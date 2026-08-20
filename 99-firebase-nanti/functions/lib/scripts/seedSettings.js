"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const businessRules_1 = require("../config/businessRules");
(0, app_1.initializeApp)();
async function seedSettings() {
    const db = (0, firestore_1.getFirestore)();
    await db.doc("settings/business").set({
        commissionRate: businessRules_1.BUSINESS_RULES.COMMISSION_RATE,
        deliveryRatePerKm: businessRules_1.BUSINESS_RULES.DELIVERY_RATE_PER_KM,
        customerServiceFee: businessRules_1.BUSINESS_RULES.CUSTOMER_SERVICE_FEE,
        paymentMethodMvp: businessRules_1.BUSINESS_RULES.PAYMENT_METHOD_MVP,
        settlementPeriod: businessRules_1.BUSINESS_RULES.SETTLEMENT_PERIOD,
        minimumSettlement: businessRules_1.BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT,
        distanceRounding: businessRules_1.BUSINESS_RULES.DISTANCE_ROUNDING_DEFAULT,
        commissionBase: businessRules_1.BUSINESS_RULES.COMMISSION_BASE,
        deliveryFeeBelongsTo: businessRules_1.BUSINESS_RULES.DELIVERY_FEE_BELONGS_TO,
        updatedAt: new Date(),
    }, { merge: true });
    console.log("Seeded settings/business");
}
seedSettings().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=seedSettings.js.map