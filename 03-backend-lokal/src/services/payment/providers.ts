import type { Prisma } from "@prisma/client";
import { newId } from "../../lib/auth";
import type {
  CustomerPaymentMethod,
  PaymentChannel,
  PaymentProviderId,
} from "../../../../02-aturan-bisnis/businessRules";

type Tx = Prisma.TransactionClient;

export type InitiatePaymentInput = {
  orderId: string;
  customerId: string;
  amount: number;
  method: CustomerPaymentMethod;
  channel?: PaymentChannel;
  provider: PaymentProviderId;
  courierId?: string | null;
};

export type InitiatePaymentResult = {
  paymentId: string | null;
  checkoutUrl: string | null;
  providerRef: string | null;
};

/**
 * Adapter payment gateway.
 * Tambah file/register Midtrans/Xendit di sini tanpa mengubah alur order.
 */
export interface PaymentProviderAdapter {
  id: PaymentProviderId;
  initiate(tx: Tx, input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
}

/** Cash: Payment dibuat saat kurir complete (collect), bukan saat create order. */
export const cashProvider: PaymentProviderAdapter = {
  id: "NONE",
  async initiate() {
    return { paymentId: null, checkoutUrl: null, providerRef: null };
  },
};

/**
 * Stub lokal — meniru charge gateway tanpa PSP sungguhan.
 * Aktifkan dengan Setting.onlinePaymentsEnabled=true + paymentProvider=STUB.
 */
export const stubOnlineProvider: PaymentProviderAdapter = {
  id: "STUB",
  async initiate(tx, input) {
    const paymentId = newId("PAY");
    const providerRef = `stub_${paymentId}`;
    const checkoutUrl = `/pay/stub/${paymentId}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await tx.payment.create({
      data: {
        id: paymentId,
        orderId: input.orderId,
        customerId: input.customerId,
        method: "ONLINE",
        channel: input.channel ?? "QRIS",
        provider: "STUB",
        providerRef,
        idempotencyKey: `order:${input.orderId}:online`,
        amount: input.amount,
        currency: "IDR",
        status: "PENDING",
        collectedByCourierId: "",
        checkoutUrl,
        expiresAt,
        rawPayload: JSON.stringify({ stub: true, createdAt: new Date().toISOString() }),
      },
    });
    return { paymentId, checkoutUrl, providerRef };
  },
};

export function getOnlineProvider(provider: PaymentProviderId): PaymentProviderAdapter {
  if (provider === "STUB") return stubOnlineProvider;
  if (provider === "MIDTRANS" || provider === "XENDIT") {
    throw new Error(
      `Provider ${provider} belum diimplementasi. Tambah adapter di services/payment/providers.ts.`
    );
  }
  throw new Error("Payment gateway belum dikonfigurasi (paymentProvider=NONE).");
}

export async function recordCashCollected(
  tx: Tx,
  input: {
    orderId: string;
    customerId: string;
    amount: number;
    courierId: string | null;
  }
) {
  return tx.payment.create({
    data: {
      id: newId("PAY"),
      orderId: input.orderId,
      customerId: input.customerId,
      method: "CASH",
      channel: "CASH_ON_DELIVERY",
      provider: "NONE",
      amount: input.amount,
      currency: "IDR",
      status: "COLLECTED",
      collectedByCourierId: input.courierId ?? "",
      paidAt: new Date(),
    },
  });
}
