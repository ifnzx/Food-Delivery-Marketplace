"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE, api, rupiah } from "@/lib/api";
import { ACCOUNT_STATUS, labelOf } from "@/lib/labels";
import { Icon } from "@/components/Icon";
import s from "@/components/stitch.module.css";

type CourierList = Awaited<ReturnType<typeof api.couriers>>;
type Row = CourierList["couriers"][number];
type Detail = Awaited<ReturnType<typeof api.courierDetail>>;
type PriorityPayment = CourierList["recentPriorityPayments"][number];

function ktpSrc(url?: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:image")) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CouriersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [priorityRevenueTotal, setPriorityRevenueTotal] = useState(0);
  const [priorityRevenueCount, setPriorityRevenueCount] = useState(0);
  const [recentPayments, setRecentPayments] = useState<PriorityPayment[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    api
      .couriers()
      .then((data) => {
        setRows(data.couriers);
        setPriorityRevenueTotal(data.priorityRevenueTotal || 0);
        setPriorityRevenueCount(data.priorityRevenueCount || 0);
        setRecentPayments(data.recentPriorityPayments || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    api
      .courierDetail(openId)
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [openId]);

  const pending = useMemo(
    () => rows.filter((r) => r.approvalStatus === "PENDING"),
    [rows]
  );
  const priorityQueue = useMemo(
    () =>
      rows
        .filter((r) => r.priorityRequestStatus === "PENDING")
        .sort((a, b) => {
          const ta = a.priorityRequestedAt ? new Date(a.priorityRequestedAt).getTime() : 0;
          const tb = b.priorityRequestedAt ? new Date(b.priorityRequestedAt).getTime() : 0;
          return ta - tb;
        }),
    [rows]
  );
  const focus = pending[0] || null;
  const directory = rows.filter((r) => {
    const hay = `${r.fullName} ${r.email} ${r.id}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  async function act(id: string, action: "approve" | "reject" | "suspend") {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const result = await api.courierDecision(id, action);
      setMessage(result.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses");
    } finally {
      setBusyId(null);
    }
  }

  async function compressKtp(file: File) {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1400;
        let w = img.width;
        let h = img.height;
        if (w > max || h > max) {
          const scale = Math.min(max / w, max / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Foto tidak bisa dibaca"));
      };
      img.src = url;
    });
  }

  async function uploadKtp(id: string, file: File) {
    setBusyId(id);
    setError("");
    try {
      const dataUrl = await compressKtp(file);
      const result = await api.uploadCourierKtp(id, dataUrl);
      setMessage(result.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal unggah KTP");
    } finally {
      setBusyId(null);
    }
  }

  async function setPriority(
    id: string,
    opts: { active?: boolean; action?: "APPROVE" | "REJECT" | "ACTIVATE" | "REVOKE" }
  ) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const res = await api.setCourierPriority(
        id,
        opts.active !== false,
        undefined,
        opts.action
      );
      setMessage(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses prioritas");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={s.stack}>
      {error ? <div className={s.error}>{error}</div> : null}
      {message ? <div className={s.ok}>{message}</div> : null}

      <div className={s.kpis}>
        <div className={s.kpi}>
          <span>Menunggu persetujuan</span>
          <strong className={s.orange}>{pending.length}</strong>
        </div>
        <div className={s.kpi}>
          <span>Antrian prioritas</span>
          <strong className={priorityQueue.length ? s.orange : undefined}>
            {priorityQueue.length}
          </strong>
        </div>
        <div className={s.kpi}>
          <span>Prioritas aktif</span>
          <strong>{rows.filter((r) => r.priorityActive).length}</strong>
        </div>
        <div className={s.kpi}>
          <span>Pendapatan prioritas</span>
          <strong className={s.success}>{rupiah(priorityRevenueTotal)}</strong>
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
            <strong>Pendapatan langganan prioritas</strong>
            <p className={s.muted} style={{ margin: "4px 0 0" }}>
              Uang transfer kurir ke rekening sistem — dicatat saat Super Admin menekan Setujui.
              {priorityRevenueCount > 0
                ? ` Total ${priorityRevenueCount} transaksi.`
                : " Belum ada yang disetujui."}
            </p>
          </div>
          <strong className={s.success}>{rupiah(priorityRevenueTotal)}</strong>
        </div>
        {recentPayments.length === 0 ? (
          <p className={`${s.cardPad} ${s.muted}`}>
            Belum ada pendapatan. Setelah setujui pengajuan, nominal muncul di sini.
          </p>
        ) : (
          <div className={s.cardPad} style={{ display: "grid", gap: 10 }}>
            {recentPayments.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                }}
              >
                <div>
                  <strong>{p.courierName}</strong>
                  <div className={s.muted}>
                    {p.approvedAt
                      ? new Date(p.approvedAt).toLocaleString("id-ID")
                      : "—"}
                    {p.hours ? ` · ${p.hours} jam aktif` : ""}
                  </div>
                </div>
                <strong className={s.success}>{rupiah(p.fee)}</strong>
              </div>
            ))}
          </div>
        )}
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
            <strong>Langganan prioritas kurir</strong>
            <p className={s.muted} style={{ margin: "4px 0 0" }}>
              Kurir transfer ke rekening sistem, lalu ajukan. Cek mutasi, lalu setujui atau tolak.
            </p>
          </div>
          {priorityQueue.length > 0 ? (
            <span className={`${s.chip} ${s.chipWarn}`}>{priorityQueue.length} menunggu</span>
          ) : (
            <span className={s.muted}>Antrian kosong</span>
          )}
        </div>
        {priorityQueue.length === 0 ? (
          <p className={`${s.cardPad} ${s.muted}`}>
            Belum ada pengajuan. Saat kurir kirim bukti transfer, namanya muncul di sini.
          </p>
        ) : (
          <div className={s.cardPad} style={{ display: "grid", gap: 12 }}>
            {priorityQueue.map((c) => (
              <div
                key={c.id}
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
                  <strong>{c.fullName}</strong>
                  <div className={s.muted}>{c.id} · WA {c.phone}</div>
                  <div className={s.muted}>
                    Diajukan{" "}
                    {c.priorityRequestedAt
                      ? new Date(c.priorityRequestedAt).toLocaleDateString("id-ID")
                      : "—"}
                    {" · "}
                    {rupiah(c.priorityRequestFee || c.priorityFee || 25000)} / {c.priorityLabel || `${c.priorityDays || 7} hari`}
                  </div>
                  {c.priorityProofUrl ? (
                    <a
                      href={ktpSrc(c.priorityProofUrl)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "inline-block", marginTop: 8 }}
                    >
                      <img
                        alt={`Bukti ${c.fullName}`}
                        src={ktpSrc(c.priorityProofUrl)}
                        style={{
                          width: 120,
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: "1px solid var(--line)",
                          background: "#fff",
                        }}
                      />
                    </a>
                  ) : (
                    <p className={s.muted} style={{ marginTop: 8 }}>
                      Bukti transfer belum ada
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className={s.btnPrimary}
                    disabled={busyId === c.id || !c.priorityProofUrl}
                    onClick={() => setPriority(c.id, { action: "APPROVE", active: true })}
                    title={!c.priorityProofUrl ? "Belum ada bukti transfer" : undefined}
                  >
                    Setujui prioritas
                  </button>
                  <button
                    className={s.btnDanger}
                    disabled={busyId === c.id}
                    onClick={() => setPriority(c.id, { action: "REJECT", active: false })}
                  >
                    Tolak
                  </button>
                  <button className={s.btnGhost} onClick={() => setOpenId(c.id)}>
                    Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={s.kycSplit}>
        <div className={s.card} style={{ display: "flex", flexDirection: "column" }}>
          <div
            className={s.cardPad}
            style={{
              borderBottom: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <strong>Antrian persetujuan</strong>
            {focus ? (
              <span className={`${s.chip} ${s.chipWarn}`}>Menunggu</span>
            ) : (
              <span className={s.muted}>Tidak ada</span>
            )}
          </div>
          {focus ? (
            <>
              <div className={s.cardPad} style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div
                    className={s.actorIcon}
                    style={{
                      width: 64,
                      height: 64,
                      background: "#dcfce7",
                      color: "#15803d",
                      fontWeight: 800,
                    }}
                  >
                    {initials(focus.fullName)}
                  </div>
                  <div>
                    <strong>{focus.fullName}</strong>
                    <div className={s.muted}>{focus.id}</div>
                  </div>
                </div>
                <p className={s.muted}>{focus.email}</p>
                <p className={s.muted}>WA {focus.phone}</p>
                {focus.nik ? (
                  <div style={{ marginTop: 12 }}>
                    <div className={s.row}>
                      <span className={s.muted}>NIK</span>
                      <strong>{focus.nik}</strong>
                    </div>
                    {focus.fullNameFromOcr && focus.fullNameFromOcr !== focus.fullName ? (
                      <div className={s.row}>
                        <span className={s.muted}>Nama OCR</span>
                        <strong className={s.danger}>{focus.fullNameFromOcr}</strong>
                      </div>
                    ) : null}
                    {focus.placeOfBirth ? (
                      <div className={s.row}>
                        <span className={s.muted}>TTL</span>
                        <strong>
                          {focus.placeOfBirth}
                          {focus.dateOfBirth ? `, ${focus.dateOfBirth}` : ""}
                        </strong>
                      </div>
                    ) : null}
                    {focus.addressOnKtp ? (
                      <div className={s.row}>
                        <span className={s.muted}>Alamat KTP</span>
                        <strong>{focus.addressOnKtp}</strong>
                      </div>
                    ) : null}
                    {(focus.mismatchFlags?.length ?? 0) > 0 ? (
                      <div className={s.warn}>
                        <Icon name="warning" />
                        <span>
                          Data tidak cocok saat pendaftaran:{" "}
                          {focus.mismatchFlags?.join(", ")} — cek ulang sebelum setujui.
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className={s.muted} style={{ marginTop: 12 }}>
                    Biodata KTP belum tersimpan — minta kurir unggah ulang foto KTP.
                  </p>
                )}
                <div style={{ marginTop: 12 }}>
                  <span className={s.muted}>Foto KTP</span>
                  <label className={s.ktpBox} style={{ marginTop: 8 }}>
                    {focus.ktpPhotoUrl ? (
                      <img alt={`KTP ${focus.fullName}`} src={ktpSrc(focus.ktpPhotoUrl)} />
                    ) : (
                      <>
                        <Icon name="upload_file" />
                        <span>Unggah foto KTP</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadKtp(focus.id, file);
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className={s.cardPad} style={{ borderTop: "1px solid var(--line)", background: "#f9fafb" }}>
                <button
                  className={s.btnPrimary}
                  style={{ width: "100%", marginBottom: 8 }}
                  disabled={busyId === focus.id || !focus.ktpPhotoUrl}
                  onClick={() => act(focus.id, "approve")}
                >
                  Setujui akun
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button className={s.btnDanger} onClick={() => act(focus.id, "reject")}>
                    Tolak
                  </button>
                  <button className={s.btnGhost} onClick={() => setOpenId(focus.id)}>
                    Detail
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className={`${s.cardPad} ${s.muted}`}>Tidak ada kurir menunggu persetujuan.</p>
          )}
        </div>

        <div className={s.tableWrap}>
          <div className={s.tableHead}>
            <strong>Daftar kurir</strong>
            <input
              className={s.search}
              placeholder="Cari nama atau ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <table>
            <thead>
              <tr>
                <th>Kurir</th>
                <th>Status</th>
                <th>Aktivitas</th>
                <th style={{ textAlign: "right" }}>Pendapatan ongkir</th>
              </tr>
            </thead>
            <tbody>
              {directory.map((c) => (
                <tr key={c.id} className={s.clickRow} onClick={() => setOpenId(c.id)}>
                  <td>
                    <strong>{c.fullName}</strong>
                    <div className={s.muted}>{c.id}</div>
                  </td>
                  <td>
                    <span
                      className={`${s.chip} ${
                        c.approvalStatus === "APPROVED"
                          ? s.chipOk
                          : c.approvalStatus === "PENDING"
                            ? s.chipWarn
                            : s.chipDanger
                      }`}
                    >
                      {labelOf(ACCOUNT_STATUS, c.approvalStatus)}
                    </span>
                  </td>
                  <td>
                    <div className={c.isOnline ? s.success : s.muted}>
                      {c.isOnline ? "Online" : "Offline"}
                    </div>
                    <div className={s.muted}>
                      {c.completedCount} order selesai
                      {c.priorityActive ? " · prioritas aktif" : ""}
                      {c.priorityRequestStatus === "PENDING" ? " · ajukan prioritas" : ""}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>{rupiah(c.earningsTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail ? (
        <div className={s.card}>
          <div className={s.cardPad} style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{detail.fullName}</strong>
            <button className={s.btnGhost} onClick={() => setOpenId(null)}>
              Tutup
            </button>
          </div>
          <div className={s.cardPad}>
            {detail.ktpPhotoUrl ? (
              <img
                alt="KTP"
                src={ktpSrc(detail.ktpPhotoUrl)}
                style={{ maxWidth: 360, borderRadius: 8, border: "1px solid var(--line)" }}
              />
            ) : null}
            <p>{detail.email} · {detail.phone}</p>
            <p className={s.muted}>Status: {labelOf(ACCOUNT_STATUS, detail.approvalStatus)}</p>
            {rows.find((r) => r.id === detail.id)?.priorityActive ? (
              <p className={s.success}>
                Langganan prioritas aktif
                {rows.find((r) => r.id === detail.id)?.priorityUntil
                  ? ` sampai ${new Date(rows.find((r) => r.id === detail.id)!.priorityUntil!).toLocaleDateString("id-ID")}`
                  : ""}
              </p>
            ) : rows.find((r) => r.id === detail.id)?.priorityRequestStatus === "PENDING" ? (
              <div>
                <p className={s.warn} style={{ display: "block" }}>
                  Menunggu verifikasi transfer{" "}
                  {rupiah(
                    rows.find((r) => r.id === detail.id)?.priorityRequestFee ||
                      rows.find((r) => r.id === detail.id)?.priorityFee ||
                      25000
                  )}
                  . Cocokkan bukti dengan mutasi rekening, lalu setujui.
                </p>
                {rows.find((r) => r.id === detail.id)?.priorityProofUrl ? (
                  <a
                    href={ktpSrc(rows.find((r) => r.id === detail.id)!.priorityProofUrl!)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-block", marginTop: 10 }}
                  >
                    <img
                      alt="Bukti transfer prioritas"
                      src={ktpSrc(rows.find((r) => r.id === detail.id)!.priorityProofUrl!)}
                      style={{
                        maxWidth: 280,
                        borderRadius: 10,
                        border: "1px solid var(--line)",
                        background: "#fff",
                      }}
                    />
                  </a>
                ) : (
                  <p className={s.muted} style={{ marginTop: 8 }}>
                    Bukti transfer belum dilampirkan
                  </p>
                )}
              </div>
            ) : (
              <p className={s.muted}>Belum berlangganan prioritas</p>
            )}
            {detail.approvalStatus === "APPROVED" ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {rows.find((r) => r.id === detail.id)?.priorityRequestStatus === "PENDING" ? (
                  <>
                    <button
                      className={s.btnPrimary}
                      disabled={
                        busyId === detail.id ||
                        !rows.find((r) => r.id === detail.id)?.priorityProofUrl
                      }
                      onClick={() => setPriority(detail.id, { action: "APPROVE", active: true })}
                    >
                      Setujui prioritas
                    </button>
                    <button
                      className={s.btnDanger}
                      disabled={busyId === detail.id}
                      onClick={() => setPriority(detail.id, { action: "REJECT", active: false })}
                    >
                      Tolak pengajuan
                    </button>
                  </>
                ) : rows.find((r) => r.id === detail.id)?.priorityActive ? (
                  <button
                    className={s.btnGhost}
                    disabled={busyId === detail.id}
                    onClick={() => setPriority(detail.id, { action: "REVOKE", active: false })}
                  >
                    Matikan prioritas
                  </button>
                ) : (
                  <button
                    className={s.btnPrimary}
                    disabled={busyId === detail.id}
                    onClick={() => setPriority(detail.id, { action: "ACTIVATE", active: true })}
                  >
                    Aktifkan manual (tanpa antrian)
                  </button>
                )}
                <button className={s.btnDanger} onClick={() => act(detail.id, "suspend")}>
                  Tangguhkan
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
