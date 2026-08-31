import path from "path";
import os from "os";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { googleBrowserKey, loadEnv } from "./lib/env";
import { isPostgres } from "./lib/dbDialect";
import { googleMapsConfigured } from "./lib/googleMaps";
import { fail } from "./lib/http";
import { ensureCourierArchive } from "./lib/courierArchive";
import { ensureOrderChat } from "./lib/orderChat";
import { ensureSupportReports } from "./lib/supportReports";
import { ensureOrderRatings } from "./lib/orderRatings";
import { ensurePricingColumns } from "./services/pricing";
import { ensurePlacementColumns } from "./lib/placement";
import { ensurePaymentSchema } from "./services/payment";
import { authRouter } from "./routes/auth";
import { merchantRouter } from "./routes/merchants";
import { orderRouter } from "./routes/orders";
import { courierRouter } from "./routes/couriers";
import { adminRouter } from "./routes/admin";
import { settlementRouter } from "./routes/settlements";
import { paymentRouter } from "./routes/payments";
import { geoRouter } from "./routes/geo";
import { supportRouter } from "./routes/support";

loadEnv();

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "../public")));

app.use("/api", authRouter);
app.use("/api", geoRouter);
app.use("/api", merchantRouter);
app.use("/api", orderRouter);
app.use("/api", courierRouter);
app.use("/api", adminRouter);
app.use("/api", settlementRouter);
app.use("/api", paymentRouter);
app.use("/api", supportRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  fail(res, 400, error instanceof Error ? error.message : "Terjadi kesalahan server");
});

app.listen(PORT, "0.0.0.0", async () => {
  await ensureCourierArchive();
  await ensureOrderChat();
  await ensureSupportReports();
  await ensureOrderRatings();
  await ensurePricingColumns();
  await ensurePlacementColumns();
  await ensurePaymentSchema();
  const lanHosts = Object.entries(os.networkInterfaces())
    .flatMap(([iface, addrs]) =>
      (addrs ?? [])
        .filter((n) => n && !n.internal && n.family === "IPv4")
        .map((n) => ({ iface, address: n!.address }))
    );
  console.log(`Database: ${isPostgres() ? "Supabase (PostgreSQL)" : "SQLite lokal"}`);
  console.log(`Customer UI: http://localhost:${PORT}/customer.html`);
  console.log(`Kurir GPS:   http://localhost:${PORT}/courier.html`);
  console.log(`Review UI:   http://localhost:${PORT}`);
  if (lanHosts.length) {
    console.log("Device lain (WiFi) — coba salah satu URL:");
    for (const { iface, address } of lanHosts) {
      console.log(`  [${iface}] http://${address}:${PORT}/customer.html`);
    }
  }
  console.log(
    googleMapsConfigured()
      ? "Google Maps: aktif (Distance Matrix + Geocoding)"
      : "Google Maps: belum ada kunci — GPS HP + jarak garis lurus"
  );
});
