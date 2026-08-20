import { prisma } from "../db";
import type { AuthedRequest } from "../lib/http";

export const orderInclude = {
  customer: true,
  courier: true,
  merchants: { include: { merchant: true } },
  items: true,
  payments: { orderBy: { createdAt: "desc" as const } },
} as const;

export async function loadOrder(id: string) {
  return prisma.order.findUnique({ where: { id }, include: orderInclude });
}

export async function resolveCustomer(req: AuthedRequest) {
  if (req.user!.role === "ADMIN" && req.body?.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: String(req.body.customerId) },
    });
    if (!customer) throw new Error("Customer tidak ditemukan");
    return customer;
  }
  const customer = await prisma.customer.findUnique({
    where: { userId: req.user!.id },
  });
  if (!customer) throw new Error("Akun customer tidak ditemukan");
  if (customer.status === "SUSPENDED") {
    throw new Error("Akun pelanggan ditangguhkan Super Admin.");
  }
  return customer;
}

export async function merchantIdFor(req: AuthedRequest): Promise<string> {
  if (
    (req.user?.role === "ADMIN" || req.user?.role === "SUPER_ADMIN") &&
    req.body?.merchantId
  ) {
    return String(req.body.merchantId);
  }
  const merchant = await prisma.merchant.findUnique({
    where: { userId: req.user!.id },
  });
  if (!merchant) {
    throw new Error("Akun outlet tidak ditemukan");
  }
  return merchant.id;
}

export async function courierIdFor(req: AuthedRequest): Promise<string> {
  if (req.user?.role === "ADMIN" && req.body?.courierId) {
    return String(req.body.courierId);
  }
  const courier = await prisma.courier.findUnique({
    where: { userId: req.user!.id },
  });
  if (!courier) {
    throw new Error("Akun kurir tidak ditemukan");
  }
  return courier.id;
}
