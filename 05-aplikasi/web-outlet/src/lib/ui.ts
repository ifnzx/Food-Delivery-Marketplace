import { API_BASE, type OutletOrder } from "./api";

export const WARUNG_PHOTO =
  "https://lh3.googleusercontent.com/aida/AP1WRLsZEwn3plWqCa0-WQVdkPsbGi7T_Yedvqt_aPFCQ4KRFwkaiWQUrrCF_VgL5sPhdyx0Gyr6YAr3XeVkYOIvhsDMoQ2VEfBrdOR-VnOYLnrdIh0T0dtvKjCcmKMJYrqcAupzBSmR6Mf6deZBc_QUfsFFNu17K57i55aRCk1c2_E2A9rhOZuDMehDQDyP6bibhNNHHR7EIAPLnFMSt_ExOwOdPRIMYu0jTqToizC2u4PU4RpKeQYSs1GZQ297";

export function menuPhoto(name: string) {
  return /teh|es /i.test(name || "")
    ? "https://lh3.googleusercontent.com/aida-public/AB6AXuAILWSVNooH-fiTr9WSpQhSj7xjHjX80LCGtOur8LVj2Ua6xQuihkuFpz3JtB9Fr7kVkwoNYO7cekJV4OHmaXjcLVZE_DJzxD1fjmTmtha80dktur2UXdzKsZcrzCYYYKcN_rqpJ_5kWLuZ0dvPbUCN_mlZGtnMwfyvdPpSa0LPKlRRolxb2CbmLZKgQVEtg2zyGTqDQUSFvF5rRIqzICDVZf4JQdGFxJ99vw-re989s2tXJdA4wILTg"
    : /mie/i.test(name || "")
      ? "https://lh3.googleusercontent.com/aida-public/AB6AXuCV0V4oSrSo5np7kc2R6AzhuPSEfS5Iu0DS3bsM2Xvk1ZscutiLFOhcu0oGhuuoTcONZgHbjvryBHsm8Z6Q9UsOh9aVcCGkPq90sEOGrKrhEKHIXm5iCjemSKSOuOu94IAJEOYSf47URggRgBuuYVHeKiCwPfhC37gppwuCZ--uIBBu2XJ-BxcFuqzwvErj86ztZCU_z45LByJ5Bj--WPT06X0p3ogSTpxMySuiL3hrUJ9RpgquFe8g1g"
      : "https://lh3.googleusercontent.com/aida-public/AB6AXuDNtLJT5xSHN3cqHpmSzqsvfIabgo6Gf0PQ5d6-Om3DGbnLTbgqXNi1iwFY6uVfgR17U8t9TeYlWzESKjCXnWLn51I_unazzgzKXqfIzEHJpwz7ZtaiMnkbCibsKuhPlGuRoQidiVpQjchnsw4KWAJUV5aMEkE-hK_jv38jSV8zalJ63jtZMiTsy7kF7E8X34jfn_BEfbC0dXUdRbNH6N_WvK3Akhr3acKuzouXZhVmer4Swyd46usC-Q";
}

export function mediaSrc(url?: string | null) {
  const value = (url || "").trim();
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("data:")) return value;
  return `${API_BASE}${value}`;
}

export function menuImageSrc(menu: { imageUrl?: string; name: string }) {
  const url = mediaSrc(menu.imageUrl);
  return url || menuPhoto(menu.name);
}

export function outletPhotoSrc(outlet?: { photoUrl?: string | null; name?: string } | null) {
  return mediaSrc(outlet?.photoUrl) || WARUNG_PHOTO;
}

export function compressImageFile(file: File, max = 960, quality = 0.82) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas tidak tersedia"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("File bukan gambar"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function merchantSlice(order: OutletOrder, merchantId?: string | null) {
  const mine =
    order.merchants.find((m) => m.merchantId === merchantId) ?? order.merchants[0];
  const items =
    (order.items || []).filter((i) => !merchantId || i.merchantId === merchantId).length
      ? (order.items || []).filter((i) => !merchantId || i.merchantId === merchantId)
      : mine?.items || [];
  return {
    status: mine?.status ?? order.status,
    subtotal: mine?.subtotal ?? items.reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0),
    items,
  };
}

export const OUTLET_OPEN_EVENT = "dk-outlet-open";

export function emitOutletOpen(isOpen: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OUTLET_OPEN_EVENT, { detail: { isOpen } }));
}

/** Getaran singkat saat toggle buka/tutup dapur (beda pola on vs off). */
export function hapticOutletToggle(isOpen: boolean) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    // Buka: dua denyut; tutup: satu denyut lebih tegas
    navigator.vibrate(isOpen ? [18, 42, 28] : [48]);
  } catch {
    /* ignore */
  }
}

export function tabForStatus(status: string, orderStatus?: string) {
  if (status === "REJECTED" || orderStatus === "CANCELLED") return "Selesai";
  if (
    orderStatus &&
    ["PICKED_UP", "DELIVERING", "DELIVERED", "COMPLETED"].includes(orderStatus)
  ) {
    return "Selesai";
  }
  if (status === "WAITING" || status === "WAITING_OUTLET") return "Masuk";
  if (status === "ACCEPTED" || status === "PREPARING" || status === "OUTLET_ACCEPTED") return "Dimasak";
  if (status === "READY" || status === "READY_FOR_PICKUP") return "Siap";
  return "Selesai";
}

export function statusBadge(status: string, orderStatus?: string) {
  if (status === "REJECTED" || orderStatus === "CANCELLED") {
    return { label: "Ditolak", tone: "bg-red-50 text-[#ba1a1a]" };
  }
  if (orderStatus === "COMPLETED" || orderStatus === "DELIVERED") {
    return { label: "Selesai", tone: "bg-emerald-50 text-teal-custom" };
  }
  if (orderStatus === "DELIVERING") {
    return { label: "Diantar kurir", tone: "bg-emerald-50 text-teal-custom" };
  }
  if (orderStatus === "PICKED_UP") {
    return { label: "Dijemput kurir", tone: "bg-emerald-50 text-teal-custom" };
  }
  const tab = tabForStatus(status, orderStatus);
  if (tab === "Masuk") return { label: "Pesanan baru", tone: "bg-primary-fixed text-primary" };
  if (tab === "Dimasak") return { label: status === "ACCEPTED" ? "Diterima" : "Sedang dimasak", tone: "bg-primary-fixed text-primary" };
  if (tab === "Siap") return { label: "Siap diambil", tone: "bg-emerald-50 text-teal-custom" };
  return { label: "Selesai", tone: "bg-emerald-50 text-teal-custom" };
}

export function minutesAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "Baru saja";
  return `${mins} menit lalu`;
}

export function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/** Pengingat bayar komisi muncul 2 hari kalender sebelum jatuh tempo. */
export const BILL_REMIND_DAYS = 2;

export function calendarDaysUntil(iso?: string | null) {
  if (!iso) return null;
  const due = new Date(iso);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function commissionBillAlert(profile: {
  outstandingAmount: number;
  status: string;
  billing?: {
    outstandingAmount?: number;
    feeDueAt?: string | null;
    isOverdue?: boolean;
    daysOverdue?: number;
    daysUntilDue?: number | null;
    showBillReminder?: boolean;
    canOperate?: boolean;
  } | null;
}) {
  const amount = Number(profile.billing?.outstandingAmount ?? profile.outstandingAmount ?? 0);
  if (amount <= 0) return null;
  const days =
    typeof profile.billing?.daysUntilDue === "number"
      ? profile.billing.daysUntilDue
      : calendarDaysUntil(profile.billing?.feeDueAt);
  const overdue =
    Boolean(profile.billing?.isOverdue) ||
    profile.status === "SUSPENDED" ||
    profile.billing?.canOperate === false ||
    (days !== null && days < 0);
  const show =
    amount > 0 &&
    (profile.billing?.showBillReminder === true ||
      overdue ||
      days === null ||
      Number.isNaN(days) ||
      days <= BILL_REMIND_DAYS);
  if (!show) return null;

  let title = "Saatnya bayar komisi";
  let hint = `Sisa ${days} hari sebelum tempo. Bayar sekarang agar dapur tetap nyala.`;
  if (overdue) {
    title = "Komisi lewat tempo";
    hint = "Bayar + kirim foto bukti supaya Super Admin bisa nyalakan dapur.";
  } else if (days === 0) {
    title = "Tempo komisi hari ini";
    hint = "Transfer hari ini, lalu kirim foto bukti.";
  } else if (days === 1) {
    title = "Tempo komisi besok";
    hint = "Bayar besok paling lambat. Foto bukti wajib.";
  } else if (days === 2) {
    title = "Tempo komisi 2 hari lagi";
    hint = "Siapkan transfer ke rekening Super Admin.";
  }

  return { amount, days, overdue, title, hint };
}
