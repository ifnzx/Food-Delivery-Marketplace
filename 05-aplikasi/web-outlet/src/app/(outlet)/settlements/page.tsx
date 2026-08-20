"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { api, rupiah, type MerchantProfile } from "@/lib/api";

type Settlement = Awaited<ReturnType<typeof api.settlements>>[number];

function compressProof(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Bukti transfer harus berupa foto"));
      return;
    }
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
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Tidak bisa memproses foto"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Foto bukti transfer tidak bisa dibaca"));
    };
    img.src = url;
  });
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusMeta(status: string) {
  if (status === "VERIFIED") {
    return { label: "Lunas", className: "bg-[#E8F8EE] text-[#15803D]" };
  }
  if (status === "REJECTED") {
    return { label: "Ditolak", className: "bg-[#FEE2E2] text-[#B91C1C]" };
  }
  return { label: "Dicek admin", className: "bg-[#FEF3C7] text-[#B45309]" };
}

export default function SettlementsPage() {
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [rows, setRows] = useState<Settlement[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  async function load() {
    const [p, s] = await Promise.all([api.profile(), api.settlements()]);
    setProfile(p);
    setRows(s);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Gagal menyalin. Salin nomor rekening secara manual.");
    }
  }

  async function onPickProof(file?: File) {
    if (!file) return;
    setError("");
    try {
      setProofUrl(await compressProof(file));
    } catch (err) {
      setProofUrl("");
      setError(err instanceof Error ? err.message : "Gagal membaca foto");
    }
  }

  async function submitBill() {
    if (!proofUrl.startsWith("data:image/")) {
      setError("Foto bukti transfer masih kosong.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.createSettlement(proofUrl);
      setProofUrl("");
      setMessage("Terkirim. Tunggu Super Admin cek foto dengan mutasi rekening.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return <p className="text-secondary pt-6 text-sm anim-up">{error || "Memuat tagihan…"}</p>;
  }

  const billing = profile.billing;
  const payout = profile.payoutAccount;
  const outstanding = profile.outstandingAmount ?? 0;
  const mix = profile.commissionMix ?? [];
  const days = billing?.workingDays ?? 10;
  const suspended = profile.status === "SUSPENDED" || billing?.canOperate === false;
  const pending = rows.some((r) => r.status === "PENDING");
  const canSubmit = outstanding > 0 && Boolean(proofUrl) && !busy && Boolean(payout);
  const paid = outstanding <= 0;

  return (
    <div className="space-y-4">
      <div className="anim-up">
        <h1 className="text-[24px] font-bold leading-tight">Bayar komisi</h1>
        <p className="text-sm text-secondary mt-1">
          Tagihan = komisi makanan tiap pesanan. Biasa 15%, rekomendasi 20%. Ongkir bukan tagihan warung.
        </p>
      </div>

      {error ? (
        <p className="dk-card p-4 text-sm text-danger font-medium anim-pop">{error}</p>
      ) : null}
      {message ? (
        <p className="dk-card p-4 text-sm font-medium text-[#15803D] anim-pop">{message}</p>
      ) : null}

      {suspended ? (
        <div className="rounded-[24px] border border-[#FECACA] bg-[#FEF2F2] p-4 anim-pop">
          <p className="font-bold text-[#B91C1C]">Dapur dimatikan</p>
          <p className="text-sm text-[#991B1B] mt-1">
            Bayar tagihan, kirim foto bukti, tunggu Super Admin mengaktifkan lagi.
          </p>
        </div>
      ) : null}

      <section
        className={`relative overflow-hidden rounded-[24px] p-5 anim-up d1 ${
          paid ? "dk-card-open hero-shimmer min-h-[132px]" : "dk-card"
        }`}
      >
        {paid ? (
          <>
            <span className="blob bg-white/20 w-24 h-24 -right-4 -top-8" />
            <span className="absolute right-2 bottom-0 text-[64px] text-white/90 pointer-events-none" style={{ animation: "floatY 2.6s ease-in-out infinite" }}>
              <Icon name="verified" fill />
            </span>
          </>
        ) : null}
        <div className="relative z-10">
          <p className={`text-[12px] font-semibold ${paid ? "text-white/80" : "text-secondary"}`}>
            {paid ? "Status tagihan" : "Yang harus dibayar"}
          </p>
          <p className={`text-[32px] font-bold leading-none mt-2 ${paid ? "text-white" : ""}`}>
            {rupiah(outstanding)}
          </p>
          <p className={`text-sm mt-2 ${paid ? "text-white/85" : "text-secondary"}`}>
            {paid
              ? "Komisi sudah lunas."
              : billing?.isOverdue
                ? `Lewat tempo ${billing.daysOverdue} hari. Bayar sekarang.`
                : `Bayar paling lambat ${formatDate(billing?.feeDueAt)} (${days} hari kalender).`}
          </p>
        </div>
      </section>

      {mix.length > 0 && outstanding > 0 ? (
        <section className="dk-card p-4 space-y-3 anim-up d1">
          <p className="font-bold">Rincian tagihan ini</p>
          <p className="text-[12px] text-secondary">
            Jumlah yang harus dibayar adalah gabungan komisi 15% dan 20% dari pesanan yang belum dilunasi.
          </p>
          {mix.map((b) => (
            <div key={b.percent} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-sm">{b.label}</p>
                <p className="text-[12px] text-secondary">
                  {b.orderCount} pesanan · makanan {rupiah(b.foodSubtotal)}
                </p>
              </div>
              <p className="font-bold tabular-nums shrink-0">{rupiah(b.commissionAmount)}</p>
            </div>
          ))}
        </section>
      ) : null}

      {!paid ? (
        <div className="flex gap-2 anim-up d2">
          {[
            ["payments", "Transfer"],
            ["photo_camera", "Foto"],
            ["send", "Kirim"],
          ].map(([icon, label], i) => (
            <div
              key={label}
              className="flex-1 dk-card py-3 px-2 text-center card-lift"
              style={{ animationDelay: `${0.08 + i * 0.06}s` }}
            >
              <span className="mx-auto w-8 h-8 rounded-full bg-[#111] text-white grid place-items-center mb-1.5">
                <Icon name={icon} size={16} />
              </span>
              <p className="text-[11px] font-bold">{i + 1}. {label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {payout ? (
        <section className="dk-card p-5 space-y-3 anim-up d2 card-lift">
          <div className="flex items-center justify-between">
            <p className="font-bold">Rekening Super Admin</p>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#111] text-white">Resmi</span>
          </div>
          <div className="rounded-2xl bg-[#f6f7f6] p-4 space-y-2">
            <p className="text-[12px] text-secondary">{payout.bankName}</p>
            <p className="font-bold text-[22px] tracking-wide tabular-nums">{payout.accountNumber}</p>
            <p className="text-sm">{payout.accountName}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => copyText("rekening", payout.accountNumber)} className="dk-btn dk-btn-ghost h-11 text-[13px]">
              <Icon name="content_copy" size={16} />
              {copied === "rekening" ? "Tersalin" : "Salin rekening"}
            </button>
            <button type="button" onClick={() => copyText("nama", payout.accountName)} className="dk-btn dk-btn-ghost h-11 text-[13px]">
              <Icon name="content_copy" size={16} />
              {copied === "nama" ? "Tersalin" : "Salin nama"}
            </button>
          </div>
        </section>
      ) : (
        <div className="dk-card p-5 anim-up d2">
          <p className="font-bold">Rekening belum ada</p>
          <p className="text-sm text-secondary mt-1">Minta Super Admin mengisi rekening tujuan.</p>
        </div>
      )}

      {!paid ? (
        <section className="dk-card p-5 space-y-4 anim-up d3">
          {pending ? (
            <p className="text-sm font-medium text-[#B45309]">
              Pengajuan sebelumnya masih dicek. Jangan transfer lagi kecuali ditolak.
            </p>
          ) : null}

          <label className={`block rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer press ${proofUrl ? "border-primary bg-[#F0FDF4]" : "border-[#D1D5DB] bg-[#f6f7f6]"}`}>
            {proofUrl ? (
              <img src={proofUrl} alt="" className="w-full max-h-44 object-contain rounded-xl bg-white mb-3 anim-pop" />
            ) : (
              <span className="mx-auto mb-2 w-12 h-12 rounded-full bg-white grid place-items-center shadow-sm" style={{ animation: "floatY 2.8s ease-in-out infinite" }}>
                <Icon name="add_a_photo" className="text-primary" fill />
              </span>
            )}
            <p className="font-bold text-sm">{proofUrl ? "Ganti foto bukti" : "Ambil foto bukti transfer"}</p>
            <p className="text-[12px] text-secondary mt-1">Struk ATM atau screenshot m-banking. Wajib.</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void onPickProof(file);
              }}
            />
          </label>

          <button type="button" disabled={!canSubmit} onClick={submitBill} className="dk-btn dk-btn-ink w-full disabled:opacity-50">
            {busy ? "Mengirim…" : proofUrl ? "Kirim ke Super Admin" : "Foto dulu, baru kirim"}
          </button>
        </section>
      ) : null}

      <section className="dk-card overflow-hidden anim-up d4">
        <div className="p-4 border-b border-[#eef0ee]">
          <p className="font-bold">Riwayat pembayaran</p>
          <p className="text-[12px] text-secondary mt-1">
            Setiap pengajuan menampilkan berapa yang 15% (biasa) dan 20% (rekomendasi).
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-secondary">Belum ada pengajuan.</p>
        ) : (
          <div className="divide-y divide-[#eef0ee]">
            {rows.map((r) => {
              const meta = statusMeta(r.status);
              const rates = r.rates ?? [];
              return (
                <div key={r.id} className="p-4 flex items-start gap-3">
                  {r.proofUrl?.startsWith("data:image/") || r.proofUrl?.startsWith("http") ? (
                    <img src={r.proofUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-[#f6f7f6] shrink-0" />
                  ) : (
                    <span className="w-12 h-12 rounded-xl bg-[#f6f7f6] grid place-items-center shrink-0">
                      <Icon name="receipt_long" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{rupiah(r.paidAmount)}</p>
                    <p className="text-[12px] text-secondary">
                      {new Date(r.createdAt).toLocaleDateString("id-ID")}
                    </p>
                    {rates.length > 0 ? (
                      <div className="mt-1.5 space-y-0.5">
                        {rates.map((b) => (
                          <p key={b.percent} className="text-[12px] text-secondary">
                            {b.label}: {b.orderCount} pesanan · {rupiah(b.commissionAmount)}
                          </p>
                        ))}
                      </div>
                    ) : r.rateNote ? (
                      <p className="text-[12px] text-secondary mt-1">{r.rateNote}</p>
                    ) : (
                      <p className="text-[12px] text-secondary mt-1">
                        Komisi mengikuti tarif tiap pesanan (15% atau 20%).
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0 ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
