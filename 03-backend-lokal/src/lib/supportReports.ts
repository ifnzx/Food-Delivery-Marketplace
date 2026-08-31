import { prisma } from "../db";
import { newId } from "./auth";
import { isPostgres, qTable, sqlOrderDesc } from "./dbDialect";

function safeId(id: string) {
  return String(id || "").replace(/[^A-Za-z0-9_-]/g, "");
}

function sqlStr(value: string) {
  return String(value || "").replace(/'/g, "''");
}

export const SUPPORT_CATEGORIES = [
  "ORDER",
  "PAYMENT",
  "ACCOUNT",
  "APP",
  "OTHER",
] as const;

export const SUPPORT_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;

export type SupportReportRow = {
  id: string;
  reporterUserId: string;
  reporterRole: string;
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string;
  category: string;
  subject: string;
  body: string;
  orderId: string | null;
  status: string;
  adminNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: Record<string, unknown>): SupportReportRow {
  const iso = (v: unknown) =>
    v instanceof Date ? v.toISOString() : v ? String(v) : null;
  return {
    id: String(row.id),
    reporterUserId: String(row.reporterUserId),
    reporterRole: String(row.reporterRole),
    reporterName: String(row.reporterName || ""),
    reporterPhone: String(row.reporterPhone || ""),
    reporterEmail: String(row.reporterEmail || ""),
    category: String(row.category || "OTHER"),
    subject: String(row.subject || ""),
    body: String(row.body || ""),
    orderId: row.orderId ? String(row.orderId) : null,
    status: String(row.status || "OPEN"),
    adminNote: row.adminNote ? String(row.adminNote) : null,
    resolvedBy: row.resolvedBy ? String(row.resolvedBy) : null,
    resolvedAt: iso(row.resolvedAt),
    createdAt: iso(row.createdAt) || new Date().toISOString(),
    updatedAt: iso(row.updatedAt) || new Date().toISOString(),
  };
}

export async function ensureSupportReports() {
  if (isPostgres()) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS SupportReport (
      id TEXT PRIMARY KEY,
      reporterUserId TEXT NOT NULL,
      reporterRole TEXT NOT NULL,
      reporterName TEXT NOT NULL DEFAULT '',
      reporterPhone TEXT NOT NULL DEFAULT '',
      reporterEmail TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'OTHER',
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      orderId TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      adminNote TEXT,
      resolvedBy TEXT,
      resolvedAt DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS SupportReport_status_idx ON SupportReport(status)`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS SupportReport_reporterUserId_idx ON SupportReport(reporterUserId)`
    );
  } catch {
    /* index exists */
  }
}

export async function countOpenSupportReports() {
  if (isPostgres()) {
    return prisma.supportReport.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    });
  }
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM ${qTable("SupportReport")} WHERE status IN ('OPEN', 'IN_PROGRESS')`
  )) as Array<{ c: number | bigint }>;
  const raw = rows[0]?.c ?? 0;
  return typeof raw === "bigint" ? Number(raw) : Number(raw);
}

export async function createSupportReport(input: {
  reporterUserId: string;
  reporterRole: string;
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string;
  category: string;
  subject: string;
  body: string;
  orderId?: string | null;
}) {
  const id = newId("SR");
  const now = new Date().toISOString();
  const category = SUPPORT_CATEGORIES.includes(
    input.category as (typeof SUPPORT_CATEGORIES)[number]
  )
    ? input.category
    : "OTHER";
  const orderId = input.orderId ? safeId(input.orderId) : "";
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${qTable("SupportReport")} (
      id, reporterUserId, reporterRole, reporterName, reporterPhone, reporterEmail,
      category, subject, body, orderId, status, createdAt, updatedAt
    ) VALUES (
      '${sqlStr(id)}', '${sqlStr(input.reporterUserId)}', '${sqlStr(input.reporterRole)}',
      '${sqlStr(input.reporterName)}', '${sqlStr(input.reporterPhone)}', '${sqlStr(input.reporterEmail)}',
      '${sqlStr(category)}', '${sqlStr(input.subject)}', '${sqlStr(input.body)}',
      ${orderId ? `'${sqlStr(orderId)}'` : "NULL"},
      'OPEN', '${now}', '${now}'
    )`
  );
  return getSupportReportById(id);
}

export async function listSupportReportsForUser(userId: string) {
  const uid = safeId(userId);
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM ${qTable("SupportReport")} WHERE reporterUserId = '${uid}'
     ORDER BY ${sqlOrderDesc("createdAt")}, id DESC`
  )) as Array<Record<string, unknown>>;
  return rows.map(mapRow);
}

export async function getSupportReportById(id: string) {
  const rid = safeId(id);
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM ${qTable("SupportReport")} WHERE id = '${rid}' LIMIT 1`
  )) as Array<Record<string, unknown>>;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listSupportReportsAdmin(filters?: {
  status?: string;
  role?: string;
  q?: string;
}) {
  const clauses: string[] = [];
  const status = String(filters?.status || "").toUpperCase();
  const role = String(filters?.role || "").toUpperCase();
  const q = String(filters?.q || "").trim().toLowerCase();

  if (status && SUPPORT_STATUSES.includes(status as (typeof SUPPORT_STATUSES)[number])) {
    clauses.push(`status = '${sqlStr(status)}'`);
  }
  if (role && ["CUSTOMER", "COURIER", "MERCHANT"].includes(role)) {
    clauses.push(`reporterRole = '${sqlStr(role)}'`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM ${qTable("SupportReport")} ${where}
     ORDER BY ${sqlOrderDesc("createdAt")}, id DESC`
  )) as Array<Record<string, unknown>>;
  let list = rows.map(mapRow);
  if (q) {
    list = list.filter((row) => {
      const hay = `${row.id} ${row.subject} ${row.body} ${row.reporterName} ${row.reporterEmail} ${row.reporterPhone} ${row.orderId || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }
  return list;
}

export async function updateSupportReportAdmin(
  id: string,
  input: { status?: string; adminNote?: string; resolvedBy?: string }
) {
  const existing = await getSupportReportById(id);
  if (!existing) return null;

  const status = input.status
    ? String(input.status).toUpperCase()
    : existing.status;
  if (!SUPPORT_STATUSES.includes(status as (typeof SUPPORT_STATUSES)[number])) {
    throw new Error("Status laporan tidak valid");
  }

  const adminNote =
    input.adminNote !== undefined ? String(input.adminNote) : existing.adminNote || "";
  const now = new Date().toISOString();
  const resolvedBy =
    status === "RESOLVED" || status === "CLOSED"
      ? input.resolvedBy || existing.resolvedBy || ""
      : "";
  const resolvedAt =
    status === "RESOLVED" || status === "CLOSED"
      ? existing.resolvedAt || now
      : null;

  await prisma.$executeRawUnsafe(
    `UPDATE ${qTable("SupportReport")} SET
      status = '${sqlStr(status)}',
      adminNote = ${adminNote ? `'${sqlStr(adminNote)}'` : "NULL"},
      resolvedBy = ${resolvedBy ? `'${sqlStr(resolvedBy)}'` : "NULL"},
      resolvedAt = ${resolvedAt ? `'${resolvedAt}'` : "NULL"},
      updatedAt = '${now}'
     WHERE id = '${sqlStr(safeId(id))}'`
  );
  return getSupportReportById(id);
}
