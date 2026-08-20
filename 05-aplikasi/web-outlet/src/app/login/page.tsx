"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SplashScreen } from "@/components/SplashScreen";
import { api, saveSession } from "@/lib/api";

type View = "login" | "register" | "pending";

export default function LoginPage() {
  const router = useRouter();
  const [boot, setBoot] = useState(true);
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("outlet-a@local.test");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [pendingMsg, setPendingMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function goRegister() {
    setView("register");
    setError("");
    setEmail("");
    setPassword("");
  }

  function goLogin() {
    setView("login");
    setError("");
    setEmail("outlet-a@local.test");
    setPassword("password123");
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api.login(email, password);
      if (data.user.role !== "MERCHANT") {
        throw new Error("Akun ini bukan outlet. Gunakan email outlet.");
      }
      saveSession({ token: data.token, ...data.user });
      sessionStorage.setItem("aq-skip-splash", "1");
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setBusy(false);
    }
  }

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api.registerOutlet({
        name: name.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        address: address.trim(),
      });
      setPendingMsg(
        data.message ||
          "Pendaftaran terkirim ke Super Admin. Akun outlet bisa dipakai setelah disetujui."
      );
      setView("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal");
    } finally {
      setBusy(false);
    }
  }

  const isReg = view === "register";

  if (boot) {
    return <SplashScreen onDone={() => setBoot(false)} />;
  }

  if (busy) {
    return <SplashScreen />;
  }

  if (view === "pending") {
    return (
      <div className="login-page min-h-screen max-w-md mx-auto p-4 pb-10 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-[#E5E7EB] p-6 text-center anim-pop">
          <span className="material-symbols-outlined text-primary text-[40px]">hourglass_top</span>
          <h1 className="text-ink text-[20px] font-semibold mt-3">Menunggu Super Admin</h1>
          <p className="text-secondary text-[13px] leading-5 mt-2">{pendingMsg}</p>
          <button
            type="button"
            className="press w-full h-[52px] mt-6 bg-ink text-white rounded-full font-semibold"
            onClick={goLogin}
          >
            Kembali ke masuk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page min-h-screen max-w-md mx-auto p-4 pb-10">
      <div className="login-hero anim-pop">
        <img src="/login-hero-outlet.png?v=2" alt="Terima pesanan, masak menu" />
      </div>
      <h1 className="text-center text-ink text-[22px] font-semibold tracking-tight mt-5 anim-up">
        {isReg ? "Daftar outlet" : "Selamat datang"}
      </h1>
      <p className="text-center text-secondary text-[13px] leading-5 mb-6 anim-up d2">
        {isReg ? "Isi data warung. Super Admin akan meninjau." : "Terima pesanan, masak menu."}
      </p>
      {isReg ? (
        <form className="space-y-3 anim-up d3" onSubmit={onRegister}>
          <p className="text-[13px] text-secondary bg-white border border-[#E5E7EB] rounded-2xl px-3 py-3">
            Wajib: nama warung, nama pemilik, WhatsApp, alamat, email, dan kata sandi.
          </p>
          <label className="flex items-center gap-2 h-14 px-3 rounded-2xl border border-[#E5E7EB] bg-white">
            <span className="material-symbols-outlined text-primary text-[22px]">storefront</span>
            <input
              className="flex-1 bg-transparent border-0 p-0 outline-none focus:ring-0"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama warung"
              autoComplete="organization"
            />
          </label>
          <label className="flex items-center gap-2 h-14 px-3 rounded-2xl border border-[#E5E7EB] bg-white">
            <span className="material-symbols-outlined text-primary text-[22px]">person</span>
            <input
              className="flex-1 bg-transparent border-0 p-0 outline-none focus:ring-0"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Nama lengkap pemilik"
              autoComplete="name"
            />
          </label>
          <label className="flex items-center gap-2 h-14 px-3 rounded-2xl border border-[#E5E7EB] bg-white">
            <span className="material-symbols-outlined text-primary text-[22px]">chat</span>
            <input
              className="flex-1 bg-transparent border-0 p-0 outline-none focus:ring-0"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nomor WhatsApp (08…)"
              autoComplete="tel"
              inputMode="tel"
            />
          </label>
          <label className="flex items-center gap-2 h-14 px-3 rounded-2xl border border-[#E5E7EB] bg-white">
            <span className="material-symbols-outlined text-primary text-[22px]">mail</span>
            <input
              className="flex-1 bg-transparent border-0 p-0 outline-none focus:ring-0"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
            />
          </label>
          <label className="relative flex items-center gap-2 h-14 pl-3 pr-12 rounded-2xl border border-[#E5E7EB] bg-white">
            <span className="material-symbols-outlined text-primary text-[22px]">lock</span>
            <input
              className="flex-1 bg-transparent border-0 p-0 outline-none focus:ring-0"
              name="password"
              type={showPass ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata sandi (min. 6)"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-2 top-0 h-full w-11 grid place-items-center text-secondary"
              onClick={() => setShowPass((v) => !v)}
              aria-label="Lihat kata sandi"
            >
              <span className="material-symbols-outlined text-[22px]">
                {showPass ? "visibility_off" : "visibility"}
              </span>
            </button>
          </label>
          <label className="flex items-start gap-2 min-h-14 px-3 py-3 rounded-2xl border border-[#E5E7EB] bg-white">
            <span className="material-symbols-outlined text-primary text-[22px] mt-0.5">location_on</span>
            <textarea
              className="flex-1 bg-transparent border-0 p-0 outline-none focus:ring-0 resize-none text-[15px] leading-5"
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat warung"
              autoComplete="street-address"
            />
          </label>
          {error ? (
            <p className="text-red-600 text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </p>
          ) : null}
          <button
            className="press w-full h-[52px] bg-ink text-white rounded-full font-semibold flex items-center justify-center gap-2"
            type="submit"
            disabled={busy}
          >
            {busy ? "Mengirim…" : (
              <>
                Kirim ke Super Admin
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <form className="space-y-3 anim-up d3" onSubmit={onLogin}>
          <label className="flex items-center gap-2 h-14 px-3 rounded-2xl border border-[#E5E7EB] bg-white">
            <span className="material-symbols-outlined text-primary text-[22px]">chat</span>
            <input
              className="flex-1 bg-transparent border-0 p-0 outline-none focus:ring-0"
              name="email"
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email atau WhatsApp"
              autoComplete="email"
            />
          </label>
          <label className="relative flex items-center gap-2 h-14 pl-3 pr-12 rounded-2xl border border-[#E5E7EB] bg-white">
            <span className="material-symbols-outlined text-primary text-[22px]">lock</span>
            <input
              className="flex-1 bg-transparent border-0 p-0 outline-none focus:ring-0"
              name="password"
              type={showPass ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata sandi"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-2 top-0 h-full w-11 grid place-items-center text-secondary"
              onClick={() => setShowPass((v) => !v)}
              aria-label="Lihat kata sandi"
            >
              <span className="material-symbols-outlined text-[22px]">
                {showPass ? "visibility_off" : "visibility"}
              </span>
            </button>
          </label>
          {error ? (
            <p className="text-red-600 text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </p>
          ) : null}
          <button
            className="press w-full h-[52px] bg-ink text-white rounded-full font-semibold flex items-center justify-center gap-2"
            type="submit"
            disabled={busy}
          >
            {busy ? "Memproses…" : (
              <>
                Masuk
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      )}
      <p className="text-center text-[13px] text-secondary mt-5">
        {isReg ? (
          <>
            Sudah punya akun?{" "}
            <button type="button" className="text-primary font-semibold" onClick={goLogin}>
              Masuk
            </button>
          </>
        ) : (
          <>
            Belum punya akun?{" "}
            <button type="button" className="text-primary font-semibold" onClick={goRegister}>
              Daftar dulu
            </button>
          </>
        )}
      </p>
      {!isReg ? (
        <p className="text-center text-xs text-secondary mt-3">Akun uji: outlet-a@local.test / password123</p>
      ) : null}
    </div>
  );
}
