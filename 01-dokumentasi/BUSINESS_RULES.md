# Business Rules (LOCKED)

File ini adalah sumber kebenaran. **Jangan diubah-ubah ketika coding sudah berjalan.**

Konstanta yang sama ada di `02-aturan-bisnis/businessRules.ts`.

## Locked constants

| Key | Value | Catatan |
|---|---|---|
## Tarif (bisa diatur Super Admin)

Nilai bawaan tetap 15% dan Rp2.000/km. Super Admin boleh mengubah di menu **Tarif**:

- Komisi: persentase dari subtotal makanan (bukan ongkir)
- Ongkir: **per km** atau **tarif tetap (plat)** per pengantaran

Order yang sudah selesai tidak dihitung ulang. Client tetap tidak boleh menulis angka fee.
| `CUSTOMER_SERVICE_FEE` | `0` | Customer tidak dikenakan fee aplikasi |
| `PAYMENT_METHOD_MVP` | `CASH` | Satu-satunya metode di Phase 1 |
| `SETTLEMENT_PERIOD` | `EVERY_10_CALENDAR_DAYS` | Fee wajib dilunasi tiap **10 hari kalender** |
| `SETTLEMENT_CALENDAR_DAYS` | `10` | Termasuk Sabtu/Minggu |
| `MINIMUM_SETTLEMENT` | configurable | Default seed: `10000` |
| `COMMISSION_BASE` | `FOOD_SUBTOTAL` | Bukan grand total, bukan ongkir |
| `DELIVERY_FEE_BELONGS_TO` | `COURIER` | Ongkir 100% milik kurir |

## Rumus (wajib server-authoritative)

```
platformFee      = foodSubtotal × COMMISSION_RATE
merchantAmount   = foodSubtotal - platformFee
distanceKmBilled = applyRounding(routeDistanceKm, roundingRule)
deliveryFee      = distanceKmBilled × DELIVERY_RATE_PER_KM
customerFee      = CUSTOMER_SERVICE_FEE   // selalu 0 di MVP
grandTotal       = foodSubtotal + deliveryFee + customerFee
courierEarning   = deliveryFee
```

Multi-outlet: komisi dihitung **per merchant** dari `order_merchants.subtotal`. `platformFee` order = jumlah komisi semua merchant. Ongkir tetap satu nilai di level order.

## Pembulatan jarak

Default rekomendasi: **ceil ke km penuh** (`3.1 km → 4 km`).

Aturan pembulatan **harus configurable** dari Admin (`settings/business`):

- `CEIL` — ke atas ke km penuh
- `ROUND` — pembulatan biasa
- `NONE` — pakai jarak aktual (boleh desimal)

Frontend boleh menampilkan estimasi. Nilai yang tersimpan di order **hanya** hasil backend (`local-api` saat uji coba, Cloud Functions nanti).

## Field yang tidak boleh diubah client

- `platformFee`
- `merchantAmount`
- `commissionAmount`
- `commissionRate`
- `courierEarning`
- `deliveryFee` (final)
- `grandTotal`
- `foodSubtotal` (final, dihitung dari harga menu server)

## Settlement

- Periode wajib: **setiap 10 hari kalender** sejak outstanding mulai terbentuk (`outstandingSince`)
- Jatuh tempo = `addCalendarDays(outstandingSince, 10)` (Sabtu/Minggu dihitung)
- Jika `outstanding >= MINIMUM_SETTLEMENT` **dan** lewat jatuh tempo → outlet **otomatis OFF / SUSPENDED**
- Outlet **wajib unggah foto bukti transfer**; status `PENDING` → Admin `VERIFIED` atau `REJECTED` setelah mencocokkan dengan mutasi rekening
- Jika `VERIFIED`: `outstanding -= settlementAmount`; bila outstanding habis → `ACTIVE` lagi + `outstandingSince` direset
- **Rekening tujuan fee** = rekening founder (`payoutBankName`, `payoutAccountNumber`, `payoutAccountName`) ditampilkan di app/web outlet Tagihan. Bisa diganti di Founder Monitor → Fee & Tagihan.

## Merchant suspension (fee overdue)

```
OUTSTANDING → (10 hari kalender) → OVERDUE → SUSPENDED (outlet off)
```

Merchant `SUSPENDED` karena tagihan:

- tidak bisa login panel/app outlet
- tidak menerima order baru
- tidak muncul sebagai outlet aktif
- `isOpen` dipaksa `false`

Setelah settlement verified & outstanding lunas: `SUSPENDED → ACTIVE`

## Persetujuan kurir

Kurir baru daftar dengan `approvalStatus = PENDING`.

- Super Admin wajib **Setujui** dulu sebelum akun bisa login / online
- `REJECTED` / `SUSPENDED` tidak bisa login
- Baru `APPROVED` yang boleh memakai app kurir

## Payment MVP

`paymentMethod = CASH` (default terkunci Phase 1).

Untuk cash, status order `PENDING_PAYMENT` **dilewati**. Order langsung `WAITING_OUTLET`.

Customer membayar `grandTotal` kepada kurir → `paymentStatus = PAID_CASH`.

## Payment Phase 2 (siap di kode, default OFF)

Struktur database + service sudah mendukung online tanpa mengubah default MVP:

| Setting | Default | Arti |
|---|---|---|
| `onlinePaymentsEnabled` | `false` | Harus `true` sebelum client boleh kirim `ONLINE` |
| `paymentProvider` | `NONE` | `STUB` (uji lokal) / `MIDTRANS` / `XENDIT` (adapter nanti) |

Alur online (saat diaktifkan):

1. `createOrder` dengan `paymentMethod: ONLINE` → order `PENDING_PAYMENT`, Payment `PENDING`
2. Webhook gateway `PAID` → order `WAITING_OUTLET`, `paymentStatus: PAID`
3. Dapur / kurir jalan seperti biasa
4. `complete` **tidak** menagih tunai (sudah lunas)

Adapter: `03-backend-lokal/src/services/payment/`. Webhook: `POST /api/payments/webhook`.
