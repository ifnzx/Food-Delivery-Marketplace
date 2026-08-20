"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { api, type SupportReport } from "@/lib/api";

const CATEGORIES = [
  ["ORDER", "Masalah order"],
  ["PAYMENT", "Pembayaran / tagihan"],
  ["ACCOUNT", "Akun outlet"],
  ["APP", "Aplikasi"],
  ["OTHER", "Lainnya"],
] as const;

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Menunggu",
  IN_PROGRESS: "Diproses",
  RESOLVED: "Selesai",
  CLOSED: "Ditutup",
};

export default function HelpPage() {
  const [reports, setReports] = useState<SupportReport[]>([]);
  const [category, setCategory] = useState("ORDER");
  const [subject, setSubject] = useState("");
  const [orderId, setOrderId] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    return api.mySupportReports().then(setReports);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await api.submitSupportReport({
        category,
        subject: subject.trim(),
        body: body.trim(),
        orderId: orderId.trim() || undefined,
      });
      setMessage(res.message);
      setSubject("");
      setOrderId("");
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim laporan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-4">
      <header className="pt-1 pb-2">
        <Link
          href="/profile"
          className="w-11 h-11 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] grid place-items-center text-on-surface"
        >
          <Icon name="arrow_back" />
        </Link>
        <h1 className="mt-4 font-bold text-[32px] leading-tight text-on-surface tracking-tight">
          Bantuan
        </h1>
        <p className="text-sm text-secondary mt-1">
          Laporkan kendala — langsung masuk ke Super Admin ANTARQ.
        </p>
      </header>

      <section className="mt-4 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">
              Kategori
            </label>
            <select
              className="mt-1 w-full h-12 px-3 rounded-xl border border-[#E5E7EB] bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">
              Subjek
            </label>
            <input
              className="mt-1 w-full h-12 px-3 rounded-xl border border-[#E5E7EB] bg-white"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={120}
              placeholder="Contoh: Menu tidak bisa diupdate"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">
              Nomor order (opsional)
            </label>
            <input
              className="mt-1 w-full h-12 px-3 rounded-xl border border-[#E5E7EB] bg-white"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="ORD-..."
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">
              Deskripsi kendala
            </label>
            <textarea
              className="mt-1 w-full px-3 py-3 rounded-xl border border-[#E5E7EB] bg-white min-h-[110px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              placeholder="Jelaskan masalah yang Anda alami…"
            />
          </div>
          {error ? <p className="text-error text-sm">{error}</p> : null}
          {message ? <p className="text-sm font-medium text-[#15803D]">{message}</p> : null}
          <button type="submit" disabled={busy} className="dk-btn dk-btn-ink w-full disabled:opacity-60">
            {busy ? "Mengirim…" : "Kirim laporan"}
          </button>
        </form>
      </section>

      <section className="mt-5">
        <h2 className="font-bold text-lg px-1 mb-3">Riwayat laporan saya</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-secondary px-1">Belum ada laporan.</p>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-[18px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-4 mb-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{r.subject}</p>
                  <p className="text-xs text-secondary mt-0.5">
                    {r.id} · {new Date(r.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-primary-fixed text-primary shrink-0">
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant mt-2 whitespace-pre-wrap">{r.body}</p>
              {r.adminNote ? (
                <p className="text-sm mt-2 p-3 rounded-xl bg-[#F0FDF4] text-[#166534]">
                  <strong>Balasan admin:</strong> {r.adminNote}
                </p>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
