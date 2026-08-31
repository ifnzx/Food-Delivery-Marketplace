import { prisma } from "../../db";
import { isPostgres } from "../../lib/dbDialect";

/** Pastikan kolom payment gateway ada di SQLite lama tanpa wajib reset. */
export async function ensurePaymentSchema() {
  if (isPostgres()) return;
  const alters = [
    `ALTER TABLE "Order" ADD COLUMN paidAt DATETIME`,
    `ALTER TABLE Payment ADD COLUMN channel TEXT NOT NULL DEFAULT 'CASH_ON_DELIVERY'`,
    `ALTER TABLE Payment ADD COLUMN provider TEXT NOT NULL DEFAULT 'NONE'`,
    `ALTER TABLE Payment ADD COLUMN providerRef TEXT`,
    `ALTER TABLE Payment ADD COLUMN idempotencyKey TEXT`,
    `ALTER TABLE Payment ADD COLUMN currency TEXT NOT NULL DEFAULT 'IDR'`,
    `ALTER TABLE Payment ADD COLUMN checkoutUrl TEXT`,
    `ALTER TABLE Payment ADD COLUMN failureReason TEXT`,
    `ALTER TABLE Payment ADD COLUMN rawPayload TEXT`,
    `ALTER TABLE Payment ADD COLUMN paidAt DATETIME`,
    `ALTER TABLE Payment ADD COLUMN failedAt DATETIME`,
    `ALTER TABLE Payment ADD COLUMN expiresAt DATETIME`,
    `ALTER TABLE Payment ADD COLUMN updatedAt DATETIME`,
    `ALTER TABLE Setting ADD COLUMN onlinePaymentsEnabled INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE Setting ADD COLUMN paymentProvider TEXT NOT NULL DEFAULT 'NONE'`,
  ];
  for (const sql of alters) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      /* already exists */
    }
  }
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE Payment SET updatedAt = COALESCE(updatedAt, createdAt, CURRENT_TIMESTAMP) WHERE updatedAt IS NULL`
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS Payment_idempotencyKey_key ON Payment(idempotencyKey)`
    );
  } catch {
    /* ignore */
  }
}
