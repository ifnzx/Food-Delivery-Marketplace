"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUSINESS_RULES = void 0;
exports.applyDistanceRounding = applyDistanceRounding;
exports.calculatePlatformFee = calculatePlatformFee;
exports.calculateMerchantAmount = calculateMerchantAmount;
exports.calculateDeliveryFee = calculateDeliveryFee;
exports.calculateGrandTotal = calculateGrandTotal;
/**
 * LOCKED business rules. Do not change these values while building.
 * Configurable admin fields live in Firestore settings/business.
 * See docs/BUSINESS_RULES.md
 */
exports.BUSINESS_RULES = {
    COMMISSION_RATE: 0.15,
    DELIVERY_RATE_PER_KM: 2000,
    CUSTOMER_SERVICE_FEE: 0,
    PAYMENT_METHOD_MVP: "CASH",
    SETTLEMENT_PERIOD: "WEEKLY",
    MINIMUM_SETTLEMENT_DEFAULT: 50000,
    COMMISSION_BASE: "FOOD_SUBTOTAL",
    DELIVERY_FEE_BELONGS_TO: "COURIER",
    DISTANCE_ROUNDING_DEFAULT: "CEIL",
};
function applyDistanceRounding(distanceKm, rounding = exports.BUSINESS_RULES.DISTANCE_ROUNDING_DEFAULT) {
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
function calculatePlatformFee(foodSubtotal) {
    return Math.round(foodSubtotal * exports.BUSINESS_RULES.COMMISSION_RATE);
}
function calculateMerchantAmount(foodSubtotal) {
    return foodSubtotal - calculatePlatformFee(foodSubtotal);
}
function calculateDeliveryFee(billedDistanceKm) {
    return billedDistanceKm * exports.BUSINESS_RULES.DELIVERY_RATE_PER_KM;
}
function calculateGrandTotal(foodSubtotal, deliveryFee) {
    return foodSubtotal + deliveryFee + exports.BUSINESS_RULES.CUSTOMER_SERVICE_FEE;
}
//# sourceMappingURL=businessRules.js.map