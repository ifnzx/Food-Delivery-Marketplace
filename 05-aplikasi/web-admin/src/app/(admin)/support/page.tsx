"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import s from "@/components/stitch.module.css";
import { SUPPORT_ROLE, SUPPORT_STATUS, labelOf } from "@/lib/labels";

type Row = Awaited<ReturnType<typeof api.supportReports>>[number];

const CATEGORY_LABEL: Record<string, string> = {
  ORDER: "Order",
  PAYMENT: "Pembayaran",
  ACCOUNT: "Akun",
  APP: "Aplikasi",
  OTHER: "Lainnya",
};

function roleChipClass(role: string) {
  if (role === "CUSTOMER") return s.chipOk;
  if (role === "COURIER") return s.chipWarn;
  return s.chipDanger;
}

function statusChipClass(status: string) {
  if (status === "OPEN") return s.chipWarn;
  if (status === "IN_PROGRESS") return s.chipDanger;
  if (status === "RESOLVED") return s.chipOk;
  return "";
}

export default function SupportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [nextStatus, setNextStatus] = useState("IN_PROGRESS");

  function load() {
    return api
      .supportReports({ status, role, q })
      .then((list) => {
        setRows(list);
        if (!openId && list[0]) setOpenId(list[0].id);
      });
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [status, role]);

  useEffect(() => {
    const selected = rows.find((r) => r.id === openId);
    if (!selected) return;
    setAdminNote(selected.adminNote || "");
    setNextStatus(
      selected.status === "OPEN"
        ? "IN_PROGRESS"
        : selected.status === "IN_PROGRESS"
          ? "RESOLVED"
          : selected.status
    );
  }, [openId, rows]);

  async function saveReport(id: string) {
    setBusy(id);
    setError("");
    try {
      const res = await api.updateSupportReport(id, {
        status: nextStatus,
        adminNote,
      });
      setMessage(res.message);
      await load();
      if (res.report) setOpenId(res.report.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbarui");
    } finally {
      setBusy("");
    }
  }

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const hay = `${r.id} ${r.subject} ${r.body} ${r.reporterName} ${r.reporterEmail} ${r.reporterPhone}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const selected = rows.find((r) => r.id === openId) || filtered[0];
  const openCount = rows.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length;

  return (
    <div className={s.stack}>
      <div className={s.kpis}>
        <div className={s.kpi}>
          <span>Menunggu tinjauan</span>
          <strong>{openCount}</strong>
        </div>
        <div className={s.kpi}>
          <span>Total laporan</span>
          <strong>{rows.length}</strong>
        </div>
        <div className={s.kpi}>
          <span>Pelanggan</span>
          <strong>{rows.filter((r) => r.reporterRole === "CUSTOMER").length}</strong>
        </div>
        <div className={s.kpi}>
          <span>Kurir / Outlet</span>
          <strong>
            {rows.filter((r) => r.reporterRole === "COURIER").length} /{" "}
            {rows.filter((r) => r.reporterRole === "MERCHANT").length}
          </strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <select
          className={s.search}
          style={{ maxWidth: 180 }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Semua status</option>
          {Object.entries(SUPPORT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className={s.search}
          style={{ maxWidth: 180 }}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Semua peran</option>
          {Object.entries(SUPPORT_ROLE).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          className={s.search}
          placeholder="Cari subjek, nama, email…"
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
                <th style={{ width: "34%" }}>Laporan</th>
                <th style={{ width: "24%" }}>Pelapor</th>
                <th style={{ width: "18%" }}>Peran</th>
                <th style={{ width: "24%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className={s.muted}>
                    Belum ada laporan bantuan.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={s.clickRow}
                    onClick={() => setOpenId(row.id)}
                  >
                    <td>
                      <div className={s.cellStack}>
                        <strong className={s.cellClip}>{row.subject}</strong>
                        <span className={s.muted}>{row.id}</span>
                        <span className={s.muted}>
                          {CATEGORY_LABEL[row.category] || row.category}
                          {row.orderId ? ` · ${row.orderId}` : ""}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={s.cellStack}>
                        <strong className={s.cellClip}>{row.reporterName}</strong>
                        <span className={s.muted}>{row.reporterPhone}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${s.chip} ${roleChipClass(row.reporterRole)}`}>
                        {labelOf(SUPPORT_ROLE, row.reporterRole)}
                      </span>
                    </td>
                    <td>
                      <span className={`${s.chip} ${statusChipClass(row.status)}`}>
                        {labelOf(SUPPORT_STATUS, row.status)}
                      </span>
                      <div className={s.muted}>
                        {new Date(row.createdAt).toLocaleString("id-ID")}
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
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="support_agent" /> {selected.subject}
              </h3>
              <span className={`${s.chip} ${statusChipClass(selected.status)}`} style={{ marginTop: 10 }}>
                {labelOf(SUPPORT_STATUS, selected.status)}
              </span>
            </div>
            <div className={s.cardPad}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <div className={s.muted}>Pelapor</div>
                  <strong>{selected.reporterName}</strong>
                </div>
                <div>
                  <div className={s.muted}>Peran</div>
                  <strong>{labelOf(SUPPORT_ROLE, selected.reporterRole)}</strong>
                </div>
                <div>
                  <div className={s.muted}>Kontak</div>
                  <strong>{selected.reporterPhone}</strong>
                </div>
                <div>
                  <div className={s.muted}>Email</div>
                  <strong>{selected.reporterEmail}</strong>
                </div>
                <div>
                  <div className={s.muted}>Kategori</div>
                  <strong>{CATEGORY_LABEL[selected.category] || selected.category}</strong>
                </div>
                <div>
                  <div className={s.muted}>Order terkait</div>
                  <strong>{selected.orderId || "—"}</strong>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className={s.muted}>Deskripsi kendala</div>
                <p style={{ whiteSpace: "pre-wrap", margin: "8px 0 0" }}>{selected.body}</p>
              </div>

              <label style={{ display: "block", marginBottom: 12 }}>
                <span className={s.muted}>Catatan Super Admin</span>
                <textarea
                  className={s.field}
                  rows={4}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Tindakan yang sudah dilakukan atau balasan untuk tim…"
                />
              </label>

              <label style={{ display: "block", marginBottom: 12 }}>
                <span className={s.muted}>Status</span>
                <select
                  className={s.field}
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                >
                  {Object.entries(SUPPORT_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className={s.btnPrimary}
                disabled={!!busy}
                onClick={() => saveReport(selected.id)}
              >
                {busy ? "Menyimpan…" : "Simpan tindak lanjut"}
              </button>

              {selected.resolvedAt ? (
                <p className={s.muted} style={{ marginTop: 12 }}>
                  Diselesaikan {new Date(selected.resolvedAt).toLocaleString("id-ID")}
                  {selected.resolvedBy ? ` · ${selected.resolvedBy}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
