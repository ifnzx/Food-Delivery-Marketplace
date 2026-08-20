"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { OrderTicket } from "@/components/OrderTicket";
import { api, rupiah, type MerchantProfile, type OutletOrder } from "@/lib/api";
import { commissionBillAlert, emitOutletOpen, hapticOutletToggle, merchantSlice } from "@/lib/ui";

function CommissionBadge({ rate, isFeatured }: { rate: number; isFeatured?: boolean }) {
  const pct = Math.round(rate * 100);
  const defaultPct = 15;
  const changed = pct !== defaultPct;
  const [tick, setTick] = useState(0);
  const [elapsed, setElapsed] = useState("00:00");
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!changed) return;
    const iv = setInterval(() => {
      setTick((t) => t + 1);
      const sec = Math.floor((Date.now() - startRef.current) / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      setElapsed(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [changed]);

  if (!changed) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary-fixed text-primary">
        <Icon name="percent" className="text-[13px]" />
        Komisi {pct}%
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border tabular-nums ${
        isFeatured
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-blue-50 text-blue-800 border-blue-200"
      }`}
      title={`Komisi ${pct}% berlaku sejak app dibuka`}
    >
      <Icon name={isFeatured ? "star" : "percent"} className="text-[13px]" filled />
      {isFeatured ? "Rekomendasi" : ""} {pct}% · {elapsed}
    </span>
  );
}

export default function HomePage() {
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [orders, setOrders] = useState<OutletOrder[]>([]);
  const [todaySales, setTodaySales] = useState(0);
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [p, list, sales] = await Promise.all([api.profile(), api.orders(), api.sales()]);
    setProfile(p);
    setOrders(list);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    setTodaySales(
      sales.rows
        .filter((r) => new Date(r.completedAt || r.createdAt) >= start)
        .reduce((s, r) => s + r.merchantAmount, 0)
    );
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    const t = setInterval(() => load().catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [load]);

  async function toggleOpen() {
    if (!profile || busy) return;
    const next = !profile.isOpen;
    hapticOutletToggle(next);
    setBusy(true);
    setError("");
    try {
      await api.setOpen(next);
      setProfile({ ...profile, isOpen: next });
      emitOutletOpen(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah status dapur");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return <p className="text-secondary pt-6 text-sm">{error || "Memuat dapur…"}</p>;
  }

  const incoming = orders.filter((o) => merchantSlice(o, profile.id).status === "WAITING");
  const history = orders
    .filter((o) => merchantSlice(o, profile.id).status !== "WAITING")
    .slice(0, 8);
  const billAlert = commissionBillAlert(profile);

  return (
    <div className="space-y-5">
      {/* Badge komisi — selalu tampil, menonjol jika berbeda dari default */}
      <div className="flex items-center justify-between gap-2">
        <CommissionBadge rate={profile.commissionRate ?? 0.15} isFeatured={profile.isFeatured} />
      </div>

      {billAlert ? (
        <Link
          href="/settlements"
          className={`flex items-center gap-3 rounded-[20px] px-4 py-3 text-white press ${
            billAlert.overdue ? "bg-[#EF4444] bill-danger" : "bg-[#F59E0B] bill-warn"
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-white/20 grid place-items-center shrink-0">
            <Icon name="payments" fill />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight truncate">{rupiah(billAlert.amount)}</p>
            <p className="text-[12px] text-white/85 truncate">{billAlert.title}</p>
          </div>
          <Icon name="chevron_right" className="shrink-0 text-white/90" />
        </Link>
      ) : null}

      <section
        className={
          profile.isOpen
            ? "dk-card-open hero-shimmer relative overflow-hidden min-h-[148px] anim-up"
            : "dk-card p-5 anim-up"
        }
      >
        {profile.isOpen ? (
          <>
            <span className="blob bg-white/20 w-28 h-28 -right-6 -top-8" />
            <span className="blob bg-white/10 w-20 h-20 right-16 bottom-0" style={{ animationDelay: ".8s" }} />
            <span
              className="absolute right-1 bottom-0 text-[72px] text-white/90 pointer-events-none"
              style={{ animation: "scooter 2.4s ease-in-out infinite" }}
            >
              <Icon name="skillet" fill />
            </span>
          </>
        ) : null}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <p className={`text-[12px] font-medium ${profile.isOpen ? "text-white/80" : "text-secondary"}`}>Status dapur</p>
            <p className="font-bold text-[22px] leading-tight mt-0.5">{profile.isOpen ? "Buka" : "Tutup"}</p>
            <p className={`text-sm mt-1 ${profile.isOpen ? "text-white/85" : "text-secondary"}`}>
              {profile.isOpen ? "Siap terima pesanan dari pelanggan." : "Nyalakan kalau dapur sudah siap masak."}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={toggleOpen}
            className={`press relative w-14 h-8 rounded-full p-1 shrink-0 ${profile.isOpen ? "bg-white/30" : "bg-[#E5E7EB]"}`}
            aria-label="Ubah status dapur"
          >
            <span
              className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${
                profile.isOpen ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      <Link href="/sales" className="dk-card p-4 flex items-center gap-3 card-lift press anim-up d2">
        <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary grid place-items-center shrink-0">
          <Icon name="payments" fill />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-secondary">Pendapatan hari ini</p>
          <p className="font-bold text-[22px] leading-tight">{rupiah(todaySales)}</p>
        </div>
        <Icon name="chevron_right" className="text-secondary" />
      </Link>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[18px]">Pesanan masuk</h2>
          {incoming.length ? (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary-fixed text-primary">{incoming.length} baru</span>
          ) : null}
        </div>
        {error ? <p className="text-error text-sm mb-2">{error}</p> : null}
        {incoming.length === 0 ? (
          <div className="dk-card p-8 text-center anim-up d3">
            <div className="relative w-24 h-24 mx-auto grid place-items-center">
              {profile.isOpen ? (
                <>
                  <span className="absolute inset-0 grid place-items-center pointer-events-none">
                    <span className="pulse-ring block w-14 h-14 rounded-full border-[3px] border-primary" />
                  </span>
                  <span className="absolute inset-0 grid place-items-center pointer-events-none">
                    <span className="pulse-ring block w-14 h-14 rounded-full border-[3px] border-primary/40" style={{ animationDelay: ".7s" }} />
                  </span>
                </>
              ) : null}
              <div className="relative z-10 w-14 h-14 rounded-full bg-primary-fixed text-primary grid place-items-center">
                <Icon name="skillet" fill />
              </div>
            </div>
            <p className="font-bold mt-3">Dapur masih sepi</p>
            <p className="text-sm text-secondary mt-1">Pesanan baru akan muncul di sini. Santai, kami pantau terus.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incoming.map((o) => (
              <OrderTicket
                key={o.id}
                order={o}
                merchantId={profile.id}
                compact
                busy={acting === o.id}
                onAct={async (kind) => {
                  setActing(o.id);
                  try {
                    if (kind === "accept") await api.respondOrder(o.id, true);
                    if (kind === "reject") await api.respondOrder(o.id, false);
                    await load();
                  } finally {
                    setActing(null);
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[18px]">Riwayat pesanan</h2>
          <Link href="/orders" className="text-xs font-semibold text-primary">Lihat semua</Link>
        </div>
        {history.length === 0 ? (
          <div className="dk-card p-6 text-center">
            <p className="text-sm text-secondary">Belum ada riwayat. Pesanan yang diterima akan tampil di sini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((o) => (
              <OrderTicket
                key={o.id}
                order={o}
                merchantId={profile.id}
                compact
                onAct={async (kind) => {
                  setActing(o.id);
                  try {
                    if (kind === "preparing") await api.updateOrderStatus(o.id, "PREPARING");
                    else if (kind === "ready") await api.updateOrderStatus(o.id, "READY");
                    await load();
                  } finally {
                    setActing(null);
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
