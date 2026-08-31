import { prisma } from "../db";
import { countOpenSupportReports } from "../lib/supportReports";

const ACTIVE_ORDER_STATUSES = [
  "WAITING_OUTLET",
  "PREPARING",
  "READY_FOR_PICKUP",
  "ASSIGNED",
  "PICKED_UP",
  "DELIVERING",
] as const;

const WAITING_OUTLET_STATUSES = [
  "WAITING_OUTLET",
  "PREPARING",
  "READY_FOR_PICKUP",
] as const;

const WITH_COURIER_STATUSES = ["ASSIGNED", "PICKED_UP", "DELIVERING"] as const;

function sumGroupedCount<T extends string>(
  rows: Array<{ [key: string]: T | number; _count: { _all: number } }>,
  field: string,
  value: T
) {
  const row = rows.find((r) => r[field] === value);
  return row?._count._all ?? 0;
}

function sumAllGrouped(
  rows: Array<{ _count: { _all: number } }>
) {
  return rows.reduce((s, r) => s + r._count._all, 0);
}

function sumGroupedByStatuses(
  rows: Array<{ status: string; _count: { _all: number } }>,
  statuses: readonly string[]
) {
  const set = new Set(statuses);
  return rows
    .filter((r) => set.has(r.status))
    .reduce((s, r) => s + r._count._all, 0);
}

/** Statistik dashboard — query dibatasi per gelombang (aman untuk pool Supabase). */
export async function loadAdminDashboardCoreStats() {
  const [orderRows, customerRows, merchantRows, outstandingAgg, courierApprovalRows] =
    await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { grandTotal: true, platformFee: true, courierEarning: true },
      }),
      prisma.customer.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.merchant.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.merchant.aggregate({ _sum: { outstandingAmount: true } }),
      prisma.courier.groupBy({ by: ["approvalStatus"], _count: { _all: true } }),
    ]);

  const [courierOnline, pendingSettlements, supportOpen] = await Promise.all([
    prisma.courier.count({ where: { isOnline: true } }),
    prisma.merchantSettlement.count({ where: { status: "PENDING" } }),
    countOpenSupportReports(),
  ]);

  let gmv = 0;
  let platformFee = 0;
  let courierEarningsPaid = 0;
  for (const row of orderRows) {
    if (row.status !== "CANCELLED") {
      gmv += row._sum.grandTotal ?? 0;
    }
    if (row.status === "COMPLETED") {
      platformFee += row._sum.platformFee ?? 0;
      courierEarningsPaid += row._sum.courierEarning ?? 0;
    }
  }

  return {
    customers: sumAllGrouped(customerRows),
    merchants: sumGroupedCount(merchantRows, "status", "ACTIVE"),
    couriers: sumAllGrouped(courierApprovalRows),
    courierOnline,
    courierPending: sumGroupedCount(courierApprovalRows, "approvalStatus", "PENDING"),
    merchantPending: sumGroupedCount(merchantRows, "status", "PENDING"),
    orders: sumAllGrouped(orderRows),
    completed: sumGroupedCount(orderRows, "status", "COMPLETED"),
    cancelled: sumGroupedCount(orderRows, "status", "CANCELLED"),
    gmv,
    platformFee,
    courierEarningsPaid,
    outstandingSettlement: outstandingAgg._sum.outstandingAmount ?? 0,
    pendingSettlements,
    customerSuspended: sumGroupedCount(customerRows, "status", "SUSPENDED"),
    merchantSuspended: sumGroupedCount(merchantRows, "status", "SUSPENDED"),
    courierSuspended: sumGroupedCount(
      courierApprovalRows,
      "approvalStatus",
      "SUSPENDED"
    ),
    activeOrders: sumGroupedByStatuses(orderRows, ACTIVE_ORDER_STATUSES),
    waitingOutlet: sumGroupedByStatuses(orderRows, WAITING_OUTLET_STATUSES),
    withCourier: sumGroupedByStatuses(orderRows, WITH_COURIER_STATUSES),
    supportOpen,
  };
}

export async function loadAdminDashboardRankings() {
  const merchantRows = await prisma.merchant.findMany({
    include: {
      orderMerchants: {
        where: { status: "COMPLETED" },
        select: { subtotal: true, commissionAmount: true },
      },
    },
  });
  const courierRows = await prisma.courier.findMany({
    where: { approvalStatus: "APPROVED" },
    include: {
      orders: {
        where: { status: "COMPLETED" },
        select: { courierEarning: true },
      },
    },
  });
  return { merchantRows, courierRows };
}
