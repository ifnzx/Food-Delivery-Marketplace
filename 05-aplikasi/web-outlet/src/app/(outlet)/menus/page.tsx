"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { api, rupiah, type MerchantProfile } from "@/lib/api";
import { MENU_CATEGORIES } from "@/lib/menuCategories";
import { menuImageSrc } from "@/lib/ui";

export default function MenusPage() {
  const [menus, setMenus] = useState<MerchantProfile["menus"]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>("Makanan");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);

  function compressImage(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Gagal membaca file"));
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 640;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas tidak tersedia"));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        };
        img.onerror = () => reject(new Error("File bukan gambar"));
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function load() {
    setMenus(await api.menus());
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createMenu({
        name: name.trim(),
        price: Number(price),
        category,
        imageUrl: imageUrl || undefined,
      });
      setName("");
      setPrice("");
      setCategory("Makanan");
      setImageUrl("");
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, isAvailable: boolean) {
    await api.updateMenu(id, { isAvailable: !isAvailable });
    await load();
  }

  const list = menus.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="pb-20">
      <h1 className="text-[24px] font-bold mb-1">Menu dapur</h1>
      <p className="text-sm text-secondary mb-4">Atur ketersediaan dan tambah hidangan baru.</p>
      {error ? <p className="text-error text-sm mb-2">{error}</p> : null}
      <div className="relative mb-4">
        <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari ayam, nasi, teh…"
          className="w-full h-12 pl-11 pr-4 bg-white border border-[#E5E7EB] rounded-2xl text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="flex flex-col gap-3">
        {list.map((m) => (
          <div key={m.id} className={`dk-card p-3 flex items-center gap-3 card-lift anim-up ${m.isAvailable ? "" : "opacity-70"}`}>
            <div className={`w-16 h-16 rounded-2xl overflow-hidden shrink-0 ${m.isAvailable ? "" : "grayscale"}`}>
              <img src={menuImageSrc(m)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate">{m.name}</h3>
              <p className="text-xs text-secondary font-semibold">{m.category}</p>
              <p className="text-sm text-primary font-semibold">{rupiah(m.price)}</p>
            </div>
            <button type="button" className="shrink-0 flex flex-col items-end gap-1" onClick={() => toggle(m.id, m.isAvailable)}>
              <span className={`w-12 h-7 rounded-full relative ${m.isAvailable ? "bg-primary" : "bg-gray-300"}`}>
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    m.isAvailable ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </span>
              <span className={`text-[11px] font-semibold ${m.isAvailable ? "text-primary" : "text-secondary"}`}>
                {m.isAvailable ? "Tersedia" : "Habis"}
              </span>
            </button>
          </div>
        ))}
      </div>

      {showAdd ? (
        <form onSubmit={onCreate} className="fixed inset-x-4 bottom-28 dk-card p-4 z-40 space-y-3 max-h-[70vh] overflow-y-auto">
          <p className="font-bold text-lg">Tambah menu</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#f6f7f6] border border-[#E5E7EB] shrink-0 grid place-items-center">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Icon name="add_a_photo" className="text-secondary" size={22} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Foto makanan</p>
              <p className="text-xs text-secondary">Dari galeri atau kamera</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  setImageUrl(await compressImage(file));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Gagal memuat gambar");
                }
              }}
            />
          </label>
          <input className="w-full h-12 border border-[#E5E7EB] rounded-2xl px-3" placeholder="Nama hidangan" value={name} onChange={(e) => setName(e.target.value)} required />
          <label className="block text-sm font-semibold text-secondary">Kategori</label>
          <select
            className="w-full h-12 border border-[#E5E7EB] rounded-2xl px-3 bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {MENU_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input className="w-full h-12 border border-[#E5E7EB] rounded-2xl px-3" placeholder="Harga" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} required />
          <div className="flex gap-2">
            <button type="button" className="dk-btn dk-btn-ghost flex-1" onClick={() => { setShowAdd(false); setImageUrl(""); }}>Batal</button>
            <button type="submit" disabled={busy} className="dk-btn dk-btn-ink flex-1">Simpan</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowAdd(true)} className="fixed bottom-24 right-4 dk-btn dk-btn-ink shadow-lg z-40 press">
          <Icon name="add" size={20} />
          Tambah
        </button>
      )}
    </div>
  );
}
