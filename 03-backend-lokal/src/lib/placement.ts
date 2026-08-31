import { prisma } from "../db";
import { BUSINESS_RULES } from "../../../02-aturan-bisnis/businessRules";
import { isPostgres, qCol, qTable, sqlIfNull } from "./dbDialect";

function sqlStr(value: string) {
  return String(value || "").replace(/'/g, "''");
}

function iso(v: unknown) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export type PriorityUnit = "HOUR" | "DAY" | "MONTH";

export type PlacementSettings = {
  featuredCommissionRate: number;
  courierPriorityFee: number;
  /** Durasi aktif dalam jam (sumber kebenaran untuk aktivasi). */
  courierPriorityHours: number;
  /** Angka yang diisi Super Admin (mis. 3 jam / 7 hari / 1 bulan). */
  courierPriorityDuration: number;
  courierPriorityUnit: PriorityUnit;
  /** Legacy: ceil(hours/24) — tetap ada untuk klien lama. */
  courierPriorityDays: number;
  /** Label siap tampil, mis. "3 jam" atau "7 hari". */
  courierPriorityLabel: string;
};

const UNIT_WORD: Record<PriorityUnit, string> = {
  HOUR: "jam",
  DAY: "hari",
  MONTH: "bulan",
};

export function parsePriorityUnit(raw: unknown): PriorityUnit {
  const u = String(raw || "DAY").toUpperCase();
  if (u === "HOUR" || u === "HOURS" || u === "JAM") return "HOUR";
  if (u === "MONTH" || u === "MONTHS" || u === "BULAN") return "MONTH";
  return "DAY";
}

export function durationToHours(duration: number, unit: PriorityUnit): number {
  const d = Math.max(1, Math.round(duration));
  if (unit === "HOUR") return d;
  if (unit === "MONTH") return d * 30 * 24;
  return d * 24;
}

export function hoursToDisplay(hours: number, unit: PriorityUnit): number {
  const h = Math.max(1, Math.round(hours));
  if (unit === "HOUR") return h;
  if (unit === "MONTH") return Math.max(1, Math.round(h / (30 * 24)));
  return Math.max(1, Math.round(h / 24));
}

export function priorityLabel(duration: number, unit: PriorityUnit): string {
  return `${Math.max(1, Math.round(duration))} ${UNIT_WORD[unit]}`;
}

export async function ensurePlacementColumns() {
  if (isPostgres()) return;
  const alters = [
    `ALTER TABLE Merchant ADD COLUMN isFeatured INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE Merchant ADD COLUMN featuredAt DATETIME`,
    `ALTER TABLE Merchant ADD COLUMN featuredRequestAt DATETIME`,
    `ALTER TABLE Merchant ADD COLUMN featuredRequestStatus TEXT`,
    `ALTER TABLE Courier ADD COLUMN priorityUntil DATETIME`,
    `ALTER TABLE Courier ADD COLUMN priorityRequestAt DATETIME`,
    `ALTER TABLE Courier ADD COLUMN priorityRequestStatus TEXT`,
    `ALTER TABLE Courier ADD COLUMN priorityRequestFee INTEGER`,
    `ALTER TABLE Courier ADD COLUMN priorityProofUrl TEXT`,
    `ALTER TABLE Setting ADD COLUMN featuredCommissionRate REAL NOT NULL DEFAULT 0.2`,
    `ALTER TABLE Setting ADD COLUMN courierPriorityFee INTEGER NOT NULL DEFAULT 25000`,
    `ALTER TABLE Setting ADD COLUMN courierPriorityDays INTEGER NOT NULL DEFAULT 7`,
    `ALTER TABLE Setting ADD COLUMN courierPriorityHours INTEGER`,
    `ALTER TABLE Setting ADD COLUMN courierPriorityUnit TEXT NOT NULL DEFAULT 'DAY'`,
    `ALTER TABLE Setting ADD COLUMN courierPriorityDuration INTEGER`,
  ];
  for (const sql of alters) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      /* already exists */
    }
  }
}

export async function getPlacementSettings(): Promise<PlacementSettings> {
  await ensurePlacementColumns();
  if (isPostgres()) {
    const row = await prisma.setting.findUnique({ where: { id: "business" } });
    const unit = parsePriorityUnit(row?.courierPriorityUnit);
    let hours = Number(row?.courierPriorityHours);
    const legacyDays = Number(row?.courierPriorityDays);
    if (!Number.isFinite(hours) || hours < 1) {
      const days =
        Number.isFinite(legacyDays) && legacyDays > 0
          ? Math.round(legacyDays)
          : BUSINESS_RULES.COURIER_PRIORITY_DAYS_DEFAULT;
      hours = days * 24;
    }
    let duration = Number(row?.courierPriorityDuration);
    if (!Number.isFinite(duration) || duration < 1) {
      duration = hoursToDisplay(hours, unit);
    }
    const featured = Number(row?.featuredCommissionRate);
    const fee = Number(row?.courierPriorityFee);
    return {
      featuredCommissionRate: Number.isFinite(featured) && featured > 0
        ? featured
        : BUSINESS_RULES.FEATURED_COMMISSION_RATE,
      courierPriorityFee: Number.isFinite(fee) && fee >= 0
        ? Math.round(fee)
        : BUSINESS_RULES.COURIER_PRIORITY_FEE_DEFAULT,
      courierPriorityHours: Math.round(hours),
      courierPriorityDuration: Math.round(duration),
      courierPriorityUnit: unit,
      courierPriorityDays: Math.max(1, Math.ceil(hours / 24)),
      courierPriorityLabel: priorityLabel(duration, unit),
    };
  }
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT featuredCommissionRate, courierPriorityFee, courierPriorityDays,
            courierPriorityHours, courierPriorityUnit, courierPriorityDuration
     FROM ${qTable("Setting")} WHERE id = 'business'`
  )) as Array<{
    featuredCommissionRate?: number;
    courierPriorityFee?: number;
    courierPriorityDays?: number;
    courierPriorityHours?: number | null;
    courierPriorityUnit?: string | null;
    courierPriorityDuration?: number | null;
  }>;
  const row = rows[0] || {};
  const featured = Number(row.featuredCommissionRate);
  const fee = Number(row.courierPriorityFee);
  const legacyDays = Number(row.courierPriorityDays);
  const unit = parsePriorityUnit(row.courierPriorityUnit);
  let hours = Number(row.courierPriorityHours);
  if (!Number.isFinite(hours) || hours < 1) {
    // Migrasi dari kolom hari lama
    const days =
      Number.isFinite(legacyDays) && legacyDays > 0
        ? Math.round(legacyDays)
        : BUSINESS_RULES.COURIER_PRIORITY_DAYS_DEFAULT;
    hours = days * 24;
  }
  let duration = Number(row.courierPriorityDuration);
  if (!Number.isFinite(duration) || duration < 1) {
    duration = hoursToDisplay(hours, unit);
  }
  return {
    featuredCommissionRate: Number.isFinite(featured) && featured > 0
      ? featured
      : BUSINESS_RULES.FEATURED_COMMISSION_RATE,
    courierPriorityFee: Number.isFinite(fee) && fee >= 0
      ? Math.round(fee)
      : BUSINESS_RULES.COURIER_PRIORITY_FEE_DEFAULT,
    courierPriorityHours: Math.round(hours),
    courierPriorityDuration: Math.round(duration),
    courierPriorityUnit: unit,
    courierPriorityDays: Math.max(1, Math.ceil(hours / 24)),
    courierPriorityLabel: priorityLabel(duration, unit),
  };
}

export async function featuredMerchantIds() {
  await ensurePlacementColumns();
  if (isPostgres()) {
    const rows = await prisma.merchant.findMany({
      where: { isFeatured: true },
      select: { id: true },
    });
    return new Set(rows.map((r) => String(r.id)));
  }
  const featuredVal = isPostgres() ? "true" : "1";
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id FROM ${qTable("Merchant")} WHERE ${qCol("isFeatured")} = ${featuredVal}`
  )) as Array<{ id: string }>;
  return new Set(rows.map((r) => String(r.id)));
}

export async function isMerchantFeatured(merchantId: string) {
  const ids = await featuredMerchantIds();
  return ids.has(merchantId);
}

export async function merchantPlacement(merchantId: string) {
  const featured = await isMerchantFeatured(merchantId);
  const placement = await getPlacementSettings();
  const pricing = await prisma.setting.findUnique({ where: { id: "business" } });
  return {
    isFeatured: featured,
    commissionRate: featured
      ? placement.featuredCommissionRate
      : (pricing?.commissionRate ?? BUSINESS_RULES.COMMISSION_RATE),
  };
}

export async function setMerchantFeatured(merchantId: string, featured: boolean) {
  await ensurePlacementColumns();
  const settings = await getPlacementSettings();
  const pricing = await prisma.setting.findUnique({ where: { id: "business" } });
  const defaultRate = pricing?.commissionRate ?? BUSINESS_RULES.COMMISSION_RATE;
  const rate = featured ? settings.featuredCommissionRate : defaultRate;
  const now = new Date().toISOString();
  await prisma.merchant.update({
    where: { id: merchantId },
    data: isPostgres()
      ? {
          commissionRate: rate,
          isFeatured: featured,
          featuredAt: featured ? new Date(now) : null,
          featuredRequestAt: null,
          featuredRequestStatus: null,
        }
      : { commissionRate: rate },
  });
  if (!isPostgres()) {
  if (featured) {
    await prisma.$executeRawUnsafe(
      `UPDATE ${qTable("Merchant")} SET ${qCol("isFeatured")} = 1, ${qCol("featuredAt")} = '${now}',
       ${qCol("featuredRequestAt")} = NULL, ${qCol("featuredRequestStatus")} = NULL
       WHERE id = '${sqlStr(merchantId)}'`
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE ${qTable("Merchant")} SET ${qCol("isFeatured")} = 0, ${qCol("featuredAt")} = NULL,
       ${qCol("featuredRequestAt")} = NULL, ${qCol("featuredRequestStatus")} = NULL
       WHERE id = '${sqlStr(merchantId)}'`
    );
  }
  }
  return merchantPlacement(merchantId);
}

export async function merchantFeaturedRequest(merchantId: string) {
  await ensurePlacementColumns();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT featuredRequestAt, featuredRequestStatus
     FROM ${qTable("Merchant")} WHERE id = '${sqlStr(merchantId)}' LIMIT 1`
  )) as Array<{
    featuredRequestAt?: unknown;
    featuredRequestStatus?: string | null;
  }>;
  const row = rows[0];
  if (!row?.featuredRequestStatus) return null;
  return {
    status: String(row.featuredRequestStatus),
    requestedAt: iso(row.featuredRequestAt),
  };
}

export async function requestMerchantFeatured(merchantId: string) {
  await ensurePlacementColumns();
  if (await isMerchantFeatured(merchantId)) {
    throw new Error("Outlet sudah berstatus rekomendasi.");
  }
  const existing = await merchantFeaturedRequest(merchantId);
  if (existing?.status === "PENDING") {
    return existing;
  }
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `UPDATE ${qTable("Merchant")} SET featuredRequestAt = '${now}',
     featuredRequestStatus = 'PENDING'
     WHERE id = '${sqlStr(merchantId)}'`
  );
  return { status: "PENDING", requestedAt: now };
}

export async function clearMerchantFeaturedRequest(merchantId: string) {
  await ensurePlacementColumns();
  await prisma.$executeRawUnsafe(
    `UPDATE ${qTable("Merchant")} SET featuredRequestAt = NULL, featuredRequestStatus = NULL
     WHERE id = '${sqlStr(merchantId)}'`
  );
}

export async function merchantFeaturedRequestMap() {
  await ensurePlacementColumns();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, featuredRequestAt, featuredRequestStatus
     FROM ${qTable("Merchant")} WHERE featuredRequestStatus IS NOT NULL`
  )) as Array<{
    id: string;
    featuredRequestAt?: unknown;
    featuredRequestStatus?: string | null;
  }>;
  const map = new Map<
    string,
    { status: string; requestedAt: string | null }
  >();
  for (const row of rows) {
    if (!row.featuredRequestStatus) continue;
    map.set(String(row.id), {
      status: String(row.featuredRequestStatus),
      requestedAt: iso(row.featuredRequestAt),
    });
  }
  return map;
}

export async function courierPriorityUntil(courierId: string) {
  await ensurePlacementColumns();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT priorityUntil FROM ${qTable("Courier")} WHERE id = '${sqlStr(courierId)}' LIMIT 1`
  )) as Array<{ priorityUntil?: unknown }>;
  return iso(rows[0]?.priorityUntil);
}

export function isPriorityActive(until: string | null | undefined, now = new Date()) {
  if (!until) return false;
  const t = new Date(until).getTime();
  return Number.isFinite(t) && t > now.getTime();
}

export async function courierPriorityMap() {
  await ensurePlacementColumns();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, priorityUntil FROM ${qTable("Courier")}`
  )) as Array<{ id: string; priorityUntil?: unknown }>;
  const map = new Map<string, string | null>();
  for (const row of rows) map.set(String(row.id), iso(row.priorityUntil));
  return map;
}

/** Aktifkan prioritas. `hoursOrDays` dihitung sebagai jam jika < 24*30 dan
 *  caller mengirim jam; untuk kompatibilitas, argumen kedua default = jam.
 *  Prefer panggil dengan jam dari getPlacementSettings().courierPriorityHours. */
export async function setCourierPriority(courierId: string, hours: number) {
  await ensurePlacementColumns();
  const until = new Date();
  until.setTime(until.getTime() + Math.max(1, Math.round(hours)) * 60 * 60 * 1000);
  await prisma.$executeRawUnsafe(
    `UPDATE ${qTable("Courier")} SET priorityUntil = '${until.toISOString()}',
     priorityRequestAt = NULL, priorityRequestStatus = NULL,
     priorityRequestFee = NULL, priorityProofUrl = NULL
     WHERE id = '${sqlStr(courierId)}'`
  );
  return until.toISOString();
}

export async function clearCourierPriority(courierId: string) {
  await ensurePlacementColumns();
  await prisma.$executeRawUnsafe(
    `UPDATE ${qTable("Courier")} SET priorityUntil = NULL WHERE id = '${sqlStr(courierId)}'`
  );
}

export async function courierPriorityRequest(courierId: string) {
  await ensurePlacementColumns();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT priorityRequestAt, priorityRequestStatus, priorityRequestFee, priorityProofUrl
     FROM ${qTable("Courier")} WHERE id = '${sqlStr(courierId)}' LIMIT 1`
  )) as Array<{
    priorityRequestAt?: unknown;
    priorityRequestStatus?: string | null;
    priorityRequestFee?: number | null;
    priorityProofUrl?: string | null;
  }>;
  const row = rows[0];
  if (!row?.priorityRequestStatus) return null;
  return {
    status: String(row.priorityRequestStatus),
    requestedAt: iso(row.priorityRequestAt),
    fee: Number(row.priorityRequestFee) || 0,
    proofUrl: String(row.priorityProofUrl || "").trim() || null,
  };
}

export async function requestCourierPriority(
  courierId: string,
  proofUrl: string
) {
  await ensurePlacementColumns();
  const placement = await getPlacementSettings();
  const until = await courierPriorityUntil(courierId);
  if (isPriorityActive(until)) {
    throw new Error("Langganan prioritas masih aktif.");
  }
  const proof = String(proofUrl || "").trim();
  if (!proof) {
    throw new Error("Wajib lampirkan foto bukti transfer.");
  }
  const existing = await courierPriorityRequest(courierId);
  if (existing?.status === "PENDING") {
    await prisma.$executeRawUnsafe(
      `UPDATE ${qTable("Courier")} SET priorityProofUrl = '${sqlStr(proof)}'
       WHERE id = '${sqlStr(courierId)}'`
    );
    return { ...existing, proofUrl: proof };
  }
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `UPDATE ${qTable("Courier")} SET priorityRequestAt = '${now}',
     priorityRequestStatus = 'PENDING',
     priorityRequestFee = ${placement.courierPriorityFee},
     priorityProofUrl = '${sqlStr(proof)}'
     WHERE id = '${sqlStr(courierId)}'`
  );
  return {
    status: "PENDING",
    requestedAt: now,
    fee: placement.courierPriorityFee,
    proofUrl: proof,
  };
}

export async function clearCourierPriorityRequest(courierId: string) {
  await ensurePlacementColumns();
  await prisma.$executeRawUnsafe(
    `UPDATE ${qTable("Courier")} SET priorityRequestAt = NULL,
     priorityRequestStatus = NULL, priorityRequestFee = NULL,
     priorityProofUrl = NULL
     WHERE id = '${sqlStr(courierId)}'`
  );
}

export async function listPendingPriorityRequests() {
  await ensurePlacementColumns();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, priorityRequestAt, priorityRequestFee, priorityProofUrl
     FROM ${qTable("Courier")} WHERE priorityRequestStatus = 'PENDING'
     ORDER BY priorityRequestAt ASC`
  )) as Array<{
    id: string;
    priorityRequestAt?: unknown;
    priorityRequestFee?: number | null;
    priorityProofUrl?: string | null;
  }>;
  return rows.map((r) => ({
    courierId: String(r.id),
    requestedAt: iso(r.priorityRequestAt),
    fee: Number(r.priorityRequestFee) || 0,
    proofUrl: String(r.priorityProofUrl || "").trim() || null,
  }));
}

export async function courierPriorityRequestMap() {
  await ensurePlacementColumns();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, priorityRequestAt, priorityRequestStatus, priorityRequestFee, priorityProofUrl
     FROM ${qTable("Courier")} WHERE priorityRequestStatus IS NOT NULL`
  )) as Array<{
    id: string;
    priorityRequestAt?: unknown;
    priorityRequestStatus?: string | null;
    priorityRequestFee?: number | null;
    priorityProofUrl?: string | null;
  }>;
  const map = new Map<
    string,
    {
      status: string;
      requestedAt: string | null;
      fee: number;
      proofUrl: string | null;
    }
  >();
  for (const row of rows) {
    if (!row.priorityRequestStatus) continue;
    map.set(String(row.id), {
      status: String(row.priorityRequestStatus),
      requestedAt: iso(row.priorityRequestAt),
      fee: Number(row.priorityRequestFee) || 0,
      proofUrl: String(row.priorityProofUrl || "").trim() || null,
    });
  }
  return map;
}

/** Pastikan tabel ledger pendapatan langganan prioritas ada. */
export async function ensurePriorityPaymentTable() {
  if (isPostgres()) return;
  await ensurePlacementColumns();
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS CourierPriorityPayment (
        id TEXT PRIMARY KEY NOT NULL,
        courierId TEXT NOT NULL,
        fee INTEGER NOT NULL,
        hours INTEGER NOT NULL,
        proofUrl TEXT,
        approvedAt DATETIME NOT NULL,
        priorityUntil DATETIME
      )
    `);
  } catch {
    /* ignore */
  }
}

export async function recordCourierPriorityPayment(input: {
  courierId: string;
  fee: number;
  hours: number;
  proofUrl?: string | null;
  priorityUntil: string;
}) {
  await ensurePriorityPaymentTable();
  const { newId } = await import("./auth");
  const id = newId("PP");
  const fee = Math.max(0, Math.round(input.fee));
  const hours = Math.max(1, Math.round(input.hours));
  const proof = String(input.proofUrl || "").trim();
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `INSERT INTO CourierPriorityPayment
     (id, courierId, fee, hours, proofUrl, approvedAt, priorityUntil)
     VALUES (
       '${sqlStr(id)}',
       '${sqlStr(input.courierId)}',
       ${fee},
       ${hours},
       ${proof ? `'${sqlStr(proof)}'` : "NULL"},
       '${now}',
       '${sqlStr(input.priorityUntil)}'
     )`
  );
  return { id, fee, hours, approvedAt: now, priorityUntil: input.priorityUntil };
}

export async function priorityRevenueSummary() {
  await ensurePriorityPaymentTable();
  if (isPostgres()) {
    const [agg, recent] = await Promise.all([
      prisma.courierPriorityPayment.aggregate({
        _count: { _all: true },
        _sum: { fee: true },
      }),
      prisma.courierPriorityPayment.findMany({
        take: 20,
        orderBy: { approvedAt: "desc" },
        include: {
          courier: { select: { fullName: true, phone: true } },
        },
      }),
    ]);
    return {
      priorityRevenueTotal: Math.round(Number(agg._sum.fee) || 0),
      priorityRevenueCount: agg._count._all,
      recentPriorityPayments: recent.map((r) => ({
        id: String(r.id),
        courierId: String(r.courierId),
        courierName: String(r.courier.fullName || "Kurir"),
        courierPhone: String(r.courier.phone || ""),
        fee: Math.round(Number(r.fee) || 0),
        hours: Math.round(Number(r.hours) || 0),
        proofUrl: String(r.proofUrl || "").trim() || null,
        approvedAt: iso(r.approvedAt),
        priorityUntil: iso(r.priorityUntil),
      })),
    };
  }
  const agg = (await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt, ${sqlIfNull("SUM(fee)", 0)} AS total
     FROM ${qTable("CourierPriorityPayment")}`
  )) as Array<{ cnt?: number; total?: number }>;
  const recent = (await prisma.$queryRawUnsafe(
    `SELECT p.id, p.courierId, p.fee, p.hours, p.proofUrl, p.approvedAt, p.priorityUntil,
            c.fullName AS courierName, c.phone AS courierPhone
     FROM ${qTable("CourierPriorityPayment")} p
     LEFT JOIN ${qTable("Courier")} c ON c.id = p.courierId
     ORDER BY p.approvedAt DESC
     LIMIT 20`
  )) as Array<{
    id: string;
    courierId: string;
    fee: number;
    hours: number;
    proofUrl?: string | null;
    approvedAt: unknown;
    priorityUntil?: unknown;
    courierName?: string | null;
    courierPhone?: string | null;
  }>;
  return {
    priorityRevenueTotal: Math.round(Number(agg[0]?.total) || 0),
    priorityRevenueCount: Math.round(Number(agg[0]?.cnt) || 0),
    recentPriorityPayments: recent.map((r) => ({
      id: String(r.id),
      courierId: String(r.courierId),
      courierName: String(r.courierName || "Kurir"),
      courierPhone: String(r.courierPhone || ""),
      fee: Math.round(Number(r.fee) || 0),
      hours: Math.round(Number(r.hours) || 0),
      proofUrl: String(r.proofUrl || "").trim() || null,
      approvedAt: iso(r.approvedAt),
      priorityUntil: iso(r.priorityUntil),
    })),
  };
}
