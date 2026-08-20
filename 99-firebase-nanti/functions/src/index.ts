import { onCall, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { BUSINESS_RULES } from "./config/businessRules";

initializeApp();
setGlobalOptions({ region: "asia-southeast1" });

export const health = onRequest((req, res) => {
  res.json({
    ok: true,
    service: "food-delivery-functions",
    step: 1,
  });
});

/**
 * Public business config for checkout preview.
 * Locked rates come from code; rounding / settlement extras from settings.
 */
export const getBusinessConfig = onCall(async () => {
  const db = getFirestore();
  const snap = await db.doc("settings/business").get();
  const settings = snap.exists ? snap.data() : {};

  return {
    commissionRate: BUSINESS_RULES.COMMISSION_RATE,
    deliveryRatePerKm: BUSINESS_RULES.DELIVERY_RATE_PER_KM,
    customerServiceFee: BUSINESS_RULES.CUSTOMER_SERVICE_FEE,
    paymentMethodMvp: BUSINESS_RULES.PAYMENT_METHOD_MVP,
    commissionBase: BUSINESS_RULES.COMMISSION_BASE,
    deliveryFeeBelongsTo: BUSINESS_RULES.DELIVERY_FEE_BELONGS_TO,
    settlementPeriod:
      settings?.settlementPeriod ?? BUSINESS_RULES.SETTLEMENT_PERIOD,
    minimumSettlement:
      settings?.minimumSettlement ?? BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT,
    distanceRounding:
      settings?.distanceRounding ?? BUSINESS_RULES.DISTANCE_ROUNDING_DEFAULT,
  };
});
