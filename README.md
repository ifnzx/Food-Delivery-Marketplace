# Food Delivery Marketplace

Baca **BACA-INI.md** untuk peta folder.

Uji coba memakai SQLite lokal. Firebase ada di `99-firebase-nanti` dan belum dipakai.

## Jalankan

```bash
cd 03-backend-lokal
npm run dev
```

Buka http://localhost:3001

Password demo: `password123`

## Aturan terkunci

| Rule | Value |
|---|---|
| Komisi | 15% dari nilai makanan |
| Ongkir | Rp2.000/km |
| Service fee customer | 0 |
| Pembayaran MVP | CASH |
| Ongkir milik | Kurir |

Semua perhitungan uang dilakukan di backend (`03-backend-lokal/src/services/quote.ts`), bukan di halaman browser.

## Dokumentasi

Lihat folder `01-dokumentasi`.
