"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, rupiah } from "@/lib/api";
import { Icon } from "@/components/Icon";
import s from "@/components/stitch.module.css";
import { ACCOUNT_STATUS, labelOf } from "@/lib/labels";

type Row = Awaited<ReturnType<typeof api.merchants>>[number];

function formatDue(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function statusChip(status: string) {
  if (status === "ACTIVE") return s.chipOk;
  if (status === "PENDING") return s.chipWarn;
  return s.chipDanger;
}

export default function OutletsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [commissionRate, setCommissionRate] = useState(0.15);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    return api.merchants().then((list) => {
      setRows(list);
      setOpenId((current) => {
        if (current && list.some((r) => r.id === current)) return current;
        const pending = list.find((r) => r.status === "PENDING");
        const first = pending || list.find((r) => r.outstandingAmount > 0) || list[0];
        return first?.id ?? null;
      });
    });
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    api.pricing().then((p) => setCommissionRate(p.commissionPercent / 100)).catch(() => {});
  }, []);

  async function control(
    id: string,
    action: "SUSPEND" | "ACTIVATE" | "FORCE_CLOSE" | "FORCE_OPEN" | "APPROVE" | "REJECT"
  ) {
    setBusy(id + action);
    setError("");
    try {
      const res = await api.accountControl("OUTLET", id, action);
      setMessage(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy("");
    }
  }

  const overdue = rows.filter((r) => r.isOverdue || r.status === "SUSPENDED");
  const pending = rows.filter((r) => r.status === "PENDING");
  const featuredQueue = rows
    .filter((r) => r.featuredRequestStatus === "PENDING" && !r.isFeatured)
    .sort((a, b) => {
      const ta = a.featuredRequestedAt ? new Date(a.featuredRequestedAt).getTime() : 0;
      const tb = b.featuredRequestedAt ? new Date(b.featuredRequestedAt).getTime() : 0;
      return ta - tb;
    });
  const selected = rows.find((r) => r.id === openId) || rows[0];
  const totalSales = rows.reduce((sum, r) => sum + r.totalSales, 0);
  const totalFee = rows.reduce((sum, r) => sum + r.totalCommission, 0);
  const outstanding = rows.reduce((sum, r) => sum + r.outstandingAmount, 0);
  const rate = commissionRate;
  const rateLabel = pct(rate);

  async function featureAction(
    id: string,
    action: "APPROVE" | "REJECT" | "ACTIVATE" | "REVOKE",
    featured: boolean
  ) {
    setBusy(id + action);
    setError("");
    try {
      const res = await api.setMerchantFeatured(id, featured, action);
      setMessage(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className={s.stack}>
      {pending.length > 0 ? (
        <div className={s.alert}>
          <span>
            <Icon name="hourglass_top" /> {pending.length} outlet menunggu persetujuan:
            {" "}
            {pending.map((o) => o.name).join(", ")}
          </span>
        </div>
      ) : null}

      {overdue.length > 0 ? (
        <div className={s.alert}>
          <span>
            <Icon name="warning" filled /> {overdue.length} outlet bermasalah
            tagihan: {overdue.map((o) => o.name).join(", ")}
          </span>
          <Link className={s.btnDanger} href="/settlements">
            Tinjau
          </Link>
        </div>
      ) : null}

      {error ? <div className={s.error}>{error}</div> : null}
      {message ? <div className={s.ok}>{message}</div> : null}

      <div className={s.formula}>
        <p className={s.formulaTitle}>Perhitungan fee founder</p>
        <p className={s.formulaHint}>
          Fee platform = subtotal makanan × {rateLabel}. Ongkir tidak masuk
          hitungan — itu hak kurir. Outlet menyetor fee ke rekening founder
          setiap 10 hari kalender.
        </p>
        <div className={s.formulaEq}>
          {rupiah(totalSales)}
          <span>×</span>
          <em>{rateLabel}</em>
          <span>=</span>
          {rupiah(totalFee)}
          <span>hak founder</span>
        </div>
      </div>

      <div className={s.kpis} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className={s.kpi}>
          <span>Menunggu persetujuan</span>
          <strong className={pending.length > 0 ? s.orange : undefined}>
            {pending.length}
          </strong>
        </div>
        <div className={s.kpi}>
          <span>Antrian rekomendasi</span>
          <strong className={featuredQueue.length > 0 ? s.orange : undefined}>
            {featuredQueue.length}
          </strong>
        </div>
        <div className={s.kpi}>
          <span>Fee founder {rateLabel}</span>
          <strong className={s.success}>{rupiah(totalFee)}</strong>
        </div>
        <div className={s.kpi}>
          <span>Tagihan belum lunas</span>
          <strong className={outstanding > 0 ? s.danger : undefined}>
            {rupiah(outstanding)}
          </strong>
        </div>
      </div>

      <div className={s.card}>
        <div
          className={s.cardPad}
          style={{
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <strong>Pengajuan rekomendasi outlet</strong>
            <p className={s.muted} style={{ margin: "4px 0 0" }}>
              Outlet ajukan dari menu Akun. Setujui agar tampil di atas + komisi 20%.
            </p>
          </div>
          {featuredQueue.length > 0 ? (
            <span className={`${s.chip} ${s.chipWarn}`}>{featuredQueue.length} menunggu</span>
          ) : (
            <span className={s.muted}>Antrian kosong</span>
          )}
        </div>
        {featuredQueue.length === 0 ? (
          <p className={`${s.cardPad} ${s.muted}`}>
            Belum ada pengajuan. Saat outlet kirim permintaan, namanya muncul di sini.
          </p>
        ) : (
          <div className={s.cardPad} style={{ display: "grid", gap: 12 }}>
            {featuredQueue.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  background: "#fffbeb",
                }}
              >
                <div style={{ minWidth: 180, flex: 1 }}>
                  <strong>{m.name}</strong>
                  <div className={s.muted}>
                    {m.id} · {m.phone || m.email}
                  </div>
                  <div className={s.muted}>
                    Diajukan{" "}
                    {m.featuredRequestedAt
                      ? new Date(m.featuredRequestedAt).toLocaleString("id-ID")
                      : "—"}
                    {" · "}
                    komisi jadi {pct(m.featuredCommissionRate ?? 0.2)} jika disetujui
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={s.btnPrimary}
                    disabled={busy.startsWith(m.id)}
                    onClick={() => featureAction(m.id, "APPROVE", true)}
                  >
                    Setujui rekomendasi
                  </button>
                  <button
                    type="button"
                    className={s.btnGhost}
                    disabled={busy.startsWith(m.id)}
                    onClick={() => featureAction(m.id, "REJECT", false)}
                  >
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={s.custSplit}>
        <div className={`${s.tableWrap} ${s.tableFixed} ${s.tableCompact}`}>
          <div className={s.tableHead}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Daftar outlet</h2>
            <span className={s.muted}>{rows.length} outlet</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: "38%" }}>Outlet</th>
                <th style={{ width: "12%", textAlign: "right" }}>Order</th>
                <th style={{ width: "18%", textAlign: "right" }}>Makanan</th>
                <th style={{ width: "16%", textAlign: "right" }}>Fee {rateLabel}</th>
                <th style={{ width: "16%", textAlign: "right" }}>Tagihan</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={s.muted}>
                    Belum ada outlet.
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr
                    key={m.id}
                    className={s.clickRow}
                    onClick={() => setOpenId(m.id)}
                  >
                    <td>
                      <div className={s.cellStack}>
                        <strong className={s.cellClip}>{m.name}</strong>
                        <span
                          className={`${s.chip} ${s.chipFlush} ${statusChip(m.status)}`}
                        >
                          {labelOf(ACCOUNT_STATUS, m.status)}
                          {m.status === "ACTIVE"
                            ? m.isOpen
                              ? " · buka"
                              : " · tutup"
                            : ""}
                        </span>
                        <div className={`${s.muted} ${s.cellClip}`} title={m.email}>
                          {m.email}
                          {m.isFeatured ? " · rekomendasi 20%" : ""}
                          {m.featuredRequestStatus === "PENDING" && !m.isFeatured
                            ? " · ajukan rekomendasi"
                            : ""}
                        </div>
                      </div>
                    </td>
                    <td className={s.moneyCol}>{m.completedOrders}</td>
                    <td className={s.moneyCol}>{rupiah(m.totalSales)}</td>
                    <td className={s.moneyCol}>{rupiah(m.totalCommission)}</td>
                    <td
                      className={`${s.moneyCol} ${
                        m.outstandingAmount > 0 ? s.danger : ""
                      }`}
                      style={{ fontWeight: 700 }}
                    >
                      {rupiah(m.outstandingAmount)}
                      <div className={s.muted} style={{ fontWeight: 500 }}>
                        {m.isOverdue ? "Lewat tempo" : formatDue(m.feeDueAt)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className={s.detailPanel}>
            <div className={s.cardPad} style={{ borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ margin: 0 }}>{selected.name}</h3>
              <p className={`${s.muted} ${s.cellWrap}`}>
                {selected.ownerName ? `${selected.ownerName} · ` : ""}
                {selected.email}
              </p>
              <p className={s.muted}>{selected.phone}</p>
              <p className={s.muted}>{selected.address || "Alamat belum diisi"}</p>
              <div style={{ marginTop: 10 }}>
                <span
                  className={`${s.chip} ${s.chipFlush} ${statusChip(selected.status)}`}
                >
                  {labelOf(ACCOUNT_STATUS, selected.status)}
                  {selected.status === "ACTIVE"
                    ? selected.isOpen
                      ? " · buka"
                      : " · tutup"
                    : ""}
                </span>
                {selected.isOverdue ? (
                  <span className={`${s.chip} ${s.chipDanger}`}>Lewat tempo</span>
                ) : null}
                {selected.isFeatured ? (
                  <span className={`${s.chip} ${s.chipOk}`}>Rekomendasi · komisi 20%</span>
                ) : selected.featuredRequestStatus === "PENDING" ? (
                  <span className={`${s.chip} ${s.chipWarn}`}>Menunggu rekomendasi</span>
                ) : null}
              </div>
            </div>

            <div className={`${s.cardPad} ${s.billList}`} style={{ borderBottom: "1px solid var(--line)" }}>
              <p className={s.formulaTitle}>Tagihan outlet ini</p>
              <p className={s.formulaHint}>
                {rupiah(selected.totalSales)} × {pct(selected.commissionRate)} ={" "}
                {rupiah(selected.totalCommission)}
              </p>
              <div className={s.row}>
                <span className={s.muted}>Penjualan makanan</span>
                <strong>{rupiah(selected.totalSales)}</strong>
              </div>
              <div className={s.row}>
                <span className={s.muted}>Fee founder {pct(selected.commissionRate)}</span>
                <strong className={s.success}>{rupiah(selected.totalCommission)}</strong>
              </div>
              <div className={s.row}>
                <span className={s.muted}>Hak outlet</span>
                <strong>{rupiah(selected.merchantAmount)}</strong>
              </div>
              <div className={s.row} style={{ borderTop: "1px solid var(--line)" }}>
                <span className={s.muted}>Tagihan berjalan</span>
                <strong className={selected.outstandingAmount > 0 ? s.danger : undefined}>
                  {rupiah(selected.outstandingAmount)}
                </strong>
              </div>
              <div className={s.row}>
                <span className={s.muted}>Jatuh tempo</span>
                <strong>{formatDue(selected.feeDueAt)}</strong>
              </div>
            </div>

            <div className={s.cardPad}>
              <strong>Order selesai</strong>
              {(selected.transactions || []).length === 0 ? (
                <p className={s.muted}>Belum ada order selesai.</p>
              ) : (
                <div className={s.txList}>
                  {(selected.transactions || []).map((t) => (
                    <div key={t.orderId} className={s.txRow}>
                      <div className={s.cellStack}>
                        <strong className={s.cellClip}>{t.orderId}</strong>
                        <span className={s.muted}>
                          {new Date(t.completedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className={s.moneyCol}>
                        <div className={s.muted}>Makanan</div>
                        <strong>{rupiah(t.subtotal)}</strong>
                      </div>
                      <div className={s.moneyCol}>
                        <div className={s.muted}>Fee {pct(t.commissionRate)}</div>
                        <strong className={s.success}>{rupiah(t.commissionAmount)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={s.ctrlRow}>
                {selected.status === "ACTIVE" ? (
                  selected.featuredRequestStatus === "PENDING" && !selected.isFeatured ? (
                    <>
                      <button
                        className={s.btnPrimary}
                        disabled={busy.startsWith(selected.id)}
                        onClick={() => featureAction(selected.id, "APPROVE", true)}
                      >
                        Setujui rekomendasi (komisi 20%)
                      </button>
                      <button
                        className={s.btnGhost}
                        disabled={busy.startsWith(selected.id)}
                        onClick={() => featureAction(selected.id, "REJECT", false)}
                      >
                        Tolak pengajuan
                      </button>
                    </>
                  ) : (
                    <button
                      className={selected.isFeatured ? s.btnGhost : s.btnPrimary}
                      disabled={busy.startsWith(selected.id)}
                      onClick={() =>
                        featureAction(
                          selected.id,
                          selected.isFeatured ? "REVOKE" : "ACTIVATE",
                          !selected.isFeatured
                        )
                      }
                    >
                      {selected.isFeatured
                        ? "Cabut rekomendasi"
                        : "Jadikan rekomendasi (komisi 20%)"}
                    </button>
                  )
                ) : null}
                {selected.status === "PENDING" ? (
                  <>
                    <button
                      className={s.btnPrimary}
                      disabled={busy.startsWith(selected.id)}
                      onClick={() => control(selected.id, "APPROVE")}
                    >
                      Setujui
                    </button>
                    <button
                      className={s.btnDanger}
                      disabled={busy.startsWith(selected.id)}
                      onClick={() => control(selected.id, "REJECT")}
                    >
                      Tolak
                    </button>
                  </>
                ) : (
                  <>
                {selected.isOpen ? (
                  <button
                    className={s.btnGhost}
                    disabled={busy.startsWith(selected.id)}
                    onClick={() => control(selected.id, "FORCE_CLOSE")}
                  >
                    Tutup
                  </button>
                ) : (
                  <button
                    className={s.btnGhost}
                    disabled={busy.startsWith(selected.id) || selected.status !== "ACTIVE"}
                    onClick={() => control(selected.id, "FORCE_OPEN")}
                  >
                    Buka
                  </button>
                )}
                {selected.status === "ACTIVE" ? (
                  <button
                    className={s.btnDanger}
                    disabled={busy.startsWith(selected.id)}
                    onClick={() => control(selected.id, "SUSPEND")}
                  >
                    Tangguhkan
                  </button>
                ) : (
                  <button
                    className={s.btnPrimary}
                    disabled={busy.startsWith(selected.id)}
                    onClick={() => control(selected.id, "ACTIVATE")}
                  >
                    Aktifkan
                  </button>
                )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
