"use client";

import { Icon } from "@/components/Icon";
import { rupiah, type OutletOrder } from "@/lib/api";
import { clock, merchantSlice, minutesAgo, statusBadge } from "@/lib/ui";

type Props = {
  order: OutletOrder;
  merchantId?: string | null;
  busy?: boolean;
  compact?: boolean;
  onAct: (kind: "accept" | "reject" | "preparing" | "ready") => void;
};

export function OrderTicket({ order, merchantId, busy, compact, onAct }: Props) {
  const slice = merchantSlice(order, merchantId);
  const kitchenDone = ["PICKED_UP", "DELIVERING", "DELIVERED", "COMPLETED"].includes(order.status);
  const name = order.customer?.fullName || "Pelanggan";
  const urgent = slice.status === "WAITING";
  const badge = statusBadge(slice.status, order.status);
  const hasActions =
    !kitchenDone &&
    (slice.status === "WAITING" ||
      slice.status === "ACCEPTED" ||
      slice.status === "PREPARING" ||
      slice.status === "READY");

  return (
    <article className="dk-card overflow-hidden card-lift anim-up">
      {urgent ? <div className="h-1.5 bg-primary" /> : null}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badge.tone}`}>{badge.label}</span>
              <span className="text-[11px] text-secondary">{compact ? clock(order.createdAt) : minutesAgo(order.createdAt)}</span>
            </div>
            <p className="font-bold text-[17px] leading-tight">{name}</p>
            <p className="text-[12px] text-secondary mt-0.5">#{order.id}</p>
          </div>
          <p className="font-bold text-primary shrink-0 text-[16px]">{rupiah(slice.subtotal)}</p>
        </div>
        <ul className="bg-[#f6f7f6] rounded-2xl p-3 space-y-2">
          {slice.items.length ? (
            slice.items.map((it, i) => (
              <li key={i} className="flex gap-3 text-[14px] items-center">
                <span className="w-7 h-7 rounded-full bg-white text-primary text-[12px] font-bold grid place-items-center shrink-0">{it.qty}</span>
                <span className="min-w-0 font-medium">{it.name}</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-secondary">Tidak ada rincian item</li>
          )}
        </ul>
        <p className="text-[12px] text-secondary flex items-center gap-1.5">
          <Icon name="payments" size={16} className="text-primary" />
          Pelanggan bayar tunai ke kurir
        </p>
      </div>
      {hasActions ? (
        <div className="px-4 pb-4 flex gap-2">
          {slice.status === "WAITING" ? (
            <>
              <button type="button" disabled={busy} onClick={() => onAct("reject")} className="dk-btn dk-btn-ghost flex-1 disabled:opacity-50">
                Tolak
              </button>
              <button type="button" disabled={busy} onClick={() => onAct("accept")} className="dk-btn dk-btn-ink flex-1 disabled:opacity-50">
                Terima
              </button>
            </>
          ) : null}
          {slice.status === "ACCEPTED" ? (
            <button type="button" disabled={busy} onClick={() => onAct("preparing")} className="dk-btn dk-btn-ink flex-1">
              Mulai masak
            </button>
          ) : null}
          {slice.status === "PREPARING" ? (
            <button type="button" disabled={busy} onClick={() => onAct("ready")} className="dk-btn dk-btn-green flex-1">
              Tandai siap
            </button>
          ) : null}
          {slice.status === "READY" ? (
            <div className="w-full h-12 rounded-full bg-primary-fixed text-primary font-bold text-sm grid place-items-center">
              Menunggu kurir jemput
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
