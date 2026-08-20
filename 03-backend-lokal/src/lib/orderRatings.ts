import { prisma } from "../db";
import { newId } from "./auth";

function safeId(id: string) {
  return String(id || "").replace(/[^A-Za-z0-9_-]/g, "");
}

function sqlStr(value: string) {
  return String(value || "").replace(/'/g, "''");
}

export type OrderRatingRow = {
  id: string;
  orderId: string;
  customerId: string;
  merchantId: string;
  courierId: string | null;
  merchantScore: number;
  courierScore: number;
  comment: string | null;
  createdAt: string;
};

function mapRow(row: Record<string, unknown>): OrderRatingRow {
  const iso = (v: unknown) =>
    v instanceof Date ? v.toISOString() : v ? String(v) : null;
  return {
    id: String(row.id),
    orderId: String(row.orderId),
    customerId: String(row.customerId),
    merchantId: String(row.merchantId),
    courierId: row.courierId ? String(row.courierId) : null,
    merchantScore: Number(row.merchantScore),
    courierScore: Number(row.courierScore),
    comment: row.comment ? String(row.comment) : null,
    createdAt: iso(row.createdAt) || new Date().toISOString(),
  };
}

export async function ensureOrderRatings() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS OrderRating (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL UNIQUE,
      customerId TEXT NOT NULL,
      merchantId TEXT NOT NULL,
      courierId TEXT,
      merchantScore INTEGER NOT NULL,
      courierScore INTEGER NOT NULL,
      comment TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS OrderRating_merchantId_idx ON OrderRating(merchantId)`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS OrderRating_courierId_idx ON OrderRating(courierId)`
    );
  } catch {
    /* index exists */
  }
}

export async function getOrderRating(orderId: string) {
  const oid = safeId(orderId);
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM OrderRating WHERE orderId = '${oid}' LIMIT 1`
  )) as Array<Record<string, unknown>>;
  return rows[0] ? mapRow(rows[0]) : null;
}

function clampScore(value: unknown) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    throw new Error("Rating harus 1–5 bintang");
  }
  return n;
}

export async function submitOrderRating(input: {
  orderId: string;
  customerId: string;
  merchantId: string;
  courierId?: string | null;
  merchantScore: unknown;
  courierScore: unknown;
  comment?: string;
}) {
  const existing = await getOrderRating(input.orderId);
  if (existing) {
    throw new Error("Pesanan ini sudah diberi rating");
  }

  const merchantScore = clampScore(input.merchantScore);
  const courierScore = clampScore(input.courierScore);
  const comment = String(input.comment ?? "").trim();
  const id = newId("RT");
  const now = new Date().toISOString();
  const courierId = input.courierId ? safeId(input.courierId) : "";

  await prisma.$executeRawUnsafe(
    `INSERT INTO OrderRating (
      id, orderId, customerId, merchantId, courierId,
      merchantScore, courierScore, comment, createdAt
    ) VALUES (
      '${sqlStr(id)}', '${sqlStr(safeId(input.orderId))}', '${sqlStr(safeId(input.customerId))}',
      '${sqlStr(safeId(input.merchantId))}',
      ${courierId ? `'${sqlStr(courierId)}'` : "NULL"},
      ${merchantScore}, ${courierScore},
      ${comment ? `'${sqlStr(comment)}'` : "NULL"},
      '${now}'
    )`
  );

  return getOrderRating(input.orderId);
}
