import { prisma } from "../db";
import {
  BUSINESS_RULES,
  calculateGrandTotal,
  calculateMerchantAmount,
  calculatePlatformFee,
} from "../../../02-aturan-bisnis/businessRules";

export type DeliveryMode = "PER_KM" | "FLAT";

export type Pricing = {
  commissionRate: number;
  deliveryMode: DeliveryMode;
  deliveryRatePerKm: number;
  deliveryFlatFee: number;
};

export async function ensurePricingColumns() {
  const alters = [
    `ALTER TABLE Setting ADD COLUMN deliveryMode TEXT NOT NULL DEFAULT 'PER_KM'`,
    `ALTER TABLE Setting ADD COLUMN deliveryFlatFee INTEGER NOT NULL DEFAULT 10000`,
  ];
  for (const sql of alters) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      /* already exists */
    }
  }
}

export async function getPricing(): Promise<Pricing> {
  await ensurePricingColumns();
  const settings = await prisma.setting.findUnique({ where: { id: "business" } });
  let mode = "PER_KM";
  let flat = 10000;
  try {
    const extra = (await prisma.$queryRawUnsafe(
      `SELECT deliveryMode, deliveryFlatFee FROM Setting WHERE id = 'business'`
    )) as Array<{ deliveryMode?: string; deliveryFlatFee?: number }>;
    mode = String(extra[0]?.deliveryMode || "PER_KM").toUpperCase();
    flat = Number(extra[0]?.deliveryFlatFee ?? 10000);
  } catch {
    /* columns just created */
  }
  return {
    commissionRate: settings?.commissionRate ?? BUSINESS_RULES.COMMISSION_RATE,
    deliveryMode: mode === "FLAT" ? "FLAT" : "PER_KM",
    deliveryRatePerKm:
      settings?.deliveryRatePerKm ?? BUSINESS_RULES.DELIVERY_RATE_PER_KM,
    deliveryFlatFee: Number.isFinite(flat) ? flat : 10000,
  };
}

export function platformFeeFrom(foodSubtotal: number, rate: number) {
  return Math.round(foodSubtotal * rate);
}

export function merchantAmountFrom(foodSubtotal: number, rate: number) {
  return foodSubtotal - platformFeeFrom(foodSubtotal, rate);
}

export function deliveryFeeFrom(billedDistanceKm: number, pricing: Pricing) {
  if (pricing.deliveryMode === "FLAT") {
    return Math.max(0, Math.round(pricing.deliveryFlatFee));
  }
  return Math.round(billedDistanceKm * pricing.deliveryRatePerKm);
}

export function deliveryNote(pricing: Pricing) {
  if (pricing.deliveryMode === "FLAT") {
    return `Ongkir tarif tetap Rp${pricing.deliveryFlatFee.toLocaleString("id-ID")} per pengantaran.`;
  }
  return `Ongkir Rp${pricing.deliveryRatePerKm.toLocaleString("id-ID")} per km.`;
}

export { calculateGrandTotal, calculateMerchantAmount, calculatePlatformFee };
