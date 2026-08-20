import { prisma } from "../db";

export type CourierKtpProfile = {
  nik: string;
  placeOfBirth: string;
  dateOfBirth: string;
  addressOnKtp: string;
  fullNameFromOcr: string;
  ocrConfidence: number;
  ocrParsedAt: string | null;
  mismatchFlags: string[];
};

function safeId(id: string) {
  return String(id || "").replace(/[^A-Za-z0-9_-]/g, "");
}

function sqlStr(value: string) {
  return String(value || "").replace(/'/g, "''");
}

export async function ensureCourierKtpProfileColumns() {
  const alters = [
    `ALTER TABLE Courier ADD COLUMN nik TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE Courier ADD COLUMN placeOfBirth TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE Courier ADD COLUMN dateOfBirth TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE Courier ADD COLUMN addressOnKtp TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE Courier ADD COLUMN fullNameFromOcr TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE Courier ADD COLUMN ocrConfidence REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE Courier ADD COLUMN ocrParsedAt DATETIME`,
    `ALTER TABLE Courier ADD COLUMN mismatchFlags TEXT NOT NULL DEFAULT '[]'`,
  ];
  for (const sql of alters) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      /* column exists */
    }
  }
}

function parseMismatchFlags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(String(raw || "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function rowToKtpProfile(row: Record<string, unknown> | undefined): CourierKtpProfile {
  return {
    nik: String(row?.nik || ""),
    placeOfBirth: String(row?.placeOfBirth || ""),
    dateOfBirth: String(row?.dateOfBirth || ""),
    addressOnKtp: String(row?.addressOnKtp || ""),
    fullNameFromOcr: String(row?.fullNameFromOcr || ""),
    ocrConfidence: Number(row?.ocrConfidence || 0),
    ocrParsedAt: row?.ocrParsedAt ? String(row.ocrParsedAt) : null,
    mismatchFlags: parseMismatchFlags(row?.mismatchFlags),
  };
}

export async function setCourierKtpProfile(
  courierId: string,
  profile: Partial<CourierKtpProfile> & { mismatchFlags?: string[] }
) {
  await ensureCourierKtpProfileColumns();
  const id = safeId(courierId);
  const flags = JSON.stringify(profile.mismatchFlags || []).replace(/'/g, "''");
  await prisma.$executeRawUnsafe(`
    UPDATE Courier SET
      nik = '${sqlStr(profile.nik || "")}',
      placeOfBirth = '${sqlStr(profile.placeOfBirth || "")}',
      dateOfBirth = '${sqlStr(profile.dateOfBirth || "")}',
      addressOnKtp = '${sqlStr(profile.addressOnKtp || "")}',
      fullNameFromOcr = '${sqlStr(profile.fullNameFromOcr || "")}',
      ocrConfidence = ${Number(profile.ocrConfidence || 0)},
      ocrParsedAt = '${new Date().toISOString()}',
      mismatchFlags = '${flags}'
    WHERE id = '${id}'
  `);
}

export async function getCourierKtpProfile(courierId: string): Promise<CourierKtpProfile> {
  await ensureCourierKtpProfileColumns();
  const id = safeId(courierId);
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT nik, placeOfBirth, dateOfBirth, addressOnKtp, fullNameFromOcr, ocrConfidence, ocrParsedAt, mismatchFlags FROM Courier WHERE id = '${id}'`
  )) as Array<Record<string, unknown>>;
  return rowToKtpProfile(rows[0]);
}

export async function ktpProfileMap() {
  await ensureCourierKtpProfileColumns();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, nik, placeOfBirth, dateOfBirth, addressOnKtp, fullNameFromOcr, ocrConfidence, ocrParsedAt, mismatchFlags FROM Courier`
  )) as Array<Record<string, unknown>>;
  const map: Record<string, CourierKtpProfile> = {};
  for (const row of rows) {
    map[String(row.id)] = rowToKtpProfile(row);
  }
  return map;
}
