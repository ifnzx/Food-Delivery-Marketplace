"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, saveSession } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { SplashScreen } from "@/components/SplashScreen";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@local.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [boot, setBoot] = useState(true);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api.login(email, password);
      if (data.user.role !== "ADMIN" && data.user.role !== "SUPER_ADMIN") {
        throw new Error("Akun ini bukan super admin");
      }
      saveSession({ token: data.token, ...data.user });
      sessionStorage.setItem("aq-skip-splash", "1");
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
      setBusy(false);
    }
  }

  if (boot) {
    return <SplashScreen onDone={() => setBoot(false)} />;
  }

  if (busy) {
    return <SplashScreen />;
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={onSubmit}>
        <div className={styles.hero}>
          <span className={styles.blob} />
          <span className={`${styles.blob} ${styles.blob2}`} />
          <BrandLogo size={56} variant="full" light className={styles.heroLogo} />
          <span>Super Admin</span>
        </div>
        <h1>Masuk</h1>
        <p className={styles.sub}>Gunakan akun Super Admin</p>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <div className={styles.error}>{error}</div> : null}
        <button type="submit">Masuk</button>
        <p className={styles.hint}>Demo: admin@local.test / password123</p>
      </form>
    </div>
  );
}
