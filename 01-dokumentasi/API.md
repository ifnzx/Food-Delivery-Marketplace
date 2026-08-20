# API — Cloud Functions

Semua endpoint finansial adalah **callable / HTTPS functions**. Client tidak menulis field uang ke Firestore secara langsung.

Region default: `asia-southeast1`.

## Prinsip

1. Frontend boleh menghitung **preview**.
2. Backend menghitung ulang dan menyimpan nilai final.
3. Harga menu, komisi, ongkir, dan grand total diambil/dihitung di server.

## STEP 1 (sekarang)

| Function | Tipe | Status |
|---|---|---|
| `getBusinessConfig` | callable | skeleton — baca settings publik |
| `health` | https | skeleton |

## Rencana function (step berikutnya)

### Auth & role — STEP 2

- `setUserRole` (admin only)
- `onUserCreate` — buat profil sesuai role

### Quote & order — STEP 8–11

- `previewCheckout` — hitung jarak + ongkir + komisi (tidak persist)
- `createOrder` — validasi cart, hitung ulang, tulis order + order_merchants + order_items + ledger
- `merchantRespondOrder`
- `merchantUpdateOrderStatus`
- `assignCourier` / `courierRespondAssignment`
- `courierUpdateDeliveryStatus`
- `completeOrder` — tandai cash collected, tulis payment + transactions

### Settlement — STEP 12

- `createSettlementRequest`
- `verifySettlement` (admin)
- `rejectSettlement` (admin)
- `runOverdueMerchantCheck` (scheduled)

### Tracking — STEP 13

Lokasi kurir ditulis client ke `courier_locations/{courierId}` (hanya field lokasi). Nilai order tidak boleh ikut berubah.

### Notification — STEP 14

- `onOrderStatusChange` — kirim FCM sesuai role

## Matching kurir (anti-rebutan)

Setelah outlet menerima order (`OUTLET_ACCEPTED` / `PREPARING` / `READY_FOR_PICKUP`):

1. Sistem ranking kurir **online + approved + GPS aktif + tidak sibuk** berdasarkan jarak haversine **kurir → outlet** (bukan ke customer).
2. Hanya **#1 terdekat** yang melihat penawaran (exclusive offer, TTL 45 detik).
3. Timeout / Lewati → offer ke kurir #2, dst.
4. `POST /api/orders/:id/assign-courier` ditolak jika bukan pemegang offer aktif.
5. `POST /api/orders/:id/courier-decline` menolak penawaran dan cascade.

File: `03-backend-lokal/src/services/courierOffer.ts`

## createOrder — kontrak rencana

Request:

```
merchantItems: [{ merchantId, items: [{ menuId, qty }] }]
deliveryAddress: { address, latitude, longitude }
paymentMethod: "CASH" | "ONLINE"   // default CASH; ONLINE ditolak jika gateway OFF
paymentChannel?: "QRIS" | "EWALLET" | "VA" | "CARD"  // hanya relevan untuk ONLINE
```

Server akan:

1. Resolve metode via `getPaymentConfig()` — MVP hanya `CASH`
2. Tolak `ONLINE` jika `onlinePaymentsEnabled=false` atau `paymentProvider=NONE`
3. Ambil harga menu dari DB
4. Hitung subtotal per merchant + komisi + ongkir (server-authoritative)
5. Persist order:
   - CASH → `WAITING_OUTLET` + `paymentStatus=UNPAID` (Payment dibuat saat complete)
   - ONLINE → `PENDING_PAYMENT` + Payment `PENDING` (checkoutUrl dari adapter)
6. Client **tidak** mengirim `grandTotal`, `platformFee`, atau `deliveryFee` sebagai sumber kebenaran

### completeOrder

- CASH: setelah `DELIVERED` → tagih tunai, Payment `COLLECTED`, `PAID_CASH`, ledger
- ONLINE: setelah `DELIVERED` + sudah `PAID` → `COMPLETED` tanpa tagih tunai

### payments/webhook

`POST /api/payments/webhook` — siap diisi signature provider. Mode `STUB`: `{ event: "PAID"|"FAILED", paymentId }`.
