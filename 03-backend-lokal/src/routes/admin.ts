import { Router, type Response } from "express";
import { prisma } from "../db";
import { fail, param, type AuthedRequest } from "../lib/http";
import { auth, requireRole } from "../middleware/auth";
import { BUSINESS_RULES } from "../../../02-aturan-bisnis/businessRules";
import {
  addCourierIncident,
  getCourierArchive,
  ktpPhotoMap,
  markCourierDecision,
  setCourierKtpPhoto,
} from "../lib/courierArchive";
import { getCourierKtpProfile, ktpProfileMap } from "../lib/courierKtpProfile";
import { readKtpFromImage } from "../services/ktpOcr";
import { ensurePricingColumns, getPricing } from "../services/pricing";
import { saveUploadedImage } from "../lib/uploadImage";
import { countOpenSupportReports } from "../lib/supportReports";
import {
  ensurePlacementColumns,
  featuredMerchantIds,
  getPlacementSettings,
  isPriorityActive,
  setMerchantFeatured,
  clearMerchantFeaturedRequest,
  merchantFeaturedRequestMap,
  setCourierPriority,
  clearCourierPriority,
  clearCourierPriorityRequest,
  courierPriorityMap,
  courierPriorityRequestMap,
  courierPriorityRequest,
  parsePriorityUnit,
  durationToHours,
  recordCourierPriorityPayment,
  priorityRevenueSummary,
} from "../lib/placement";

export const adminRouter = Router();

adminRouter.get(
  "/admin/dashboard",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (_req, res) => {
    const [
      customers,
      merchants,
      couriers,
      courierOnline,
      courierPending,
      merchantPending,
      orders,
      completed,
      cancelled,
      gmvAgg,
      feeAgg,
      courierEarnAgg,
      outstandingAgg,
      pendingSettlements,
      customerSuspended,
      merchantSuspended,
      courierSuspended,
      activeOrders,
      waitingOutlet,
      withCourier,
      supportOpen,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.merchant.count({ where: { status: "ACTIVE" } }),
      prisma.courier.count(),
      prisma.courier.count({ where: { isOnline: true } }),
      prisma.courier.count({ where: { approvalStatus: "PENDING" } }),
      prisma.merchant.count({ where: { status: "PENDING" } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "COMPLETED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.order.aggregate({
        _sum: { grandTotal: true },
        where: { status: { not: "CANCELLED" } },
      }),
      prisma.order.aggregate({
        _sum: { platformFee: true },
        where: { status: "COMPLETED" },
      }),
      prisma.order.aggregate({
        _sum: { courierEarning: true },
        where: { status: "COMPLETED" },
      }),
      prisma.merchant.aggregate({ _sum: { outstandingAmount: true } }),
      prisma.merchantSettlement.count({ where: { status: "PENDING" } }),
      prisma.customer.count({ where: { status: "SUSPENDED" } }),
      prisma.merchant.count({ where: { status: "SUSPENDED" } }),
      prisma.courier.count({ where: { approvalStatus: "SUSPENDED" } }),
      prisma.order.count({
        where: {
          status: {
            in: [
              "WAITING_OUTLET",
              "PREPARING",
              "READY_FOR_PICKUP",
              "ASSIGNED",
              "PICKED_UP",
              "DELIVERING",
            ],
          },
        },
      }),
      prisma.order.count({
        where: {
          status: { in: ["WAITING_OUTLET", "PREPARING", "READY_FOR_PICKUP"] },
        },
      }),
      prisma.order.count({
        where: {
          status: { in: ["ASSIGNED", "PICKED_UP", "DELIVERING"] },
        },
      }),
      countOpenSupportReports(),
    ]);
    const pricing = await getPricing();
    const { buildBillingSnapshot } = await import("../services/merchantBilling");
    const settings = await prisma.setting.findUnique({ where: { id: "business" } });
    const minimum =
      settings?.minimumSettlement ?? BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT;
    const settlementDays = BUSINESS_RULES.SETTLEMENT_CALENDAR_DAYS;
    const priorityRevenue = await priorityRevenueSummary();

    const [merchantRows, courierRows] = await Promise.all([
      prisma.merchant.findMany({
        include: {
          orderMerchants: {
            where: { status: "COMPLETED" },
            select: { subtotal: true, commissionAmount: true },
          },
        },
      }),
      prisma.courier.findMany({
        where: { approvalStatus: "APPROVED" },
        include: {
          orders: {
            where: { status: "COMPLETED" },
            select: { courierEarning: true },
          },
        },
      }),
    ]);

    const outletRanking = merchantRows
      .filter((m) => m.status === "ACTIVE")
      .map((m) => {
        const totalSales = m.orderMerchants.reduce((s, om) => s + om.subtotal, 0);
        const totalCommission = m.orderMerchants.reduce(
          (s, om) => s + om.commissionAmount,
          0
        );
        return {
          id: m.id,
          name: m.name,
          completedOrders: m.orderMerchants.length,
          totalSales,
          totalCommission,
        };
      })
      .sort(
        (a, b) =>
          b.totalSales - a.totalSales || b.completedOrders - a.completedOrders
      )
      .slice(0, 5);

    const courierRanking = courierRows
      .map((c) => ({
        id: c.id,
        fullName: c.fullName,
        completedCount: c.orders.length,
        earningsTotal: c.orders.reduce((s, o) => s + o.courierEarning, 0),
        isOnline: c.isOnline,
      }))
      .sort(
        (a, b) =>
          b.completedCount - a.completedCount ||
          b.earningsTotal - a.earningsTotal
      )
      .slice(0, 5);

    const feeReminders = merchantRows
      .filter((m) => m.outstandingAmount > 0)
      .map((m) => {
        const billing = buildBillingSnapshot(m, minimum, settlementDays);
        return {
          id: m.id,
          name: m.name,
          outstandingAmount: m.outstandingAmount,
          feeDueAt: billing.feeDueAt ? billing.feeDueAt.toISOString() : null,
          isOverdue: billing.isOverdue,
          daysUntilDue: billing.daysUntilDue,
          daysOverdue: billing.daysOverdue,
          status: m.status,
          message: billing.message,
        };
      })
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        const aDue = a.daysUntilDue ?? 999;
        const bDue = b.daysUntilDue ?? 999;
        if (aDue !== bDue) return aDue - bDue;
        return b.outstandingAmount - a.outstandingAmount;
      });

    res.json({
      totalCustomer: customers,
      merchantActive: merchants,
      totalCourier: couriers,
      courierOnline,
      courierPending,
      merchantPending,
      orderCount: orders,
      orderCompleted: completed,
      orderCancelled: cancelled,
      gmv: gmvAgg._sum.grandTotal ?? 0,
      platformFee: feeAgg._sum.platformFee ?? 0,
      courierEarningsPaid: courierEarnAgg._sum.courierEarning ?? 0,
      outstandingSettlement: outstandingAgg._sum.outstandingAmount ?? 0,
      pendingSettlements,
      customerSuspended,
      merchantSuspended,
      courierSuspended,
      activeOrders,
      waitingOutlet,
      withCourier,
      supportOpen,
      commissionRate: pricing.commissionRate,
      deliveryMode: pricing.deliveryMode,
      deliveryRatePerKm: pricing.deliveryRatePerKm,
      deliveryFlatFee: pricing.deliveryFlatFee,
      settlementDays,
      outletRanking,
      courierRanking,
      feeReminders,
      priorityRevenueTotal: priorityRevenue.priorityRevenueTotal,
      priorityRevenueCount: priorityRevenue.priorityRevenueCount,
      recentPriorityPayments: priorityRevenue.recentPriorityPayments,
      roleNote:
        "Panel founder: monitoring transaksi Customer → Outlet → Kurir. Operasional order dilakukan di app masing-masing.",
    });
  }
);

adminRouter.post(
  "/admin/account-control",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    const party = String(req.body?.party ?? "").toUpperCase();
    const id = String(req.body?.id ?? "").trim();
    const action = String(req.body?.action ?? "").toUpperCase();
    if (!id) {
      fail(res, 400, "ID akun wajib");
      return;
    }

    if (party === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({ where: { id } });
      if (!customer) {
        fail(res, 404, "Pelanggan tidak ditemukan");
        return;
      }
      if (action === "SUSPEND") {
        await prisma.customer.update({
          where: { id },
          data: { status: "SUSPENDED" },
        });
        await prisma.user.update({
          where: { id: customer.userId },
          data: { status: "SUSPENDED" },
        });
        res.json({
          ok: true,
          message: "Akun pelanggan ditangguhkan. Tidak bisa login atau pesan.",
        });
        return;
      }
      if (action === "ACTIVATE") {
        await prisma.customer.update({
          where: { id },
          data: { status: "ACTIVE" },
        });
        await prisma.user.update({
          where: { id: customer.userId },
          data: { status: "ACTIVE" },
        });
        res.json({ ok: true, message: "Akun pelanggan diaktifkan kembali." });
        return;
      }
      fail(res, 400, "Aksi pelanggan: SUSPEND atau ACTIVATE");
      return;
    }

    if (party === "OUTLET") {
      const merchant = await prisma.merchant.findUnique({ where: { id } });
      if (!merchant) {
        fail(res, 404, "Outlet tidak ditemukan");
        return;
      }
      if (action === "SUSPEND") {
        await prisma.merchant.update({
          where: { id },
          data: {
            status: "SUSPENDED",
            suspensionState: "ADMIN",
            isOpen: false,
          },
        });
        res.json({
          ok: true,
          message: "Outlet ditangguhkan. Tidak bisa terima order. Bisa login hanya untuk tagihan.",
        });
        return;
      }
      if (action === "REJECT") {
        if (merchant.status !== "PENDING") {
          fail(res, 400, "Hanya pendaftaran yang menunggu yang bisa ditolak.");
          return;
        }
        await prisma.merchant.update({
          where: { id },
          data: { status: "REJECTED", isOpen: false },
        });
        res.json({
          ok: true,
          message: "Pendaftaran outlet ditolak. Pemilik tidak bisa login.",
        });
        return;
      }
      if (action === "ACTIVATE" || action === "APPROVE") {
        if (merchant.status === "PENDING" || merchant.status === "REJECTED") {
          await prisma.merchant.update({
            where: { id },
            data: { status: "ACTIVE", suspensionState: null, isOpen: false },
          });
          res.json({
            ok: true,
            message: "Outlet disetujui. Pemilik sudah bisa login.",
          });
          return;
        }
        const { isFeeOverdue } = await import(
          "../../../02-aturan-bisnis/businessRules"
        );
        const { BUSINESS_RULES } = await import(
          "../../../02-aturan-bisnis/businessRules"
        );
        const settings = await prisma.setting.findUnique({
          where: { id: "business" },
        });
        const overdue = isFeeOverdue(
          merchant.outstandingAmount,
          merchant.outstandingSince,
          new Date(),
          settings?.minimumSettlement ?? BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT
        );
        if (overdue) {
          fail(
            res,
            400,
            "Tagihan masih lewat tempo. Verifikasi pelunasan di Fee & Tagihan dulu."
          );
          return;
        }
        await prisma.merchant.update({
          where: { id },
          data: { status: "ACTIVE", suspensionState: null, isOpen: true },
        });
        res.json({ ok: true, message: "Outlet diaktifkan kembali." });
        return;
      }
      if (action === "FORCE_CLOSE") {
        await prisma.merchant.update({
          where: { id },
          data: { isOpen: false },
        });
        res.json({
          ok: true,
          message: "Outlet dipaksa tutup. Pelanggan tidak bisa pesan ke warung ini.",
        });
        return;
      }
      if (action === "FORCE_OPEN") {
        if (merchant.status !== "ACTIVE") {
          fail(res, 400, "Aktifkan outlet dulu sebelum memaksa buka.");
          return;
        }
        await prisma.merchant.update({
          where: { id },
          data: { isOpen: true },
        });
        res.json({ ok: true, message: "Outlet dipaksa buka." });
        return;
      }
      fail(
        res,
        400,
        "Aksi outlet: APPROVE, REJECT, SUSPEND, ACTIVATE, FORCE_CLOSE, atau FORCE_OPEN"
      );
      return;
    }

    if (party === "COURIER") {
      if (action === "SUSPEND") {
        await applyCourierDecision(req, res, "SUSPENDED", id);
        return;
      }
      if (action === "ACTIVATE" || action === "APPROVE") {
        await applyCourierDecision(req, res, "APPROVED", id);
        return;
      }
      fail(res, 400, "Aksi kurir: SUSPEND atau ACTIVATE");
      return;
    }

    fail(res, 400, "Pihak harus CUSTOMER, OUTLET, atau COURIER");
  }
);

function monitorStage(status: string): string {
  if (status === "WAITING_OUTLET") return "OUTLET";
  if (["PREPARING", "READY_FOR_PICKUP"].includes(status)) return "OUTLET";
  if (["ASSIGNED", "PICKED_UP", "DELIVERING", "OUT_FOR_DELIVERY"].includes(status)) {
    return "COURIER";
  }
  if (status === "COMPLETED") return "DONE";
  if (status === "CANCELLED") return "CANCELLED";
  return "OTHER";
}

adminRouter.get(
  "/admin/orders",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (_req, res) => {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        courier: true,
        merchants: { include: { merchant: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const mapped = orders.map((o) => {
      const stage = monitorStage(o.status);
      const timeline = [
        {
          key: "created",
          label: "Order masuk",
          at: o.createdAt,
          actor: "CUSTOMER",
          done: true,
        },
        {
          key: "accepted",
          label: "Outlet terima",
          at: o.acceptedAt,
          actor: "OUTLET",
          done: Boolean(o.acceptedAt) ||
            ["PREPARING", "READY_FOR_PICKUP", "ASSIGNED", "PICKED_UP", "DELIVERING", "COMPLETED"].includes(
              o.status
            ),
        },
        {
          key: "preparing",
          label: "Dimasak",
          at: o.acceptedAt,
          actor: "OUTLET",
          done: ["PREPARING", "READY_FOR_PICKUP", "ASSIGNED", "PICKED_UP", "DELIVERING", "COMPLETED"].includes(
            o.status
          ),
        },
        {
          key: "ready",
          label: "Siap dijemput",
          at: null,
          actor: "OUTLET",
          done: ["READY_FOR_PICKUP", "ASSIGNED", "PICKED_UP", "DELIVERING", "COMPLETED"].includes(
            o.status
          ),
        },
        {
          key: "picked",
          label: "Kurir ambil",
          at: o.pickedUpAt,
          actor: "COURIER",
          done: Boolean(o.pickedUpAt) ||
            ["PICKED_UP", "DELIVERING", "COMPLETED"].includes(o.status),
        },
        {
          key: "delivering",
          label: "Diantar",
          at: o.pickedUpAt,
          actor: "COURIER",
          done: ["DELIVERING", "COMPLETED"].includes(o.status) || Boolean(o.deliveredAt),
        },
        {
          key: "settled",
          label: "Selesai tunai",
          at: o.completedAt,
          actor: "SYSTEM",
          done: o.status === "COMPLETED",
        },
      ];

      return {
        id: o.id,
        status: o.status,
        stage,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
        completedAt: o.completedAt,
        customer: {
          id: o.customer.id,
          name: o.customer.fullName,
          phone: o.customer.phone,
          address: o.deliveryAddress,
        },
        outlets: o.merchants.map((m) => ({
          id: m.merchantId,
          name: m.merchant.name,
          status: m.status,
          subtotal: m.subtotal,
          commissionAmount: m.commissionAmount,
          merchantAmount: m.merchantAmount,
        })),
        courier: o.courier
          ? {
              id: o.courier.id,
              name: o.courier.fullName,
              phone: o.courier.phone,
              isOnline: o.courier.isOnline,
            }
          : null,
        money: {
          foodSubtotal: o.foodSubtotal,
          deliveryFee: o.deliveryFee,
          platformFee: o.platformFee,
          courierEarning: o.courierEarning,
          grandTotal: o.grandTotal,
        },
        distanceKm: o.billedDistanceKm,
        itemCount: o.items.reduce((s, i) => s + i.qty, 0),
        timeline,
      };
    });

    const pipeline = {
      outlet: mapped.filter((o) => o.stage === "OUTLET").length,
      courier: mapped.filter((o) => o.stage === "COURIER").length,
      done: mapped.filter((o) => o.stage === "DONE").length,
      cancelled: mapped.filter((o) => o.stage === "CANCELLED").length,
      active: mapped.filter((o) => o.stage === "OUTLET" || o.stage === "COURIER")
        .length,
    };

    res.json({
      pipeline,
      orders: mapped,
      updatedAt: new Date().toISOString(),
    });
  }
);

adminRouter.get(
  "/admin/customers",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (_req, res) => {
    const customers = await prisma.customer.findMany({
      include: {
        user: true,
        orders: {
          select: {
            id: true,
            status: true,
            grandTotal: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { fullName: "asc" },
    });
    res.json(
      customers.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        email: c.user.email,
        status: c.status,
        address: c.address,
        orderCount: c.orders.length,
        completedCount: c.orders.filter((o) => o.status === "COMPLETED").length,
        totalSpent: c.orders
          .filter((o) => o.status === "COMPLETED")
          .reduce((s, o) => s + o.grandTotal, 0),
        lastOrderAt: c.orders[0]?.createdAt ?? null,
        recentOrders: c.orders.slice(0, 5),
      }))
    );
  }
);

adminRouter.get(
  "/admin/merchants",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (_req, res) => {
    const { enforceMerchantBilling, buildBillingSnapshot } = await import(
      "../services/merchantBilling"
    );
    const { BUSINESS_RULES } = await import(
      "../../../02-aturan-bisnis/businessRules"
    );
    await enforceMerchantBilling();
    const settings = await prisma.setting.findUnique({ where: { id: "business" } });
    const minimum =
      settings?.minimumSettlement ?? BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT;
    const workingDays = BUSINESS_RULES.SETTLEMENT_WORKING_DAYS;

    const merchants = await prisma.merchant.findMany({
      include: {
        user: true,
        orderMerchants: {
          include: {
            order: { select: { id: true, status: true, completedAt: true, createdAt: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        settlements: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    const featuredIds = await featuredMerchantIds();
    const placement = await getPlacementSettings();
    const featuredRequests = await merchantFeaturedRequestMap();
    res.json(
      merchants.map((m) => {
        const completed = m.orderMerchants.filter((om) => om.status === "COMPLETED");
        const totalSales = completed.reduce((s, om) => s + om.subtotal, 0);
        const totalCommission = completed.reduce((s, om) => s + om.commissionAmount, 0);
        const merchantAmount = completed.reduce((s, om) => s + om.merchantAmount, 0);
        const billing = buildBillingSnapshot(m, minimum, workingDays);
        const featured = featuredIds.has(m.id);
        const featReq = featuredRequests.get(m.id);
        return {
          id: m.id,
          name: m.name,
          ownerName: m.user.displayName,
          phone: m.phone,
          email: m.user.email,
          address: m.address,
          createdAt: m.createdAt,
          status: m.status,
          suspensionState: m.suspensionState,
          isOpen: m.isOpen,
          isFeatured: featured,
          featuredRequestStatus: featReq?.status || null,
          featuredRequestedAt: featReq?.requestedAt || null,
          outstandingAmount: m.outstandingAmount,
          outstandingSince: m.outstandingSince,
          feeDueAt: billing.feeDueAt,
          isOverdue: billing.isOverdue,
          billingMessage: billing.message,
          commissionRate: featured
            ? placement.featuredCommissionRate
            : m.commissionRate,
          featuredCommissionRate: placement.featuredCommissionRate,
          totalSales,
          totalCommission,
          merchantAmount,
          completedOrders: completed.length,
          transactions: completed.slice(0, 30).map((om) => ({
            orderId: om.orderId,
            subtotal: om.subtotal,
            commissionRate: om.commissionRate,
            commissionAmount: om.commissionAmount,
            merchantAmount: om.merchantAmount,
            completedAt: om.completedAt || om.order.completedAt || om.createdAt,
          })),
          settlements: m.settlements.map((s) => ({
            id: s.id,
            status: s.status,
            paidAmount: s.paidAmount,
            commissionAmount: s.commissionAmount,
            createdAt: s.createdAt,
            proofUrl: s.proofUrl,
          })),
        };
      })
    );
  }
);

adminRouter.post(
  "/admin/merchants/:id/feature",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res) => {
    const merchant = await prisma.merchant.findUnique({
      where: { id: param(req, "id") },
    });
    if (!merchant) {
      fail(res, 404, "Outlet tidak ditemukan");
      return;
    }
    const action = String(req.body?.action || "").toUpperCase();
    const featured =
      action === "APPROVE" || action === "ACTIVATE"
        ? true
        : action === "REJECT" || action === "REVOKE"
          ? false
          : req.body?.featured !== false;

    if (action === "REJECT") {
      await clearMerchantFeaturedRequest(merchant.id);
      res.json({
        ok: true,
        featured: false,
        featuredRequestStatus: null,
        message: "Pengajuan rekomendasi ditolak.",
      });
      return;
    }

    if (featured) {
      const live = await setMerchantFeatured(merchant.id, true);
      res.json({
        ok: true,
        featured: live.isFeatured,
        commissionRate: live.commissionRate,
        featuredRequestStatus: null,
        message: `Outlet masuk rekomendasi. Komisi per transaksi ${Math.round(live.commissionRate * 100)}%.`,
      });
      return;
    }

    const live = await setMerchantFeatured(merchant.id, false);
    res.json({
      ok: true,
      featured: live.isFeatured,
      commissionRate: live.commissionRate,
      featuredRequestStatus: null,
      message: "Outlet dikeluarkan dari rekomendasi. Komisi kembali ke tarif default.",
    });
  }
);

adminRouter.post(
  "/admin/couriers/:id/priority",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res) => {
    const courier = await prisma.courier.findUnique({
      where: { id: param(req, "id") },
    });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    const placement = await getPlacementSettings();
    const action = String(req.body?.action || "").toUpperCase();
    const active =
      action === "APPROVE" || action === "ACTIVATE"
        ? true
        : action === "REJECT" || action === "REVOKE"
          ? false
          : req.body?.active !== false;

    if (action === "REJECT") {
      await clearCourierPriorityRequest(courier.id);
      res.json({
        ok: true,
        priorityActive: false,
        priorityUntil: null,
        priorityRequestStatus: null,
        message:
          "Pengajuan langganan prioritas ditolak. Minta kurir transfer ulang jika perlu.",
      });
      return;
    }

    if (active) {
      const hoursRaw = Number(req.body?.hours);
      const daysRaw = Number(req.body?.days);
      const hours =
        Number.isFinite(hoursRaw) && hoursRaw > 0
          ? Math.round(hoursRaw)
          : Number.isFinite(daysRaw) && daysRaw > 0
            ? Math.round(daysRaw) * 24
            : placement.courierPriorityHours;
      // Ambil fee/bukti dari pengajuan sebelum dihapus saat aktivasi
      const pendingReq = await courierPriorityRequest(courier.id);
      const fee =
        pendingReq?.fee && pendingReq.fee > 0
          ? pendingReq.fee
          : placement.courierPriorityFee;
      const proofUrl = pendingReq?.proofUrl || null;
      const until = await setCourierPriority(courier.id, hours);
      await recordCourierPriorityPayment({
        courierId: courier.id,
        fee,
        hours,
        proofUrl,
        priorityUntil: until,
      });
      res.json({
        ok: true,
        priorityActive: true,
        priorityUntil: until,
        priorityRequestStatus: null,
        feeRecorded: fee,
        message: `Langganan prioritas aktif sampai ${new Date(until).toLocaleString("id-ID")}. Pendapatan ${rupiaStr(fee)} dicatat.`,
      });
      return;
    }
    await clearCourierPriority(courier.id);
    await clearCourierPriorityRequest(courier.id);
    res.json({
      ok: true,
      priorityActive: false,
      priorityUntil: null,
      priorityRequestStatus: null,
      message: "Langganan prioritas dimatikan. Kurir kembali ke antrian jarak terdekat.",
    });
  }
);

adminRouter.get(
  "/admin/couriers",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (_req, res) => {
    const couriers = await prisma.courier.findMany({
      include: {
        user: true,
        orders: {
          select: {
            id: true,
            status: true,
            courierEarning: true,
            grandTotal: true,
            completedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const photos = await ktpPhotoMap();
    const profiles = await ktpProfileMap();
    const priority = await courierPriorityMap();
    const requests = await courierPriorityRequestMap();
    const placement = await getPlacementSettings();
    const priorityRevenue = await priorityRevenueSummary();
    res.json({
      couriers: couriers.map((c) => {
        const completed = c.orders.filter((o) => o.status === "COMPLETED");
        const ktp = profiles[c.id];
        const reqInfo = requests.get(c.id);
        return {
          id: c.id,
          fullName: c.fullName,
          phone: c.phone,
          ktpPhotoUrl: photos[c.id] || "",
          email: c.user.email,
          approvalStatus: c.approvalStatus,
          isOnline: c.isOnline,
          lastLatitude: c.lastLatitude,
          lastLongitude: c.lastLongitude,
          lastLocationAt: c.lastLocationAt,
          activeOrderId: c.activeOrderId,
          createdAt: c.createdAt,
          completedCount: completed.length,
          earningsTotal: completed.reduce((s, o) => s + o.courierEarning, 0),
          recentOrders: c.orders.slice(0, 5),
          nik: ktp?.nik || "",
          placeOfBirth: ktp?.placeOfBirth || "",
          dateOfBirth: ktp?.dateOfBirth || "",
          addressOnKtp: ktp?.addressOnKtp || "",
          fullNameFromOcr: ktp?.fullNameFromOcr || "",
          ocrConfidence: ktp?.ocrConfidence || 0,
          mismatchFlags: ktp?.mismatchFlags || [],
          priorityUntil: priority.get(c.id) || null,
          priorityActive: isPriorityActive(priority.get(c.id) || null),
          priorityRequestStatus: reqInfo?.status || null,
          priorityRequestedAt: reqInfo?.requestedAt || null,
          priorityRequestFee: reqInfo?.fee || placement.courierPriorityFee,
          priorityProofUrl: reqInfo?.proofUrl || null,
          priorityFee: placement.courierPriorityFee,
          priorityDays: placement.courierPriorityDays,
          priorityHours: placement.courierPriorityHours,
          priorityDuration: placement.courierPriorityDuration,
          priorityUnit: placement.courierPriorityUnit,
          priorityLabel: placement.courierPriorityLabel,
        };
      }),
      priorityRevenueTotal: priorityRevenue.priorityRevenueTotal,
      priorityRevenueCount: priorityRevenue.priorityRevenueCount,
      recentPriorityPayments: priorityRevenue.recentPriorityPayments,
    });
  }
);

async function applyCourierDecision(
  req: AuthedRequest,
  res: Response,
  action: "APPROVED" | "REJECTED" | "SUSPENDED",
  courierId = param(req, "id")
) {
  const id = String(courierId || req.body?.id || req.body?.courierId || "").trim();
  const courier = await prisma.courier.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!courier) {
    fail(res, 404, "Kurir tidak ditemukan");
    return;
  }
  if (action === "APPROVED") {
    const photos = await ktpPhotoMap();
    if (!String(photos[id] || "").trim()) {
      fail(
        res,
        400,
        "Cek biodata dan pastikan foto KTP ada di arsip sebelum Super Admin menyetujui akun."
      );
      return;
    }
  }
  const reason = String(req.body?.reason ?? req.body?.note ?? "").trim();
  await markCourierDecision(
    courier.id,
    action,
    req.user?.displayName || req.user?.email || "admin",
    reason
  );
  const messages = {
    APPROVED: "Akun kurir disetujui. Pendaftar sudah bisa login.",
    REJECTED: "Pendaftaran kurir ditolak. Data KTP tetap disimpan.",
    SUSPENDED: "Akun kurir ditangguhkan. Data KTP tetap disimpan.",
  };
  res.json({
    ok: true,
    message: messages[action],
    courier: {
      id: courier.id,
      fullName: courier.fullName,
      email: courier.user.email,
      approvalStatus: action,
    },
  });
}

adminRouter.post(
  "/admin/courier-decision",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res) => {
    const raw = String(req.body?.action ?? req.body?.status ?? "").toUpperCase();
    const action =
      raw === "APPROVE" || raw === "APPROVED"
        ? "APPROVED"
        : raw === "REJECT" || raw === "REJECTED"
          ? "REJECTED"
          : raw === "SUSPEND" || raw === "SUSPENDED"
            ? "SUSPENDED"
            : "";
    if (!action) {
      fail(res, 400, "Aksi tidak valid");
      return;
    }
    await applyCourierDecision(
      req,
      res,
      action,
      String(req.body?.id ?? req.body?.courierId ?? "")
    );
  }
);

adminRouter.get(
  "/admin/courier-archive",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    const id = String(req.query.id ?? "").trim();
    const courier = await prisma.courier.findUnique({
      where: { id },
      include: {
        user: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            status: true,
            courierEarning: true,
            grandTotal: true,
            deliveryAddress: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    const archive = await getCourierArchive(courier.id);
    const ktpProfile = await getCourierKtpProfile(courier.id);
    res.json({
      id: courier.id,
      fullName: courier.fullName,
      phone: courier.phone,
      email: courier.user.email,
      userId: courier.userId,
      approvalStatus: courier.approvalStatus,
      isOnline: courier.isOnline,
      lastLatitude: courier.lastLatitude,
      lastLongitude: courier.lastLongitude,
      lastLocationAt: courier.lastLocationAt,
      activeOrderId: courier.activeOrderId,
      createdAt: courier.createdAt,
      ktpPhotoUrl: archive.ktpPhotoUrl,
      approvedAt: archive.approvedAt,
      approvedBy: archive.approvedBy,
      rejectReason: archive.rejectReason,
      incidents: archive.incidents,
      orders: courier.orders,
      nik: ktpProfile.nik,
      placeOfBirth: ktpProfile.placeOfBirth,
      dateOfBirth: ktpProfile.dateOfBirth,
      addressOnKtp: ktpProfile.addressOnKtp,
      fullNameFromOcr: ktpProfile.fullNameFromOcr,
      ocrConfidence: ktpProfile.ocrConfidence,
      mismatchFlags: ktpProfile.mismatchFlags,
    });
  }
);

adminRouter.post(
  "/admin/courier-ktp",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    const id = String(req.body?.id ?? req.body?.courierId ?? "").trim();
    const courier = await prisma.courier.findUnique({ where: { id } });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    const ktpPhotoUrl = saveUploadedImage(
      "ktp",
      id,
      req.body?.ktpPhotoUrl ?? req.body?.ktpPhoto
    );
    if (!ktpPhotoUrl) {
      fail(res, 400, "Foto KTP tidak terbaca. Unggah JPEG/PNG yang jelas.");
      return;
    }
    await setCourierKtpPhoto(id, ktpPhotoUrl);
    const ocr = await readKtpFromImage(req.body?.ktpPhotoUrl ?? req.body?.ktpPhoto);
    res.json({
      ok: true,
      ktpPhotoUrl,
      ocr: {
        nik: ocr.nik,
        fullName: ocr.fullName,
        placeOfBirth: ocr.placeOfBirth,
        dateOfBirth: ocr.dateOfBirth,
        address: ocr.address,
        confidence: ocr.confidence,
        note: ocr.note,
      },
      message: "Foto KTP disimpan di arsip kurir.",
    });
  }
);

adminRouter.post(
  "/admin/courier-incident",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res) => {
    const courierId = String(req.body?.id ?? req.body?.courierId ?? "").trim();
    const courier = await prisma.courier.findUnique({ where: { id: courierId } });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    const title = String(req.body?.title ?? "").trim();
    const note = String(req.body?.note ?? "").trim();
    if (!title || !note) {
      fail(res, 400, "Judul dan catatan laporan wajib diisi");
      return;
    }
    const id = await addCourierIncident(
      courierId,
      title,
      note,
      req.user?.displayName || req.user?.email || "admin"
    );
    res.status(201).json({ ok: true, id, message: "Laporan disimpan di arsip kurir." });
  }
);

adminRouter.get(
  "/admin/couriers/:id",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    const courier = await prisma.courier.findUnique({
      where: { id: param(req, "id") },
      include: {
        user: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            status: true,
            courierEarning: true,
            grandTotal: true,
            deliveryAddress: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    const archive = await getCourierArchive(courier.id);
    const ktpProfile = await getCourierKtpProfile(courier.id);
    res.json({
      id: courier.id,
      fullName: courier.fullName,
      phone: courier.phone,
      email: courier.user.email,
      userId: courier.userId,
      approvalStatus: courier.approvalStatus,
      isOnline: courier.isOnline,
      lastLatitude: courier.lastLatitude,
      lastLongitude: courier.lastLongitude,
      lastLocationAt: courier.lastLocationAt,
      activeOrderId: courier.activeOrderId,
      createdAt: courier.createdAt,
      ktpPhotoUrl: archive.ktpPhotoUrl,
      approvedAt: archive.approvedAt,
      approvedBy: archive.approvedBy,
      rejectReason: archive.rejectReason,
      incidents: archive.incidents,
      orders: courier.orders,
      nik: ktpProfile.nik,
      placeOfBirth: ktpProfile.placeOfBirth,
      dateOfBirth: ktpProfile.dateOfBirth,
      addressOnKtp: ktpProfile.addressOnKtp,
      fullNameFromOcr: ktpProfile.fullNameFromOcr,
      ocrConfidence: ktpProfile.ocrConfidence,
      mismatchFlags: ktpProfile.mismatchFlags,
    });
  }
);

adminRouter.post(
  "/admin/couriers/:id/decision",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res) => {
    const raw = String(req.body?.action ?? req.body?.status ?? "").toUpperCase();
    const action =
      raw === "APPROVE" || raw === "APPROVED"
        ? "APPROVED"
        : raw === "REJECT" || raw === "REJECTED"
          ? "REJECTED"
          : raw === "SUSPEND" || raw === "SUSPENDED"
            ? "SUSPENDED"
            : "";
    if (!action) {
      fail(res, 400, "Aksi tidak valid");
      return;
    }
    await applyCourierDecision(req, res, action);
  }
);

adminRouter.post(
  "/admin/couriers/:id/incidents",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: AuthedRequest, res) => {
    const courierId = param(req, "id");
    const courier = await prisma.courier.findUnique({ where: { id: courierId } });
    if (!courier) {
      fail(res, 404, "Kurir tidak ditemukan");
      return;
    }
    const title = String(req.body?.title ?? "").trim();
    const note = String(req.body?.note ?? "").trim();
    if (!title || !note) {
      fail(res, 400, "Judul dan catatan laporan wajib diisi");
      return;
    }
    const id = await addCourierIncident(
      courierId,
      title,
      note,
      req.user?.displayName || req.user?.email || "admin"
    );
    res.status(201).json({ ok: true, id, message: "Laporan disimpan di arsip kurir." });
  }
);

adminRouter.get(
  "/admin/pricing",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (_req, res) => {
    const pricing = await getPricing();
    res.json({
      ...pricing,
      commissionPercent: Math.round(pricing.commissionRate * 1000) / 10,
      exampleFood: 100000,
      exampleKm: 5,
      exampleCommission: Math.round(100000 * pricing.commissionRate),
      exampleDelivery:
        pricing.deliveryMode === "FLAT"
          ? pricing.deliveryFlatFee
          : 5 * pricing.deliveryRatePerKm,
    });
  }
);

adminRouter.put(
  "/admin/pricing",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    await ensurePricingColumns();
    const percentRaw = Number(
      req.body?.commissionPercent ??
        (Number(req.body?.commissionRate) > 1
          ? req.body.commissionRate
          : Number(req.body?.commissionRate) * 100)
    );
    const rate = percentRaw / 100;
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) {
      fail(res, 400, "Komisi harus antara 0% dan 50% dari makanan.");
      return;
    }
    const modeRaw = String(req.body?.deliveryMode ?? "PER_KM").toUpperCase();
    const deliveryMode = modeRaw === "FLAT" ? "FLAT" : "PER_KM";
    const deliveryRatePerKm = Math.round(Number(req.body?.deliveryRatePerKm ?? 2000));
    const deliveryFlatFee = Math.round(Number(req.body?.deliveryFlatFee ?? 10000));
    if (deliveryMode === "PER_KM" && (!Number.isFinite(deliveryRatePerKm) || deliveryRatePerKm < 0)) {
      fail(res, 400, "Tarif per km tidak valid.");
      return;
    }
    if (deliveryMode === "FLAT" && (!Number.isFinite(deliveryFlatFee) || deliveryFlatFee < 0)) {
      fail(res, 400, "Tarif tetap ongkir tidak valid.");
      return;
    }
    await prisma.setting.update({
      where: { id: "business" },
      data: {
        commissionRate: rate,
        deliveryRatePerKm: Number.isFinite(deliveryRatePerKm)
          ? deliveryRatePerKm
          : BUSINESS_RULES.DELIVERY_RATE_PER_KM,
      },
    });
    await prisma.$executeRawUnsafe(
      `UPDATE Setting SET deliveryMode = '${deliveryMode}', deliveryFlatFee = ${
        Number.isFinite(deliveryFlatFee) ? deliveryFlatFee : 10000
      } WHERE id = 'business'`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE Merchant SET commissionRate = ${rate} WHERE IFNULL(isFeatured, 0) = 0`
    );
    const pricing = await getPricing();
    res.json({
      ok: true,
      message: "Tarif disimpan. Order baru memakai komisi dan ongkir ini.",
      pricing,
    });
  }
);

adminRouter.get(
  "/admin/placement",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (_req, res) => {
    const s = await getPlacementSettings();
    res.json({
      featuredCommissionRate: s.featuredCommissionRate,
      featuredCommissionPercent: Math.round(s.featuredCommissionRate * 1000) / 10,
      courierPriorityFee: s.courierPriorityFee,
      courierPriorityHours: s.courierPriorityHours,
      courierPriorityDays: s.courierPriorityDays,
      courierPriorityDuration: s.courierPriorityDuration,
      courierPriorityUnit: s.courierPriorityUnit,
      courierPriorityLabel: s.courierPriorityLabel,
    });
  }
);

adminRouter.put(
  "/admin/placement",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    await ensurePlacementColumns();

    // Featured commission
    const featuredPctRaw = Number(req.body?.featuredCommissionPercent ?? NaN);
    const featuredRate = Number.isFinite(featuredPctRaw)
      ? featuredPctRaw / 100
      : Number(req.body?.featuredCommissionRate ?? NaN);
    if (!Number.isFinite(featuredRate) || featuredRate < 0 || featuredRate > 1) {
      fail(res, 400, "Komisi rekomendasi harus antara 0% dan 100%.");
      return;
    }

    // Priority fee & duration (jam / hari / bulan — disimpan akurat dalam jam)
    const fee = Math.round(Number(req.body?.courierPriorityFee ?? NaN));
    if (!Number.isFinite(fee) || fee < 0) {
      fail(res, 400, "Biaya prioritas tidak valid.");
      return;
    }
    const unit = parsePriorityUnit(req.body?.courierPriorityUnit);
    const rawDuration = Number(req.body?.courierPriorityDuration ?? NaN);
    if (!Number.isFinite(rawDuration) || rawDuration < 1) {
      fail(res, 400, "Durasi prioritas tidak valid (minimal 1).");
      return;
    }
    const duration = Math.round(rawDuration);
    const hours = durationToHours(duration, unit);
    const days = Math.max(1, Math.ceil(hours / 24));

    await prisma.$executeRawUnsafe(
      `UPDATE Setting SET
       featuredCommissionRate = ${featuredRate},
       courierPriorityFee = ${fee},
       courierPriorityDays = ${days},
       courierPriorityHours = ${hours},
       courierPriorityUnit = '${unit}',
       courierPriorityDuration = ${duration}
       WHERE id = 'business'`
    );

    // Update semua merchant rekomendasi ke tarif baru
    await prisma.$executeRawUnsafe(
      `UPDATE Merchant SET commissionRate = ${featuredRate} WHERE IFNULL(isFeatured,0) = 1`
    );

    const saved = await getPlacementSettings();
    res.json({
      ok: true,
      message: `Tersimpan. Rekomendasi ${Math.round(saved.featuredCommissionRate * 100)}%, prioritas kurir ${rupiaStr(saved.courierPriorityFee)} / ${saved.courierPriorityLabel}.`,
      ...saved,
    });
  }
);

function rupiaStr(n: number) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

adminRouter.get(
  "/admin/payout-account",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (_req, res) => {
    const settings = await prisma.setting.findUnique({ where: { id: "business" } });
    res.json({
      bankName: settings?.payoutBankName ?? BUSINESS_RULES.PAYOUT_BANK_NAME,
      accountNumber:
        settings?.payoutAccountNumber ?? BUSINESS_RULES.PAYOUT_ACCOUNT_NUMBER,
      accountName:
        settings?.payoutAccountName ?? BUSINESS_RULES.PAYOUT_ACCOUNT_NAME,
      note: "Rekening ini ditampilkan di aplikasi outlet untuk transfer fee komisi.",
    });
  }
);

adminRouter.put(
  "/admin/payout-account",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    const bankName = String(req.body?.bankName ?? "").trim();
    const accountNumber = String(req.body?.accountNumber ?? "").trim();
    const accountName = String(req.body?.accountName ?? "").trim();
    if (!bankName || !accountNumber || !accountName) {
      fail(res, 400, "Bank, nomor rekening, dan nama pemilik wajib diisi");
      return;
    }
    const updated = await prisma.setting.update({
      where: { id: "business" },
      data: {
        payoutBankName: bankName,
        payoutAccountNumber: accountNumber,
        payoutAccountName: accountName,
      },
    });
    res.json({
      ok: true,
      message: "Rekening founder disimpan. Outlet akan melihat nomor ini di Tagihan.",
      payoutAccount: {
        bankName: updated.payoutBankName,
        accountNumber: updated.payoutAccountNumber,
        accountName: updated.payoutAccountName,
      },
    });
  }
);

adminRouter.post(
  "/admin/couriers/:id/approve",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  (req: AuthedRequest, res) => applyCourierDecision(req, res, "APPROVED")
);

adminRouter.post(
  "/admin/couriers/:id/reject",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  (req: AuthedRequest, res) => applyCourierDecision(req, res, "REJECTED")
);

adminRouter.post(
  "/admin/couriers/:id/suspend",
  auth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  (req: AuthedRequest, res) => applyCourierDecision(req, res, "SUSPENDED")
);
