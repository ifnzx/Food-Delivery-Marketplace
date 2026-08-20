"use client";

import { useEffect, useState } from "react";
import { api, rupiah, type SalesReport } from "@/lib/api";

export default function SalesPage() {
  const [data, setData] = useState<SalesReport | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"today" | "week" | "all">("all");

  useEffect(() => {
    api
      .sales()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <p className="text-danger">{error}</p>;
  }
  if (!data) {
    return <p className="text-secondary">Memuat laporan penjualan…</p>;
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const rows = data.rows.filter((r) => {
    const t = new Date(r.completedAt || r.createdAt);
    if (period === "today") return t >= startOfDay;
    if (period === "week") return t >= weekAgo;
    return true;
  });

  const totalSales = rows.reduce((s, r) => s + r.subtotal, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commissionAmount, 0);
  const merchantAmount = rows.reduce((s, r) => s + r.merchantAmount, 0);

  function exportCsv() {
    const lines = [
      "ID Pesanan,Waktu,Subtotal,Komisi,Hak Outlet,Status",
      ...rows.map((r) => {
        const t = new Date(r.completedAt || r.createdAt).toLocaleString("id-ID");
        return `${r.orderId},${t},${r.subtotal},${r.commissionAmount},${r.merchantAmount},${r.status}`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laporan-penjualan.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] text-secondary">Performa warung</p>
        <h1 className="text-[24px] font-bold">Penjualan</h1>
      </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              ["today", "Hari ini"],
              ["week", "Minggu ini"],
              ["all", "Semua"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`h-10 px-4 rounded-full text-sm font-semibold ${
                period === key ? "bg-[#111] text-white" : "bg-white text-secondary border border-[#E5E7EB]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="dk-card p-5 relative overflow-hidden anim-up">
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant mb-2">
              <span className="material-symbols-outlined text-primary">
                account_balance_wallet
              </span>
              <h3 className="text-label-lg">Pendapatan Bersih (Hak Outlet)</h3>
            </div>
            <p className="text-currency-display text-[32px] leading-tight text-on-background mt-2">
              {rupiah(merchantAmount)}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-tertiary-container bg-tertiary-container/10 w-fit px-2 py-1 rounded text-label-sm">
            <span className="material-symbols-outlined text-[14px]">
              trending_up
            </span>
            <span>Dana siap ditarik</span>
          </div>
        </div>

        <div className="dk-card p-5">
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant mb-2">
              <span className="material-symbols-outlined text-secondary">
                receipt_long
              </span>
              <h3 className="text-label-lg">Total Penjualan Makanan</h3>
            </div>
            <p className="text-currency-display text-on-background mt-2">
              {rupiah(totalSales)}
            </p>
          </div>
          <div className="mt-4 text-body-md text-secondary">
            Dari {rows.length} pesanan selesai
          </div>
        </div>

        <div className="dk-card p-5">
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant mb-2">
              <span className="material-symbols-outlined text-primary">
                pie_chart
              </span>
              <h3 className="text-label-lg">
                Komisi Platform ({Math.round(data.commissionRate * 100)}%)
                {data.isFeatured ? " · rekomendasi" : ""}
              </h3>
            </div>
            <p className="text-currency-display text-on-background mt-2">
              {rupiah(totalCommission)}
            </p>
          </div>
          <div className="mt-4 text-body-md text-secondary flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] mt-0.5">
              info
            </span>
            <span>
              {data.note || "Biaya layanan aplikasi untuk operasional & pemasaran."}
            </span>
          </div>
        </div>
      </div>

      <div className="dk-card overflow-hidden">
        <div className="p-6 border-b border-border-muted bg-surface-bright flex justify-between items-center">
          <h2 className="text-headline-sm text-on-background">
            Rincian Pesanan Selesai
          </h2>
          <button
            type="button"
            onClick={exportCsv}
            className="text-primary text-label-lg flex items-center gap-1 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
          >
            Unduh CSV
            <span className="material-symbols-outlined text-[18px]">
              download
            </span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-lowest">
                <th className="py-4 px-6 text-label-sm text-secondary uppercase tracking-wider border-b border-border-muted">
                  ID Pesanan
                </th>
                <th className="py-4 px-6 text-label-sm text-secondary uppercase tracking-wider border-b border-border-muted">
                  Waktu
                </th>
                <th className="py-4 px-6 text-label-sm text-secondary uppercase tracking-wider border-b border-border-muted text-right">
                  Subtotal
                </th>
                <th className="py-4 px-6 text-label-sm text-secondary uppercase tracking-wider border-b border-border-muted text-right">
                  Komisi ({Math.round(data.commissionRate * 100)}%)
                </th>
                <th className="py-4 px-6 text-label-sm text-secondary uppercase tracking-wider border-b border-border-muted text-right">
                  Hak Outlet
                </th>
                <th className="py-4 px-6 text-label-sm text-secondary uppercase tracking-wider border-b border-border-muted text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-muted bg-surface-white">
              {rows.map((r) => {
                const t = new Date(r.completedAt || r.createdAt);
                return (
                  <tr
                    key={r.orderId}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="py-4 px-6 text-label-lg text-on-background">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[18px]">
                          receipt
                        </span>
                        {r.orderId}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-body-md text-on-background">
                      {t.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-6 text-body-md text-on-background text-right">
                      {rupiah(r.subtotal)}
                    </td>
                    <td className="py-4 px-6 text-body-md text-danger text-right">
                      -{rupiah(r.commissionAmount)}
                    </td>
                    <td className="py-4 px-6 text-currency-display text-[16px] text-on-background text-right">
                      {rupiah(r.merchantAmount)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm bg-tertiary-container/20 text-tertiary-container">
                        Selesai
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="py-12 px-6 text-center bg-surface-container-lowest"
                    colSpan={6}
                  >
                    <div className="flex flex-col items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">
                        inbox
                      </span>
                      <p className="text-body-md">
                        Tidak ada pesanan untuk periode ini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-surface flex items-center justify-center gap-2 border-t border-border-muted text-secondary text-label-sm">
          <span className="material-symbols-outlined text-[16px]">
            local_shipping
          </span>
          Ongkir tidak masuk pendapatan outlet.
        </div>
      </div>
    </div>
  );
}
