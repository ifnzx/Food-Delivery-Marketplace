import { Router } from "express";
import { prisma } from "../db";
import { createToken, newId } from "../lib/auth";
import { fail, type AuthedRequest } from "../lib/http";
import { hashPassword } from "../lib/password";
import { auth } from "../middleware/auth";
import { googleBrowserKey } from "../lib/env";
import { googleMapsConfigured } from "../lib/googleMaps";
import { BUSINESS_RULES } from "../../../02-aturan-bisnis/businessRules";
import { getPricing } from "../services/pricing";
import { getPaymentConfig } from "../services/payment";
import { saveUploadedImage } from "../lib/uploadImage";
import { setCourierKtpPhoto } from "../lib/courierArchive";
import { setCourierKtpProfile } from "../lib/courierKtpProfile";
import {
  compareKtpFields,
  normalizeNik,
  readKtpFromImage,
} from "../services/ktpOcr";

export const authRouter = Router();

authRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mode: "local",
    database: "sqlite",
    settlementPeriod: BUSINESS_RULES.SETTLEMENT_PERIOD,
  });
});

authRouter.get("/config", async (_req, res) => {
  const settings = await prisma.setting.findUnique({ where: { id: "business" } });
  const pricing = await getPricing();
  const payment = await getPaymentConfig();
  res.json({
    mode: "local",
    distanceNote: googleMapsConfigured()
      ? "Ongkir memakai jarak rute Google Maps (berkendara). GPS customer menentukan titik antar."
      : "Belum ada GOOGLE_MAPS_API_KEY. Ongkir memakai jarak garis lurus dari GPS. Set kunci di 03-backend-lokal/.env",
    googleMapsEnabled: googleMapsConfigured(),
    googleMapsBrowserKey: googleBrowserKey() || null,
    commissionRate: pricing.commissionRate,
    deliveryRatePerKm: pricing.deliveryRatePerKm,
    deliveryMode: pricing.deliveryMode,
    deliveryFlatFee: pricing.deliveryFlatFee,
    customerServiceFee: BUSINESS_RULES.CUSTOMER_SERVICE_FEE,
    paymentMethodMvp: BUSINESS_RULES.PAYMENT_METHOD_MVP,
    payment,
    commissionBase: BUSINESS_RULES.COMMISSION_BASE,
    deliveryFeeBelongsTo: BUSINESS_RULES.DELIVERY_FEE_BELONGS_TO,
    settlementPeriod:
      settings?.settlementPeriod ?? BUSINESS_RULES.SETTLEMENT_PERIOD,
    settlementWorkingDays: BUSINESS_RULES.SETTLEMENT_CALENDAR_DAYS,
    settlementCalendarDays: BUSINESS_RULES.SETTLEMENT_CALENDAR_DAYS,
    minimumSettlement:
      settings?.minimumSettlement ?? BUSINESS_RULES.MINIMUM_SETTLEMENT_DEFAULT,
    distanceRounding:
      settings?.distanceRounding ?? BUSINESS_RULES.DISTANCE_ROUNDING_DEFAULT,
    settlementNote:
      "Fee platform wajib dibayar tiap 10 hari kalender. Lewat jatuh tempo = outlet otomatis dimatikan. Pelunasan wajib foto bukti transfer.",
    payoutAccount: {
      bankName:
        settings?.payoutBankName ?? BUSINESS_RULES.PAYOUT_BANK_NAME,
      accountNumber:
        settings?.payoutAccountNumber ?? BUSINESS_RULES.PAYOUT_ACCOUNT_NUMBER,
      accountName:
        settings?.payoutAccountName ?? BUSINESS_RULES.PAYOUT_ACCOUNT_NAME,
      note: "Transfer fee komisi outlet ke rekening founder platform ini.",
    },
  });
});

authRouter.post("/auth/login", async (req, res) => {
  const identifier = String(req.body?.email ?? req.body?.phone ?? "").trim();
  const password = String(req.body?.password ?? "");
  const phoneGuess = normalizeWhatsapp(identifier);
  const usePhone = isWhatsapp(phoneGuess);

  const user = usePhone
    ? await prisma.user.findFirst({
        where: { phone: phoneGuess, role: "CUSTOMER" },
        include: { customer: true, merchant: true, courier: true },
      })
    : await prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
        include: { customer: true, merchant: true, courier: true },
      });
  if (!user || user.passwordHash !== hashPassword(password)) {
    fail(
      res,
      401,
      usePhone ? "Nomor WhatsApp atau password salah" : "Email atau password salah"
    );
    return;
  }

  if (user.status === "SUSPENDED") {
    fail(res, 403, "Akun ditangguhkan. Hubungi Super Admin.");
    return;
  }
  if (user.customer?.status === "SUSPENDED") {
    fail(res, 403, "Akun pelanggan ditangguhkan Super Admin.");
    return;
  }

  if (user.role === "COURIER") {
    const approval = user.courier?.approvalStatus ?? "PENDING";
    if (approval === "PENDING") {
      fail(
        res,
        403,
        "Akun kurir menunggu persetujuan Super Admin. Belum bisa login."
      );
      return;
    }
    if (approval === "REJECTED") {
      fail(res, 403, "Pendaftaran kurir ditolak oleh Super Admin.");
      return;
    }
    if (approval === "SUSPENDED") {
      fail(res, 403, "Akun kurir ditangguhkan. Hubungi Super Admin.");
      return;
    }
  }

  if (user.role === "MERCHANT") {
    const merchantStatus = user.merchant?.status ?? "PENDING";
    if (merchantStatus === "PENDING") {
      fail(
        res,
        403,
        "Akun outlet menunggu persetujuan Super Admin. Belum bisa login."
      );
      return;
    }
    if (merchantStatus === "REJECTED") {
      fail(res, 403, "Pendaftaran outlet ditolak oleh Super Admin.");
      return;
    }
  }

  let merchantBilling: {
    status: string;
    canOperate: boolean;
    message: string | null;
    outstandingAmount: number;
    feeDueAt: string | null;
  } | null = null;

  if (user.role === "MERCHANT" && user.merchant) {
    const { enforceMerchantBilling, getMerchantBilling } = await import(
      "../services/merchantBilling"
    );
    await enforceMerchantBilling(user.merchant.id);
    const billing = await getMerchantBilling(user.merchant.id);
    if (billing) {
      merchantBilling = {
        status: billing.status,
        canOperate: billing.canOperate,
        message: billing.message,
        outstandingAmount: billing.outstandingAmount,
        feeDueAt: billing.feeDueAt ? billing.feeDueAt.toISOString() : null,
      };
    }
  }

  const authUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  };
  res.json({
    token: createToken(authUser),
    user: {
      ...authUser,
      status: user.status,
      customerId: user.customer?.id ?? null,
      merchantId: user.merchant?.id ?? null,
      courierId: user.courier?.id ?? null,
      courierApprovalStatus: user.courier?.approvalStatus ?? null,
      merchantStatus: user.merchant?.status ?? null,
      merchantBilling,
    },
  });
});

function normalizeWhatsapp(raw: string) {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (digits.startsWith("62") && digits.length >= 11) return "0" + digits.slice(2);
  return digits;
}

function isWhatsapp(phone: string) {
  return /^08\d{8,12}$/.test(phone);
}

authRouter.post("/auth/customer-otp/send", async (req, res) => {
  const phone = normalizeWhatsapp(String(req.body?.phone ?? "").trim());
  if (!isWhatsapp(phone)) {
    fail(res, 400, "Nomor WhatsApp tidak valid. Contoh: 081234567890");
    return;
  }
  const existingPhone = await prisma.user.findFirst({
    where: { phone, role: "CUSTOMER" },
  });
  if (existingPhone) {
    fail(res, 400, "Nomor WhatsApp sudah terdaftar. Silakan masuk.");
    return;
  }
  const { issueCustomerOtp, phoneToWaIntl } = await import("../services/customerOtp");
  const code = issueCustomerOtp(phone);
  const waIntl = phoneToWaIntl(phone);
  console.log(`[OTP] WhatsApp ${phone} (${waIntl}) kode ${code}`);
  res.json({
    ok: true,
    phone,
    waIntl,
    expiresInSec: 300,
    demoOtp: code,
    message: `Kode OTP dikirim ke WhatsApp ${phone}. Berlaku 5 menit.`,
  });
});

authRouter.post("/auth/register-customer", async (req, res) => {
  const fullName = String(req.body?.fullName ?? req.body?.name ?? "").trim();
  const phone = normalizeWhatsapp(String(req.body?.phone ?? "").trim());
  const password = String(req.body?.password ?? "");
  const otp = String(req.body?.otp ?? req.body?.code ?? "").trim();
  const emailRaw = String(req.body?.email ?? "").trim().toLowerCase();
  const email = emailRaw || `${phone}@wa.customer.local`;

  if (!fullName || !phone || !password) {
    fail(res, 400, "Nama, nomor WhatsApp, dan password wajib diisi");
    return;
  }
  if (fullName.length < 2) {
    fail(res, 400, "Isi nama lengkap");
    return;
  }
  if (!isWhatsapp(phone)) {
    fail(res, 400, "Nomor WhatsApp tidak valid. Contoh: 081234567890");
    return;
  }
  if (password.length < 6) {
    fail(res, 400, "Password minimal 6 karakter");
    return;
  }
  if (!/^\d{6}$/.test(otp)) {
    fail(res, 400, "Masukkan kode OTP 6 digit dari WhatsApp");
    return;
  }
  const { consumeCustomerOtp } = await import("../services/customerOtp");
  const otpError = consumeCustomerOtp(phone, otp);
  if (otpError) {
    fail(res, 400, otpError);
    return;
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    fail(res, 400, "Email sudah terdaftar");
    return;
  }
  const existingPhone = await prisma.user.findFirst({
    where: { phone, role: "CUSTOMER" },
  });
  if (existingPhone) {
    fail(res, 400, "Nomor WhatsApp sudah terdaftar. Silakan masuk.");
    return;
  }

  const created = await prisma.user.create({
    data: {
      id: newId("USR-CUS"),
      email,
      passwordHash: hashPassword(password),
      displayName: fullName,
      phone,
      role: "CUSTOMER",
      status: "ACTIVE",
      customer: {
        create: {
          id: newId("CUS"),
          fullName,
          phone,
          address: "Jl. Veteran, Banjarmasin",
          latitude: -3.3249,
          longitude: 114.5921,
        },
      },
    },
    include: { customer: true },
  });

  const authUser = {
    id: created.id,
    email: created.email,
    role: created.role,
    displayName: created.displayName,
  };
  res.status(201).json({
    ok: true,
    token: createToken(authUser),
    user: {
      ...authUser,
      status: created.status,
      customerId: created.customer?.id ?? null,
      merchantId: null,
      courierId: null,
    },
    message: "Akun berhasil dibuat.",
  });
});

authRouter.post("/auth/ktp-ocr", async (req, res) => {
  const ktpPhotoRaw = req.body?.ktpPhotoUrl ?? req.body?.ktpPhoto;
  const fullName = String(req.body?.fullName ?? "").trim();
  const nik = normalizeNik(String(req.body?.nik ?? ""));

  const ocr = await readKtpFromImage(ktpPhotoRaw);
  const mismatches = compareKtpFields({ fullName, nik }, ocr);

  res.json({
    ok: true,
    ocr: {
      nik: ocr.nik,
      fullName: ocr.fullName,
      placeOfBirth: ocr.placeOfBirth,
      dateOfBirth: ocr.dateOfBirth,
      address: ocr.address,
      gender: ocr.gender,
      religion: ocr.religion,
      confidence: ocr.confidence,
      provider: ocr.provider,
      note: ocr.note,
    },
    mismatches,
    editable: true,
    message:
      mismatches.length > 0
        ? "Ada data yang tidak cocok. Periksa dan koreksi sebelum kirim pendaftaran."
        : "Data KTP terbaca. Periksa sekali lagi sebelum kirim.",
  });
});

authRouter.post("/auth/register-courier", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const fullName = String(req.body?.fullName ?? "").trim();
  const phone = normalizeWhatsapp(String(req.body?.phone ?? "").trim());
  const nik = normalizeNik(String(req.body?.nik ?? ""));
  const placeOfBirth = String(req.body?.placeOfBirth ?? "").trim();
  const dateOfBirth = String(req.body?.dateOfBirth ?? "").trim();
  const addressOnKtp = String(req.body?.addressOnKtp ?? req.body?.address ?? "").trim();
  const fullNameFromOcr = String(req.body?.fullNameFromOcr ?? "").trim();
  const ocrConfidence = Number(req.body?.ocrConfidence ?? 0);
  const ktpPhotoRaw = req.body?.ktpPhotoUrl ?? req.body?.ktpPhoto;

  if (!email || !password || !fullName || !phone) {
    fail(res, 400, "Nama sesuai KTP, nomor WhatsApp, email, dan password wajib diisi");
    return;
  }
  if (fullName.split(/\s+/).length < 2) {
    fail(res, 400, "Isi nama lengkap sesuai KTP (minimal dua kata)");
    return;
  }
  if (nik && nik.length !== 16) {
    fail(res, 400, "NIK harus 16 digit angka");
    return;
  }
  if (!nik) {
    fail(res, 400, "NIK wajib diisi setelah verifikasi foto KTP");
    return;
  }
  if (!isWhatsapp(phone)) {
    fail(res, 400, "Nomor WhatsApp tidak valid. Contoh: 081234567890");
    return;
  }
  if (password.length < 6) {
    fail(res, 400, "Password minimal 6 karakter");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    fail(res, 400, "Email sudah terdaftar");
    return;
  }

  const userId = newId("USR-COU");
  const courierId = newId("COURIER");
  const ktpPhotoUrl = saveUploadedImage("ktp", courierId, ktpPhotoRaw);
  if (!ktpPhotoUrl) {
    fail(res, 400, "Foto KTP wajib diunggah dengan jelas (JPEG/PNG)");
    return;
  }

  const created = await prisma.user.create({
    data: {
      id: userId,
      email,
      passwordHash: hashPassword(password),
      displayName: fullName,
      phone,
      role: "COURIER",
      status: "ACTIVE",
      courier: {
        create: {
          id: courierId,
          fullName,
          phone,
          approvalStatus: "PENDING",
          isOnline: false,
        },
      },
    },
    include: { courier: true },
  });
  await setCourierKtpPhoto(courierId, ktpPhotoUrl);

  const ocr = await readKtpFromImage(ktpPhotoRaw);
  const mismatches = compareKtpFields({ fullName, nik }, ocr);
  await setCourierKtpProfile(courierId, {
    nik,
    placeOfBirth: placeOfBirth || ocr.placeOfBirth,
    dateOfBirth: dateOfBirth || ocr.dateOfBirth,
    addressOnKtp: addressOnKtp || ocr.address,
    fullNameFromOcr: fullNameFromOcr || ocr.fullName,
    ocrConfidence: ocrConfidence || ocr.confidence,
    mismatchFlags: mismatches,
  });

  res.status(201).json({
    ok: true,
    message:
      "Pendaftaran terkirim ke Super Admin. Akun baru bisa dipakai setelah disetujui.",
    courierId: created.courier?.id,
    approvalStatus: "PENDING",
  });
});

authRouter.post("/auth/register-outlet", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const name = String(req.body?.name ?? req.body?.outletName ?? "").trim();
  const ownerName = String(
    req.body?.ownerName ?? req.body?.fullName ?? ""
  ).trim();
  const phone = normalizeWhatsapp(String(req.body?.phone ?? "").trim());
  const address = String(req.body?.address ?? "").trim();
  const description = String(req.body?.description ?? "").trim();
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);

  if (!name || !ownerName || !phone || !email || !password || !address) {
    fail(
      res,
      400,
      "Nama warung, nama pemilik, WhatsApp, email, alamat, dan password wajib diisi"
    );
    return;
  }
  if (name.length < 2) {
    fail(res, 400, "Nama warung terlalu pendek");
    return;
  }
  if (ownerName.split(/\s+/).length < 2) {
    fail(res, 400, "Isi nama lengkap pemilik (minimal dua kata)");
    return;
  }
  if (!isWhatsapp(phone)) {
    fail(res, 400, "Nomor WhatsApp tidak valid. Contoh: 081234567890");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(res, 400, "Email tidak valid");
    return;
  }
  if (password.length < 6) {
    fail(res, 400, "Password minimal 6 karakter");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    fail(res, 400, "Email sudah terdaftar");
    return;
  }
  const existingPhone = await prisma.user.findFirst({
    where: { phone, role: "MERCHANT" },
  });
  if (existingPhone) {
    fail(res, 400, "Nomor WhatsApp sudah terdaftar sebagai outlet");
    return;
  }

  const lat = Number.isFinite(latitude) ? latitude : -3.3194;
  const lng = Number.isFinite(longitude) ? longitude : 114.5921;
  const userId = newId("USR-OUT");
  const merchantId = newId("OUTLET");

  const created = await prisma.user.create({
    data: {
      id: userId,
      email,
      passwordHash: hashPassword(password),
      displayName: ownerName,
      phone,
      role: "MERCHANT",
      status: "ACTIVE",
      merchant: {
        create: {
          id: merchantId,
          name,
          description: description || `${name} — ${address}`,
          phone,
          address,
          latitude: lat,
          longitude: lng,
          isOpen: false,
          status: "PENDING",
        },
      },
    },
    include: { merchant: true },
  });

  res.status(201).json({
    ok: true,
    message:
      "Pendaftaran terkirim ke Super Admin. Akun outlet bisa dipakai setelah disetujui.",
    merchantId: created.merchant?.id,
    status: "PENDING",
  });
});

authRouter.post("/auth/courier-ktp", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const nik = normalizeNik(String(req.body?.nik ?? ""));
  const placeOfBirth = String(req.body?.placeOfBirth ?? "").trim();
  const dateOfBirth = String(req.body?.dateOfBirth ?? "").trim();
  const addressOnKtp = String(req.body?.addressOnKtp ?? req.body?.address ?? "").trim();
  const fullName = String(req.body?.fullName ?? "").trim();
  const fullNameFromOcr = String(req.body?.fullNameFromOcr ?? "").trim();
  const ocrConfidence = Number(req.body?.ocrConfidence ?? 0);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { courier: true },
  });
  if (!user || user.passwordHash !== hashPassword(password) || user.role !== "COURIER" || !user.courier) {
    fail(res, 401, "Email atau password salah");
    return;
  }
  const ktpPhotoUrl = saveUploadedImage(
    "ktp",
    user.courier.id,
    req.body?.ktpPhotoUrl ?? req.body?.ktpPhoto
  );
  if (!ktpPhotoUrl) {
    fail(res, 400, "Foto KTP wajib JPEG/PNG yang jelas");
    return;
  }
  await setCourierKtpPhoto(user.courier.id, ktpPhotoUrl);

  const ocr = await readKtpFromImage(
    req.body?.ktpPhotoUrl ?? req.body?.ktpPhoto
  );
  const mismatches = compareKtpFields(
    { fullName: fullName || user.courier.fullName, nik },
    ocr
  );
  if (nik || placeOfBirth || dateOfBirth || addressOnKtp || fullNameFromOcr) {
    await setCourierKtpProfile(user.courier.id, {
      nik: nik || ocr.nik,
      placeOfBirth: placeOfBirth || ocr.placeOfBirth,
      dateOfBirth: dateOfBirth || ocr.dateOfBirth,
      addressOnKtp: addressOnKtp || ocr.address,
      fullNameFromOcr: fullNameFromOcr || ocr.fullName,
      ocrConfidence: ocrConfidence || ocr.confidence,
      mismatchFlags: mismatches,
    });
  }
  if (fullName && fullName !== user.courier.fullName) {
    await prisma.courier.update({
      where: { id: user.courier.id },
      data: { fullName },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { displayName: fullName },
    });
  }

  res.json({
    ok: true,
    ktpPhotoUrl,
    message: "Foto KTP tersimpan. Super Admin bisa cek dan menyetujui akun.",
  });
});

authRouter.get("/me", auth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { customer: true, merchant: true, courier: true },
  });
  res.json(user);
});
