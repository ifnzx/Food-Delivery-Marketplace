"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { OutletLocationMap } from "@/components/OutletLocationMap";
import { api, clearSession, getSession, type MerchantProfile } from "@/lib/api";
import { emitOutletOpen, hapticOutletToggle, compressImageFile, mediaSrc } from "@/lib/ui";

function SettingRow({
  icon,
  label,
  hint,
  tone,
  href,
  onClick,
  trailing,
}: {
  icon: string;
  label: string;
  hint?: string;
  tone: string;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tone}`}>
        <Icon name={icon} fill />
      </span>
      <span className="flex-1 font-semibold text-[15px] text-on-surface text-left">{label}</span>
      {trailing ?? (
        <>
          {hint ? <span className="text-xs text-secondary max-w-[42%] truncate text-right">{hint}</span> : null}
          <Icon name="chevron_right" className="text-[#c5c5c5]" />
        </>
      )}
    </>
  );
  const cls =
    "press flex items-center gap-3 px-4 min-h-[56px] active:bg-[#F3F4F6] w-full";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [photoDraft, setPhotoDraft] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [openBusy, setOpenBusy] = useState(false);
  const [showFeatured, setShowFeatured] = useState(false);
  const [featuredBusy, setFeaturedBusy] = useState(false);

  useEffect(() => {
    api
      .profile()
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setAddress(p.address);
        setPhone(p.phone || "");
        setPhotoDraft(p.photoUrl || "");
      })
      .catch((e) => setError(e.message));
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setError("Nama dan alamat wajib diisi");
      return;
    }
    setSaveBusy(true);
    setError("");
    setMessage("");
    try {
      await api.updateProfile({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        ...(photoDraft.startsWith("data:") ? { photoUrl: photoDraft } : {}),
      });
      const next = await api.profile();
      setProfile(next);
      setName(next.name);
      setAddress(next.address);
      setPhone(next.phone || "");
      setPhotoDraft(next.photoUrl || "");
      setEditing(false);
      setMessage("Profil warung disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaveBusy(false);
    }
  }

  async function toggleOpen() {
    if (!profile) return;
    setOpenBusy(true);
    try {
      const next = !profile.isOpen;
      hapticOutletToggle(next);
      await api.setOpen(next);
      setProfile({ ...profile, isOpen: next });
      emitOutletOpen(next);
    } finally {
      setOpenBusy(false);
    }
  }

  if (!profile) {
    return <p className="text-secondary pt-6 text-sm">{error || "Memuat…"}</p>;
  }

  const email = getSession()?.email || "";
  const initial = (profile.name.trim()[0] || "W").toUpperCase();
  const photoSrc = photoDraft.startsWith("data:")
    ? photoDraft
    : mediaSrc(photoDraft || profile.photoUrl);
  const gpsHint =
    profile.latitude != null && profile.longitude != null ? "Aktif" : "Atur";

  return (
    <div className="max-w-lg mx-auto pb-4">
      <header className="pt-1 pb-2">
        <Link
          href="/home"
          className="w-11 h-11 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] grid place-items-center text-on-surface"
        >
          <Icon name="arrow_back" />
        </Link>
        <h1 className="mt-4 font-bold text-[32px] leading-tight text-on-surface tracking-tight">
          Profil
        </h1>
      </header>

      {error ? <p className="text-error text-sm">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-[#15803D]">{message}</p> : null}

      <section className="mt-4 bg-white rounded-[28px] shadow-[0_8px_28px_rgba(0,0,0,0.06)] px-5 pt-7 pb-6 text-center">
        {editing ? (
          <label className="relative w-[92px] h-[92px] mx-auto block cursor-pointer">
            <span className="w-[92px] h-[92px] rounded-full bg-primary-fixed text-primary text-3xl font-bold grid place-items-center ring-4 ring-white shadow overflow-hidden">
              {photoSrc ? (
                <img src={photoSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </span>
            <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#111] text-white grid place-items-center shadow">
              <Icon name="photo_camera" className="text-[16px]" />
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  setPhotoDraft(await compressImageFile(file));
                  setError("");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Gagal memuat foto");
                }
              }}
            />
          </label>
        ) : (
          <div className="w-[92px] h-[92px] mx-auto rounded-full bg-primary-fixed text-primary text-3xl font-bold grid place-items-center ring-4 ring-white shadow overflow-hidden">
            {photoSrc ? (
              <img src={photoSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
        )}
        {editing ? (
          <form onSubmit={saveProfile} className="mt-5 text-left space-y-3">
            <p className="text-center text-xs text-secondary -mt-1">
              Ketuk foto untuk ganti. Foto ini tampil ke pelanggan.
            </p>
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">
                Nama warung
              </label>
              <input
                className="mt-1 w-full h-12 px-3 rounded-xl border border-[#E5E7EB] bg-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">
                Alamat
              </label>
              <textarea
                className="mt-1 w-full min-h-[72px] px-3 py-3 rounded-xl border border-[#E5E7EB] bg-white"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">
                Nomor HP
              </label>
              <input
                className="mt-1 w-full h-12 px-3 rounded-xl border border-[#E5E7EB] bg-white"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">
                Alamat email
              </label>
              <input
                className="mt-1 w-full h-12 px-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-secondary"
                value={email}
                disabled
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="flex-1 h-11 rounded-full border border-[#E5E7EB] font-semibold"
                onClick={() => {
                  setEditing(false);
                  setName(profile.name);
                  setAddress(profile.address);
                  setPhone(profile.phone || "");
                  setPhotoDraft(profile.photoUrl || "");
                  setError("");
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saveBusy}
                className="dk-btn dk-btn-ink flex-1 disabled:opacity-50"
              >
                {saveBusy ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="mt-4 font-bold text-[22px] leading-tight text-on-surface">{profile.name}</h2>
            <p className="mt-1 text-sm text-secondary">{email}</p>
            <p className="mt-2 text-[13px] text-on-surface-variant flex items-center justify-center gap-1.5 flex-wrap">
              <span>Outlet</span>
              <span className="opacity-40">•</span>
              <Icon name="location_on" className="text-[16px] text-on-surface-variant" />
              <span className="truncate max-w-[220px]">{profile.address || "Belum ada alamat"}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setMessage("");
              }}
              className="dk-btn dk-btn-ink mt-5 px-8 shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
            >
              <Icon name="edit" className="text-[18px]" /> Ubah profil
            </button>
          </>
        )}
      </section>

      <section className="mt-5 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-[#f0ebe6]">
        <SettingRow
          icon="storefront"
          label="Status dapur"
          hint={profile.isOpen ? "Buka" : "Tutup"}
          tone={profile.isOpen ? "bg-primary-fixed text-primary" : "bg-[#F3F4F6] text-ink"}
          onClick={() => {
            if (!openBusy) void toggleOpen();
          }}
          trailing={
            <span
              className={`relative w-14 h-7 rounded-full shrink-0 ${
                profile.isOpen ? "bg-primary" : "bg-[#E5E7EB]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow ${
                  profile.isOpen ? "right-0.5" : "left-0.5"
                }`}
              />
            </span>
          }
        />
        <div>
          <SettingRow
            icon="my_location"
            label="Lokasi GPS"
            hint={gpsHint}
            tone="bg-primary-fixed text-primary"
            onClick={() => setShowLocation((v) => !v)}
            trailing={
              <Icon
                name="expand_more"
                className={`text-[#c5c5c5] transition-transform ${showLocation ? "rotate-180" : ""}`}
              />
            }
          />
          {showLocation ? (
            <div className="px-4 pb-4 pt-1">
              <OutletLocationMap
                latitude={profile.latitude}
                longitude={profile.longitude}
                onSaved={({ latitude, longitude, address: addr }) => {
                  setProfile((current) =>
                    current
                      ? {
                          ...current,
                          latitude,
                          longitude,
                          ...(addr ? { address: addr } : {}),
                        }
                      : current
                  );
                  if (addr) setAddress(addr);
                  setShowLocation(true);
                  setError("");
                }}
              />
            </div>
          ) : null}
        </div>
        <SettingRow
          icon="payments"
          label="Tagihan komisi"
          hint="Fee platform"
          tone="bg-[#FEF3C7] text-[#B45309]"
          href="/settlements"
        />
        <div>
          <SettingRow
            icon="star"
            label="Rekomendasi outlet"
            hint={
              profile.isFeatured
                ? `Aktif · komisi ${Math.round((profile.commissionRate ?? 0.2) * 100)}%`
                : profile.featuredRequestStatus === "PENDING"
                  ? "Menunggu Super Admin"
                  : "Ajukan tampil di atas"
            }
            tone={
              profile.isFeatured
                ? "bg-primary-fixed text-primary"
                : profile.featuredRequestStatus === "PENDING"
                  ? "bg-[#FEF3C7] text-[#B45309]"
                  : "bg-[#FFF7ED] text-[#C2410C]"
            }
            onClick={() => setShowFeatured((v) => !v)}
            trailing={
              <Icon
                name="expand_more"
                className={`text-[#c5c5c5] transition-transform ${showFeatured ? "rotate-180" : ""}`}
              />
            }
          />
          {showFeatured ? (
            <div className="px-4 pb-4 pt-1 space-y-3">
              {profile.isFeatured ? (
                <div className="rounded-2xl border border-primary/20 bg-primary-fixed/40 p-3">
                  <p className="font-bold text-sm text-primary">Status rekomendasi aktif</p>
                  <p className="text-sm text-secondary mt-1">
                    Warung tampil di atas daftar pelanggan. Komisi{" "}
                    {Math.round((profile.commissionRate ?? 0.2) * 100)}% dari makanan.
                  </p>
                </div>
              ) : profile.featuredRequestStatus === "PENDING" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <p className="font-bold text-sm text-amber-900">Pengajuan menunggu</p>
                  <p className="text-sm text-amber-800/80 mt-1">
                    Super Admin sedang meninjau. Jika disetujui, komisi otomatis jadi 20% dan badge di
                    Beranda berubah.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-secondary">
                    Ajukan agar warung tampil di atas daftar pelanggan. Setelah Super Admin setujui,
                    komisi otomatis menjadi <strong>20%</strong> dan badge di menu utama ikut berubah.
                  </p>
                  <button
                    type="button"
                    disabled={featuredBusy}
                    onClick={async () => {
                      if (
                        !confirm(
                          "Ajukan status rekomendasi?\n\nJika Super Admin setujui, komisi menjadi 20% dari makanan."
                        )
                      ) {
                        return;
                      }
                      setFeaturedBusy(true);
                      setError("");
                      setMessage("");
                      try {
                        const res = await api.requestFeatured();
                        const p = await api.profile();
                        setProfile(p);
                        setMessage(res.message);
                        setShowFeatured(true);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Gagal mengajukan");
                      } finally {
                        setFeaturedBusy(false);
                      }
                    }}
                    className="press w-full h-11 rounded-full bg-primary text-white font-bold text-sm disabled:opacity-60"
                  >
                    {featuredBusy ? "Mengirim…" : "Ajukan rekomendasi"}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
        <SettingRow
          icon="menu_book"
          label="Kelola menu"
          tone="bg-[#EEF2FF] text-[#4F46E5]"
          href="/menus"
        />
        <SettingRow
          icon="support_agent"
          label="Bantuan"
          hint="Laporkan kendala"
          tone="bg-[#ECFEFF] text-[#0E7490]"
          href="/help"
        />
      </section>

      <section className="mt-3 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-[#f0ebe6]">
        <SettingRow
          icon="logout"
          label="Keluar"
          tone="bg-[#FEE2E2] text-[#DC2626]"
          onClick={() => {
            clearSession();
            router.replace("/login");
          }}
        />
      </section>
    </div>
  );
}
