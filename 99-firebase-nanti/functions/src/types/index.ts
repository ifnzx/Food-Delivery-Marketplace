export const ORDER_STATUSES = [
  "WAITING_OUTLET",
  "OUTLET_ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COURIER_ASSIGNED",
  "COURIER_GOING_TO_OUTLET",
  "PICKED_UP",
  "DELIVERING",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ROLES = [
  "CUSTOMER",
  "COURIER",
  "MERCHANT",
  "ADMIN",
  "SUPER_ADMIN",
] as const;
