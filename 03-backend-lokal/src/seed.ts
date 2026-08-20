import { prisma } from "./db";
import { hashPassword } from "./lib/password";
import { BUSINESS_RULES } from "../../02-aturan-bisnis/businessRules";

const PASSWORD = "password123";

async function seed(): Promise<void> {
  await prisma.orderItem.deleteMany();
  await prisma.orderMerchant.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.courierAssignment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.merchantSettlement.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.courier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  const passwordHash = hashPassword(PASSWORD);

  await prisma.setting.create({
    data: {
      id: "business",
      commissionRate: BUSINESS_RULES.COMMISSION_RATE,
      deliveryRatePerKm: BUSINESS_RULES.DELIVERY_RATE_PER_KM,
      customerServiceFee: BUSINESS_RULES.CUSTOMER_SERVICE_FEE,
      paymentMethodMvp: BUSINESS_RULES.PAYMENT_METHOD_MVP,
      onlinePaymentsEnabled: BUSINESS_RULES.ONLINE_PAYMENTS_ENABLED_DEFAULT,
      paymentProvider: BUSINESS_RULES.PAYMENT_PROVIDER_DEFAULT,
      settlementPeriod: BUSINESS_RULES.SETTLEMENT_PERIOD,
      minimumSettlement: 10000,
      distanceRounding: BUSINESS_RULES.DISTANCE_ROUNDING_DEFAULT,
      commissionBase: BUSINESS_RULES.COMMISSION_BASE,
      deliveryFeeBelongsTo: BUSINESS_RULES.DELIVERY_FEE_BELONGS_TO,
      payoutBankName: BUSINESS_RULES.PAYOUT_BANK_NAME,
      payoutAccountNumber: BUSINESS_RULES.PAYOUT_ACCOUNT_NUMBER,
      payoutAccountName: BUSINESS_RULES.PAYOUT_ACCOUNT_NAME,
    },
  });

  await prisma.user.create({
    data: {
      id: "USR-ADMIN",
      email: "admin@local.test",
      passwordHash,
      displayName: "Admin Platform",
      phone: "081100000001",
      role: "ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      id: "USR-CUS-001",
      email: "andi@local.test",
      passwordHash,
      displayName: "Andi",
      phone: "081200000001",
      role: "CUSTOMER",
      customer: {
        create: {
          id: "CUS-001",
          fullName: "Andi",
          phone: "081200000001",
          address: "Jl. Veteran, Banjarmasin",
          latitude: -3.3249,
          longitude: 114.5921,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "USR-OUT-001",
      email: "outlet-a@local.test",
      passwordHash,
      displayName: "Warung A",
      phone: "081300000001",
      role: "MERCHANT",
      merchant: {
        create: {
          id: "OUTLET-001",
          name: "Warung A",
          description: "Nasi goreng dan ayam",
          phone: "081300000001",
          address: "Jl. A. Yani Km 3, Banjarmasin",
          latitude: -3.3194,
          longitude: 114.5921,
          outstandingAmount: 49500,
          // Demo Beranda: jatuh tempo besok (9 hari kalender lalu + 10 hari = tempo +1 hari)
          outstandingSince: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
          suspensionState: null,
          isOpen: true,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "USR-OUT-002",
      email: "outlet-b@local.test",
      passwordHash,
      displayName: "Warung B",
      phone: "081300000002",
      role: "MERCHANT",
      merchant: {
        create: {
          id: "OUTLET-002",
          name: "Warung B",
          description: "Mie dan minuman",
          phone: "081300000002",
          address: "Jl. Lambung Mangkurat, Banjarmasin",
          latitude: -3.3210,
          longitude: 114.5980,
          outstandingAmount: 0,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "USR-COU-001",
      email: "budi@local.test",
      passwordHash,
      displayName: "Budi",
      phone: "081400000001",
      role: "COURIER",
      courier: {
        create: {
          id: "COURIER-001",
          fullName: "Budi",
          phone: "081400000001",
          approvalStatus: "APPROVED",
          isOnline: true,
          lastLatitude: -3.3200,
          lastLongitude: 114.5940,
          lastLocationAt: new Date(),
          activeOrderId: "ORD-001",
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "USR-COU-002",
      email: "citra@local.test",
      passwordHash,
      displayName: "Citra",
      phone: "081400000002",
      role: "COURIER",
      courier: {
        create: {
          id: "COURIER-002",
          fullName: "Citra Putri",
          phone: "081400000002",
          approvalStatus: "PENDING",
          isOnline: false,
        },
      },
    },
  });

  await prisma.menu.createMany({
    data: [
      {
        id: "MENU-A1",
        merchantId: "OUTLET-001",
        category: "Makanan",
        name: "Nasi Goreng Spesial",
        description: "Porsi lengkap",
        price: 50000,
      },
      {
        id: "MENU-A2",
        merchantId: "OUTLET-001",
        category: "Makanan",
        name: "Ayam Goreng",
        description: "Ayam krispi",
        price: 50000,
      },
      {
        id: "MENU-B1",
        merchantId: "OUTLET-002",
        category: "Makanan",
        name: "Mie Ayam",
        description: "Mie ayam komplit",
        price: 40000,
      },
      {
        id: "MENU-B2",
        merchantId: "OUTLET-002",
        category: "Minuman",
        name: "Es Teh",
        description: "Es teh manis",
        price: 40000,
      },
    ],
  });

  await prisma.order.create({
    data: {
      id: "ORD-001",
      customerId: "CUS-001",
      status: "COMPLETED",
      paymentMethod: "CASH",
      paymentStatus: "PAID_CASH",
      foodSubtotal: 100000,
      deliveryFee: 10000,
      platformFee: 15000,
      grandTotal: 110000,
      courierEarning: 10000,
      deliveryAddress: "Jl. Veteran, Banjarmasin",
      deliveryLatitude: -3.3249,
      deliveryLongitude: 114.5921,
      routeDistanceKm: 5,
      billedDistanceKm: 5,
      courierId: "COURIER-001",
      acceptedAt: new Date(),
      pickedUpAt: new Date(),
      deliveredAt: new Date(),
      completedAt: new Date(),
      merchants: {
        create: {
          id: "OM-001",
          merchantId: "OUTLET-001",
          subtotal: 100000,
          commissionRate: 0.15,
          commissionAmount: 15000,
          merchantAmount: 85000,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      },
      payments: {
        create: {
          id: "PAY-001",
          customerId: "CUS-001",
          method: "CASH",
          channel: "CASH_ON_DELIVERY",
          provider: "NONE",
          amount: 110000,
          currency: "IDR",
          status: "COLLECTED",
          collectedByCourierId: "COURIER-001",
          paidAt: new Date(),
        },
      },
      transactions: {
        create: [
          {
            id: "TRX-001",
            type: "PLATFORM_FEE",
            partyType: "PLATFORM",
            partyId: "PLATFORM",
            amount: 15000,
          },
          {
            id: "TRX-002",
            type: "MERCHANT_PAYABLE",
            partyType: "MERCHANT",
            partyId: "OUTLET-001",
            amount: 85000,
          },
          {
            id: "TRX-003",
            type: "COURIER_EARNING",
            partyType: "COURIER",
            partyId: "COURIER-001",
            amount: 10000,
          },
        ],
      },
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        id: "OI-001",
        orderId: "ORD-001",
        orderMerchantId: "OM-001",
        merchantId: "OUTLET-001",
        menuId: "MENU-A1",
        name: "Nasi Goreng Spesial",
        unitPrice: 50000,
        qty: 1,
        subtotal: 50000,
      },
      {
        id: "OI-002",
        orderId: "ORD-001",
        orderMerchantId: "OM-001",
        merchantId: "OUTLET-001",
        menuId: "MENU-A2",
        name: "Ayam Goreng",
        unitPrice: 50000,
        qty: 1,
        subtotal: 50000,
      },
    ],
  });

  await prisma.courier.update({
    where: { id: "COURIER-001" },
    data: { activeOrderId: null },
  });

  console.log("Seed selesai.");
  console.log("Login demo (password: password123)");
  console.log("  Admin    admin@local.test");
  console.log("  Customer andi@local.test");
  console.log("  Outlet A outlet-a@local.test (demo tagihan overdue → auto OFF)");
  console.log("  Outlet B outlet-b@local.test");
  console.log("  Kurir    budi@local.test (APPROVED)");
  console.log("  Kurir    citra@local.test (PENDING — perlu approve Super Admin)");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
