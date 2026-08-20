# PRD — Food Delivery Marketplace

## 1. Product Overview

Nama sementara: **Food Delivery Marketplace**

Platform marketplace makanan yang menghubungkan:

- Customer
- Outlet / merchant
- Kurir
- Admin / platform

Customer dapat membeli makanan dari satu atau beberapa outlet dalam satu pesanan. Kurir mengambil makanan dari outlet kemudian mengantarkannya kepada customer.

Platform mendapatkan pendapatan melalui komisi **15% dari nilai makanan** setiap transaksi outlet.

Customer **tidak dikenakan fee aplikasi** tambahan.

## 2. Business Model

### Komisi platform

Platform mengambil: `15% × nilai makanan`

Contoh: makanan Rp100.000 → komisi Rp15.000 → hak outlet Rp85.000.

### Ongkir

Tarif dasar: **Rp2.000/km** (pembulatan jarak configurable dari Admin).

Contoh: jarak 5 km → ongkir Rp10.000.

### Total pembayaran customer

`Total = Harga makanan + Ongkir`

Tidak ada service fee.

## 3. Contoh transaksi

| Item | Nominal |
|---|---|
| Makanan | Rp100.000 |
| Ongkir | Rp10.000 |
| **Total customer (cash ke kurir)** | **Rp110.000** |

Settlement:

| Pihak | Nominal |
|---|---|
| Outlet | Rp85.000 |
| Platform | Rp15.000 |
| Kurir | Rp10.000 |

## 4. Multi outlet order

Satu checkout dapat berisi beberapa outlet. Komisi dihitung **per outlet** dari subtotal makanan outlet tersebut. Ongkir dihitung sekali untuk pengiriman ke customer.

Contoh:

- Outlet A makanan Rp50.000 → fee Rp7.500 → hak Rp42.500
- Outlet B makanan Rp80.000 → fee Rp12.000 → hak Rp68.000
- Ongkir Rp15.000
- Total customer Rp145.000

## 5. User roles — Customer (Android)

Registrasi, login, profil, alamat, lihat outlet & menu, keranjang, multi-outlet checkout, lihat ongkir, bayar cash, status order, tracking kurir, riwayat, rating (rating penuh di Phase 2).

## 6. Kurir (Android)

Login, profil, online/offline, terima order, detail order, navigasi ke outlet, konfirmasi pickup, navigasi ke customer, konfirmasi delivery, pendapatan, riwayat, rating, GPS tracking.

## 7. Outlet (Web responsive)

Registrasi, login, profil, alamat + koordinat GPS, jam operasional, buka/tutup, kelola menu/harga/stok, terima/tolak order, ubah status makanan, transaksi, penjualan, komisi, tagihan, upload bukti settlement.

## 8. Admin (Web dashboard)

Dashboard KPI, manajemen customer/outlet/kurir, approve/reject/suspend, order, komisi, settlement, live map kurir, reports, settings.

## 9–11. Order flow & status

Untuk MVP cash, `PENDING_PAYMENT` dilewati. Order langsung `WAITING_OUTLET`.

Status: `WAITING_OUTLET` → `OUTLET_ACCEPTED` → `PREPARING` → `READY_FOR_PICKUP` → `COURIER_ASSIGNED` → `COURIER_GOING_TO_OUTLET` → `PICKED_UP` → `DELIVERING` → `DELIVERED` → `COMPLETED` | `CANCELLED`

## 12. GPS tracking

Kurir menulis `courier_locations/{courierId}`: latitude, longitude, timestamp, status, activeOrderId.

## 13–14. Jarak & ongkir

Jarak memakai Google Maps Distance Matrix / Routes API (bukan garis lurus). Ongkir = `ceil_configurable(jarak_km) × 2000`. Aturan pembulatan configurable dari Admin.

## 16. Cash payment MVP

`paymentMethod = CASH`. Customer membayar grand total kepada kurir.

Fondasi online (Phase 2) sudah ada di schema `Payment` + service adapter (`STUB` / Midtrans / Xendit nanti), default **OFF**.

## 17–19. Settlement & suspensi merchant

Settlement default mingguan, minimum tagihan configurable. Outlet upload bukti transfer; Admin verifikasi (`PENDING` / `VERIFIED` / `REJECTED`).

Overdue: `OUTSTANDING` → `OVERDUE` → `WARNING` → `SUSPENDED`. Setelah settlement verified: `ACTIVE`.

## 24–25. Keamanan & role

Roles: `CUSTOMER`, `COURIER`, `MERCHANT`, `ADMIN`, `SUPER_ADMIN`.

Firebase Auth + custom claims untuk role sensitif.

## 30. MVP Phase 1

Customer Android: login, outlet, menu, cart, checkout, cash, tracking.

Courier Android: login, online/offline, order, pickup, delivery, GPS.

Merchant Web: login, menu, order, status, settlement.

Admin Web: dashboard, customer, merchant, courier, order, settlement, commission, live tracking.

## 31–32. Phase 2 & 3

Phase 2: payment gateway, e-wallet, QRIS, promo, rating, chat, laporan, auto settlement.

Phase 3: dynamic pricing, membership, referral, loyalty, ads, analytics, AI recommendation, multi zone.
