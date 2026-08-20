import { Router } from "express";
import { prisma } from "../db";
import { newId } from "../lib/auth";
import { fail, param, type AuthedRequest } from "../lib/http";
import { auth, requireRole } from "../middleware/auth";
import {
  courierIdFor,
  loadOrder,
  merchantIdFor,
  orderInclude,
  resolveCustomer,
} from "../services/orderHelpers";
import { quoteOrder } from "../services/quote";
import {
  assertCanCompleteDelivery,
  cancelPendingPaymentsForOrder,
  initiateOrderPayment,
  mayStartKitchen,
  resolveCustomerPaymentMethod,
} from "../services/payment";
import { finalizeDeliveredOrder } from "../services/orderSettlement";
import {
  assertCourierMayAccept,
  declineCourierOffer,
} from "../services/courierOffer";
import { listOrderChat, sendOrderChat } from "../lib/orderChat";
import { getOrderRating, submitOrderRating } from "../lib/orderRatings";

export const orderRouter = Router();

orderRouter.post("/orders/preview", auth, async (req: AuthedRequest, res) => {
  try {
    res.json(await quoteOrder(req.body));
  } catch (error) {
    fail(res, 400, error instanceof Error ? error.message : "Preview gagal");
  }
});

orderRouter.post(
  "/orders",
  auth,
  requireRole("CUSTOMER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    try {
      const customer = await resolveCustomer(req);
      const quote = await quoteOrder({
        ...req.body,
        delivery: req.body.delivery ?? {
          address: customer.address,
          latitude: customer.latitude,
          longitude: customer.longitude,
        },
      });
      const payment = await resolveCustomerPaymentMethod(req.body?.paymentMethod);

      const orderId = newId("ORD");
      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            id: orderId,
            customerId: customer.id,
            status: payment.orderStatus,
            paymentMethod: payment.method,
            paymentStatus: payment.paymentStatus,
            foodSubtotal: quote.foodSubtotal,
            deliveryFee: quote.deliveryFee,
            platformFee: quote.platformFee,
            grandTotal: quote.grandTotal,
            courierEarning: quote.courierEarning,
            deliveryAddress: quote.delivery.address,
            deliveryLatitude: quote.delivery.latitude,
            deliveryLongitude: quote.delivery.longitude,
            routeDistanceKm: quote.routeDistanceKm,
            billedDistanceKm: quote.billedDistanceKm,
          },
        });

        for (const merchant of quote.merchants) {
          const orderMerchantId = newId("OM");
          await tx.orderMerchant.create({
            data: {
              id: orderMerchantId,
              orderId,
              merchantId: merchant.merchantId,
              subtotal: merchant.subtotal,
              commissionRate: merchant.commissionRate,
              commissionAmount: merchant.commissionAmount,
              merchantAmount: merchant.merchantAmount,
              status: "WAITING",
            },
          });
          for (const item of merchant.items) {
            await tx.orderItem.create({
              data: {
                id: newId("OI"),
                orderId,
                orderMerchantId,
                merchantId: merchant.merchantId,
                menuId: item.menuId,
                name: item.name,
                unitPrice: item.unitPrice,
                qty: item.qty,
                subtotal: item.subtotal,
              },
            });
          }
        }

        await initiateOrderPayment(tx, {
          orderId,
          customerId: customer.id,
          amount: quote.grandTotal,
          method: payment.method,
          channel: req.body?.paymentChannel,
        });

        return created;
      });

      res.status(201).json(await loadOrder(order.id));
    } catch (error) {
      fail(res, 400, error instanceof Error ? error.message : "Gagal buat order");
    }
  }
);

orderRouter.get("/orders", auth, async (req: AuthedRequest, res) => {
  const where =
    req.user!.role === "ADMIN"
      ? {}
      : req.user!.role === "CUSTOMER"
        ? { customer: { userId: req.user!.id } }
        : req.user!.role === "COURIER"
          ? { courier: { userId: req.user!.id } }
          : { merchants: { some: { merchant: { userId: req.user!.id } } } };
  res.json(
    await prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    })
  );
});

orderRouter.get("/orders/:id", auth, async (req, res) => {
  const order = await loadOrder(param(req, "id"));
  if (!order) {
    fail(res, 404, "Order tidak ditemukan");
    return;
  }
  const rating = await getOrderRating(order.id);
  res.json({ ...order, rating });
});

orderRouter.get(
  "/orders/:id/rating",
  auth,
  requireRole("CUSTOMER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const order = await loadOrder(param(req, "id"));
    if (!order) {
      fail(res, 404, "Order tidak ditemukan");
      return;
    }
    if (req.user!.role === "CUSTOMER") {
      const customer = await resolveCustomer(req);
      if (customer.id !== order.customerId) {
        fail(res, 403, "Bukan pesanan Anda");
        return;
      }
    }
    const rating = await getOrderRating(order.id);
    res.json({ rated: Boolean(rating), rating });
  }
);

orderRouter.post(
  "/orders/:id/rate",
  auth,
  requireRole("CUSTOMER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const order = await loadOrder(param(req, "id"));
    if (!order) {
      fail(res, 404, "Order tidak ditemukan");
      return;
    }
    const customer =
      req.user!.role === "ADMIN" && req.body?.customerId
        ? await prisma.customer.findUnique({
            where: { id: String(req.body.customerId) },
          })
        : await resolveCustomer(req);
    if (!customer) {
      fail(res, 404, "Customer tidak ditemukan");
      return;
    }
    if (customer.id !== order.customerId) {
      fail(res, 403, "Bukan pesanan Anda");
      return;
    }
    if (!["DELIVERED", "COMPLETED"].includes(order.status)) {
      fail(res, 400, "Rating hanya setelah pesanan diantar");
      return;
    }
    const merchantId = order.merchants[0]?.merchantId;
    if (!merchantId) {
      fail(res, 400, "Outlet pesanan tidak ditemukan");
      return;
    }
    try {
      const rating = await submitOrderRating({
        orderId: order.id,
        customerId: customer.id,
        merchantId,
        courierId: order.courierId,
        merchantScore: req.body?.merchantScore,
        courierScore: req.body?.courierScore,
        comment: req.body?.comment,
      });
      res.status(201).json({ ok: true, rating });
    } catch (error) {
      fail(res, 400, error instanceof Error ? error.message : "Gagal kirim rating");
    }
  }
);

const CUSTOMER_CANCELLABLE = new Set([
  "WAITING_OUTLET",
  "OUTLET_ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COURIER_ASSIGNED",
  "COURIER_GOING_TO_OUTLET",
]);

orderRouter.post(
  "/orders/:id/cancel",
  auth,
  requireRole("CUSTOMER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const orderId = param(req, "id");
    const order = await loadOrder(orderId);
    if (!order) {
      fail(res, 404, "Order tidak ditemukan");
      return;
    }
    if (req.user!.role === "CUSTOMER") {
      const customer = await resolveCustomer(req);
      if (customer.id !== order.customerId) {
        fail(res, 403, "Bukan pesanan Anda");
        return;
      }
    }
    if (order.status === "CANCELLED") {
      fail(res, 400, "Pesanan sudah dibatalkan");
      return;
    }
    if (!CUSTOMER_CANCELLABLE.has(order.status)) {
      fail(
        res,
        400,
        "Pesanan tidak bisa dibatalkan setelah kurir mengambil makanan."
      );
      return;
    }
    const reason =
      String(req.body?.reason ?? "").trim() ||
      "Dibatalkan pelanggan sebelum kurir mengambil pesanan";

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });
      await tx.orderMerchant.updateMany({
        where: {
          orderId,
          status: { notIn: ["REJECTED", "COMPLETED", "CANCELLED"] },
        },
        data: { status: "CANCELLED" },
      });
      await tx.courierAssignment.updateMany({
        where: { orderId, status: "OFFERED" },
        data: { status: "EXPIRED", respondedAt: new Date() },
      });
      if (order.courierId) {
        await tx.courier.updateMany({
          where: { id: order.courierId, activeOrderId: orderId },
          data: { activeOrderId: null },
        });
      }
      await cancelPendingPaymentsForOrder(tx, orderId);
    });

    res.json(await loadOrder(orderId));
  }
);

orderRouter.post(
  "/orders/:id/merchant-respond",
  auth,
  requireRole("MERCHANT", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const accept = Boolean(req.body?.accept);
    const orderId = param(req, "id");
    const merchantId = await merchantIdFor(req);
    if (req.user!.role === "MERCHANT") {
      const { enforceMerchantBilling } = await import("../services/merchantBilling");
      await enforceMerchantBilling(merchantId);
      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant || merchant.status !== "ACTIVE") {
        fail(
          res,
          403,
          "Outlet dimatikan karena tagihan fee lewat 10 hari kalender. Tidak bisa proses order."
        );
        return;
      }
    }
    const om = await prisma.orderMerchant.findFirst({
      where: { orderId, merchantId },
    });
    if (!om) {
      fail(res, 404, "Order outlet tidak ditemukan");
      return;
    }
    const before = await loadOrder(orderId);
    if (before && !mayStartKitchen(before)) {
      fail(res, 400, "Menunggu pembayaran pelanggan dulu sebelum dapur mulai");
      return;
    }
    await prisma.orderMerchant.update({
      where: { id: om.id },
      data: { status: accept ? "ACCEPTED" : "REJECTED" },
    });
    const all = await prisma.orderMerchant.findMany({ where: { orderId } });
    const anyAccepted = all.some((row) => row.status === "ACCEPTED");
    const allRejected = all.every((row) => row.status === "REJECTED");
    const current = await loadOrder(orderId);
    const keepCourierStatus =
      Boolean(current?.courierId) &&
      [
        "COURIER_ASSIGNED",
        "COURIER_GOING_TO_OUTLET",
        "PICKED_UP",
        "DELIVERING",
      ].includes(current?.status || "");
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: keepCourierStatus
            ? current!.status
            : allRejected
              ? "CANCELLED"
              : anyAccepted
                ? "OUTLET_ACCEPTED"
                : "WAITING_OUTLET",
          acceptedAt: anyAccepted ? new Date() : undefined,
          cancelledAt: allRejected ? new Date() : undefined,
          cancelReason: allRejected ? "Semua outlet menolak" : undefined,
        },
      });
      if (allRejected) {
        await cancelPendingPaymentsForOrder(tx, orderId);
      }
    });
    res.json(await loadOrder(orderId));
  }
);

orderRouter.post(
  "/orders/:id/merchant-status",
  auth,
  requireRole("MERCHANT", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const next = String(req.body?.status ?? "");
    if (!["PREPARING", "READY"].includes(next)) {
      fail(res, 400, "Status outlet tidak valid");
      return;
    }
    const orderId = param(req, "id");
    const merchantId = await merchantIdFor(req);
    if (req.user!.role === "MERCHANT") {
      const { enforceMerchantBilling } = await import("../services/merchantBilling");
      await enforceMerchantBilling(merchantId);
      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant || merchant.status !== "ACTIVE") {
        fail(
          res,
          403,
          "Outlet dimatikan karena tagihan fee lewat 10 hari kalender. Tidak bisa proses order."
        );
        return;
      }
    }
    const om = await prisma.orderMerchant.findFirst({
      where: { orderId, merchantId },
    });
    if (!om) {
      fail(res, 404, "Order outlet tidak ditemukan");
      return;
    }
    const beforeStatus = await loadOrder(orderId);
    if (beforeStatus && !mayStartKitchen(beforeStatus)) {
      fail(res, 400, "Menunggu pembayaran pelanggan dulu sebelum dapur mulai");
      return;
    }
    await prisma.orderMerchant.update({
      where: { id: om.id },
      data: { status: next },
    });
    const all = await prisma.orderMerchant.findMany({ where: { orderId } });
    const current = await loadOrder(orderId);
    const keepCourierStatus =
      Boolean(current?.courierId) &&
      [
        "COURIER_ASSIGNED",
        "COURIER_GOING_TO_OUTLET",
        "PICKED_UP",
        "DELIVERING",
      ].includes(current?.status || "");
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: keepCourierStatus
          ? current!.status
          : all.every((row) => row.status === "READY")
            ? "READY_FOR_PICKUP"
            : "PREPARING",
      },
    });
    res.json(await loadOrder(orderId));
  }
);

orderRouter.post(
  "/orders/:id/assign-courier",
  auth,
  requireRole("COURIER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const orderId = param(req, "id");
    const courierId = await courierIdFor(req);
    const order = await loadOrder(orderId);
    if (!order) {
      fail(res, 404, "Order tidak ditemukan");
      return;
    }
    if (order.courierId && order.courierId !== courierId) {
      fail(res, 409, "Order sudah diambil kurir lain");
      return;
    }
    if (order.courierId === courierId) {
      res.json(order);
      return;
    }
    if (!["OUTLET_ACCEPTED", "PREPARING", "READY_FOR_PICKUP"].includes(order.status)) {
      fail(
        res,
        400,
        order.status === "WAITING_OUTLET"
          ? "Tunggu outlet menerima pesanan dulu"
          : "Order ini belum bisa diambil kurir"
      );
      return;
    }
    const taken = await prisma.courier.findUnique({ where: { id: courierId } });
    if (taken?.approvalStatus && taken.approvalStatus !== "APPROVED") {
      fail(res, 403, "Akun kurir belum disetujui Super Admin");
      return;
    }
    if (taken?.activeOrderId && taken.activeOrderId !== orderId) {
      const active = await prisma.order.findUnique({
        where: { id: taken.activeOrderId },
      });
      const stale =
        !active ||
        ["COMPLETED", "CANCELLED", "DELIVERED"].includes(active.status);
      if (stale) {
        await prisma.courier.update({
          where: { id: courierId },
          data: { activeOrderId: null },
        });
      } else {
        fail(
          res,
          409,
          `Selesaikan dulu order aktif ${taken.activeOrderId} sebelum terima order baru`
        );
        return;
      }
    }

    // Kurir biasa hanya boleh terima jika dia pemegang offer exclusive (terdekat).
    if (req.user?.role === "COURIER") {
      try {
        await assertCourierMayAccept(orderId, courierId);
      } catch (error) {
        fail(res, 409, error instanceof Error ? error.message : "Order tidak untukmu");
        return;
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.order.findUnique({ where: { id: orderId } });
        if (!fresh || fresh.courierId) {
          throw new Error("Order sudah diambil kurir lain");
        }
        await tx.order.update({
          where: { id: orderId },
          data: { status: "COURIER_ASSIGNED", courierId },
        });
        await tx.courier.update({
          where: { id: courierId },
          data: { activeOrderId: orderId, isOnline: true },
        });
        const openOffer = await tx.courierAssignment.findFirst({
          where: { orderId, courierId, status: "OFFERED" },
          orderBy: { offeredAt: "desc" },
        });
        if (openOffer) {
          await tx.courierAssignment.update({
            where: { id: openOffer.id },
            data: { status: "ACCEPTED", respondedAt: new Date() },
          });
        } else {
          await tx.courierAssignment.create({
            data: {
              id: newId("ASG"),
              orderId,
              courierId,
              status: "ACCEPTED",
              respondedAt: new Date(),
            },
          });
        }
        await tx.courierAssignment.updateMany({
          where: { orderId, status: "OFFERED", courierId: { not: courierId } },
          data: { status: "EXPIRED", respondedAt: new Date() },
        });
      });
    } catch (error) {
      fail(res, 409, error instanceof Error ? error.message : "Gagal assign kurir");
      return;
    }

    res.json(await loadOrder(orderId));
  }
);

orderRouter.post(
  "/orders/:id/courier-decline",
  auth,
  requireRole("COURIER"),
  async (req: AuthedRequest, res) => {
    try {
      const orderId = param(req, "id");
      const courierId = await courierIdFor(req);
      const next = await declineCourierOffer(orderId, courierId);
      res.json({
        ok: true,
        message: next
          ? "Penawaran diteruskan ke kurir terdekat berikutnya."
          : "Penawaran ditolak. Belum ada kurir pengganti.",
        nextOffer: next,
      });
    } catch (error) {
      fail(res, 400, error instanceof Error ? error.message : "Gagal menolak penawaran");
    }
  }
);

orderRouter.post(
  "/orders/:id/courier-status",
  auth,
  requireRole("COURIER", "ADMIN"),
  async (req, res) => {
    const next = String(req.body?.status ?? "");
    const allowed = [
      "COURIER_GOING_TO_OUTLET",
      "PICKED_UP",
      "DELIVERING",
      "DELIVERED",
    ];
    if (!allowed.includes(next)) {
      fail(res, 400, "Status kurir tidak valid");
      return;
    }
    const orderId = param(req, "id");
    if (next === "PICKED_UP") {
      const slices = await prisma.orderMerchant.findMany({ where: { orderId } });
      const live = slices.filter((row) => row.status !== "REJECTED");
      const ready =
        live.length > 0 &&
        live.every((row) => row.status === "READY" || row.status === "COMPLETED");
      if (!ready) {
        fail(res, 400, "Dapur belum menandai pesanan siap diambil");
        return;
      }
    }
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: next,
        pickedUpAt: next === "PICKED_UP" ? new Date() : undefined,
        deliveredAt: next === "DELIVERED" ? new Date() : undefined,
      },
    });
    res.json(await loadOrder(orderId));
  }
);

orderRouter.post(
  "/orders/:id/complete",
  auth,
  requireRole("COURIER", "ADMIN"),
  async (req, res) => {
    const order = await loadOrder(param(req, "id"));
    if (!order) {
      fail(res, 404, "Order tidak ditemukan");
      return;
    }
    if (order.status === "COMPLETED") {
      res.json(order);
      return;
    }
    if (order.status !== "DELIVERED") {
      fail(
        res,
        400,
        order.paymentMethod === "ONLINE"
          ? "Kurir harus menandai sampai dulu sebelum menutup order"
          : "Kurir harus menandai sampai dulu sebelum menutup order tunai"
      );
      return;
    }
    try {
      assertCanCompleteDelivery(order);
      await prisma.$transaction(async (tx) => {
        await finalizeDeliveredOrder(tx, order);
      });
      res.json(await loadOrder(order.id));
    } catch (error) {
      fail(res, 400, error instanceof Error ? error.message : "Gagal complete order");
    }
  }
);

async function chatParty(req: AuthedRequest, order: NonNullable<Awaited<ReturnType<typeof loadOrder>>>) {
  if (req.user?.role === "ADMIN" || req.user?.role === "SUPER_ADMIN") {
    return { role: "ADMIN", name: "Admin" };
  }
  if (req.user?.role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
    if (!customer || customer.id !== order.customerId) return null;
    return { role: "CUSTOMER", name: customer.fullName };
  }
  if (req.user?.role === "COURIER") {
    const courier = await prisma.courier.findUnique({ where: { userId: req.user.id } });
    if (!courier || !order.courierId || courier.id !== order.courierId) return null;
    return { role: "COURIER", name: courier.fullName };
  }
  return null;
}

orderRouter.get(
  "/orders/:id/chat",
  auth,
  requireRole("CUSTOMER", "COURIER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const order = await loadOrder(param(req, "id"));
    if (!order) {
      fail(res, 404, "Order tidak ditemukan");
      return;
    }
    const party = await chatParty(req, order);
    if (!party) {
      fail(res, 403, "Chat hanya untuk kurir dan pelanggan order ini");
      return;
    }
    res.json({ me: party.role, messages: await listOrderChat(order.id) });
  }
);

orderRouter.post(
  "/orders/:id/chat",
  auth,
  requireRole("CUSTOMER", "COURIER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const order = await loadOrder(param(req, "id"));
    if (!order) {
      fail(res, 404, "Order tidak ditemukan");
      return;
    }
    if (order.status === "CANCELLED") {
      fail(res, 400, "Order dibatalkan");
      return;
    }
    const party = await chatParty(req, order);
    if (!party) {
      fail(res, 403, "Chat hanya untuk kurir dan pelanggan order ini");
      return;
    }
    if (party.role === "CUSTOMER" && !order.courierId) {
      fail(res, 400, "Kurir belum terhubung");
      return;
    }
    try {
      const message = await sendOrderChat({
        orderId: order.id,
        senderRole: party.role,
        senderName: party.name,
        body: String(req.body?.body ?? ""),
      });
      res.status(201).json(message);
    } catch (error) {
      fail(res, 400, error instanceof Error ? error.message : "Gagal kirim pesan");
    }
  }
);
