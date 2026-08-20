import { Router } from "express";
import { prisma } from "../db";
import { fail, param, type AuthedRequest } from "../lib/http";
import { auth, requireRole } from "../middleware/auth";
import {
  SUPPORT_CATEGORIES,
  createSupportReport,
  getSupportReportById,
  listSupportReportsAdmin,
  listSupportReportsForUser,
  updateSupportReportAdmin,
} from "../lib/supportReports";

export const supportRouter = Router();

async function reporterProfile(userId: string, role: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  if (role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    return {
      name: customer?.fullName || user.displayName,
      phone: customer?.phone || user.phone,
      email: user.email,
    };
  }
  if (role === "COURIER") {
    const courier = await prisma.courier.findUnique({ where: { userId } });
    return {
      name: courier?.fullName || user.displayName,
      phone: courier?.phone || user.phone,
      email: user.email,
    };
  }
  if (role === "MERCHANT") {
    const merchant = await prisma.merchant.findUnique({ where: { userId } });
    return {
      name: merchant?.name || user.displayName,
      phone: merchant?.phone || user.phone,
      email: user.email,
    };
  }
  return {
    name: user.displayName,
    phone: user.phone,
    email: user.email,
  };
}

supportRouter.post(
  "/support-reports",
  auth,
  requireRole("CUSTOMER", "COURIER", "MERCHANT"),
  async (req: AuthedRequest, res) => {
    const category = String(req.body?.category ?? "OTHER").toUpperCase();
    const subject = String(req.body?.subject ?? "").trim();
    const body = String(req.body?.body ?? "").trim();
    const orderId = req.body?.orderId
      ? String(req.body.orderId).trim()
      : null;

    if (!subject || subject.length < 4) {
      fail(res, 400, "Subjek laporan minimal 4 karakter");
      return;
    }
    if (!body || body.length < 10) {
      fail(res, 400, "Deskripsi kendala minimal 10 karakter");
      return;
    }
    if (
      category !== "OTHER" &&
      !SUPPORT_CATEGORIES.includes(category as (typeof SUPPORT_CATEGORIES)[number])
    ) {
      fail(res, 400, "Kategori tidak valid");
      return;
    }

    const profile = await reporterProfile(req.user!.id, req.user!.role);
    if (!profile) {
      fail(res, 404, "Profil pengguna tidak ditemukan");
      return;
    }

    const report = await createSupportReport({
      reporterUserId: req.user!.id,
      reporterRole: req.user!.role,
      reporterName: profile.name,
      reporterPhone: profile.phone,
      reporterEmail: profile.email,
      category,
      subject,
      body,
      orderId,
    });

    res.status(201).json({
      ok: true,
      message:
        "Laporan bantuan terkirim. Tim Super Admin akan meninjau segera.",
      report,
    });
  }
);

supportRouter.get(
  "/support-reports/me",
  auth,
  requireRole("CUSTOMER", "COURIER", "MERCHANT"),
  async (req: AuthedRequest, res) => {
    const rows = await listSupportReportsForUser(req.user!.id);
    res.json(rows);
  }
);

supportRouter.get(
  "/admin/support-reports",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    const status = String(req.query.status ?? "");
    const role = String(req.query.role ?? "");
    const q = String(req.query.q ?? "");
    const rows = await listSupportReportsAdmin({ status, role, q });
    res.json(rows);
  }
);

supportRouter.get(
  "/admin/support-reports/:id",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    const report = await getSupportReportById(param(req, "id"));
    if (!report) {
      fail(res, 404, "Laporan tidak ditemukan");
      return;
    }
    res.json(report);
  }
);

supportRouter.patch(
  "/admin/support-reports/:id",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res) => {
    const id = param(req, "id");
    const existing = await getSupportReportById(id);
    if (!existing) {
      fail(res, 404, "Laporan tidak ditemukan");
      return;
    }

    try {
      const updated = await updateSupportReportAdmin(id, {
        status: req.body?.status ? String(req.body.status) : undefined,
        adminNote:
          req.body?.adminNote !== undefined
            ? String(req.body.adminNote)
            : undefined,
        resolvedBy: req.user!.displayName || req.user!.email,
      });
      res.json({
        ok: true,
        message: "Laporan bantuan diperbarui.",
        report: updated,
      });
    } catch (err) {
      fail(res, 400, err instanceof Error ? err.message : "Gagal memperbarui");
    }
  }
);
