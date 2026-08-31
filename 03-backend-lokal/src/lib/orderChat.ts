import { prisma } from "../db";
import { newId } from "./auth";
import { isPostgres, qTable, sqlOrderAsc } from "./dbDialect";

function safeId(id: string) {
  return String(id || "").replace(/[^A-Za-z0-9_-]/g, "");
}

export async function ensureOrderChat() {
  if (isPostgres()) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS OrderChatMessage (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      senderRole TEXT NOT NULL,
      senderName TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS OrderChatMessage_orderId_idx ON OrderChatMessage(orderId)`
    );
  } catch {
    /* index exists */
  }
}

export type ChatRow = {
  id: string;
  orderId: string;
  senderRole: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export async function listOrderChat(orderId: string): Promise<ChatRow[]> {
  const id = safeId(orderId);
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, orderId, senderRole, senderName, body, createdAt
     FROM ${qTable("OrderChatMessage")} WHERE orderId = '${id}'
     ORDER BY ${sqlOrderAsc("createdAt")}, id ASC`
  )) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    orderId: String(row.orderId),
    senderRole: String(row.senderRole),
    senderName: String(row.senderName),
    body: String(row.body),
    createdAt: row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : String(row.createdAt || ""),
  }));
}

const IMAGE_PREFIX = "IMG:";
const IMAGE_BODY = /^IMG:data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

export async function sendOrderChat(input: {
  orderId: string;
  senderRole: string;
  senderName: string;
  body: string;
}): Promise<ChatRow> {
  const raw = String(input.body || "").trim();
  const isImage = raw.startsWith(IMAGE_PREFIX);
  const body = isImage ? raw.slice(0, 1_200_000) : raw.slice(0, 500);
  if (!body) throw new Error("Pesan tidak boleh kosong");
  if (isImage && !IMAGE_BODY.test(body)) throw new Error("Foto tidak valid");
  const row: ChatRow = {
    id: newId("MSG"),
    orderId: input.orderId,
    senderRole: input.senderRole,
    senderName: input.senderName || (input.senderRole === "COURIER" ? "Kurir" : "Pelanggan"),
    body,
    createdAt: new Date().toISOString(),
  };
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${qTable("OrderChatMessage")} (id, orderId, senderRole, senderName, body, createdAt)
     VALUES ('${row.id.replace(/'/g, "''")}', '${row.orderId.replace(/'/g, "''")}', '${row.senderRole.replace(/'/g, "''")}', '${row.senderName.replace(/'/g, "''")}', '${row.body.replace(/'/g, "''")}', '${row.createdAt}')`
  );
  return row;
}
