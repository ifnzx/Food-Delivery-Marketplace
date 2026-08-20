import { prisma } from "../db";
import { newId } from "../lib/auth";
import { haversineKm } from "../lib/geo";
import { courierPriorityMap, isPriorityActive } from "../lib/placement";

/** Detik penawaran exclusive ke satu kurir sebelum cascade ke #2. */
export const COURIER_OFFER_TTL_SEC = 45;

type LatLng = { latitude: number; longitude: number };

function isFiniteLatLng(lat: unknown, lng: unknown): lat is number {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

/** Titik jemput = outlet pertama yang tidak ditolak (multi-outlet: warung pertama). */
export function pickupPoint(order: {
  merchants?: Array<{
    status?: string;
    merchant?: { latitude?: number; longitude?: number } | null;
  }>;
}): LatLng | null {
  const live = (order.merchants || []).filter((m) => m.status !== "REJECTED");
  const row = live[0] || order.merchants?.[0];
  const m = row?.merchant;
  if (!m || !isFiniteLatLng(m.latitude, m.longitude)) return null;
  return { latitude: Number(m.latitude), longitude: Number(m.longitude) };
}

export async function rankOnlineCouriers(pickup: LatLng) {
  const couriers = await prisma.courier.findMany({
    where: {
      isOnline: true,
      approvalStatus: "APPROVED",
      activeOrderId: null,
    },
  });
  const priority = await courierPriorityMap();

  return couriers
    .filter((c) => isFiniteLatLng(c.lastLatitude, c.lastLongitude))
    .map((c) => ({
      courierId: c.id,
      priority: isPriorityActive(priority.get(c.id) || null),
      distanceKm: Number(
        haversineKm(
          pickup.latitude,
          pickup.longitude,
          Number(c.lastLatitude),
          Number(c.lastLongitude)
        ).toFixed(3)
      ),
      lastLocationAt: c.lastLocationAt,
    }))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });
}

/**
 * Pastikan ada penawaran OFFERED yang masih valid untuk order tanpa kurir.
 * Hanya 1 kurir (terdekat yang belum tolak) yang memegang offer aktif.
 */
export async function ensureExclusiveOffer(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { merchants: { include: { merchant: true } } },
  });
  if (!order || order.courierId) return null;
  if (!["OUTLET_ACCEPTED", "PREPARING", "READY_FOR_PICKUP"].includes(order.status)) {
    return null;
  }

  const pickup = pickupPoint(order);
  if (!pickup) return null;

  const now = Date.now();
  const active = await prisma.courierAssignment.findFirst({
    where: { orderId, status: "OFFERED" },
    orderBy: { offeredAt: "desc" },
  });

  if (active) {
    const ageSec = (now - new Date(active.offeredAt).getTime()) / 1000;
    if (ageSec <= COURIER_OFFER_TTL_SEC) {
      const ranked = await rankOnlineCouriers(pickup);
      const hit = ranked.find((r) => r.courierId === active.courierId);
      return {
        assignmentId: active.id,
        courierId: active.courierId,
        offeredAt: active.offeredAt,
        expiresAt: new Date(
          new Date(active.offeredAt).getTime() + COURIER_OFFER_TTL_SEC * 1000
        ),
        distanceKm: hit?.distanceKm ?? null,
        pickup,
        ttlSec: Math.max(0, Math.ceil(COURIER_OFFER_TTL_SEC - ageSec)),
      };
    }
    await prisma.courierAssignment.update({
      where: { id: active.id },
      data: { status: "EXPIRED", respondedAt: new Date() },
    });
  }

  const rejected = await prisma.courierAssignment.findMany({
    where: { orderId, status: { in: ["REJECTED", "EXPIRED"] } },
    select: { courierId: true },
  });
  const skip = new Set(rejected.map((r) => r.courierId));
  const ranked = (await rankOnlineCouriers(pickup)).filter(
    (r) => !skip.has(r.courierId)
  );
  const next = ranked[0];
  if (!next) return null;

  const created = await prisma.courierAssignment.create({
    data: {
      id: newId("ASG"),
      orderId,
      courierId: next.courierId,
      status: "OFFERED",
    },
  });

  return {
    assignmentId: created.id,
    courierId: created.courierId,
    offeredAt: created.offeredAt,
    expiresAt: new Date(created.offeredAt.getTime() + COURIER_OFFER_TTL_SEC * 1000),
    distanceKm: next.distanceKm,
    pickup,
    ttlSec: COURIER_OFFER_TTL_SEC,
  };
}

export async function assertCourierMayAccept(orderId: string, courierId: string) {
  const offer = await ensureExclusiveOffer(orderId);
  if (!offer) {
    throw new Error(
      "Belum ada kurir terdekat yang bisa ditawari. Pastikan GPS kurir aktif."
    );
  }
  if (offer.courierId !== courierId) {
    throw new Error(
      "Order ini sedang ditawarkan ke kurir lain. Tunggu giliran."
    );
  }
  return offer;
}

export async function declineCourierOffer(orderId: string, courierId: string) {
  const active = await prisma.courierAssignment.findFirst({
    where: { orderId, courierId, status: "OFFERED" },
    orderBy: { offeredAt: "desc" },
  });
  if (!active) {
    throw new Error("Tidak ada penawaran aktif untuk ditolak");
  }
  await prisma.courierAssignment.update({
    where: { id: active.id },
    data: { status: "REJECTED", respondedAt: new Date() },
  });
  return ensureExclusiveOffer(orderId);
}
