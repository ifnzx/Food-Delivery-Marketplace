"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessConfig = exports.health = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const businessRules_1 = require("./config/businessRules");
(0, app_1.initializeApp)();
(0, v2_1.setGlobalOptions)({ region: "asia-southeast1" });
exports.health = (0, https_1.onRequest)((req, res) => {
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
exports.getBusinessConfig = (0, https_1.onCall)(async () => {
    const db = (0, firestore_1.getFirestore)();
    const snap = await db.doc("settings/business").get();
    const settings = snap.exists ? snap.data() : {};
    return {
        commissionRate: businessRules_1.BUSINESS_RULES.COMMISSION_RATE,
        deliveryRatePerKm: businessRules_1.BUSINESS_RULES.DELIVERY_RATE_PER_KM,
        customerServiceFee: businessRules_1.BUSINESS_RULES.CUSTOMER_SERVICE_FEE,
        paymentMethodMvp: businessRules_1.BUSINESS_RULES.PAYMENT_METHOD_MVP,
        commissionBase: businessRules_1.BUSINESS_RULES.COMMISSION_BASE,
        deliveryFeeBelongsTo: businessRules_1.BUSINESS_RULES.DELIVERY_FEE_BELONGS_TO,
        settlementPeriod: settings?.settlementPeriod ?? businessRules_1.BUSINESS_RULES.SETTLEMENT_PERIOD,
        minimumSettlement: settings?.minimumSettlement ?? businessRules_1.BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT,
        distanceRounding: settings?.distanceRounding ?? businessRules_1.BUSINESS_RULES.DISTANCE_ROUNDING_DEFAULT,
    };
});
//# sourceMappingURL=index.js.map