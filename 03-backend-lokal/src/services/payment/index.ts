import type { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { newId } from "../../lib/auth";
import { isCustomerPaid } from "../../../../02-aturan-bisnis/businessRules";
import {
  getPaymentConfig,
  mayStartKitchen,
  resolveCustomerPaymentMethod,
} from "./policy";
import { cashProvider, getOnlineProvider, recordCashCollected } from "./providers";
import { ensurePaymentSchema } from "./schema";

export {
  getPaymentConfig,
  mayStartKitchen,
  resolveCustomerPaymentMethod,
  ensurePaymentSchema,
};
export { recordCashCollected };

type Tx = Prisma.TransactionClient;

export async function initiateOrderPayment(
  tx: Tx,
  input: {
    orderId: string;
    customerId: string;
    amount: number;
    method: "CASH" | "ONLINE";
    channel?: string;
  }
) {
  if (input.method === "CASH") {
    return cashProvider.initiate(tx, {
      orderId: input.orderId,
      customerId: input.customerId,
      amount: input.amount,
      method: "CASH",
      provider: "NONE",
    });
  }

  const config = await getPaymentConfig();
  const adapter = getOnlineProvider(config.provider);
  return adapter.initiate(tx, {
    orderId: input.orderId,
    customerId: input.customerId,
    amount: input.amount,
    method: "ONLINE",
    channel: (input.channel as "QRIS") || "QRIS",
    provider: config.provider,
  });
}

/**
 * Webhook gateway → tandai order lunas → dapur boleh mulai (WAITING_OUTLET).
 * Panggil dari POST /api/payments/webhook setelah verifikasi signature provider.
 */
export async function applyOnlinePaymentPaid(input: {
  paymentId?: string;
  providerRef?: string;
  rawPayload?: unknown;
}) {
  await ensurePaymentSchema();
  const payment = await prisma.payment.findFirst({
    where: input.paymentId
      ? { id: input.paymentId }
      : { providerRef: String(input.providerRef ?? "") },
  });
  if (!payment) {
    throw new Error("Payment tidak ditemukan");
  }
  if (payment.method !== "ONLINE") {
    throw new Error("Bukan pembayaran online");
  }
  if (payment.status === "PAID") {
    return loadPaidResult(payment.orderId);
  }
  if (!["PENDING", "INITIATED"].includes(payment.status)) {
    throw new Error(`Status payment ${payment.status} tidak bisa di-PAID`);
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paidAt: now,
        updatedAt: now,
        rawPayload: input.rawPayload
          ? JSON.stringify(input.rawPayload)
          : payment.rawPayload,
      },
    });
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: "PAID",
        paidAt: now,
        status: "WAITING_OUTLET",
      },
    });
  });

  return loadPaidResult(payment.orderId);
}

export async function applyOnlinePaymentFailed(input: {
  paymentId?: string;
  providerRef?: string;
  reason?: string;
  rawPayload?: unknown;
}) {
  await ensurePaymentSchema();
  const payment = await prisma.payment.findFirst({
    where: input.paymentId
      ? { id: input.paymentId }
      : { providerRef: String(input.providerRef ?? "") },
  });
  if (!payment || payment.method !== "ONLINE") {
    throw new Error("Payment online tidak ditemukan");
  }
  if (payment.status === "PAID") {
    throw new Error("Payment sudah PAID");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failedAt: now,
        updatedAt: now,
        failureReason: input.reason ?? "Gateway failed",
        rawPayload: input.rawPayload
          ? JSON.stringify(input.rawPayload)
          : payment.rawPayload,
      },
    });
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: "FAILED",
        status: "CANCELLED",
        cancelledAt: now,
        cancelReason: "Pembayaran online gagal",
      },
    });
  });

  return { orderId: payment.orderId, paymentStatus: "FAILED" as const };
}

async function loadPaidResult(orderId: string) {
  return {
    orderId,
    paymentStatus: "PAID" as const,
    orderStatus: "WAITING_OUTLET" as const,
  };
}

/** Handler generik webhook — ganti body parsing per provider nanti. */
export async function handleGatewayWebhook(body: {
  event?: string;
  paymentId?: string;
  providerRef?: string;
  reason?: string;
  [key: string]: unknown;
}) {
  const config = await getPaymentConfig();
  if (config.provider === "NONE" || !config.onlineEnabled) {
    return {
      ok: false as const,
      code: "GATEWAY_DISABLED",
      message: "Payment gateway belum aktif (MVP masih CASH).",
    };
  }

  if (config.provider === "MIDTRANS" || config.provider === "XENDIT") {
    return {
      ok: false as const,
      code: "PROVIDER_NOT_IMPLEMENTED",
      message: `Adapter ${config.provider} belum diisi. Implementasikan di services/payment.`,
    };
  }

  // STUB: body { event: "PAID"|"FAILED", paymentId }
  const event = String(body.event ?? "").toUpperCase();
  if (event === "PAID") {
    const result = await applyOnlinePaymentPaid({
      paymentId: body.paymentId,
      providerRef: body.providerRef,
      rawPayload: body,
    });
    return { ok: true as const, event: "PAID", ...result };
  }
  if (event === "FAILED") {
    const result = await applyOnlinePaymentFailed({
      paymentId: body.paymentId,
      providerRef: body.providerRef,
      reason: body.reason ? String(body.reason) : undefined,
      rawPayload: body,
    });
    return { ok: true as const, event: "FAILED", ...result };
  }

  return {
    ok: false as const,
    code: "UNKNOWN_EVENT",
    message: "Kirim event PAID atau FAILED (mode STUB).",
  };
}

export function assertCanCompleteDelivery(order: {
  paymentMethod: string;
  paymentStatus: string;
}) {
  if (order.paymentMethod === "ONLINE" && !isCustomerPaid(order.paymentStatus)) {
    throw new Error("Pembayaran online belum lunas; tidak bisa menutup order");
  }
}

export async function cancelPendingPaymentsForOrder(tx: Tx, orderId: string) {
  await tx.payment.updateMany({
    where: {
      orderId,
      method: "ONLINE",
      status: { in: ["INITIATED", "PENDING"] },
    },
    data: { status: "CANCELLED", updatedAt: new Date() },
  });
}

/** Dev helper id generator kept for adapters that need local ids outside routes. */
export { newId };
