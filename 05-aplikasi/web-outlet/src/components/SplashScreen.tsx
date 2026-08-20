"use client";

import { useEffect, useState } from "react";
import styles from "./SplashScreen.module.css";

export function SplashScreen({
  duration = 1800,
  onDone,
}: {
  duration?: number;
  onDone?: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!onDone) return;
    const leaveAt = Math.max(duration - 320, 400);
    const leave = window.setTimeout(() => setLeaving(true), leaveAt);
    const done = window.setTimeout(onDone, duration);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
    };
  }, [duration, onDone]);

  return (
    <div className={`${styles.splash} ${leaving ? styles.leave : ""}`}>
      <div className={styles.brand}>
        <img src="/logo-antarq-black.png" alt="ANTARQ" className={styles.mark} />
        <p className={styles.line}>Kelola dapur &amp; pesanan masuk</p>
      </div>
      <p className={styles.credit}>from Brynx Solution company</p>
    </div>
  );
}
