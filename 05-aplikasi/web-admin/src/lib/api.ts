export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:3001";

export function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export type Session = {
  token: string;
  id: string;
  email: string;
  displayName: string;
  role: string;
};

const TOKEN_KEY = "dk_admin_token";
const USER_KEY = "dk_admin_user";

export function saveSession(session: Session) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (!token || !raw) return null;
  try {
    return { ...JSON.parse(raw), token };
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };
  if (session?.token) {
    (headers as Record<string, string>).Authorization = `Bearer ${session.token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request gagal (${res.status})`);
  }
  return data as T;
}

export const api = {
  login(email: string, password: string) {
    return request<{ token: string; user: Omit<Session, "token"> }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  },
  dashboard() {
    return request<{
      totalCustomer: number;
      merchantActive: number;
      totalCourier: number;
      courierOnline: number;
      courierPending: number;
      merchantPending?: number;
      supportOpen?: number;
      orderCount: number;
      orderCompleted: number;
      orderCancelled: number;
      gmv: number;
      platformFee: number;
      courierEarningsPaid?: number;
      outstandingSettlement: number;
      pendingSettlements: number;
      activeOrders?: number;
      waitingOutlet?: number;
      withCourier?: number;
      customerSuspended?: number;
      merchantSuspended?: number;
      courierSuspended?: number;
      commissionRate: number;
      deliveryMode?: "PER_KM" | "FLAT";
      deliveryRatePerKm?: number;
      deliveryFlatFee?: number;
      settlementDays?: number;
      outletRanking?: Array<{
        id: string;
        name: string;
        completedOrders: number;
        totalSales: number;
        totalCommission: number;
      }>;
      courierRanking?: Array<{
        id: string;
        fullName: string;
        completedCount: number;
        earningsTotal: number;
        isOnline: boolean;
      }>;
      feeReminders?: Array<{
        id: string;
        name: string;
        outstandingAmount: number;
        feeDueAt: string | null;
        isOverdue: boolean;
        daysUntilDue: number | null;
        daysOverdue: number;
        status: string;
        message: string | null;
      }>;
      priorityRevenueTotal?: number;
      priorityRevenueCount?: number;
      recentPriorityPayments?: Array<{
        id: string;
        courierId: string;
        courierName: string;
        courierPhone: string;
        fee: number;
        hours: number;
        proofUrl: string | null;
        approvedAt: string | null;
        priorityUntil: string | null;
      }>;
      roleNote?: string;
    }>("/api/admin/dashboard");
  },
  ordersMonitor() {
    return request<{
      pipeline: {
        outlet: number;
        courier: number;
        done: number;
        cancelled: number;
        active: number;
      };
      updatedAt: string;
      orders: Array<{
        id: string;
        status: string;
        stage: string;
        paymentMethod: string;
        paymentStatus: string;
        createdAt: string;
        completedAt: string | null;
        customer: {
          id: string;
          name: string;
          phone: string;
          address: string;
        };
        outlets: Array<{
          id: string;
          name: string;
          status: string;
          subtotal: number;
          commissionAmount: number;
          merchantAmount: number;
        }>;
        courier: {
          id: string;
          name: string;
          phone: string;
          isOnline: boolean;
        } | null;
        money: {
          foodSubtotal: number;
          deliveryFee: number;
          platformFee: number;
          courierEarning: number;
          grandTotal: number;
        };
        distanceKm: number;
        itemCount: number;
        timeline: Array<{
          key: string;
          label: string;
          at: string | null;
          actor: string;
          done: boolean;
        }>;
      }>;
    }>("/api/admin/orders");
  },
  customers() {
    return request<
      Array<{
        id: string;
        fullName: string;
        phone: string;
        email: string;
        status: string;
        address: string;
        orderCount: number;
        completedCount: number;
        totalSpent: number;
        lastOrderAt: string | null;
        recentOrders?: Array<{
          id: string;
          status: string;
          grandTotal: number;
          createdAt: string;
        }>;
      }>
    >("/api/admin/customers");
  },
  merchants() {
    return request<
      Array<{
        id: string;
        name: string;
        ownerName?: string;
        phone: string;
        email: string;
        address: string;
        createdAt?: string;
        status: string;
        suspensionState?: string | null;
        isOpen: boolean;
        isFeatured?: boolean;
        featuredRequestStatus?: string | null;
        featuredRequestedAt?: string | null;
        outstandingAmount: number;
        outstandingSince?: string | null;
        feeDueAt?: string | null;
        isOverdue?: boolean;
        billingMessage?: string | null;
        commissionRate: number;
        featuredCommissionRate?: number;
        totalSales: number;
        totalCommission: number;
        merchantAmount: number;
        completedOrders: number;
        transactions?: Array<{
          orderId: string;
          subtotal: number;
          commissionRate: number;
          commissionAmount: number;
          merchantAmount: number;
          completedAt: string;
        }>;
        settlements: Array<{
          id: string;
          status: string;
          paidAmount: number;
          commissionAmount: number;
          createdAt: string;
          proofUrl: string | null;
        }>;
      }>
    >("/api/admin/merchants");
  },
  async couriers() {
    const data = await request<unknown>("/api/admin/couriers");
    if (Array.isArray(data)) {
      return {
        couriers: data as Array<{
          id: string;
          fullName: string;
          phone: string;
          ktpPhotoUrl?: string;
          email: string;
          approvalStatus: string;
          isOnline: boolean;
          lastLatitude: number | null;
          lastLongitude: number | null;
          lastLocationAt: string | null;
          activeOrderId: string | null;
          createdAt?: string;
          completedCount: number;
          earningsTotal: number;
          nik?: string;
          placeOfBirth?: string;
          dateOfBirth?: string;
          addressOnKtp?: string;
          fullNameFromOcr?: string;
          ocrConfidence?: number;
          mismatchFlags?: string[];
          priorityUntil?: string | null;
          priorityActive?: boolean;
          priorityRequestStatus?: string | null;
          priorityRequestedAt?: string | null;
          priorityRequestFee?: number;
          priorityProofUrl?: string | null;
          priorityFee?: number;
          priorityDays?: number;
          priorityHours?: number;
          priorityDuration?: number;
          priorityUnit?: "HOUR" | "DAY" | "MONTH";
          priorityLabel?: string;
        }>,
        priorityRevenueTotal: 0,
        priorityRevenueCount: 0,
        recentPriorityPayments: [] as Array<{
          id: string;
          courierId: string;
          courierName: string;
          courierPhone: string;
          fee: number;
          hours: number;
          proofUrl: string | null;
          approvedAt: string | null;
          priorityUntil: string | null;
        }>,
      };
    }
    return data as {
      couriers: Array<{
        id: string;
        fullName: string;
        phone: string;
        ktpPhotoUrl?: string;
        email: string;
        approvalStatus: string;
        isOnline: boolean;
        lastLatitude: number | null;
        lastLongitude: number | null;
        lastLocationAt: string | null;
        activeOrderId: string | null;
        createdAt?: string;
        completedCount: number;
        earningsTotal: number;
        nik?: string;
        placeOfBirth?: string;
        dateOfBirth?: string;
        addressOnKtp?: string;
        fullNameFromOcr?: string;
        ocrConfidence?: number;
        mismatchFlags?: string[];
        priorityUntil?: string | null;
        priorityActive?: boolean;
        priorityRequestStatus?: string | null;
        priorityRequestedAt?: string | null;
        priorityRequestFee?: number;
        priorityProofUrl?: string | null;
        priorityFee?: number;
        priorityDays?: number;
        priorityHours?: number;
        priorityDuration?: number;
        priorityUnit?: "HOUR" | "DAY" | "MONTH";
        priorityLabel?: string;
      }>;
      priorityRevenueTotal: number;
      priorityRevenueCount: number;
      recentPriorityPayments: Array<{
        id: string;
        courierId: string;
        courierName: string;
        courierPhone: string;
        fee: number;
        hours: number;
        proofUrl: string | null;
        approvedAt: string | null;
        priorityUntil: string | null;
      }>;
    };
  },
  courierDetail(id: string) {
    return request<{
      id: string;
      fullName: string;
      phone: string;
      email: string;
      approvalStatus: string;
      ktpPhotoUrl: string;
      approvedAt: string | null;
      approvedBy: string;
      rejectReason: string;
      createdAt: string;
      nik?: string;
      placeOfBirth?: string;
      dateOfBirth?: string;
      addressOnKtp?: string;
      fullNameFromOcr?: string;
      ocrConfidence?: number;
      mismatchFlags?: string[];
      lastLatitude: number | null;
      lastLongitude: number | null;
      incidents: Array<{
        id: string;
        title: string;
        note: string;
        createdAt: string;
        createdBy: string;
      }>;
      orders: Array<{
        id: string;
        status: string;
        courierEarning: number;
        grandTotal: number;
        deliveryAddress: string;
        createdAt: string;
        completedAt: string | null;
      }>;
    }>(`/api/admin/courier-archive?id=${encodeURIComponent(id)}`);
  },
  courierDecision(id: string, action: "approve" | "reject" | "suspend", reason = "") {
    return request<{ ok: boolean; message: string }>(
      "/api/admin/courier-decision",
      {
        method: "POST",
        body: JSON.stringify({ id, action, reason }),
      }
    );
  },
  uploadCourierKtp(id: string, ktpPhotoUrl: string) {
    return request<{ ok: boolean; message: string; ktpPhotoUrl: string }>(
      "/api/admin/courier-ktp",
      {
        method: "POST",
        body: JSON.stringify({ id, ktpPhotoUrl }),
      }
    );
  },
  addCourierIncident(id: string, title: string, note: string) {
    return request<{ ok: boolean; message: string }>(
      "/api/admin/courier-incident",
      {
        method: "POST",
        body: JSON.stringify({ id, title, note }),
      }
    );
  },
  approveCourier(id: string) {
    return this.courierDecision(id, "approve");
  },
  rejectCourier(id: string) {
    return this.courierDecision(id, "reject");
  },
  suspendCourier(id: string) {
    return this.courierDecision(id, "suspend");
  },
  settlements() {
    return request<
      Array<{
        id: string;
        merchantId: string;
        commissionAmount: number;
        paidAmount: number;
        status: string;
        proofUrl: string | null;
        createdAt: string;
        merchant?: { name: string };
      }>
    >("/api/settlements");
  },
  verifySettlement(id: string, approve: boolean) {
    return request(`/api/settlements/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ approve }),
    });
  },
  createSettlementForMerchant(merchantId: string) {
    return request<{ id: string }>("/api/settlements", {
      method: "POST",
      body: JSON.stringify({
        merchantId,
        proofUrl: "local://bukti-founder-monitor.jpg",
      }),
    });
  },
  payoutAccount() {
    return request<{
      bankName: string;
      accountNumber: string;
      accountName: string;
      note: string;
    }>("/api/admin/payout-account");
  },
  updatePayoutAccount(body: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  }) {
    return request<{
      ok: boolean;
      message: string;
      payoutAccount: {
        bankName: string;
        accountNumber: string;
        accountName: string;
      };
    }>("/api/admin/payout-account", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
  pricing() {
    return request<{
      commissionRate: number;
      commissionPercent: number;
      deliveryMode: "PER_KM" | "FLAT";
      deliveryRatePerKm: number;
      deliveryFlatFee: number;
      exampleFood: number;
      exampleKm: number;
      exampleCommission: number;
      exampleDelivery: number;
    }>("/api/admin/pricing");
  },
  updatePricing(body: {
    commissionPercent: number;
    deliveryMode: "PER_KM" | "FLAT";
    deliveryRatePerKm: number;
    deliveryFlatFee: number;
  }) {
    return request<{
      ok: boolean;
      message: string;
      pricing: {
        commissionRate: number;
        deliveryMode: "PER_KM" | "FLAT";
        deliveryRatePerKm: number;
        deliveryFlatFee: number;
      };
    }>("/api/admin/pricing", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
  placement() {
    return request<{
      featuredCommissionRate: number;
      featuredCommissionPercent: number;
      courierPriorityFee: number;
      courierPriorityDays: number;
      courierPriorityHours: number;
      courierPriorityDuration: number;
      courierPriorityUnit: "HOUR" | "DAY" | "MONTH";
      courierPriorityLabel: string;
    }>("/api/admin/placement");
  },
  updatePlacement(body: {
    featuredCommissionPercent: number;
    courierPriorityFee: number;
    courierPriorityDuration: number;
    courierPriorityUnit: "HOUR" | "DAY" | "MONTH";
  }) {
    return request<{
      ok: boolean;
      message: string;
      featuredCommissionRate: number;
      courierPriorityFee: number;
      courierPriorityDays: number;
      courierPriorityHours: number;
      courierPriorityDuration: number;
      courierPriorityUnit: "HOUR" | "DAY" | "MONTH";
      courierPriorityLabel: string;
    }>("/api/admin/placement", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
  setMerchantFeatured(
    id: string,
    featured: boolean,
    action?: "APPROVE" | "REJECT" | "ACTIVATE" | "REVOKE"
  ) {
    return request<{
      ok: boolean;
      message: string;
      featured: boolean;
      commissionRate?: number;
      featuredRequestStatus?: string | null;
    }>(`/api/admin/merchants/${encodeURIComponent(id)}/feature`, {
      method: "POST",
      body: JSON.stringify({
        featured,
        ...(action ? { action } : {}),
      }),
    });
  },
  setCourierPriority(
    id: string,
    active: boolean,
    days?: number,
    action?: "APPROVE" | "REJECT" | "ACTIVATE" | "REVOKE"
  ) {
    return request<{
      ok: boolean;
      message: string;
      priorityActive: boolean;
      priorityUntil: string | null;
      priorityRequestStatus?: string | null;
    }>(`/api/admin/couriers/${encodeURIComponent(id)}/priority`, {
      method: "POST",
      body: JSON.stringify({ active, days, action }),
    });
  },
  accountControl(
    party: "CUSTOMER" | "OUTLET" | "COURIER",
    id: string,
    action: "SUSPEND" | "ACTIVATE" | "FORCE_CLOSE" | "FORCE_OPEN" | "APPROVE" | "REJECT"
  ) {
    return request<{ ok: boolean; message: string }>(
      "/api/admin/account-control",
      {
        method: "POST",
        body: JSON.stringify({ party, id, action }),
      }
    );
  },
  supportReports(filters?: { status?: string; role?: string; q?: string }) {
    const qs = new URLSearchParams();
    if (filters?.status) qs.set("status", filters.status);
    if (filters?.role) qs.set("role", filters.role);
    if (filters?.q) qs.set("q", filters.q);
    const query = qs.toString();
    return request<
      Array<{
        id: string;
        reporterUserId: string;
        reporterRole: string;
        reporterName: string;
        reporterPhone: string;
        reporterEmail: string;
        category: string;
        subject: string;
        body: string;
        orderId: string | null;
        status: string;
        adminNote: string | null;
        resolvedBy: string | null;
        resolvedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }>
    >(`/api/admin/support-reports${query ? `?${query}` : ""}`);
  },
  updateSupportReport(
    id: string,
    body: { status?: string; adminNote?: string }
  ) {
    return request<{
      ok: boolean;
      message: string;
      report: {
        id: string;
        status: string;
        adminNote: string | null;
        resolvedAt: string | null;
        resolvedBy: string | null;
      };
    }>(`/api/admin/support-reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};
