import type { Prisma } from "@prisma/client";
import { newId } from "../lib/auth";
import { isCustomerPaid } from "../../../02-aturan-bisnis/businessRules";
import { recordCashCollected } from "./payment";

type Tx = Prisma.TransactionClient;

type OrderForSettlement = {
  id: string;
  customerId: string;
  courierId: string | null;
  paymentMethod: string;
  paymentStatus: string;
  platformFee: number;
  courierEarning: number;
  grandTotal: number;
  merchants: Array<{
    id: string;
    merchantId: string;
    merchantAmount: number;
    commissionAmount: number;
  }>;
};

/**
 * Tutup order setelah kurir DELIVERED.
 * - CASH: tagih tunai → Payment COLLECTED + PAID_CASH
 * - ONLINE (sudah PAID): tidak tagih lagi; hanya ledger + COMPLETED
 */
export async function finalizeDeliveredOrder(tx: Tx, order: OrderForSettlement) {
  const now = new Date();
  const alreadyPaid = isCustomerPaid(order.paymentStatus);
  const isCash = order.paymentMethod !== "ONLINE";

  if (isCash) {
    await recordCashCollected(tx, {
      orderId: order.id,
      customerId: order.customerId,
      amount: order.grandTotal,
      courierId: order.courierId,
    });
  } else if (!alreadyPaid) {
    throw new Error("Pembayaran online belum lunas");
  }

  await tx.order.update({
    where: { id: order.id },
    data: {
      status: "COMPLETED",
      paymentStatus: isCash ? "PAID_CASH" : "PAID",
      completedAt: now,
      paidAt: isCash ? now : undefined,
    },
  });

  await tx.ledgerTransaction.createMany({
    data: [
      {
        id: newId("TRX"),
        orderId: order.id,
        type: "PLATFORM_FEE",
        partyType: "PLATFORM",
        partyId: "PLATFORM",
        amount: order.platformFee,
      },
      {
        id: newId("TRX"),
        orderId: order.id,
        type: "COURIER_EARNING",
        partyType: "COURIER",
        partyId: order.courierId ?? "UNKNOWN",
        amount: order.courierEarning,
      },
      ...order.merchants.map((merchant) => ({
        id: newId("TRX"),
        orderId: order.id,
        type: "MERCHANT_PAYABLE",
        partyType: "MERCHANT" as const,
        partyId: merchant.merchantId,
        amount: merchant.merchantAmount,
      })),
    ],
  });

  for (const merchant of order.merchants) {
    const current = await tx.merchant.findUnique({
      where: { id: merchant.merchantId },
    });
    await tx.merchant.update({
      where: { id: merchant.merchantId },
      data: {
        outstandingAmount: { increment: merchant.commissionAmount },
        outstandingSince:
          !current?.outstandingSince || (current.outstandingAmount ?? 0) <= 0
            ? now
            : current.outstandingSince,
      },
    });
    await tx.orderMerchant.update({
      where: { id: merchant.id },
      data: { status: "COMPLETED", completedAt: now },
    });
  }

  if (order.courierId) {
    await tx.courier.update({
      where: { id: order.courierId },
      data: { activeOrderId: null },
    });
  }
}
