import { prisma } from "../../db";
import {
  BUSINESS_RULES,
  kitchenStartsImmediately,
  type CustomerPaymentMethod,
  type PaymentProviderId,
} from "../../../../02-aturan-bisnis/businessRules";
import { ensurePaymentSchema } from "./schema";

export type PaymentConfig = {
  defaultMethod: CustomerPaymentMethod;
  onlineEnabled: boolean;
  provider: PaymentProviderId;
  allowedMethods: CustomerPaymentMethod[];
  /** Channel yang akan ditawarkan UI saat ONLINE aktif. */
  onlineChannels: Array<"QRIS" | "EWALLET" | "VA" | "CARD">;
  collectOnDelivery: boolean;
  note: string;
};

export async function getPaymentConfig(): Promise<PaymentConfig> {
  await ensurePaymentSchema();
  const settings = await prisma.setting.findUnique({ where: { id: "business" } });
  let onlineEnabled: boolean = BUSINESS_RULES.ONLINE_PAYMENTS_ENABLED_DEFAULT;
  let provider: PaymentProviderId = BUSINESS_RULES.PAYMENT_PROVIDER_DEFAULT;
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT onlinePaymentsEnabled, paymentProvider FROM Setting WHERE id = 'business'`
    )) as Array<{ onlinePaymentsEnabled?: number | boolean; paymentProvider?: string }>;
    const row = rows[0];
    onlineEnabled = Boolean(row?.onlinePaymentsEnabled);
    const raw = String(row?.paymentProvider || BUSINESS_RULES.PAYMENT_PROVIDER_DEFAULT).toUpperCase();
    provider = (
      ["NONE", "STUB", "MIDTRANS", "XENDIT"].includes(raw) ? raw : "NONE"
    ) as PaymentProviderId;
  } catch {
    onlineEnabled = Boolean(settings?.onlinePaymentsEnabled);
    provider = (settings?.paymentProvider as PaymentProviderId) || "NONE";
  }

  const canOfferOnline = onlineEnabled && provider !== "NONE";
  const allowedMethods: CustomerPaymentMethod[] = canOfferOnline
    ? ["CASH", "ONLINE"]
    : ["CASH"];

  return {
    defaultMethod: BUSINESS_RULES.PAYMENT_METHOD_MVP,
    onlineEnabled: canOfferOnline,
    provider,
    allowedMethods,
    onlineChannels: canOfferOnline ? ["QRIS", "EWALLET", "VA", "CARD"] : [],
    collectOnDelivery: true,
    note: canOfferOnline
      ? "Cash COD dan pembayaran online tersedia."
      : "MVP: bayar tunai ke kurir. Online payment siap di backend, belum diaktifkan.",
  };
}

export async function resolveCustomerPaymentMethod(
  requested: unknown
): Promise<{
  method: CustomerPaymentMethod;
  orderStatus: "WAITING_OUTLET" | "PENDING_PAYMENT";
  paymentStatus: "UNPAID" | "PENDING";
}> {
  const config = await getPaymentConfig();
  const raw = String(requested ?? config.defaultMethod).toUpperCase();
  const method = (raw === "ONLINE" ? "ONLINE" : "CASH") as CustomerPaymentMethod;

  if (!config.allowedMethods.includes(method)) {
    if (method === "ONLINE") {
      throw new Error(
        "Pembayaran online belum aktif. Pakai CASH (tunai ke kurir) atau aktifkan gateway di Setting."
      );
    }
    throw new Error(`Metode pembayaran ${method} tidak diizinkan`);
  }

  if (kitchenStartsImmediately(method)) {
    return { method: "CASH", orderStatus: "WAITING_OUTLET", paymentStatus: "UNPAID" };
  }

  return { method: "ONLINE", orderStatus: "PENDING_PAYMENT", paymentStatus: "PENDING" };
}

export function mayStartKitchen(order: {
  status: string;
  paymentMethod: string;
  paymentStatus: string;
}): boolean {
  if (order.status === "PENDING_PAYMENT") return false;
  if (order.paymentMethod === "ONLINE") {
    return order.paymentStatus === "PAID";
  }
  return true;
}
