export const ORDER_STATUS: Record<string, string> = {
  WAITING_OUTLET: "Menunggu outlet",
  PREPARING: "Dimasak",
  READY_FOR_PICKUP: "Siap dijemput",
  ASSIGNED: "Kurir ditugaskan",
  PICKED_UP: "Diambil",
  DELIVERING: "Diantar",
  OUT_FOR_DELIVERY: "Diantar",
  DELIVERED: "Sampai",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const MERCHANT_ORDER_STATUS: Record<string, string> = {
  WAITING: "Menunggu",
  ACCEPTED: "Diterima",
  PREPARING: "Dimasak",
  READY_FOR_PICKUP: "Siap dijemput",
  COMPLETED: "Selesai",
  REJECTED: "Ditolak",
};

export const ACCOUNT_STATUS: Record<string, string> = {
  ACTIVE: "Aktif",
  SUSPENDED: "Ditangguhkan",
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  VERIFIED: "Diverifikasi",
};

export const SETTLEMENT_STATUS: Record<string, string> = {
  PENDING: "Menunggu",
  VERIFIED: "Diverifikasi",
  REJECTED: "Ditolak",
};

export const SUPPORT_STATUS: Record<string, string> = {
  OPEN: "Baru",
  IN_PROGRESS: "Diproses",
  RESOLVED: "Selesai",
  CLOSED: "Ditutup",
};

export const SUPPORT_ROLE: Record<string, string> = {
  CUSTOMER: "Pelanggan",
  COURIER: "Kurir",
  MERCHANT: "Outlet",
};

export function labelOf(map: Record<string, string>, value: string) {
  return map[value] || value;
}
