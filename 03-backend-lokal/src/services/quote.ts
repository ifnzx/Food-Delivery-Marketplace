import { prisma } from "../db";
import {
  BUSINESS_RULES,
  applyDistanceRounding,
  calculateGrandTotal,
  type DistanceRounding,
} from "../../../02-aturan-bisnis/businessRules";
import { deliveryFeeFrom, getPricing, merchantAmountFrom, platformFeeFrom } from "./pricing";
import { getPlacementSettings, isMerchantFeatured } from "../lib/placement";
import { drivingRoute } from "../lib/googleMaps";
import { getPaymentConfig } from "./payment";

type PreviewItem = { menuId: string; qty: number };
type PreviewMerchant = { merchantId: string; items: PreviewItem[] };

export async function quoteOrder(body: {
  merchantItems?: PreviewMerchant[];
  delivery?: { address: string; latitude: number; longitude: number };
  forceBilledKm?: number;
}) {
  const groups = body.merchantItems ?? [];
  if (groups.length === 0) {
    throw new Error("Keranjang kosong");
  }
  const delivery = body.delivery;
  if (!delivery?.address) {
    throw new Error("Alamat pengiriman wajib");
  }
  if (
    !Number.isFinite(Number(delivery.latitude)) ||
    !Number.isFinite(Number(delivery.longitude))
  ) {
    throw new Error("Titik GPS pengiriman wajib. Izinkan lokasi atau pilih di peta.");
  }

  const settings = await prisma.setting.findUnique({ where: { id: "business" } });
  const rounding = (settings?.distanceRounding ??
    BUSINESS_RULES.DISTANCE_ROUNDING_DEFAULT) as DistanceRounding;
  const pricing = await getPricing();
  const placement = await getPlacementSettings();

  const merchants = [];
  let foodSubtotal = 0;
  let maxDistance = 0;
  let maxDurationSeconds = 0;
  let usedGoogle = false;
  let durationText: string | null = null;

  for (const group of groups) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: group.merchantId },
    });
    if (!merchant || merchant.status !== "ACTIVE") {
      throw new Error(`Outlet ${group.merchantId} tidak aktif`);
    }
    if (!merchant.isOpen) {
      throw new Error(`${merchant.name} sedang tutup. Tidak bisa pesan sekarang.`);
    }
    const items = [];
    let subtotal = 0;
    for (const line of group.items ?? []) {
      const menu = await prisma.menu.findUnique({ where: { id: line.menuId } });
      if (!menu || menu.merchantId !== merchant.id || !menu.isAvailable) {
        throw new Error(`Menu ${line.menuId} tidak tersedia`);
      }
      const qty = Number(line.qty);
      if (!Number.isInteger(qty) || qty <= 0) {
        throw new Error("Qty tidak valid");
      }
      const lineTotal = menu.price * qty;
      subtotal += lineTotal;
      items.push({
        menuId: menu.id,
        name: menu.name,
        unitPrice: menu.price,
        qty,
        subtotal: lineTotal,
      });
    }
    const featured = await isMerchantFeatured(merchant.id);
    const commissionRate = featured
      ? placement.featuredCommissionRate
      : pricing.commissionRate;
    const commissionAmount = platformFeeFrom(subtotal, commissionRate);
    const merchantAmount = merchantAmountFrom(subtotal, commissionRate);
    foodSubtotal += subtotal;
    const route = await drivingRoute(
      { latitude: merchant.latitude, longitude: merchant.longitude },
      {
        latitude: Number(delivery.latitude),
        longitude: Number(delivery.longitude),
      }
    );
    maxDistance = Math.max(maxDistance, route.km);
    if (route.durationSeconds != null) {
      maxDurationSeconds = Math.max(maxDurationSeconds, route.durationSeconds);
    }
    if (route.mode === "google-distance-matrix") usedGoogle = true;
    durationText = route.durationText || durationText;
    merchants.push({
      merchantId: merchant.id,
      merchantName: merchant.name,
      subtotal,
      commissionRate,
      commissionAmount,
      merchantAmount,
      items,
    });
  }

  const forced = Number(body.forceBilledKm);
  const routeDistanceKm =
    Number.isFinite(forced) && forced > 0 ? forced : maxDistance;
  const billedDistanceKm = applyDistanceRounding(routeDistanceKm, rounding);
  const deliveryFee = deliveryFeeFrom(billedDistanceKm, pricing);
  const platformFee = merchants.reduce((sum, row) => sum + row.commissionAmount, 0);
  const grandTotal = calculateGrandTotal(foodSubtotal, deliveryFee);
  const payment = await getPaymentConfig();

  return {
    foodSubtotal,
    platformFee,
    deliveryFee,
    courierEarning: deliveryFee,
    grandTotal,
    commissionRate: pricing.commissionRate,
    deliveryMode: pricing.deliveryMode,
    deliveryRatePerKm: pricing.deliveryRatePerKm,
    deliveryFlatFee: pricing.deliveryFlatFee,
    routeDistanceKm: Number(routeDistanceKm.toFixed(3)),
    billedDistanceKm,
    distanceMode:
      Number.isFinite(forced) && forced > 0
        ? "forced-local-review"
        : usedGoogle
          ? "google-distance-matrix"
          : "haversine-local",
    etaMinutes: maxDurationSeconds
      ? Math.max(1, Math.round(maxDurationSeconds / 60))
      : Math.max(12, Math.round(12 + billedDistanceKm * 3)),
    etaText: durationText,
    delivery,
    merchants,
    payment,
  };
}
