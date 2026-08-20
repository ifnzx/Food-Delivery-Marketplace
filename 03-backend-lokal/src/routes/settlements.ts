import { Router } from "express";
import { prisma } from "../db";
import { newId } from "../lib/auth";
import { fail, param, type AuthedRequest } from "../lib/http";
import { auth, requireRole } from "../middleware/auth";
import { merchantIdFor } from "../services/orderHelpers";
import { BUSINESS_RULES } from "../../../02-aturan-bisnis/businessRules";
import {
  commissionRowsInPeriod,
  enforceMerchantBilling,
  groupCommissionBuckets,
  mixNote,
  unpaidCommissionRows,
} from "../services/merchantBilling";

export const settlementRouter = Router();

function isImageProof(value: string) {
  return (
    value.startsWith("data:image/") ||
    /^https?:\/\//i.test(value) ||
    value.startsWith("/uploads/")
  );
}

settlementRouter.get("/settlements", auth, async (req: AuthedRequest, res) => {
  if (req.user!.role === "MERCHANT") {
    const merchantId = await merchantIdFor(req);
    await enforceMerchantBilling(merchantId);
  } else if (req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN") {
    await enforceMerchantBilling();
  }

  const where =
    req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN"
      ? {}
      : { merchant: { userId: req.user!.id } };
  const rows = await prisma.merchantSettlement.findMany({
    where,
    include: { merchant: true },
    orderBy: { createdAt: "desc" },
  });
  const withMix = await Promise.all(
    rows.map(async (row) => {
      const periodRows = await commissionRowsInPeriod(
        row.merchantId,
        row.periodStart,
        row.periodEnd
      );
      const rates = groupCommissionBuckets(periodRows);
      return {
        ...row,
        rates,
        rateNote: mixNote(rates),
      };
    })
  );
  res.json(withMix);
});

settlementRouter.post(
  "/settlements",
  auth,
  requireRole("MERCHANT", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const merchantId = await merchantIdFor(req);
    await enforceMerchantBilling(merchantId);
    const current = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!current) {
      fail(res, 404, "Outlet tidak ditemukan");
      return;
    }
    const settings = await prisma.setting.findUnique({ where: { id: "business" } });
    const minimum =
      settings?.minimumSettlement ?? BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT;
    if (current.outstandingAmount < minimum) {
      fail(
        res,
        400,
        `Tagihan ${current.outstandingAmount} masih di bawah minimum ${minimum}`
      );
      return;
    }
    const now = new Date();
    const periodStart =
      current.outstandingSince ??
      new Date(
        now.getTime() -
          BUSINESS_RULES.SETTLEMENT_CALENDAR_DAYS * 24 * 60 * 60 * 1000
      );
    const role = req.user!.role;
    const rawProof = String(req.body?.proofUrl ?? "").trim();
    if (role === "MERCHANT") {
      if (!isImageProof(rawProof)) {
        fail(
          res,
          400,
          "Wajib unggah foto bukti transfer agar Super Admin bisa mencocokkan dengan mutasi rekening."
        );
        return;
      }
    }
    const proofUrl =
      role === "MERCHANT"
        ? rawProof
        : isImageProof(rawProof)
          ? rawProof
          : "local://verifikasi-super-admin";
    const unpaid = await unpaidCommissionRows(merchantId);
    const rates = groupCommissionBuckets(unpaid);
    const totalSales = unpaid.reduce((s, r) => s + r.subtotal, 0);
    const weightedRate =
      totalSales > 0
        ? unpaid.reduce((s, r) => s + r.commissionAmount, 0) / totalSales
        : rates[0]?.rate ?? 0.15;
    const created = await prisma.merchantSettlement.create({
      data: {
        id: newId("STL"),
        merchantId,
        periodStart,
        periodEnd: now,
        totalSales,
        commissionRate: weightedRate,
        commissionAmount: current.outstandingAmount,
        paidAmount: current.outstandingAmount,
        remainingAmount: 0,
        proofUrl,
        status: "PENDING",
      },
    });
    res.status(201).json({
      ...created,
      rates,
      rateNote: mixNote(rates),
    });
  }
);

settlementRouter.post(
  "/settlements/:id/verify",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res) => {
    const settlement = await prisma.merchantSettlement.findUnique({
      where: { id: param(req, "id") },
    });
    if (!settlement) {
      fail(res, 404, "Settlement tidak ditemukan");
      return;
    }
    const approved = Boolean(req.body?.approve ?? true);
    await prisma.$transaction(async (tx) => {
      await tx.merchantSettlement.update({
        where: { id: settlement.id },
        data: {
          status: approved ? "VERIFIED" : "REJECTED",
          verifiedAt: new Date(),
          verifiedBy: req.user!.id,
        },
      });
      if (approved) {
        const merchant = await tx.merchant.findUnique({
          where: { id: settlement.merchantId },
        });
        const nextOutstanding = Math.max(
          0,
          (merchant?.outstandingAmount ?? 0) - settlement.paidAmount
        );
        await tx.merchant.update({
          where: { id: settlement.merchantId },
          data: {
            outstandingAmount: nextOutstanding,
            status: "ACTIVE",
            suspensionState: null,
            outstandingSince: nextOutstanding > 0 ? new Date() : null,
            isOpen: nextOutstanding > 0 ? merchant?.isOpen ?? false : true,
          },
        });
      }
    });
    res.json(
      await prisma.merchantSettlement.findUnique({ where: { id: settlement.id } })
    );
  }
);
