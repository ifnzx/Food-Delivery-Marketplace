"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { Icon } from "@/components/Icon";
import s from "@/components/stitch.module.css";

type Dash = Awaited<ReturnType<typeof api.dashboard>>;

function formatDue(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dueLabel(item: NonNullable<Dash["feeReminders"]>[number]) {
  if (item.isOverdue) {
    return item.daysOverdue > 0
      ? `Lewat ${item.daysOverdue} hari`
      : "Lewat tempo";
  }
  if (item.daysUntilDue === 0) return "Jatuh tempo hari ini";
  if (item.daysUntilDue !== null && item.daysUntilDue > 0) {
    return `${item.daysUntilDue} hari lagi`;
  }
  return formatDue(item.feeDueAt);
}

export default function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className={s.error}>{error}</div>;
  if (!data) return <div className={s.muted}>Memuat overview…</div>;

  const ratePct = Math.round(data.commissionRate * 100);
  const outlets = data.outletRanking ?? [];
  const couriers = data.courierRanking ?? [];
  const feeReminders = data.feeReminders ?? [];
  const settlementDays = data.settlementDays ?? 10;
  const overdueCount = feeReminders.filter((f) => f.isOverdue).length;

  return (
    <div className={s.stack}>
      <div className={s.kpis}>
        <div className={s.kpi}>
          <span>Nilai order (GMV)</span>
          <strong>{rupiah(data.gmv)}</strong>
        </div>
        <div className={s.kpi}>
          <span>Fee founder {ratePct}%</span>
          <strong className={s.success}>{rupiah(data.platformFee)}</strong>
        </div>
        <div className={s.kpi}>
          <span>Prioritas kurir</span>
          <strong className={s.success}>{rupiah(data.priorityRevenueTotal ?? 0)}</strong>
        </div>
        <div className={s.kpi}>
          <span>Kurir online</span>
          <strong>
            {data.courierOnline}/{data.totalCourier}
          </strong>
        </div>
      </div>

      {(data.priorityRevenueCount ?? 0) > 0 ? (
        <section className={s.feePanel}>
          <div className={s.feePanelHead}>
            <div>
              <h3>
                <Icon name="workspace_premium" /> Pendapatan prioritas kurir
              </h3>
              <p>
                Transfer ke rekening sistem — dicatat di halaman Kurir saat pengajuan disetujui.
                {data.priorityRevenueCount
                  ? ` ${data.priorityRevenueCount} transaksi.`
                  : ""}
              </p>
            </div>
            <div className={s.feePanelTotal}>
              <span>Total masuk</span>
              <strong>{rupiah(data.priorityRevenueTotal ?? 0)}</strong>
            </div>
          </div>
          <div className={s.feeList}>
            {(data.recentPriorityPayments ?? []).slice(0, 5).map((p) => (
              <div key={p.id} className={s.feeItem}>
                <div>
                  <strong>{p.courierName}</strong>
                  <p className={s.muted}>
                    {p.approvedAt
                      ? new Date(p.approvedAt).toLocaleDateString("id-ID")
                      : "—"}
                    {p.hours ? ` · ${p.hours} jam` : ""}
                  </p>
                </div>
                <strong className={s.success}>{rupiah(p.fee)}</strong>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 16px 16px" }}>
            <Link className={s.btnGhost} href="/couriers">
              Lihat semua di Kurir
            </Link>
          </div>
        </section>
      ) : null}

      <section className={s.feePanel}>
        <div className={s.feePanelHead}>
          <div>
            <h3>
              <Icon name="payments" /> Pengingat fee outlet
            </h3>
            <p>
              Komisi {ratePct}% per order — outlet transfer dalam {settlementDays} hari, lalu unggah bukti.
            </p>
          </div>
          <div className={s.feePanelTotal}>
            <span>Total tagihan belum lunas</span>
            <strong>{rupiah(data.outstandingSettlement)}</strong>
          </div>
        </div>

        {feeReminders.length === 0 ? (
          <p className={s.feeEmpty}>
            Semua outlet lunas — belum ada tagihan fee yang menunggu pembayaran.
          </p>
        ) : (
          <div className={s.feeList}>
            {feeReminders.map((item) => (
              <div
                key={item.id}
                className={`${s.feeItem} ${item.isOverdue ? s.feeItemOverdue : ""}`}
              >
                <div>
                  <div className={s.feeItemName}>{item.name}</div>
                  <div className={s.feeItemMeta}>
                    {item.message || `Jatuh tempo ${formatDue(item.feeDueAt)}`}
                    {item.status === "SUSPENDED" ? " · ditangguhkan" : ""}
                  </div>
                </div>
                <div className={s.feeItemAmt}>
                  <strong>{rupiah(item.outstandingAmount)}</strong>
                  <span>{dueLabel(item)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={s.ctaRow} style={{ border: 0, padding: "16px 0 0" }}>
          <Link className={s.btnPrimary} href="/settlements" style={{ flex: 1, textAlign: "center" }}>
            Verifikasi bukti transfer
          </Link>
          <Link className={`${s.btnGhost} ${s.btnGhostLight}`} href="/outlets" style={{ flex: 1, textAlign: "center" }}>
            Detail outlet
          </Link>
        </div>
      </section>

      {overdueCount > 0 ? (
        <div className={s.alert}>
          <span>
            <Icon name="warning" filled /> {overdueCount} outlet lewat tempo fee —
            segera tindak lanjuti agar outlet tidak terus ditangguhkan.
          </span>
          <Link className={s.btnDanger} href="/settlements">
            Cek tagihan
          </Link>
        </div>
      ) : null}

      {(data.merchantPending ?? 0) > 0 ? (
        <div className={s.alert}>
          <span>
            <Icon name="hourglass_top" /> {data.merchantPending} pendaftaran outlet
            menunggu persetujuan Super Admin.
          </span>
          <Link className={s.btnPrimary} href="/outlets">
            Tinjau
          </Link>
        </div>
      ) : null}

      {(data.supportOpen ?? 0) > 0 ? (
        <div className={s.alertInfo}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="headset_mic" /> {data.supportOpen} laporan bantuan menunggu respons
          </span>
          <Link className={s.btnPrimary} href="/support">
            Buka Bantuan
          </Link>
        </div>
      ) : null}

      <div className={s.split}>
        <div className={s.card}>
          <div className={s.cardPad}>
            <h4 className={s.colTitle}>
              <Icon name="emoji_events" /> Ranking outlet
            </h4>
            <p className={s.muted} style={{ margin: "-12px 0 16px" }}>
              Diurutkan dari penjualan makanan tertinggi (order selesai).
            </p>
            {outlets.length === 0 ? (
              <p className={s.muted}>Belum ada data penjualan.</p>
            ) : (
              <div className={s.rankList}>
                {outlets.map((o, i) => (
                  <div key={o.id} className={s.rankItem}>
                    <div className={`${s.rankBadge} ${i < 3 ? s.rankBadgeTop : ""}`}>
                      {i + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className={s.rankName}>{o.name}</div>
                      <div className={s.rankSub}>
                        {o.completedOrders} order · fee {rupiah(o.totalCommission)}
                      </div>
                    </div>
                    <div className={s.rankVal}>
                      {rupiah(o.totalSales)}
                      <span>makanan</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link className={s.btnGhost} href="/outlets" style={{ display: "block", textAlign: "center", marginTop: 16 }}>
              Lihat semua outlet
            </Link>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardPad}>
            <h4 className={s.colTitle}>
              <Icon name="local_shipping" /> Ranking kurir
            </h4>
            <p className={s.muted} style={{ margin: "-12px 0 16px" }}>
              Diurutkan dari jumlah antar selesai, lalu total ongkir.
            </p>
            {couriers.length === 0 ? (
              <p className={s.muted}>Belum ada kurir aktif dengan order selesai.</p>
            ) : (
              <div className={s.rankList}>
                {couriers.map((c, i) => (
                  <div key={c.id} className={s.rankItem}>
                    <div className={`${s.rankBadge} ${i < 3 ? s.rankBadgeTop : ""}`}>
                      {i + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className={s.rankName}>{c.fullName}</div>
                      <div className={s.rankSub}>
                        {c.completedCount} antar · ongkir {rupiah(c.earningsTotal)}
                        {c.isOnline ? " · online" : ""}
                      </div>
                    </div>
                    <div className={s.rankVal}>
                      {c.completedCount}
                      <span>selesai</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link className={s.btnGhost} href="/couriers" style={{ display: "block", textAlign: "center", marginTop: 16 }}>
              Lihat semua kurir
            </Link>
          </div>
        </div>
      </div>

      <div className={s.pipes}>
        <div className={s.pipe}>
          <div className={s.pipeHead}>
            <span>Di outlet</span>
            <Icon name="storefront" />
          </div>
          <div className={s.pipeVal}>{data.waitingOutlet ?? 0}</div>
        </div>
        <div className={`${s.pipe} ${data.withCourier ? s.pipeHot : ""}`}>
          <div className={s.pipeHead}>
            <span>Di kurir</span>
            <Icon name="delivery_dining" />
          </div>
          <div className={s.pipeVal}>{data.withCourier ?? 0}</div>
        </div>
        <div className={s.pipe}>
          <div className={s.pipeHead}>
            <span>Order aktif</span>
            <Icon name="sync" />
          </div>
          <div className={s.pipeVal}>{data.activeOrders ?? 0}</div>
        </div>
        <div className={s.pipe}>
          <div className={s.pipeHead}>
            <span>Menunggu verifikasi fee</span>
            <Icon name="fact_check" />
          </div>
          <div className={s.pipeVal}>{data.pendingSettlements}</div>
        </div>
      </div>

      <div className={s.ctaRow} style={{ padding: 0 }}>
        <Link className={s.btnPrimary} href="/monitor" style={{ flex: 1, textAlign: "center" }}>
          Live Transaksi
        </Link>
        <Link className={s.btnGhost} href="/settlements" style={{ flex: 1, textAlign: "center" }}>
          Fee & Tagihan
        </Link>
        <Link className={s.btnGhost} href="/settings" style={{ flex: 1, textAlign: "center" }}>
          Atur tarif
        </Link>
      </div>
    </div>
  );
}
