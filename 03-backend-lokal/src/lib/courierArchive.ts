import fs from "fs";
import path from "path";
import { prisma } from "../db";
import { newId } from "./auth";
import { readKtpFile, uploadsRoot } from "./uploadImage";
import { ensureCourierKtpProfileColumns } from "./courierKtpProfile";

function safeId(id: string) {
  return String(id || "").replace(/[^A-Za-z0-9_-]/g, "");
}

export async function ensureCourierArchive() {
  await ensureCourierKtpProfileColumns();
  const alters = [
    `ALTER TABLE Courier ADD COLUMN ktpPhotoUrl TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE Courier ADD COLUMN ktpPhotoData TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE Courier ADD COLUMN approvedAt DATETIME`,
    `ALTER TABLE Courier ADD COLUMN approvedBy TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE Courier ADD COLUMN rejectReason TEXT NOT NULL DEFAULT ''`,
  ];
  for (const sql of alters) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      /* column already exists */
    }
  }
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS CourierIncident (
      id TEXT PRIMARY KEY,
      courierId TEXT NOT NULL,
      title TEXT NOT NULL,
      note TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      createdBy TEXT NOT NULL
    )
  `);
}

export async function setCourierKtpPhoto(
  courierId: string,
  ktpPhotoUrl: string,
  _dataUrl = ""
) {
  const id = safeId(courierId);
  const url = String(ktpPhotoUrl || "").replace(/'/g, "");
  await prisma.$executeRawUnsafe(
    `UPDATE Courier SET ktpPhotoUrl = '${url}' WHERE id = '${id}'`
  );
}

export async function ktpPhotoMap() {
  let rows: Array<{ id: string; ktpPhotoUrl?: string | null; ktpPhotoData?: string | null }> = [];
  try {
    rows = (await prisma.$queryRawUnsafe(
      `SELECT id, ktpPhotoUrl, ktpPhotoData FROM Courier`
    )) as typeof rows;
  } catch {
    rows = (await prisma.$queryRawUnsafe(
      `SELECT id, ktpPhotoUrl FROM Courier`
    )) as typeof rows;
  }
  const map: Record<string, string> = {};
  const dir = path.join(uploadsRoot(), "ktp");
  for (const row of rows) {
    let url = String(row.ktpPhotoUrl || "");
    if (!url && row.ktpPhotoData && String(row.ktpPhotoData).startsWith("data:image")) {
      url = String(row.ktpPhotoData);
    }
    if (!url && fs.existsSync(dir)) {
      const found = ["jpg", "jpeg", "png", "webp", "gif"]
        .map((ext) => `${row.id}.${ext}`)
        .find((file) => fs.existsSync(path.join(dir, file)));
      if (found) url = `/uploads/ktp/${found}`;
    }
    map[row.id] = url;
  }
  return map;
}

export function publicKtpUrl(courierId: string, stored = "") {
  if (stored.startsWith("data:image") || stored.startsWith("http") || stored.startsWith("/uploads/")) {
    return stored;
  }
  const buf = readKtpFile(courierId);
  if (buf) return `/uploads/ktp/${courierId}.jpg`;
  return stored;
}

export async function getCourierArchive(courierId: string) {
  const id = safeId(courierId);
  let row: {
    id: string;
    ktpPhotoUrl: string | null;
    ktpPhotoData?: string | null;
    approvedAt: Date | string | null;
    approvedBy: string | null;
    rejectReason: string | null;
  } | undefined;
  try {
    row = (
      (await prisma.$queryRawUnsafe(
        `SELECT id, ktpPhotoUrl, ktpPhotoData, approvedAt, approvedBy, rejectReason FROM Courier WHERE id = '${id}'`
      )) as Array<typeof row>
    )[0];
  } catch {
    row = (
      (await prisma.$queryRawUnsafe(
        `SELECT id, ktpPhotoUrl FROM Courier WHERE id = '${id}'`
      )) as Array<typeof row>
    )[0];
  }
  let ktpPhotoUrl = String(row?.ktpPhotoUrl || "");
  if (!ktpPhotoUrl && row?.ktpPhotoData) ktpPhotoUrl = String(row.ktpPhotoData);
  if (!ktpPhotoUrl) {
    const dir = path.join(uploadsRoot(), "ktp");
    const found = ["jpg", "jpeg", "png", "webp", "gif"]
      .map((ext) => `${courierId}.${ext}`)
      .find((file) => fs.existsSync(path.join(dir, file)));
    if (found) ktpPhotoUrl = `/uploads/ktp/${found}`;
  }
  let incidents: Array<{
    id: string;
    courierId: string;
    title: string;
    note: string;
    createdAt: Date | string;
    createdBy: string;
  }> = [];
  try {
    incidents = (await prisma.$queryRawUnsafe(
      `SELECT id, courierId, title, note, createdAt, createdBy FROM CourierIncident WHERE courierId = '${id}' ORDER BY createdAt DESC`
    )) as typeof incidents;
  } catch {
    incidents = [];
  }
  return {
    ktpPhotoUrl,
    approvedAt: row?.approvedAt ?? null,
    approvedBy: String(row?.approvedBy || ""),
    rejectReason: String(row?.rejectReason || ""),
    incidents,
  };
}

export async function markCourierDecision(
  courierId: string,
  action: "APPROVED" | "REJECTED" | "SUSPENDED",
  adminName: string,
  reason = ""
) {
  const id = safeId(courierId);
  const by = String(adminName || "admin").replace(/'/g, "");
  const why = String(reason || "").replace(/'/g, "");
  const now = new Date().toISOString();
  if (action === "APPROVED") {
    await prisma.$executeRawUnsafe(
      `UPDATE Courier SET approvalStatus = 'APPROVED', isOnline = 0 WHERE id = '${id}'`
    );
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE Courier SET approvedAt = '${now}', approvedBy = '${by}', rejectReason = '' WHERE id = '${id}'`
      );
    } catch {
      /* extra columns may not exist yet */
    }
  } else if (action === "REJECTED") {
    await prisma.$executeRawUnsafe(
      `UPDATE Courier SET approvalStatus = 'REJECTED', isOnline = 0 WHERE id = '${id}'`
    );
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE Courier SET rejectReason = '${why}' WHERE id = '${id}'`
      );
    } catch {
      /* optional */
    }
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE Courier SET approvalStatus = 'SUSPENDED', isOnline = 0 WHERE id = '${id}'`
    );
  }
}

export async function addCourierIncident(
  courierId: string,
  title: string,
  note: string,
  createdBy: string
) {
  const id = newId("INC");
  const cid = safeId(courierId);
  const t = String(title || "").replace(/'/g, " ");
  const n = String(note || "").replace(/'/g, " ");
  const by = String(createdBy || "admin").replace(/'/g, " ");
  await prisma.$executeRawUnsafe(
    `INSERT INTO CourierIncident (id, courierId, title, note, createdAt, createdBy) VALUES ('${id}', '${cid}', '${t}', '${n}', '${new Date().toISOString()}', '${by}')`
  );
  return id;
}
