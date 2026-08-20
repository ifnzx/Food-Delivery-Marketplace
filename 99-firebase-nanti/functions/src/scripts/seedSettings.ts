import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { BUSINESS_RULES } from "../config/businessRules";

initializeApp();

async function seedSettings(): Promise<void> {
  const db = getFirestore();
  await db.doc("settings/business").set(
    {
      commissionRate: BUSINESS_RULES.COMMISSION_RATE,
      deliveryRatePerKm: BUSINESS_RULES.DELIVERY_RATE_PER_KM,
      customerServiceFee: BUSINESS_RULES.CUSTOMER_SERVICE_FEE,
      paymentMethodMvp: BUSINESS_RULES.PAYMENT_METHOD_MVP,
      settlementPeriod: BUSINESS_RULES.SETTLEMENT_PERIOD,
      minimumSettlement: BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT,
      distanceRounding: BUSINESS_RULES.DISTANCE_ROUNDING_DEFAULT,
      commissionBase: BUSINESS_RULES.COMMISSION_BASE,
      deliveryFeeBelongsTo: BUSINESS_RULES.DELIVERY_FEE_BELONGS_TO,
      updatedAt: new Date(),
    },
    { merge: true }
  );
  console.log("Seeded settings/business");
}

seedSettings().catch((error) => {
  console.error(error);
  process.exit(1);
});
