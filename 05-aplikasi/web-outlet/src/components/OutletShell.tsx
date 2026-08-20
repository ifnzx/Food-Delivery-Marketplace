"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { SplashScreen } from "@/components/SplashScreen";
import { api, getSession, type MerchantProfile, type OutletOrder } from "@/lib/api";
import {
  diffOutletAlerts,
  incomingOrderCount,
  requestOutletNotifyPermission,
  type OutletToast,
} from "@/lib/outletAlerts";
import { OUTLET_OPEN_EVENT, outletPhotoSrc } from "@/lib/ui";

const NAV = [
  { href: "/home", label: "Beranda", icon: "home" },
  { href: "/orders", label: "Pesanan", icon: "list_alt" },
  { href: "/menus", label: "Menu", icon: "menu_book" },
  { href: "/profile", label: "Akun", icon: "person" },
];

export function OutletShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [skipSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      if (sessionStorage.getItem("aq-skip-splash") === "1") {
        sessionStorage.removeItem("aq-skip-splash");
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  });
  const [splashDone, setSplashDone] = useState(skipSplash);
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [incoming, setIncoming] = useState(0);
  const [toast, setToast] = useState<OutletToast | null>(null);
  const baseline = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "MERCHANT") {
      router.replace("/login");
      return;
    }

    api
      .profile()
      .then(setProfile)
      .catch(() => router.replace("/login"))
      .finally(() => setReady(true));

    const onOpen = (e: Event) => {
      const isOpen = (e as CustomEvent<{ isOpen?: boolean }>).detail?.isOpen;
      if (typeof isOpen !== "boolean") return;
      setProfile((p) => (p ? { ...p, isOpen } : p));
    };
    window.addEventListener(OUTLET_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OUTLET_OPEN_EVENT, onOpen);
  }, [router, pathname]);

  useEffect(() => {
    if (!profile?.id) return;
    requestOutletNotifyPermission();
    let cancelled = false;
    const tick = async () => {
      try {
        const list: OutletOrder[] = await api.orders();
        if (cancelled) return;
        const alerts = diffOutletAlerts(list, profile.id, baseline.current);
        baseline.current = false;
        setIncoming(incomingOrderCount(list, profile.id));
        if (alerts[0]) {
          setToast(alerts[alerts.length - 1]);
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast(null), 8000);
        }
        const n = incomingOrderCount(list, profile.id);
        document.title = n ? `(${n}) ANTARQ Outlet` : "ANTARQ Outlet";
      } catch {
        /* ignore poll errors */
      }
    };
    void tick();
    const t = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [profile?.id]);

  const waitingData = !ready || !profile;
  if (!skipSplash && (!splashDone || waitingData)) {
    return (
      <SplashScreen
        onDone={splashDone ? undefined : () => setSplashDone(true)}
      />
    );
  }
  if (waitingData) return null;

  const billing = profile.billing;
  const locked = profile.status !== "ACTIVE" || billing?.canOperate === false;
  const hour = new Date().getHours();
  const hail = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
  const isHome = pathname === "/home";
  const navIdx = NAV.findIndex((item) =>
    item.href === "/profile"
      ? pathname.startsWith("/profile") || pathname.startsWith("/settlements")
      : pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  const navIdxSafe = navIdx < 0 ? 0 : navIdx;

  return (
    <div className="bg-[#f6f7f6] text-on-surface min-h-screen antialiased pb-28">
      {locked ? (
        <div className="bg-[#111] text-white text-center text-sm font-medium px-4 py-2.5">
          Dapur sedang nonaktif karena tagihan fee. Buka Tagihan di Akun untuk lanjut.
        </div>
      ) : null}
      {isHome ? (
        <header className="sticky top-0 z-40 bg-[#f6f7f6]/90 backdrop-blur-md px-4 pt-4 pb-3">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] text-secondary">{hail}</p>
              <p className="font-bold text-[20px] leading-tight truncate">{profile.name}</p>
            </div>
            <Link href="/profile" className="relative shrink-0 press">
              <img
                alt=""
                src={outletPhotoSrc(profile)}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  profile.isOpen ? "bg-[#22C55E] dk-live-dot" : "bg-gray-400"
                }`}
              />
            </Link>
          </div>
        </header>
      ) : null}

      <main className={`px-4 pb-6 max-w-md mx-auto w-full ${isHome ? "pt-1" : "pt-5"}`}>
        {children}
      </main>

      {toast ? (
        <Link
          href="/orders"
          onClick={() => setToast(null)}
          className="fixed top-3 inset-x-3 z-[80] max-w-md mx-auto bg-[#111] text-white rounded-2xl px-4 py-3 shadow-lg flex items-start gap-3 press"
        >
          <span className="w-9 h-9 rounded-full bg-primary grid place-items-center shrink-0 mt-0.5">
            <Icon name="notifications_active" fill />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-sm leading-tight">{toast.title}</span>
            <span className="block text-[12px] text-white/80 mt-0.5 leading-snug">{toast.body}</span>
          </span>
        </Link>
      ) : null}

      <nav className="dk-nav" aria-label="Menu utama">
        <div className="dk-nav-bar">
          <div className="dk-nav-track">
            <span
              className="dk-nav-thumb"
              style={{ transform: `translate3d(${navIdxSafe * 100}%, 0, 0)` }}
            />
            {NAV.map((item, i) => {
              const active = i === navIdxSafe;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  aria-label={item.label}
                  className={`dk-nav-item ${active ? "is-on" : ""}`}
                >
                  <Icon name={item.icon} fill={active} />
                  {item.href === "/orders" && incoming > 0 ? (
                    <span className="absolute top-1.5 right-[18%] min-w-[16px] h-4 px-1 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold grid place-items-center">
                      {incoming > 9 ? "9+" : incoming}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
