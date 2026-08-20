"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";

type LeafletMap = {
  setView: (c: [number, number], z?: number) => void;
  getCenter: () => { lat: number; lng: number };
  on: (ev: string, fn: (e?: { latlng?: { lat: number; lng: number } }) => void) => void;
  off: (ev: string, fn: () => void) => void;
  invalidateSize: () => void;
  remove: () => void;
};

type LeafletNS = {
  map: (el: HTMLElement, opts?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, opts?: Record<string, unknown>) => { addTo: (m: LeafletMap) => void };
};

declare global {
  interface Window {
    L?: LeafletNS;
  }
}

const DEFAULT = { lat: -3.3194, lng: 114.5921 };

function loadLeaflet(): Promise<LeafletNS> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-dk-leaflet]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      css.setAttribute("data-dk-leaflet", "1");
      document.head.appendChild(css);
    }
    const existing = document.querySelector("script[data-dk-leaflet]") as HTMLScriptElement | null;
    if (existing) {
      if (window.L) {
        resolve(window.L);
        return;
      }
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Peta tidak siap"));
      });
      existing.addEventListener("error", () => reject(new Error("Gagal memuat peta")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.setAttribute("data-dk-leaflet", "1");
    s.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Peta tidak siap"));
    };
    s.onerror = () => reject(new Error("Gagal memuat peta"));
    document.body.appendChild(s);
  });
}

function gpsMessage(err: unknown) {
  const code = (err as GeolocationPositionError)?.code;
  if (code === 1) return "Izinkan lokasi di browser, lalu coba lagi.";
  if (code === 2) return "GPS HP tidak tersedia. Geser peta secara manual.";
  if (code === 3) return "GPS terlalu lama. Geser peta sampai pin tepat di warung.";
  return err instanceof Error ? err.message : "Tidak bisa membaca GPS";
}

export function OutletLocationMap({
  latitude,
  longitude,
  onSaved,
}: {
  latitude?: number;
  longitude?: number;
  onSaved: (next: { latitude: number; longitude: number; address?: string }) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [center, setCenter] = useState(() => ({
    lat: Number.isFinite(latitude) ? Number(latitude) : DEFAULT.lat,
    lng: Number.isFinite(longitude) ? Number(longitude) : DEFAULT.lng,
  }));
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    const sync = () => {
      if (!map) return;
      const c = map.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });
    };
    loadLeaflet()
      .then((L) => {
        if (cancelled || !hostRef.current) return;
        const start: [number, number] = [
          Number.isFinite(latitude) ? Number(latitude) : DEFAULT.lat,
          Number.isFinite(longitude) ? Number(longitude) : DEFAULT.lng,
        ];
        map = L.map(hostRef.current, {
          zoomControl: true,
          attributionControl: false,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
        map.setView(start, Number.isFinite(latitude) ? 18 : 14);
        map.on("move", sync);
        map.on("moveend", sync);
        map.on("click", (e) => {
          if (!e?.latlng) return;
          map?.setView([e.latlng.lat, e.latlng.lng]);
        });
        mapRef.current = map;
        sync();
        setTimeout(() => map?.invalidateSize(), 80);
        setTimeout(() => map?.invalidateSize(), 400);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Peta gagal dimuat"));
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // Map is created once; later GPS/search fly via mapRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flyTo(lat: number, lng: number, zoom = 18) {
    mapRef.current?.setView([lat, lng], zoom);
    setCenter({ lat, lng });
  }

  async function useGps() {
    setBusy("gps");
    setError("");
    setHint("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });
      flyTo(pos.coords.latitude, pos.coords.longitude);
      setHint("GPS HP dipakai. Geser sedikit jika pin belum tepat di pintu warung.");
    } catch (e) {
      setError(gpsMessage(e));
    } finally {
      setBusy("");
    }
  }

  async function searchAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy("search");
    setError("");
    setHint("");
    try {
      const found = await api.geocode(query.trim());
      flyTo(found.latitude, found.longitude);
      setHint(found.address || "Alamat ditemukan. Geser pin sampai tepat.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Alamat tidak ketemu. Ketuk peta atau pakai GPS."
      );
    } finally {
      setBusy("");
    }
  }

  async function savePin() {
    const map = mapRef.current;
    const lat = map?.getCenter().lat ?? center.lat;
    const lng = map?.getCenter().lng ?? center.lng;
    setBusy("save");
    setError("");
    setHint("");
    try {
      let address: string | undefined;
      try {
        const rev = await api.reverseGeocode(lat, lng);
        address = rev.address;
      } catch {
        address = undefined;
      }
      await api.updateLocation(lat, lng, address);
      onSaved({ latitude: lat, longitude: lng, address });
      setHint("Titik warung tersimpan. Ongkir pelanggan dihitung dari pin ini.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan lokasi");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={searchAddress} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari alamat atau nama jalan…"
          className="flex-1 min-w-0 h-11 rounded-full border border-[#E5E7EB] px-4 text-sm bg-white"
        />
        <button
          type="submit"
          disabled={busy === "search"}
          className="dk-btn dk-btn-ghost h-11 px-4 shrink-0 disabled:opacity-50"
        >
          {busy === "search" ? "…" : "Cari"}
        </button>
      </form>

      <div className="relative h-72 rounded-[20px] overflow-hidden bg-[#dce6ef]">
        <div ref={hostRef} className="absolute inset-0 z-0" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
          <div className="w-9 h-9 rounded-full bg-[#22C55E] border-[3px] border-white shadow-[0_6px_16px_rgba(17,17,17,0.28)] grid place-items-center">
            <Icon name="storefront" className="text-white" size={18} fill />
          </div>
          <div className="w-2 h-2 bg-[#22C55E] rotate-45 mx-auto -mt-1 shadow-sm" />
        </div>
        <button
          type="button"
          onClick={useGps}
          disabled={Boolean(busy)}
          className="absolute bottom-3 left-3 z-20 h-10 px-3 rounded-full bg-white shadow-md text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-50"
        >
          <Icon name="my_location" size={18} className="text-primary" />
          {busy === "gps" ? "Membaca GPS…" : "Lokasi HP"}
        </button>
      </div>

      <p className="text-[12px] text-secondary leading-relaxed">
        Geser peta sampai pin hijau tepat di warung. Titik ini dipakai hitung jarak dan ongkir.
      </p>
      <p className="text-[12px] font-mono text-secondary">
        {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
      </p>
      {error ? <p className="text-sm text-danger font-medium">{error}</p> : null}
      {hint ? <p className="text-sm font-medium text-[#15803D]">{hint}</p> : null}

      <button
        type="button"
        onClick={savePin}
        disabled={busy === "save"}
        className="dk-btn dk-btn-ink w-full disabled:opacity-50"
      >
        {busy === "save" ? "Menyimpan titik…" : "Simpan titik warung"}
      </button>
    </div>
  );
}
