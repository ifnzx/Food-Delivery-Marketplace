"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, rupiah } from "@/lib/api";
import { Icon } from "@/components/Icon";
import s from "@/components/stitch.module.css";

type PriorityUnit = "HOUR" | "DAY" | "MONTH";

const UNIT_LABEL: Record<PriorityUnit, string> = {
  HOUR: "jam",
  DAY: "hari",
  MONTH: "bulan",
};

export default function SettingsPage() {
  // Simpan sebagai string agar user bisa mengetik bebas (hapus, ketik ulang, dsb.)
  const [percentStr, setPercentStr] = useState("15");
  const [mode, setMode] = useState<"PER_KM" | "FLAT">("PER_KM");
  const [perKmStr, setPerKmStr] = useState("2000");
  const [flatStr, setFlatStr] = useState("10000");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Placement — rekomendasi & prioritas kurir
  const [featPctStr, setFeatPctStr] = useState("20");
  const [priorityFeeStr, setPriorityFeeStr] = useState("25000");
  const [priorityDurStr, setPriorityDurStr] = useState("7");
  const [priorityUnit, setPriorityUnit] = useState<PriorityUnit>("DAY");
  const [placementError, setPlacementError] = useState("");
  const [placementMsg, setPlacementMsg] = useState("");
  const [placementBusy, setPlacementBusy] = useState(false);

  // Nilai numerik — NaN kalau field sedang kosong/invalid (pratinjau diam)
  const percent = parseFloat(percentStr);
  const perKm = parseInt(perKmStr, 10);
  const flat = parseInt(flatStr, 10);

  useEffect(() => {
    api
      .pricing()
      .then((p) => {
        setPercentStr(String(p.commissionPercent));
        setMode(p.deliveryMode);
        setPerKmStr(String(p.deliveryRatePerKm));
        setFlatStr(String(p.deliveryFlatFee));
      })
      .catch((e) => setError(e.message));
    api
      .placement()
      .then((pl) => {
        setFeatPctStr(String(pl.featuredCommissionPercent));
        setPriorityFeeStr(String(pl.courierPriorityFee));
        setPriorityDurStr(String(pl.courierPriorityDuration ?? pl.courierPriorityDays));
        setPriorityUnit(pl.courierPriorityUnit || "DAY");
      })
      .catch(() => {/* ignore if not available */});
  }, []);

  const exampleCommission = useMemo(
    () => (Number.isFinite(percent) ? Math.round(100000 * (percent / 100)) : null),
    [percent]
  );
  const exampleDelivery = useMemo(() => {
    if (mode === "FLAT") return Number.isFinite(flat) ? flat : null;
    return Number.isFinite(perKm) ? 5 * perKm : null;
  }, [mode, flat, perKm]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
      setError("Komisi harus antara 0 dan 50.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.updatePricing({
        commissionPercent: percent,
        deliveryMode: mode,
        deliveryRatePerKm: Number.isFinite(perKm) ? perKm : 2000,
        deliveryFlatFee: Number.isFinite(flat) ? flat : 10000,
      });
      // Re-fetch dari DB untuk konfirmasi nilai yang benar-benar tersimpan
      const confirmed = await api.pricing();
      setPercentStr(String(confirmed.commissionPercent));
      setMode(confirmed.deliveryMode);
      setPerKmStr(String(confirmed.deliveryRatePerKm));
      setFlatStr(String(confirmed.deliveryFlatFee));
      setMessage(
        `Tersimpan ✓ — komisi ${confirmed.commissionPercent}%, ongkir ${
          confirmed.deliveryMode === "FLAT"
            ? rupiah(confirmed.deliveryFlatFee) + " (tetap)"
            : rupiah(confirmed.deliveryRatePerKm) + "/km"
        }. Order baru akan memakai tarif ini.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal simpan tarif");
    } finally {
      setBusy(false);
    }
  }

  const featPct = parseFloat(featPctStr);
  const priorityFee = parseInt(priorityFeeStr, 10);
  const priorityDur = parseInt(priorityDurStr, 10);

  async function savePlacement(e: FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(featPct) || featPct < 0 || featPct > 50) {
      setPlacementError("Komisi rekomendasi harus antara 0–50%.");
      return;
    }
    if (!Number.isFinite(priorityFee) || priorityFee < 0) {
      setPlacementError("Biaya prioritas tidak valid.");
      return;
    }
    if (!Number.isFinite(priorityDur) || priorityDur < 1) {
      setPlacementError("Durasi prioritas tidak valid.");
      return;
    }
    setPlacementBusy(true);
    setPlacementError("");
    setPlacementMsg("");
    try {
      const res = await api.updatePlacement({
        featuredCommissionPercent: featPct,
        courierPriorityFee: priorityFee,
        courierPriorityDuration: priorityDur,
        courierPriorityUnit: priorityUnit,
      });
      setPlacementMsg(res.message);
      // Refresh nilai tersimpan — pertahankan unit yang dipilih (jam/hari/bulan)
      const pl = await api.placement();
      setFeatPctStr(String(pl.featuredCommissionPercent));
      setPriorityFeeStr(String(pl.courierPriorityFee));
      setPriorityDurStr(String(pl.courierPriorityDuration ?? pl.courierPriorityDays));
      setPriorityUnit(pl.courierPriorityUnit || "DAY");
    } catch (err) {
      setPlacementError(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setPlacementBusy(false);
    }
  }

  return (
    <div className={s.stack}>
    <form className={s.stack} onSubmit={save}>
      {error ? <div className={s.error}>{error}</div> : null}
      {message ? <div className={s.ok}>{message}</div> : null}

      <div className={s.split}>
        <div className={s.card}>
          <div className={s.cardPad}>
            <h2 className={s.colTitle} style={{ marginBottom: 8 }}>
              <Icon name="percent" /> Komisi outlet
            </h2>
            <p className={s.muted}>Persentase dari harga makanan.</p>
            <label className={s.muted}>
              Komisi (%)
              <input
                className={s.field}
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={percentStr}
                onChange={(e) => setPercentStr(e.target.value)}
                required
              />
            </label>
            <p className={s.muted} style={{ marginTop: 12 }}>
              {exampleCommission != null
                ? `Contoh makanan Rp100.000 → komisi ${rupiah(exampleCommission)}, hak outlet ${rupiah(100000 - exampleCommission)}.`
                : "Masukkan angka komisi."}
            </p>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardPad}>
            <h2 className={s.colTitle} style={{ marginBottom: 8 }}>
              <Icon name="two_wheeler" /> Ongkir kurir
            </h2>
            <p className={s.muted}>Tarif tetap atau per kilometer.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "12px 0" }}>
              <button
                type="button"
                className={mode === "PER_KM" ? s.btnPrimary : s.btnGhost}
                onClick={() => setMode("PER_KM")}
              >
                Per km
              </button>
              <button
                type="button"
                className={mode === "FLAT" ? s.btnPrimary : s.btnGhost}
                onClick={() => setMode("FLAT")}
              >
                Tarif tetap (plat)
              </button>
            </div>
            {mode === "PER_KM" ? (
              <label className={s.muted}>
                Rupiah per km
                <input
                  className={s.field}
                  type="number"
                  min={0}
                  step={500}
                  value={perKmStr}
                  onChange={(e) => setPerKmStr(e.target.value)}
                  required
                />
              </label>
            ) : (
              <label className={s.muted}>
                Ongkir per pengantaran
                <input
                  className={s.field}
                  type="number"
                  min={0}
                  step={500}
                  value={flatStr}
                  onChange={(e) => setFlatStr(e.target.value)}
                  required
                />
              </label>
            )}
            <p className={s.muted} style={{ marginTop: 12 }}>
              {mode === "FLAT"
                ? exampleDelivery != null
                  ? `Setiap antar dikenakan ${rupiah(exampleDelivery)}, berapa pun jaraknya.`
                  : "Masukkan ongkir tetap."
                : exampleDelivery != null
                  ? `Contoh 5 km → ongkir ${rupiah(exampleDelivery)}.`
                  : "Masukkan tarif per km."}
            </p>
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardPad}>
          <strong>Pratinjau</strong>
          <div className={s.row}>
            <span>Makanan Rp100.000</span>
            <strong>
              {exampleCommission != null
                ? `Komisi ${rupiah(exampleCommission)} → outlet ${rupiah(100000 - exampleCommission)}`
                : "—"}
            </strong>
          </div>
          <div className={s.row}>
            <span>{mode === "FLAT" ? "Ongkir tetap" : "Ongkir 5 km"}</span>
            <strong>{exampleDelivery != null ? `${rupiah(exampleDelivery)} (ke kurir)` : "—"}</strong>
          </div>
          <div className={s.row}>
            <span>Total bayar pelanggan</span>
            <strong>
              {exampleCommission != null && exampleDelivery != null
                ? rupiah(100000 + exampleDelivery)
                : "—"}
            </strong>
          </div>
          <div className={s.row} style={{ borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 4 }}>
            <span className={s.muted}>Formulanya</span>
            <span className={s.muted}>subtotal × {Number.isFinite(percent) ? percent : "…"}% = komisi founder</span>
          </div>
          <button className={s.btnPrimary} disabled={busy} style={{ marginTop: 12 }}>
            {busy ? "Menyimpan…" : "Simpan tarif"}
          </button>
        </div>
      </div>
    </form>

    {/* ── Placement: rekomendasi & prioritas kurir ── */}
    <form className={s.stack} onSubmit={savePlacement}>
      {placementError ? <div className={s.error}>{placementError}</div> : null}
      {placementMsg ? <div className={s.ok}>{placementMsg}</div> : null}

      <div className={s.split}>
        <div className={s.card}>
          <div className={s.cardPad}>
            <h2 className={s.colTitle} style={{ marginBottom: 8 }}>
              <Icon name="star" /> Komisi outlet rekomendasi
            </h2>
            <p className={s.muted}>Outlet yang ditandai "rekomendasi" dikenai komisi berbeda.</p>
            <label className={s.muted}>
              Komisi rekomendasi (%)
              <input
                className={s.field}
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={featPctStr}
                onChange={(e) => setFeatPctStr(e.target.value)}
                required
              />
            </label>
            <p className={s.muted} style={{ marginTop: 12 }}>
              {Number.isFinite(featPct)
                ? `Contoh makanan Rp100.000 → komisi ${rupiah(Math.round(100000 * (featPct / 100)))}.`
                : "Masukkan angka komisi rekomendasi."}
            </p>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardPad}>
            <h2 className={s.colTitle} style={{ marginBottom: 8 }}>
              <Icon name="workspace_premium" /> Langganan prioritas kurir
            </h2>
            <p className={s.muted}>Biaya dan durasi aktif langganan prioritas kurir.</p>
            <label className={s.muted}>
              Biaya (Rp)
              <input
                className={s.field}
                type="number"
                min={0}
                step={1000}
                value={priorityFeeStr}
                onChange={(e) => setPriorityFeeStr(e.target.value)}
                required
              />
            </label>
            <label className={s.muted} style={{ marginTop: 8, display: "block" }}>
              Durasi
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "8px 0 4px" }}>
                {(["HOUR", "DAY", "MONTH"] as PriorityUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={priorityUnit === u ? s.btnPrimary : s.btnGhost}
                    onClick={() => setPriorityUnit(u)}
                    style={{ fontSize: 13 }}
                  >
                    Per {UNIT_LABEL[u]}
                  </button>
                ))}
              </div>
              <input
                className={s.field}
                type="number"
                min={1}
                step={1}
                value={priorityDurStr}
                onChange={(e) => setPriorityDurStr(e.target.value)}
                required
              />
            </label>
            <p className={s.muted} style={{ marginTop: 8 }}>
              {Number.isFinite(priorityFee) && Number.isFinite(priorityDur)
                ? `Kurir bayar ${rupiah(priorityFee)} untuk aktif ${priorityDur} ${UNIT_LABEL[priorityUnit]}.`
                : "Masukkan biaya dan durasi."}
            </p>
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardPad}>
          <button className={s.btnPrimary} disabled={placementBusy} style={{ marginTop: 4 }}>
            {placementBusy ? "Menyimpan…" : "Simpan pengaturan placement"}
          </button>
        </div>
      </div>
    </form>
    </div>
  );
}
