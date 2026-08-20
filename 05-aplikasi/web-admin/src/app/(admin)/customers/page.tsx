"use client";

import { useEffect, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { Icon } from "@/components/Icon";
import s from "@/components/stitch.module.css";
import { ACCOUNT_STATUS, ORDER_STATUS, labelOf } from "@/lib/labels";

type Row = Awaited<ReturnType<typeof api.customers>>[number];

export default function CustomersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    return api
      .customers()
      .then((list) => {
        setRows(list);
        if (!openId && list[0]) setOpenId(list[0].id);
      });
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function control(id: string, action: "SUSPEND" | "ACTIVATE") {
    setBusy(id + action);
    setError("");
    try {
      const res = await api.accountControl("CUSTOMER", id, action);
      setMessage(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy("");
    }
  }

  const filtered = rows.filter((r) => {
    const hay = `${r.fullName} ${r.email} ${r.phone}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const selected = rows.find((r) => r.id === openId) || filtered[0];

  return (
    <div className={s.stack}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <input
            className={s.search}
            placeholder="Cari nama atau HP"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
      </div>
      {error ? <div className={s.error}>{error}</div> : null}
      {message ? <div className={s.ok}>{message}</div> : null}

      <div className={s.custSplit}>
        <div className={`${s.tableWrap} ${s.tableFixed}`}>
          <table>
            <thead>
              <tr>
                <th style={{ width: "34%" }}>Pemesan</th>
                <th style={{ width: "30%" }}>Kontak</th>
                <th style={{ width: "16%", textAlign: "right" }}>Order</th>
                <th style={{ width: "20%", textAlign: "right" }}>Total belanja</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className={s.clickRow}
                  onClick={() => setOpenId(c.id)}
                >
                  <td>
                    <div className={s.cellStack}>
                      <strong className={s.cellClip}>{c.fullName}</strong>
                      <span
                        className={`${s.chip} ${s.chipFlush} ${
                          c.status === "ACTIVE" ? s.chipOk : s.chipDanger
                        }`}
                      >
                        {labelOf(ACCOUNT_STATUS, c.status)}
                      </span>
                      <div className={`${s.muted} ${s.cellClip}`} title={c.address}>
                        {c.address}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={s.cellStack}>
                      <span className={s.cellClip} title={c.email}>
                        {c.email}
                      </span>
                      <div className={`${s.muted} ${s.cellClip}`}>{c.phone}</div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {c.orderCount} total
                    <div className={s.success}>{c.completedCount} selesai</div>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {rupiah(c.totalSpent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className={s.detailPanel}>
            <div className={s.cardPad} style={{ borderBottom: "1px solid var(--line)" }}>
              <div
                className={s.actorIcon}
                style={{
                  width: 48,
                  height: 48,
                  background: "#dcfce7",
                  color: "#15803d",
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                {selected.fullName.slice(0, 1)}
              </div>
              <h3 style={{ margin: 0 }}>{selected.fullName}</h3>
              <p className={`${s.muted} ${s.cellWrap}`}>
                <Icon name="location_on" /> {selected.address}
              </p>
              <p className={s.muted}>
                Terakhir:{" "}
                {selected.lastOrderAt
                  ? new Date(selected.lastOrderAt).toLocaleDateString("id-ID")
                  : "-"}
              </p>
            </div>
            <div className={s.cardPad}>
              <strong>Pesanan terakhir</strong>
              {(selected.recentOrders || []).length === 0 ? (
                <p className={s.muted}>Belum ada order.</p>
              ) : (
                (selected.recentOrders || []).map((o) => (
                  <div
                    key={o.id}
                    className={s.card}
                    style={{ padding: 12, marginTop: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className={s.muted}>{o.id}</span>
                      <span
                        className={`${s.chip} ${
                          o.status === "COMPLETED" ? s.chipOk : s.chipWarn
                        }`}
                      >
                        {labelOf(ORDER_STATUS, o.status)}
                      </span>
                    </div>
                    <div style={{ textAlign: "right", marginTop: 8 }}>
                      {rupiah(o.grandTotal)}
                    </div>
                  </div>
                ))
              )}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span className={s.muted}>Total belanja tunai</span>
                <strong className={s.orange}>{rupiah(selected.totalSpent)}</strong>
              </div>
              {selected.status === "ACTIVE" ? (
                <button
                  className={s.btnDanger}
                  style={{ marginTop: 12, width: "100%" }}
                  disabled={busy.startsWith(selected.id)}
                  onClick={() => control(selected.id, "SUSPEND")}
                >
                  Tangguhkan akun
                </button>
              ) : (
                <button
                  className={s.btnPrimary}
                  style={{ marginTop: 12, width: "100%" }}
                  disabled={busy.startsWith(selected.id)}
                  onClick={() => control(selected.id, "ACTIVATE")}
                >
                  Aktifkan akun
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
