# User Flow

## Customer — buat order (MVP cash)

```
Pilih outlet
  → Pilih makanan
  → Tambah keranjang
  → (opsional) pilih outlet lain
  → Checkout
  → Masukkan alamat
  → Server hitung jarak rute
  → Server hitung ongkir
  → Pilih Cash
  → createOrder
  → Status: WAITING_OUTLET
```

## Outlet

```
Order baru
  → Terima / Tolak
  → PREPARING
  → READY_FOR_PICKUP
```

Jika semua merchant pada order `REJECTED` → order `CANCELLED`.

## Kurir

```
Order OUTLET_ACCEPTED / PREPARING / READY_FOR_PICKUP
  → Ranking kurir online (GPS) by jarak kurir → outlet
  → Exclusive offer ke #1 (TTL ~45 dtk) — anti-rebutan
  → Timeout / Lewati → cascade ke #2, dst.
  → Kurir terima → COURIER_ASSIGNED
  → Menuju outlet → COURIER_GOING_TO_OUTLET
  → Pickup → PICKED_UP
  → Menuju customer → DELIVERING
  → Delivery → DELIVERED
  → Completed → COMPLETED
```

Multi-outlet: kurir mengambil dari setiap outlet yang `READY` sebelum `DELIVERING`. Urutan pickup disimpan di assignment (detail di STEP 9).
Matching: `03-backend-lokal/src/services/courierOffer.ts`.

## Cash settlement di lapangan

Customer membayar `grandTotal` tunai kepada kurir.

Contoh Rp110.000:

- Outlet hak Rp85.000 (dicatat sebagai tagihan komisi outlet ke platform)
- Platform fee Rp15.000 (outlet menyetor kemudian via settlement)
- Kurir Rp10.000 (ongkir, sudah diterima dari customer)

## Settlement outlet

```
Lihat tagihan (penjualan, komisi, outstanding)
  → Jika outstanding >= minimumSettlement
  → BAYAR TAGIHAN + upload bukti
  → PENDING
  → Admin VERIFIED / REJECTED
  → Jika VERIFIED: outstanding berkurang
  → Jika merchant SUSPENDED dan lunas: kembali ACTIVE
```

## Admin live map

```
Baca courier_locations
  → Marker online / offline / delivering
  → Klik marker: nama, status, order aktif, last update
```
