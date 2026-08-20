import { Router } from "express";
import { prisma } from "../db";
import { normalizeMenuCategory } from "../lib/menuCategories";
import { saveMenuImage } from "../lib/menuImage";
import { saveUploadedImage } from "../lib/uploadImage";
import { newId } from "../lib/auth";
import { fail, param, type AuthedRequest } from "../lib/http";
import { auth, requireRole } from "../middleware/auth";
import { merchantIdFor } from "../services/orderHelpers";
import { BUSINESS_RULES } from "../../../02-aturan-bisnis/businessRules";
import { featuredMerchantIds, merchantPlacement, merchantFeaturedRequest, requestMerchantFeatured, getPlacementSettings } from "../lib/placement";
import {
  enforceMerchantBilling,
  getMerchantBilling,
  groupCommissionBuckets,
  mixNote,
  publicBilling,
  unpaidCommissionRows,
} from "../services/merchantBilling";

export const merchantRouter = Router();

merchantRouter.get("/merchants", async (_req, res) => {
  await enforceMerchantBilling();
  const featured = await featuredMerchantIds();
  const merchants = await prisma.merchant.findMany({
    where: { status: "ACTIVE" },
    include: { menus: { where: { isAvailable: true } } },
    orderBy: { name: "asc" },
  });
  const ranked = merchants
    .map((m) => ({ ...m, isFeatured: featured.has(m.id) }))
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  res.json(ranked);
});

merchantRouter.get(
  "/merchants/me/profile",
  auth,
  requireRole("MERCHANT"),
  async (req: AuthedRequest, res) => {
    const merchantId = await merchantIdFor(req);
    await enforceMerchantBilling(merchantId);
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { menus: { orderBy: { name: "asc" } } },
    });
    if (!merchant) {
      fail(res, 404, "Outlet tidak ditemukan");
      return;
    }

    const orderMerchants = await prisma.orderMerchant.findMany({
      where: { merchantId: merchant.id, status: "COMPLETED" },
    });
    const totalSales = orderMerchants.reduce((s, row) => s + row.subtotal, 0);
    const totalCommission = orderMerchants.reduce(
      (s, row) => s + row.commissionAmount,
      0
    );
    const merchantAmount = orderMerchants.reduce(
      (s, row) => s + row.merchantAmount,
      0
    );
    const billing = await getMerchantBilling(merchant.id);
    const settings = await prisma.setting.findUnique({ where: { id: "business" } });
    const live = await merchantPlacement(merchant.id);
    const unpaid = await unpaidCommissionRows(merchant.id);
    const commissionMix = groupCommissionBuckets(unpaid);
    const featuredReq = await merchantFeaturedRequest(merchant.id);

    res.json({
      ...merchant,
      isFeatured: live.isFeatured,
      commissionRate: live.commissionRate,
      featuredRequestStatus: featuredReq?.status || null,
      featuredRequestedAt: featuredReq?.requestedAt || null,
      commissionMix,
      commissionMixNote: mixNote(commissionMix),
      billing: publicBilling(billing),
      payoutAccount: {
        bankName: settings?.payoutBankName ?? BUSINESS_RULES.PAYOUT_BANK_NAME,
        accountNumber:
          settings?.payoutAccountNumber ?? BUSINESS_RULES.PAYOUT_ACCOUNT_NUMBER,
        accountName:
          settings?.payoutAccountName ?? BUSINESS_RULES.PAYOUT_ACCOUNT_NAME,
        note: "Transfer fee komisi ke rekening founder platform di bawah ini.",
      },
      stats: {
        totalSales,
        totalCommission,
        merchantAmount,
        completedOrders: orderMerchants.length,
        outstandingAmount: merchant.outstandingAmount,
      },
    });
  }
);

merchantRouter.post(
  "/merchants/me/open",
  auth,
  requireRole("MERCHANT"),
  async (req: AuthedRequest, res) => {
    const merchantId = await merchantIdFor(req);
    await enforceMerchantBilling(merchantId);
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      fail(res, 404, "Outlet tidak ditemukan");
      return;
    }
    if (merchant.status !== "ACTIVE") {
      fail(
        res,
        403,
        "Outlet dimatikan karena tagihan fee. Lunasi dulu sebelum buka kembali."
      );
      return;
    }
    const updated = await prisma.merchant.update({
      where: { id: merchantId },
      data: { isOpen: Boolean(req.body?.isOpen) },
    });
    res.json(updated);
  }
);

merchantRouter.patch(
  "/merchants/me/profile",
  auth,
  requireRole("MERCHANT"),
  async (req: AuthedRequest, res) => {
    const merchantId = await merchantIdFor(req);
    const data: Record<string, unknown> = {};
    if (req.body?.name != null) data.name = String(req.body.name);
    if (req.body?.description != null) data.description = String(req.body.description);
    if (req.body?.address != null) data.address = String(req.body.address);
    if (req.body?.phone != null) data.phone = String(req.body.phone);
    if (req.body?.latitude != null) data.latitude = Number(req.body.latitude);
    if (req.body?.longitude != null) data.longitude = Number(req.body.longitude);
    if (req.body?.photoUrl != null) {
      const saved = saveUploadedImage("outlets", merchantId, req.body.photoUrl);
      if (saved) data.photoUrl = `${saved.split("?")[0]}?v=${Date.now()}`;
    }
    const updated = await prisma.merchant.update({
      where: { id: merchantId },
      data,
    });
    res.json(updated);
  }
);

merchantRouter.get(
  "/merchants/me/menus",
  auth,
  requireRole("MERCHANT"),
  async (req: AuthedRequest, res) => {
    const merchantId = await merchantIdFor(req);
    const menus = await prisma.menu.findMany({
      where: { merchantId },
      orderBy: { name: "asc" },
    });
    res.json(menus);
  }
);

merchantRouter.post(
  "/merchants/me/menus",
  auth,
  requireRole("MERCHANT"),
  async (req: AuthedRequest, res) => {
    const merchantId = await merchantIdFor(req);
    const name = String(req.body?.name ?? "").trim();
    const price = Number(req.body?.price);
    if (!name || !Number.isFinite(price) || price <= 0) {
      fail(res, 400, "Nama dan harga wajib");
      return;
    }
    const id = newId("MENU");
    const imageUrl = saveMenuImage(id, req.body?.imageUrl);
    const created = await prisma.menu.create({
      data: {
        id,
        merchantId,
        category: normalizeMenuCategory(req.body?.category),
        name,
        description: String(req.body?.description ?? ""),
        price: Math.round(price),
        stock: Number(req.body?.stock ?? 99),
        isAvailable: req.body?.isAvailable !== false,
        imageUrl,
      },
    });
    res.status(201).json(created);
  }
);

merchantRouter.patch(
  "/merchants/me/menus/:id",
  auth,
  requireRole("MERCHANT"),
  async (req: AuthedRequest, res) => {
    const merchantId = await merchantIdFor(req);
    const menu = await prisma.menu.findFirst({
      where: { id: param(req, "id"), merchantId },
    });
    if (!menu) {
      fail(res, 404, "Menu tidak ditemukan");
      return;
    }
    const data: Record<string, unknown> = {};
    if (req.body?.name != null) data.name = String(req.body.name);
    if (req.body?.description != null) data.description = String(req.body.description);
    if (req.body?.category != null) {
      data.category = normalizeMenuCategory(req.body.category);
    }
    if (req.body?.price != null) data.price = Math.round(Number(req.body.price));
    if (req.body?.stock != null) data.stock = Number(req.body.stock);
    if (req.body?.isAvailable != null) data.isAvailable = Boolean(req.body.isAvailable);
    if (req.body?.imageUrl != null) data.imageUrl = saveMenuImage(menu.id, req.body.imageUrl);
    const updated = await prisma.menu.update({
      where: { id: menu.id },
      data,
    });
    res.json(updated);
  }
);

merchantRouter.delete(
  "/merchants/me/menus/:id",
  auth,
  requireRole("MERCHANT"),
  async (req: AuthedRequest, res) => {
    const merchantId = await merchantIdFor(req);
    const menu = await prisma.menu.findFirst({
      where: { id: param(req, "id"), merchantId },
    });
    if (!menu) {
      fail(res, 404, "Menu tidak ditemukan");
      return;
    }
    await prisma.menu.update({
      where: { id: menu.id },
      data: { isAvailable: false },
    });
    res.json({ ok: true });
  }
);

merchantRouter.get(
  "/merchants/me/sales",
  auth,
  requireRole("MERCHANT"),
  async (req: AuthedRequest, res) => {
    const merchantId = await merchantIdFor(req);
    const live = await merchantPlacement(merchantId);
    const rows = await prisma.orderMerchant.findMany({
      where: { merchantId, status: "COMPLETED" },
      include: {
        order: { select: { id: true, completedAt: true, createdAt: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const totalSales = rows.reduce((s, r) => s + r.subtotal, 0);
    const totalCommission = rows.reduce((s, r) => s + r.commissionAmount, 0);
    const merchantAmount = rows.reduce((s, r) => s + r.merchantAmount, 0);
    res.json({
      totalSales,
      totalCommission,
      merchantAmount,
      completedOrders: rows.length,
      commissionRate: live.commissionRate,
      isFeatured: live.isFeatured,
      note: live.isFeatured
        ? `Warung rekomendasi: komisi ${Math.round(live.commissionRate * 100)}% dari makanan.`
        : "Ongkir tidak masuk pendapatan outlet.",
      rows: rows.map((r) => ({
        orderId: r.orderId,
        subtotal: r.subtotal,
        commissionAmount: r.commissionAmount,
        merchantAmount: r.merchantAmount,
        status: r.status,
        completedAt: r.order.completedAt,
        createdAt: r.order.createdAt,
      })),
    });
  }
);

merchantRouter.post(
  "/merchants/me/featured",
  auth,
  requireRole("MERCHANT"),
  async (req: AuthedRequest, res) => {
    const merchantId = await merchantIdFor(req);
    const live = await merchantPlacement(merchantId);
    if (live.isFeatured) {
      res.json({
        ok: true,
        alreadyFeatured: true,
        isFeatured: true,
        commissionRate: live.commissionRate,
        message: "Outlet sudah berstatus rekomendasi.",
      });
      return;
    }
    if (req.body?.confirm !== true) {
      const placement = await getPlacementSettings();
      fail(
        res,
        400,
        `Ajukan rekomendasi agar warung tampil di atas. Jika disetujui Super Admin, komisi menjadi ${Math.round(placement.featuredCommissionRate * 100)}% dari makanan.`
      );
      return;
    }
    try {
      const request = await requestMerchantFeatured(merchantId);
      const placement = await merchantPlacement(merchantId);
      res.json({
        ok: true,
        pending: true,
        featuredRequestStatus: request.status,
        featuredRequestedAt: request.requestedAt,
        isFeatured: false,
        commissionRate: placement.commissionRate,
        message:
          "Pengajuan rekomendasi terkirim. Super Admin akan meninjau — jika disetujui, komisi otomatis jadi tarif rekomendasi.",
      });
    } catch (e) {
      fail(res, 400, e instanceof Error ? e.message : "Gagal mengajukan rekomendasi");
    }
  }
);

merchantRouter.get("/merchants/:id", async (req, res) => {
  const merchant = await prisma.merchant.findUnique({
    where: { id: param(req, "id") },
    include: { menus: true },
  });
  if (!merchant) {
    fail(res, 404, "Outlet tidak ditemukan");
    return;
  }
  res.json(merchant);
});
