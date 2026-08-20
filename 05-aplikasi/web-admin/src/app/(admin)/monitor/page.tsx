"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { Icon } from "@/components/Icon";
import s from "@/components/stitch.module.css";
import { ORDER_STATUS, labelOf } from "@/lib/labels";

type Feed = Awaited<ReturnType<typeof api.ordersMonitor>>;

export default function MonitorPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .ordersMonitor()
      .then((data) => {
        setFeed(data);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  const shown = useMemo(
    () =>
      feed?.orders.filter(
        (o) => o.stage === "OUTLET" || o.stage === "COURIER"
      ) ?? [],
    [feed]
  );

  if (error) return <div className={s.error}>{error}</div>;
  if (!feed) return <div className={s.muted}>Memuat live transaksi…</div>;

  return (
    <div className={s.stack}>
      <div className={s.liveBar}>
        <span className={s.muted}>{shown.length} order berjalan</span>
        <div className={s.badgeLive}>
          <span className={s.pulse} />
          Live · {new Date(feed.updatedAt).toLocaleTimeString("id-ID")}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className={s.empty}>
          <Icon name="inbox" />
          <p>Tidak ada order yang sedang berjalan.</p>
        </div>
      ) : (
        <div className={`${s.tableWrap} ${s.tableCompact}`}>
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Order</th>
                <th>Status</th>
                <th>Pelanggan</th>
                <th>Outlet</th>
                <th>Kurir</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => {
                const done = o.timeline.filter((t) => t.done).length;
                const current =
                  o.timeline.find((t) => !t.done)?.label ||
                  labelOf(ORDER_STATUS, o.status);
                return (
                  <tr key={o.id}>
                    <td className={s.muted} style={{ whiteSpace: "nowrap" }}>
                      {new Date(o.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <strong>{o.id}</strong>
                    </td>
                    <td>
                      <span
                        className={`${s.chip} ${
                          o.stage === "COURIER" ? s.chipOk : s.chipWarn
                        }`}
                        style={{ marginLeft: 0 }}
                      >
                        {labelOf(ORDER_STATUS, o.status)}
                      </span>
                      <div className={s.track}>
                        <div
                          className={s.trackFill}
                          style={{
                            width: `${(done / o.timeline.length) * 100}%`,
                          }}
                        />
                      </div>
                      <div className={s.muted} style={{ fontSize: 11 }}>
                        {current} · {done}/{o.timeline.length}
                      </div>
                    </td>
                    <td>{o.customer.name}</td>
                    <td>{o.outlets.map((x) => x.name).join(", ") || "—"}</td>
                    <td className={o.courier ? undefined : s.muted}>
                      {o.courier?.name || "—"}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {rupiah(o.money.grandTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
