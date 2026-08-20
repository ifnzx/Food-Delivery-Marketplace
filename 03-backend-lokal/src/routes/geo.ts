import { Router } from "express";
import { fail, type AuthedRequest } from "../lib/http";
import { auth, requireRole } from "../middleware/auth";
import {
  geocodeAddress,
  googleMapsConfigured,
  reverseGeocode,
} from "../lib/googleMaps";
import { hashPassword } from "../lib/password";
import { prisma } from "../db";

function looksLikeCoordinates(value: string | null | undefined): boolean {
  return /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(String(value ?? "").trim());
}

export const geoRouter = Router();

geoRouter.post("/geo/reverse", auth, async (req: AuthedRequest, res) => {
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    fail(res, 400, "Koordinat GPS tidak valid");
    return;
  }
  const address = await reverseGeocode(latitude, longitude);
  res.json({
    address:
      address ||
      `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    latitude,
    longitude,
    google: googleMapsConfigured(),
    source: address
      ? googleMapsConfigured()
        ? "google-geocode"
        : "openstreetmap"
      : "coordinates",
  });
});

geoRouter.post("/geo/geocode", auth, async (req: AuthedRequest, res) => {
  const address = String(req.body?.address ?? "").trim();
  if (!address) {
    fail(res, 400, "Alamat wajib diisi");
    return;
  }
  const found = await geocodeAddress(address);
  if (!found) {
    fail(
      res,
      404,
      googleMapsConfigured()
        ? "Alamat tidak ditemukan di Google Maps"
        : "Set GOOGLE_MAPS_API_KEY di file .env untuk cari alamat Google"
    );
    return;
  }
  res.json(found);
});

geoRouter.patch(
  "/customers/me/location",
  auth,
  requireRole("CUSTOMER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    let address = String(req.body?.address ?? "").trim();
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      fail(res, 400, "Koordinat GPS tidak valid");
      return;
    }
    if (!address || looksLikeCoordinates(address)) {
      address =
        (await reverseGeocode(latitude, longitude)) ||
        address ||
        `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user!.id },
    });
    if (!customer) {
      fail(res, 404, "Akun customer tidak ditemukan");
      return;
    }
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { latitude, longitude, address },
    });
    res.json(updated);
  }
);

geoRouter.get(
  "/customers/me",
  auth,
  requireRole("CUSTOMER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user!.id },
      include: { user: { select: { email: true, displayName: true, phone: true } } },
    });
    if (!customer) {
      fail(res, 404, "Akun customer tidak ditemukan");
      return;
    }
    let address = customer.address;
    if (looksLikeCoordinates(address) && customer.latitude && customer.longitude) {
      const resolved = await reverseGeocode(customer.latitude, customer.longitude);
      if (resolved) {
        address = resolved;
        await prisma.customer.update({
          where: { id: customer.id },
          data: { address },
        });
      }
    }
    res.json({
      ...customer,
      address,
      email: customer.user.email,
    });
  }
);

geoRouter.patch(
  "/customers/me",
  auth,
  requireRole("CUSTOMER", "ADMIN"),
  async (req: AuthedRequest, res) => {
    const fullName = String(req.body?.fullName ?? "").trim();
    const phone = String(req.body?.phone ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!fullName || fullName.length < 2) {
      fail(res, 400, "Nama lengkap minimal 2 karakter");
      return;
    }
    if (!phone || phone.length < 8) {
      fail(res, 400, "Nomor HP tidak valid");
      return;
    }
    if (!email || !email.includes("@")) {
      fail(res, 400, "Email tidak valid");
      return;
    }
    if (password && password.length < 6) {
      fail(res, 400, "Password baru minimal 6 karakter");
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: req.user!.id },
    });
    if (!customer) {
      fail(res, 404, "Akun customer tidak ditemukan");
      return;
    }

    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id: req.user!.id } },
    });
    if (taken) {
      fail(res, 400, "Email sudah dipakai akun lain");
      return;
    }

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customer.id },
        data: { fullName, phone },
      }),
      prisma.user.update({
        where: { id: req.user!.id },
        data: {
          displayName: fullName,
          phone,
          email,
          ...(password ? { passwordHash: hashPassword(password) } : {}),
        },
      }),
    ]);

    const updated = await prisma.customer.findUnique({
      where: { id: customer.id },
      include: { user: { select: { email: true, displayName: true } } },
    });
    res.json({
      ...updated,
      email: updated?.user.email,
      displayName: updated?.user.displayName,
    });
  }
);
