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
  merchantId?: string | null;
};

const TOKEN_KEY = "dk_outlet_token";
const USER_KEY = "dk_outlet_user";

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

export type CommissionBucket = {
  rate: number;
  percent: number;
  orderCount: number;
  foodSubtotal: number;
  commissionAmount: number;
  label: string;
};

export type MerchantProfile = {
  id: string;
  name: string;
  phone: string;
  address: string;
  description: string;
  isOpen: boolean;
  status: string;
  outstandingAmount: number;
  commissionRate: number;
  isFeatured?: boolean;
  featuredRequestStatus?: string | null;
  featuredRequestedAt?: string | null;
  commissionMix?: CommissionBucket[];
  commissionMixNote?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  billing?: {
    outstandingAmount: number;
    outstandingSince: string | null;
    feeDueAt: string | null;
    workingDays: number;
    daysUntilDue: number | null;
    showBillReminder: boolean;
    minimumSettlement: number;
    isOverdue: boolean;
    daysOverdue: number;
    status: string;
    suspensionState: string | null;
    isOpen: boolean;
    canOperate: boolean;
    message: string | null;
  };
  payoutAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    note: string;
  };
  menus: Array<{
    id: string;
    name: string;
    price: number;
    category: string;
    description: string;
    isAvailable: boolean;
    stock: number;
    imageUrl?: string;
  }>;
  stats: {
    totalSales: number;
    totalCommission: number;
    merchantAmount: number;
    completedOrders: number;
    outstandingAmount: number;
  };
};

export type SalesReport = {
  totalSales: number;
  totalCommission: number;
  merchantAmount: number;
  completedOrders: number;
  commissionRate: number;
  isFeatured?: boolean;
  note: string;
  rows: Array<{
    orderId: string;
    subtotal: number;
    commissionAmount: number;
    merchantAmount: number;
    status: string;
    completedAt: string | null;
    createdAt: string;
  }>;
};

export type OutletOrder = {
  id: string;
  status: string;
  createdAt: string;
  grandTotal: number;
  foodSubtotal: number;
  customer?: { fullName?: string; phone?: string };
  items?: Array<{
    merchantId: string;
    name: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
  }>;
  merchants: Array<{
    merchantId: string;
    status: string;
    subtotal: number;
    items?: Array<{ name: string; qty: number; unitPrice: number }>;
  }>;
};

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
  registerOutlet(body: {
    name: string;
    ownerName: string;
    phone: string;
    email: string;
    password: string;
    address: string;
    description?: string;
  }) {
    return request<{ ok: boolean; message: string; merchantId?: string; status?: string }>(
      "/api/auth/register-outlet",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  },
  profile() {
    return request<MerchantProfile>("/api/merchants/me/profile");
  },
  setOpen(isOpen: boolean) {
    return request("/api/merchants/me/open", {
      method: "POST",
      body: JSON.stringify({ isOpen }),
    });
  },
  requestFeatured() {
    return request<{
      ok: boolean;
      pending?: boolean;
      alreadyFeatured?: boolean;
      featuredRequestStatus?: string | null;
      featuredRequestedAt?: string | null;
      isFeatured?: boolean;
      commissionRate?: number;
      message: string;
    }>("/api/merchants/me/featured", {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
  },
  updateLocation(latitude: number, longitude: number, address?: string) {
    return request("/api/merchants/me/profile", {
      method: "PATCH",
      body: JSON.stringify({
        latitude,
        longitude,
        ...(address ? { address } : {}),
      }),
    });
  },
  reverseGeocode(latitude: number, longitude: number) {
    return request<{ address: string }>("/api/geo/reverse", {
      method: "POST",
      body: JSON.stringify({ latitude, longitude }),
    });
  },
  geocode(address: string) {
    return request<{ latitude: number; longitude: number; address: string }>(
      "/api/geo/geocode",
      {
        method: "POST",
        body: JSON.stringify({ address }),
      }
    );
  },
  updateProfile(body: {
    name?: string;
    address?: string;
    phone?: string;
    description?: string;
    photoUrl?: string;
  }) {
    return request("/api/merchants/me/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  sales() {
    return request<SalesReport>("/api/merchants/me/sales");
  },
  orders() {
    return request<OutletOrder[]>("/api/orders");
  },
  respondOrder(id: string, accept: boolean) {
    return request(`/api/orders/${id}/merchant-respond`, {
      method: "POST",
      body: JSON.stringify({ accept }),
    });
  },
  updateOrderStatus(id: string, status: string) {
    return request(`/api/orders/${id}/merchant-status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },
  menus() {
    return request<MerchantProfile["menus"]>("/api/merchants/me/menus");
  },
  createMenu(body: {
    name: string;
    price: number;
    description?: string;
    category?: string;
    imageUrl?: string;
  }) {
    return request("/api/merchants/me/menus", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  updateMenu(id: string, patch: Record<string, unknown>) {
    return request(`/api/merchants/me/menus/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  settlements() {
    return request<
      Array<{
        id: string;
        commissionAmount: number;
        paidAmount: number;
        status: string;
        proofUrl: string | null;
        createdAt: string;
        periodStart?: string;
        periodEnd?: string;
        rates?: CommissionBucket[];
        rateNote?: string;
      }>
    >("/api/settlements");
  },
  createSettlement(proofUrl: string) {
    return request("/api/settlements", {
      method: "POST",
      body: JSON.stringify({ proofUrl }),
    });
  },
  mySupportReports() {
    return request<SupportReport[]>("/api/support-reports/me");
  },
  submitSupportReport(body: {
    category: string;
    subject: string;
    body: string;
    orderId?: string;
  }) {
    return request<{ ok: boolean; message: string; report: SupportReport }>(
      "/api/support-reports",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  },
};

export type SupportReport = {
  id: string;
  reporterRole: string;
  reporterName: string;
  category: string;
  subject: string;
  body: string;
  orderId: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};
