import type { OutletOrder } from "./api";
import { merchantSlice } from "./ui";

const SEEN_KEY = "dk_outlet_alert_seen";

export type OutletToast = {
  id: string;
  title: string;
  body: string;
};

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-300)));
}

export function requestOutletNotifyPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 1174;
    gain2.gain.value = 0.07;
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.16);
    osc2.stop(ctx.currentTime + 0.34);
  } catch {
    /* ignore */
  }
}

function desktopNotify(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, tag, silent: false });
    n.onclick = () => {
      window.focus();
      window.location.href = "/orders";
      n.close();
    };
  } catch {
    /* ignore */
  }
}

function itemSummary(order: OutletOrder, merchantId: string) {
  const slice = merchantSlice(order, merchantId);
  return slice.items.map((it) => `${it.name} x${it.qty}`).join(", ") || "Pesanan baru";
}

export function diffOutletAlerts(
  orders: OutletOrder[],
  merchantId: string,
  baseline: boolean
): OutletToast[] {
  const seen = loadSeen();
  const toasts: OutletToast[] = [];

  for (const order of orders) {
    const slice = merchantSlice(order, merchantId);
    const incomingKey = `in:${order.id}`;
    const doneKey = `done:${order.id}`;

    if (slice.status === "WAITING") {
      if (!seen.has(incomingKey)) {
        seen.add(incomingKey);
        if (!baseline) {
          const body = `${order.customer?.fullName || "Pelanggan"} · ${itemSummary(order, merchantId)}`;
          toasts.push({ id: incomingKey, title: "Pesanan baru masuk", body });
          desktopNotify("Pesanan baru masuk", body, incomingKey);
        }
      }
    }

    if (
      ["PICKED_UP", "DELIVERING", "DELIVERED", "COMPLETED"].includes(order.status) &&
      slice.status !== "REJECTED"
    ) {
      if (!seen.has(doneKey)) {
        seen.add(doneKey);
        if (!baseline) {
          const title = order.status === "COMPLETED" ? "Pesanan selesai" : "Kurir sudah jemput";
          const body = `${order.id} masuk riwayat pesanan.`;
          toasts.push({ id: doneKey, title, body });
          desktopNotify(title, body, doneKey);
        }
      }
    }
  }

  saveSeen(seen);
  if (!baseline && toasts.length) playBeep();
  return toasts;
}

export function incomingOrderCount(orders: OutletOrder[], merchantId: string) {
  return orders.filter((o) => merchantSlice(o, merchantId).status === "WAITING").length;
}
