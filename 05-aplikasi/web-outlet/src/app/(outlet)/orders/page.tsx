"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { OrderTicket } from "@/components/OrderTicket";
import { api, getSession, type OutletOrder } from "@/lib/api";
import { merchantSlice, tabForStatus } from "@/lib/ui";

const TABS = ["Masuk", "Dimasak", "Siap", "Selesai"] as const;
type Tab = (typeof TABS)[number];

const EMPTY: Record<Tab, { title: string; body: string; icon: string }> = {
  Masuk: {
    icon: "notifications_active",
    title: "Belum ada pesanan masuk",
    body: "Pesanan baru akan muncul di sini untuk diterima atau ditolak.",
  },
  Dimasak: {
    icon: "skillet",
    title: "Tidak ada yang sedang dimasak",
    body: "Setelah diterima, pesanan pindah ke sini sampai ditandai siap.",
  },
  Siap: {
    icon: "shopping_bag",
    title: "Belum ada yang siap diambil",
    body: "Tandai pesanan siap agar kurir bisa menjemput ke warung.",
  },
  Selesai: {
    icon: "receipt_long",
    title: "Belum ada riwayat",
    body: "Pesanan yang sudah dijemput, selesai, atau ditolak tersimpan di sini.",
  },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OutletOrder[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Masuk");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const picked = useRef(false);

  const load = useCallback(async () => {
    const profile = await api.profile();
    setMerchantId(profile.id);
    const list = await api.orders();
    setOrders(list);
    if (!picked.current) {
      picked.current = true;
      const mid = profile.id;
      const first = (["Masuk", "Dimasak", "Siap"] as Tab[]).find((t) =>
        list.some((o) => tabForStatus(merchantSlice(o, mid).status, o.status) === t)
      );
      if (first) setTab(first);
    }
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    const t = setInterval(() => load().catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [load]);

  const mid = merchantId || getSession()?.merchantId;
  const counts = Object.fromEntries(
    TABS.map((t) => [
      t,
      orders.filter((o) => tabForStatus(merchantSlice(o, mid).status, o.status) === t).length,
    ])
  ) as Record<Tab, number>;
  const list = orders.filter((o) => tabForStatus(merchantSlice(o, mid).status, o.status) === tab);
  const active = TABS.slice(0, 3).reduce((s, t) => s + counts[t], 0);
  const empty = EMPTY[tab];

  async function act(id: string, kind: "accept" | "reject" | "preparing" | "ready") {
    setBusy(id);
    setError("");
    try {
      if (kind === "accept") await api.respondOrder(id, true);
      else if (kind === "reject") await api.respondOrder(id, false);
      else if (kind === "preparing") await api.updateOrderStatus(id, "PREPARING");
      else await api.updateOrderStatus(id, "READY");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-[12px] text-secondary">Antrian dapur</p>
          <h1 className="text-[24px] font-bold leading-tight">Pesanan</h1>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary-fixed text-primary">{active} aktif</span>
      </div>
      {error ? <p className="text-error text-sm mb-3">{error}</p> : null}

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-4">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`press shrink-0 h-10 px-4 rounded-full text-sm font-semibold ${
              tab === t ? "bg-[#111] text-white" : "bg-white text-secondary border border-[#E5E7EB]"
            }`}
          >
            {t}
            {t !== "Selesai" ? ` · ${counts[t]}` : ""}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <section className="dk-card p-8 text-center anim-up">
          <div
            className="w-16 h-16 mx-auto rounded-2xl bg-primary-fixed text-primary grid place-items-center"
            style={{ animation: "floatY 2.6s ease-in-out infinite" }}
          >
            <Icon name={empty.icon} fill />
          </div>
          <p className="font-bold text-lg mt-4">{empty.title}</p>
          <p className="text-sm text-secondary mt-1">{empty.body}</p>
          {tab === "Masuk" && counts.Siap > 0 ? (
            <button type="button" onClick={() => setTab("Siap")} className="dk-btn dk-btn-ink mt-5">
              Lihat {counts.Siap} siap diambil
            </button>
          ) : null}
        </section>
      ) : (
        <div className="space-y-3">
          {list.map((o) => (
            <OrderTicket
              key={o.id}
              order={o}
              merchantId={mid}
              busy={busy === o.id}
              onAct={(kind) => act(o.id, kind)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
