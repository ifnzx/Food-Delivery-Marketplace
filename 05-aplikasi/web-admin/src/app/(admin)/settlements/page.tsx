"use client";

import { Fragment, useEffect, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { Icon } from "@/components/Icon";
import s from "@/components/stitch.module.css";
import { SETTLEMENT_STATUS, labelOf } from "@/lib/labels";

type Row = Awaited<ReturnType<typeof api.settlements>>[number];
type Merchant = Awaited<ReturnType<typeof api.merchants>>[number];

function proofSrc(url: string | null) {
  if (!url) return "";
  if (url.startsWith("data:image/") || /^https?:\/\//.test(url)) return url;
  return "";
}

export default function SettlementsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savingPayout, setSavingPayout] = useState(false);

  async function load() {
    const [list, m, payout] = await Promise.all([
      api.settlements(),
      api.merchants(),
      api.payoutAccount(),
    ]);
    setRows(list);
    setMerchants(m);
    setBankName(payout.bankName);
    setAccountNumber(payout.accountNumber);
    setAccountName(payout.accountName);
    const pending = list.find((r) => r.status === "PENDING");
    if (pending) setOpenId(pending.id);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function savePayout(e: React.FormEvent) {
    e.preventDefault();
    setSavingPayout(true);
    setError("");
    try {
      const res = await api.updatePayoutAccount({
        bankName,
        accountNumber,
        accountName,
      });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal simpan rekening");
    } finally {
      setSavingPayout(false);
    }
  }

  async function verify(id: string, approve: boolean) {
    setBusyId(id);
    setError("");
    try {
      await api.verifySettlement(id, approve);
      setMessage(approve ? "Bukti diterima. Tagihan dikurangi." : "Bukti ditolak.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal verifikasi");
    } finally {
      setBusyId("");
    }
  }

  const outstandingTotal = merchants.reduce((sum, m) => sum + m.outstandingAmount, 0);
  const pendingCount = rows.filter((r) => r.status === "PENDING").length;

  return (
    <div className={s.stack}>
      {error ? <div className={s.error}>{error}</div> : null}
      {message ? <div className={s.ok}>{message}</div> : null}

      <div className={s.kpis} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className={s.kpi}>
          <span>Tagihan komisi belum lunas</span>
          <strong>{rupiah(outstandingTotal)}</strong>
        </div>
        <div className={s.kpi}>
          <span>Menunggu verifikasi</span>
          <strong className={s.orange}>{pendingCount}</strong>
        </div>
        <div className={s.kpi}>
          <span>Periode pelunasan</span>
          <strong>
            10 hari kalender
          </strong>
        </div>
      </div>

      <div className={s.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Outlet</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Bukti</th>
              <th>Diajukan</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={s.muted}>
                  Belum ada pengajuan.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const img = proofSrc(row.proofUrl);
                const merchant = merchants.find((m) => m.id === row.merchantId);
                return (
                  <Fragment key={row.id}>
                    <tr
                      className={s.clickRow}
                      onClick={() =>
                        setOpenId(openId === row.id ? null : row.id)
                      }
                    >
                      <td>{row.merchant?.name || row.merchantId}</td>
                      <td>{rupiah(row.paidAmount)}</td>
                      <td>
                        <span
                          className={`${s.chip} ${
                            row.status === "VERIFIED"
                              ? s.chipOk
                              : row.status === "REJECTED"
                                ? s.chipDanger
                                : s.chipMuted
                          }`}
                        >
                          {labelOf(SETTLEMENT_STATUS, row.status)}
                        </span>
                      </td>
                      <td>
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            style={{
                              width: 48,
                              height: 40,
                              objectFit: "cover",
                              borderRadius: 6,
                            }}
                          />
                        ) : (
                          <Icon name="image" />
                        )}
                      </td>
                      <td>
                        {new Date(row.createdAt).toLocaleDateString("id-ID")}
                        {merchant?.isOverdue && row.status === "PENDING" ? (
                          <span className={`${s.chip} ${s.chipDanger}`}>
                            Lewat tempo
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <Icon
                          name={openId === row.id ? "expand_less" : "expand_more"}
                        />
                      </td>
                    </tr>
                    {openId === row.id ? (
                      <tr>
                        <td colSpan={6}>
                          <div
                            className={s.split}
                            style={{ padding: 24, alignItems: "start" }}
                          >
                            <div>
                              <h4 className={s.muted}>BUKTI TRANSFER</h4>
                              {img ? (
                                <a href={img} target="_blank" rel="noreferrer">
                                  <img className={s.proof} src={img} alt="Bukti" />
                                </a>
                              ) : (
                                <p className={s.muted}>Tidak ada foto bukti.</p>
                              )}
                            </div>
                            <div>
                              <h4 className={s.muted}>DETAIL VERIFIKASI</h4>
                              <p>
                                <strong>
                                  {row.merchant?.name || row.merchantId}
                                </strong>
                              </p>
                              <div
                                className={s.cardPad}
                                style={{
                                  background: "#dcfce7",
                                  borderRadius: 12,
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>Nominal dilaporkan</span>
                                <strong className={s.orange} style={{ fontSize: 28 }}>
                                  {rupiah(row.paidAmount)}
                                </strong>
                              </div>
                              {row.status === "PENDING" ? (
                                <div className={s.ctaRow} style={{ border: 0, padding: "16px 0" }}>
                                  <button
                                    className={s.btnDanger}
                                    disabled={busyId === row.id}
                                    onClick={() => verify(row.id, false)}
                                  >
                                    Tolak
                                  </button>
                                  <button
                                    className={s.btnTeal}
                                    disabled={busyId === row.id}
                                    onClick={() => verify(row.id, true)}
                                  >
                                    Verifikasi
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <form className={s.card} onSubmit={savePayout}>
        <div className={s.cardPad}>
          <strong>Rekening tujuan transfer komisi</strong>
          <p className={s.muted}>Rekening tujuan pembayaran komisi.</p>
          <div className={s.ecoGrid}>
            <label className={s.muted}>
              Bank
              <input
                className={s.field}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
              />
            </label>
            <label className={s.muted}>
              No. Rekening
              <input
                className={s.field}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />
            </label>
            <label className={s.muted}>
              Atas nama
              <input
                className={s.field}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
              />
            </label>
          </div>
          <button className={s.btnPrimary} style={{ marginTop: 12 }} disabled={savingPayout}>
            {savingPayout ? "Menyimpan…" : "Simpan rekening"}
          </button>
        </div>
      </form>
    </div>
  );
}
