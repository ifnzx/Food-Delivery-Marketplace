import { Router } from "express";
import { prisma } from "../db";
import { fail, type AuthedRequest } from "../lib/http";
import { auth, requireRole } from "../middleware/auth";
import { saveUploadedImage } from "../lib/uploadImage";
import {
  getPlacementSettings,
  courierPriorityUntil,
  courierPriorityRequest,
  isPriorityActive,
  requestCourierPriority,
} from "../lib/placement";
import {
  COURIER_OFFER_TTL_SEC,
  ensureExclusiveOffer,
} from "../services/courierOffer";

export const courierRouter = Router();

courierRouter.get(
  "/couriers/me",
  auth,
  requireRole("COURIER"),
  async (req: AuthedRequest, res) => {
    const courier = await prisma.courier.findUnique({
      where: { userId: req.user!.id },
      include: { user: true },
    });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    const completed = await prisma.order.findMany({
      where: { courierId: courier.id, status: "COMPLETED" },
      select: { courierEarning: true },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await prisma.order.findMany({
      where: {
        courierId: courier.id,
        status: "COMPLETED",
        completedAt: { gte: today },
      },
      select: { courierEarning: true },
    });
    const placement = await getPlacementSettings();
    const priorityUntil = await courierPriorityUntil(courier.id);
    const priorityActive = isPriorityActive(priorityUntil);
    const priorityRequest = await courierPriorityRequest(courier.id);
    const settings = await prisma.setting.findUnique({ where: { id: "business" } });
    res.json({
      ...courier,
      priorityUntil,
      priorityActive,
      priorityFee: placement.courierPriorityFee,
      priorityDays: placement.courierPriorityDays,
      priorityHours: placement.courierPriorityHours,
      priorityDuration: placement.courierPriorityDuration,
      priorityUnit: placement.courierPriorityUnit,
      priorityLabel: placement.courierPriorityLabel,
      priorityRequestStatus: priorityRequest?.status || null,
      priorityRequestedAt: priorityRequest?.requestedAt || null,
      priorityRequestFee: priorityRequest?.fee || null,
      priorityProofUrl: priorityRequest?.proofUrl || null,
      payoutAccount: {
        bankName: settings?.payoutBankName ?? "BCA",
        accountNumber: settings?.payoutAccountNumber ?? "1234567890",
        accountName: settings?.payoutAccountName ?? "Founder ANTARQ",
        note: "Transfer biaya langganan ke rekening sistem ANTARQ.",
      },
      earningsToday: todayOrders.reduce((s, o) => s + o.courierEarning, 0),
      earningsTotal: completed.reduce((s, o) => s + o.courierEarning, 0),
      completedCount: completed.length,
    });
  }
);

courierRouter.post(
  "/couriers/me/priority",
  auth,
  requireRole("COURIER"),
  async (req: AuthedRequest, res) => {
    const courier = await prisma.courier.findUnique({
      where: { userId: req.user!.id },
    });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    if (courier.approvalStatus !== "APPROVED") {
      fail(res, 400, "Akun kurir belum disetujui");
      return;
    }
    const placement = await getPlacementSettings();
    const until = await courierPriorityUntil(courier.id);
    if (isPriorityActive(until)) {
      res.json({
        ok: true,
        alreadyActive: true,
        priorityUntil: until,
        message: "Langganan prioritas masih aktif.",
      });
      return;
    }
    if (req.body?.confirmPay !== true) {
      fail(
        res,
        400,
        `Langganan prioritas dikenakan biaya Rp${placement.courierPriorityFee.toLocaleString("id-ID")} per ${placement.courierPriorityLabel}. Transfer dulu, lampirkan bukti, lalu kirim agar Super Admin memeriksa.`
      );
      return;
    }
    const rawProof = String(req.body?.proofUrl ?? "").trim();
    const isImage =
      rawProof.startsWith("data:image/") ||
      /^https?:\/\//i.test(rawProof) ||
      rawProof.startsWith("/uploads/");
    if (!isImage) {
      fail(
        res,
        400,
        "Wajib unggah foto bukti transfer (struk ATM / screenshot m-banking)."
      );
      return;
    }
    const proofUrl =
      saveUploadedImage("priority", courier.id, rawProof) || rawProof;
    try {
      const request = await requestCourierPriority(courier.id, proofUrl);
      res.json({
        ok: true,
        pending: true,
        priorityRequestStatus: request.status,
        priorityRequestedAt: request.requestedAt,
        priorityProofUrl: request.proofUrl,
        fee: request.fee,
        days: placement.courierPriorityDays,
        hours: placement.courierPriorityHours,
        duration: placement.courierPriorityDuration,
        unit: placement.courierPriorityUnit,
        label: placement.courierPriorityLabel,
        message:
          "Pengajuan + bukti transfer terkirim. Super Admin akan mengaktifkan setelah cek.",
      });
    } catch (e) {
      fail(res, 400, e instanceof Error ? e.message : "Gagal mengajukan langganan");
    }
  }
);

courierRouter.patch(
  "/couriers/me/profile",
  auth,
  requireRole("COURIER"),
  async (req: AuthedRequest, res) => {
    const courier = await prisma.courier.findUnique({
      where: { userId: req.user!.id },
    });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    const fullName = String(req.body?.fullName ?? "").trim();
    const phone = String(req.body?.phone ?? "").trim();
    if (!fullName) {
      fail(res, 400, "Nama wajib diisi");
      return;
    }
    const updated = await prisma.courier.update({
      where: { id: courier.id },
      data: {
        fullName,
        phone,
        user: {
          update: {
            displayName: fullName,
            phone,
          },
        },
      },
      include: { user: true },
    });
    res.json(updated);
  }
);

courierRouter.post(
  "/couriers/me/online",
  auth,
  requireRole("COURIER"),
  async (req: AuthedRequest, res) => {
    const courier = await prisma.courier.findUnique({
      where: { userId: req.user!.id },
    });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    if (courier.approvalStatus !== "APPROVED") {
      fail(
        res,
        403,
        "Akun kurir belum disetujui Super Admin. Tidak bisa online."
      );
      return;
    }
    const isOnline = Boolean(req.body?.isOnline);
    const updated = await prisma.courier.update({
      where: { id: courier.id },
      data: {
        isOnline,
        lastLocationAt: new Date(),
        lastLatitude: req.body?.latitude != null ? Number(req.body.latitude) : courier.lastLatitude,
        lastLongitude:
          req.body?.longitude != null ? Number(req.body.longitude) : courier.lastLongitude,
      },
    });
    res.json(updated);
  }
);

courierRouter.post(
  "/couriers/me/location",
  auth,
  requireRole("COURIER"),
  async (req: AuthedRequest, res) => {
    const courier = await prisma.courier.findUnique({
      where: { userId: req.user!.id },
    });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    const updated = await prisma.courier.update({
      where: { id: courier.id },
      data: {
        lastLatitude: Number(req.body?.latitude),
        lastLongitude: Number(req.body?.longitude),
        lastLocationAt: new Date(),
        isOnline: req.body?.isOnline ?? true,
      },
    });
    res.json(updated);
  }
);

courierRouter.get(
  "/couriers/me/available-orders",
  auth,
  requireRole("COURIER"),
  async (req: AuthedRequest, res) => {
    const courier = await prisma.courier.findUnique({
      where: { userId: req.user!.id },
    });
    if (!courier?.isOnline) {
      res.json([]);
      return;
    }
    if (courier.approvalStatus !== "APPROVED") {
      res.json([]);
      return;
    }
    if (
      courier.lastLatitude == null ||
      courier.lastLongitude == null ||
      !Number.isFinite(courier.lastLatitude) ||
      !Number.isFinite(courier.lastLongitude)
    ) {
      res.json([]);
      return;
    }

    const candidates = await prisma.order.findMany({
      where: {
        courierId: null,
        status: { in: ["OUTLET_ACCEPTED", "PREPARING", "READY_FOR_PICKUP"] },
      },
      include: {
        customer: true,
        merchants: { include: { merchant: true } },
        items: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const mine = [];
    for (const order of candidates) {
      const offer = await ensureExclusiveOffer(order.id);
      if (!offer || offer.courierId !== courier.id) continue;
      mine.push({
        ...order,
        offer: {
          exclusive: true,
          distanceToOutletKm: offer.distanceKm,
          expiresAt: offer.expiresAt,
          ttlSec: offer.ttlSec,
          offerTtlSec: COURIER_OFFER_TTL_SEC,
          note: "Kamu mendapat giliran penawaran exclusive dulu.",
        },
      });
    }
    res.json(mine);
  }
);
