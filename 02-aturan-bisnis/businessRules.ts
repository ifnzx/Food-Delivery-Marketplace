/**
 * ATURAN BISNIS TERKUNCI — jangan diubah saat coding.
 * Sumber yang sama dipakai backend lokal.
 */
export const BUSINESS_RULES = {
  COMMISSION_RATE: 0.15,
  /** Komisi khusus warung rekomendasi Super Admin (per transaksi makanan). */
  FEATURED_COMMISSION_RATE: 0.2,
  /** Biaya langganan kurir prioritas (lokal, per periode). */
  COURIER_PRIORITY_FEE_DEFAULT: 25000,
  COURIER_PRIORITY_DAYS_DEFAULT: 7,
  DELIVERY_RATE_PER_KM: 2000,
  CUSTOMER_SERVICE_FEE: 0,
  /** Phase 1: satu-satunya metode yang diaktifkan. */
  PAYMENT_METHOD_MVP: "CASH",
  /** Online gateway siap di kode, default OFF sampai Super Admin + provider diisi. */
  ONLINE_PAYMENTS_ENABLED_DEFAULT: false,
  PAYMENT_PROVIDER_DEFAULT: "NONE",
  /** Fee platform wajib dilunasi tiap 10 hari kalender. */
  SETTLEMENT_PERIOD: "EVERY_10_CALENDAR_DAYS",
  SETTLEMENT_CALENDAR_DAYS: 10,
  /** Alias jumlah hari (kalender, bukan hari kerja). */
  SETTLEMENT_WORKING_DAYS: 10,
  MINIMUM_SETTLEMENT_DEFAULT: 10000,
  COMMISSION_BASE: "FOOD_SUBTOTAL",
  DELIVERY_FEE_BELONGS_TO: "COURIER",
  DISTANCE_ROUNDING_DEFAULT: "CEIL",
  /** Rekening tujuan transfer fee outlet (bisa diganti di Founder Monitor). */
  PAYOUT_BANK_NAME: "BCA",
  PAYOUT_ACCOUNT_NUMBER: "1234567890",
  PAYOUT_ACCOUNT_NAME: "Founder ANTARQ",
} as const;

/** Metode bayar customer (checkout). Settlement outlet → platform tetap TRANSFER. */
export type CustomerPaymentMethod = "CASH" | "ONLINE";
export type PaymentChannel =
  | "CASH_ON_DELIVERY"
  | "QRIS"
  | "EWALLET"
  | "VA"
  | "CARD";
export type PaymentProviderId = "NONE" | "STUB" | "MIDTRANS" | "XENDIT";
/** Status pembayaran di level Order. */
export type OrderPaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "PAID_CASH"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"
  | "CANCELLED";
/** Status baris Payment (charge / tagihan tunai). */
export type PaymentRecordStatus =
  | "INITIATED"
  | "PENDING"
  | "COLLECTED"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"
  | "CANCELLED";

export function isCustomerPaid(paymentStatus: string): boolean {
  return paymentStatus === "PAID" || paymentStatus === "PAID_CASH";
}

/** Cash: dapur langsung. Online: tunggu gateway lunas dulu. */
export function kitchenStartsImmediately(method: string): boolean {
  return method === "CASH";
}

export type DistanceRounding = "CEIL" | "ROUND" | "NONE";
export type SettlementPeriod =
  | "EVERY_10_CALENDAR_DAYS"
  | "EVERY_10_WORKING_DAYS"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY";
export type UserRole =
  | "CUSTOMER"
  | "COURIER"
  | "MERCHANT"
  | "ADMIN"
  | "SUPER_ADMIN";

export function applyDistanceRounding(
  distanceKm: number,
  rounding: DistanceRounding = BUSINESS_RULES.DISTANCE_ROUNDING_DEFAULT
): number {
  if (distanceKm < 0) {
    throw new Error("distanceKm must be >= 0");
  }
  if (rounding === "NONE") {
    return distanceKm;
  }
  if (rounding === "ROUND") {
    return Math.max(1, Math.round(distanceKm));
  }
  return Math.max(1, Math.ceil(distanceKm));
}

export function calculatePlatformFee(
  foodSubtotal: number,
  rate: number = BUSINESS_RULES.COMMISSION_RATE
): number {
  return Math.round(foodSubtotal * rate);
}

export function calculateMerchantAmount(
  foodSubtotal: number,
  rate: number = BUSINESS_RULES.COMMISSION_RATE
): number {
  return foodSubtotal - calculatePlatformFee(foodSubtotal, rate);
}

export function calculateDeliveryFee(
  billedDistanceKm: number,
  ratePerKm: number = BUSINESS_RULES.DELIVERY_RATE_PER_KM
): number {
  return Math.round(billedDistanceKm * ratePerKm);
}

export function calculateGrandTotal(
  foodSubtotal: number,
  deliveryFee: number
): number {
  return foodSubtotal + deliveryFee + BUSINESS_RULES.CUSTOMER_SERVICE_FEE;
}

/** Tambah N hari kalender (termasuk Sabtu/Minggu). */
export function addCalendarDays(from: Date, days: number): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result;
}

/** @deprecated Gunakan addCalendarDays. Disimpan agar pemanggilan lama tidak pecah. */
export function addWorkingDays(from: Date, workingDays: number): Date {
  return addCalendarDays(from, workingDays);
}

export function feeDueAt(
  outstandingSince: Date | string | null | undefined,
  days: number = BUSINESS_RULES.SETTLEMENT_CALENDAR_DAYS
): Date | null {
  if (!outstandingSince) return null;
  return addCalendarDays(new Date(outstandingSince), days);
}

export function isFeeOverdue(
  outstandingAmount: number,
  outstandingSince: Date | string | null | undefined,
  now: Date = new Date(),
  minimum: number = BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT,
  days: number = BUSINESS_RULES.SETTLEMENT_CALENDAR_DAYS
): boolean {
  if (outstandingAmount < minimum) return false;
  const due = feeDueAt(outstandingSince, days);
  if (!due) return false;
  return now.getTime() > due.getTime();
}
