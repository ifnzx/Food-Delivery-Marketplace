import {
  BUSINESS_RULES,
  feeDueAt,
  isFeeOverdue,
} from "../../../02-aturan-bisnis/businessRules";
import { prisma } from "../db";

export type BillingSnapshot = {
  outstandingAmount: number;
  outstandingSince: Date | null;
  feeDueAt: Date | null;
  workingDays: number;
  daysUntilDue: number | null;
  showBillReminder: boolean;
  minimumSettlement: number;
  isOverdue: boolean;
  daysOverdue: number;
  status: string;
  suspensionState: string | null;
  isOpen: boolean;
  canOperate: boolean;
  message: string | null;
};

async function billingConfig() {
  const settings = await prisma.setting.findUnique({ where: { id: "business" } });
  return {
    workingDays: BUSINESS_RULES.SETTLEMENT_CALENDAR_DAYS,
    minimum:
      settings?.minimumSettlement ?? BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT,
  };
}

export function buildBillingSnapshot(
  merchant: {
    outstandingAmount: number;
    outstandingSince: Date | null;
    status: string;
    suspensionState: string | null;
    isOpen: boolean;
  },
  minimum: number,
  workingDays: number,
  now = new Date()
): BillingSnapshot {
  const due = feeDueAt(merchant.outstandingSince, workingDays);
  const overdue = isFeeOverdue(
    merchant.outstandingAmount,
    merchant.outstandingSince,
    now,
    minimum,
    workingDays
  );
  const daysOverdue =
    overdue && due
      ? Math.max(
          0,
          Math.ceil((now.getTime() - due.getTime()) / (24 * 60 * 60 * 1000))
        )
      : 0;

  const canOperate = merchant.status === "ACTIVE";
  let message: string | null = null;
  if (merchant.status === "SUSPENDED") {
    message =
      merchant.suspensionState === "FEE_OVERDUE"
        ? "Outlet dimatikan: tagihan fee lewat 10 hari kalender. Lunasi tagihan, unggah foto bukti transfer, lalu tunggu verifikasi Super Admin."
        : "Outlet ditangguhkan. Hubungi Super Admin.";
  } else if (
    merchant.outstandingAmount >= minimum &&
    due &&
    !overdue
  ) {
    message = `Tagihan fee jatuh tempo ${due.toLocaleDateString("id-ID")} (10 hari kalender).`;
  } else if (overdue) {
    message =
      "Tagihan fee sudah lewat jatuh tempo. Outlet akan / sudah dimatikan sampai lunas.";
  }

  const daysUntilDue = due
    ? Math.round(
        (Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) -
          Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
          (24 * 60 * 60 * 1000)
      )
    : null;
  const showBillReminder =
    merchant.outstandingAmount > 0 &&
    (overdue || (daysUntilDue !== null && daysUntilDue <= 2));

  return {
    outstandingAmount: merchant.outstandingAmount,
    outstandingSince: merchant.outstandingSince,
    feeDueAt: due,
    workingDays,
    daysUntilDue,
    showBillReminder,
    minimumSettlement: minimum,
    isOverdue: overdue,
    daysOverdue,
    status: merchant.status,
    suspensionState: merchant.suspensionState,
    isOpen: merchant.isOpen,
    canOperate,
    message,
  };
}

/** Suspend outlet yang outstanding-nya lewat 10 hari kalender. */
export async function enforceMerchantBilling(merchantId?: string) {
  const { workingDays, minimum } = await billingConfig();
  const merchants = await prisma.merchant.findMany({
    where: merchantId ? { id: merchantId } : undefined,
  });
  const now = new Date();
  const changed: string[] = [];

  for (const m of merchants) {
    if (m.status === "PENDING" || m.status === "REJECTED") continue;
    const overdue = isFeeOverdue(
      m.outstandingAmount,
      m.outstandingSince,
      now,
      minimum,
      workingDays
    );
    if (overdue && m.status !== "SUSPENDED") {
      await prisma.merchant.update({
        where: { id: m.id },
        data: {
          status: "SUSPENDED",
          suspensionState: "FEE_OVERDUE",
          isOpen: false,
        },
      });
      changed.push(m.id);
    }
  }

  return { changed, workingDays, minimum };
}

export async function getMerchantBilling(merchantId: string) {
  await enforceMerchantBilling(merchantId);
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) return null;
  const { workingDays, minimum } = await billingConfig();
  return buildBillingSnapshot(merchant, minimum, workingDays);
}

export type CommissionBucket = {
  rate: number;
  percent: number;
  orderCount: number;
  foodSubtotal: number;
  commissionAmount: number;
  label: string;
};

export function groupCommissionBuckets(
  rows: Array<{ commissionRate: number; commissionAmount: number; subtotal: number }>
): CommissionBucket[] {
  const map = new Map<number, CommissionBucket>();
  for (const row of rows) {
    const rate = Number(row.commissionRate) || 0;
    const percent = Math.round(rate * 100);
    const existing = map.get(percent);
    if (existing) {
      existing.orderCount += 1;
      existing.foodSubtotal += row.subtotal;
      existing.commissionAmount += row.commissionAmount;
    } else {
      map.set(percent, {
        rate,
        percent,
        orderCount: 1,
        foodSubtotal: row.subtotal,
        commissionAmount: row.commissionAmount,
        label:
          percent === 20
            ? "Rekomendasi 20%"
            : percent === 15
              ? "Biasa 15%"
              : `Komisi ${percent}%`,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.percent - b.percent);
}

export function mixNote(buckets: CommissionBucket[]) {
  if (buckets.length === 0) return "";
  return buckets
    .map(
      (b) =>
        `${b.label}: ${b.orderCount} pesanan, ${b.commissionAmount.toLocaleString("id-ID")}`
    )
    .join(" · ");
}

export async function unpaidCommissionRows(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  const outstanding = merchant?.outstandingAmount ?? 0;
  if (outstanding <= 0) return [];
  const rows = await prisma.orderMerchant.findMany({
    where: { merchantId, status: "COMPLETED" },
    orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
  });
  const picked: typeof rows = [];
  let sum = 0;
  for (const row of rows) {
    if (sum >= outstanding) break;
    picked.push(row);
    sum += row.commissionAmount;
  }
  return picked;
}

export async function commissionRowsInPeriod(
  merchantId: string,
  start: Date,
  end: Date
) {
  return prisma.orderMerchant.findMany({
    where: {
      merchantId,
      status: "COMPLETED",
      OR: [
        { completedAt: { gte: start, lte: end } },
        {
          AND: [
            { completedAt: null },
            { createdAt: { gte: start, lte: end } },
          ],
        },
      ],
    },
  });
}

export function publicBilling(billing: BillingSnapshot | null) {
  if (!billing) return null;
  return {
    ...billing,
    outstandingSince: billing.outstandingSince
      ? billing.outstandingSince.toISOString()
      : null,
    feeDueAt: billing.feeDueAt ? billing.feeDueAt.toISOString() : null,
  };
}

/** Saat komisi bertambah: set outstandingSince jika baru mulai berhutang. */
export async function markOutstandingAccrual(
  tx: {
    merchant: {
      findUnique: typeof prisma.merchant.findUnique;
      update: typeof prisma.merchant.update;
    };
  },
  merchantId: string,
  commissionAmount: number
) {
  const current = await tx.merchant.findUnique({ where: { id: merchantId } });
  if (!current) return;
  const nextOutstanding = current.outstandingAmount + commissionAmount;
  await tx.merchant.update({
    where: { id: merchantId },
    data: {
      outstandingAmount: { increment: commissionAmount },
      outstandingSince:
        current.outstandingAmount <= 0 && commissionAmount > 0
          ? new Date()
          : current.outstandingSince,
    },
  });
  return nextOutstanding;
}
