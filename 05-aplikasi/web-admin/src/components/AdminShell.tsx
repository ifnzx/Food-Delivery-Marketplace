"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/api";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { BrandLogo } from "./BrandLogo";
import { SplashScreen } from "./SplashScreen";
import styles from "./AdminShell.module.css";

const NAV = [
  { href: "/", label: "Overview", icon: "dashboard" },
  { href: "/monitor", label: "Live Transaksi", icon: "receipt_long" },
  { href: "/settlements", label: "Fee & Tagihan", icon: "payments" },
  { href: "/outlets", label: "Outlet", icon: "storefront" },
  { href: "/customers", label: "Pelanggan", icon: "group" },
  { href: "/couriers", label: "Kurir", icon: "delivery_dining" },
  { href: "/support", label: "Bantuan", icon: "support_agent" },
  { href: "/settings", label: "Tarif", icon: "tune" },
];

const PAGE_META: Record<string, string> = {
  "/": "Overview",
  "/monitor": "Live Transaksi",
  "/settlements": "Fee & Tagihan",
  "/outlets": "Outlet",
  "/customers": "Pelanggan",
  "/couriers": "Kurir",
  "/support": "Bantuan",
  "/settings": "Tarif",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [booting, setBooting] = useState(true);
  const [name, setName] = useState("Admin");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      router.replace("/login");
      return;
    }
    setName(session.displayName);

    const skip = sessionStorage.getItem("aq-skip-splash") === "1";
    if (skip) {
      sessionStorage.removeItem("aq-skip-splash");
      setReady(true);
      setBooting(false);
      return;
    }

    setBooting(false);
    const id = window.setTimeout(() => setReady(true), 1400);
    return () => window.clearTimeout(id);
  }, [router]);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("id-ID", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!ready) {
    if (booting) return null;
    return <SplashScreen />;
  }

  const title = PAGE_META[pathname] ?? "Super Admin";
  const initial = (name || "A").slice(0, 1).toUpperCase();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <BrandLogo size={24} variant="full" light className={styles.brandLogo} />
          <span className={styles.brandRole}>Super Admin</span>
        </div>
        <nav className={styles.nav}>
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? styles.active : undefined}
              >
                <Icon name={item.icon} filled={active} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.sideFoot}>
          <button
            className={styles.logout}
            onClick={() => {
              clearSession();
              router.replace("/login");
            }}
          >
            <Icon name="logout" />
            Keluar
          </button>
        </div>
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.title}>{title}</h1>
          </div>
          <div className={styles.topRight}>
            <div className={styles.clock}>
              <Icon name="schedule" />
              <span>{clock}</span>
            </div>
            <div className={styles.user} title={name}>
              {initial}
            </div>
          </div>
        </header>
        <div className={styles.content} key={pathname}>
          {children}
        </div>
      </div>
    </div>
  );
}
