Buka file ini dulu.

Lokasi folder:
Desktop \ Food-Delivery-Marketplace

Cara baca kode (urut angka):

01-dokumentasi     → PRD, alur user, aturan bisnis, prompt Stitch
02-aturan-bisnis   → rumus uang yang dikunci (15%, ongkir Rp2.000/km)
03-backend-lokal   → kode yang sedang jalan untuk uji coba
04-database        → file SQLite local.db (data bisa dilihat)
05-aplikasi        → app: customer-android (Flutter) sudah mulai
99-firebase-nanti  → disimpan dulu, belum dipakai

UI mockup (Google Stitch — Customer, Kurir, Outlet, Super Admin):
https://stitch.withgoogle.com/projects/10051657497505071507

Customer app:
cd 05-aplikasi\customer-android
flutter run
(akun: andi@local.test / password123)

Kurir app:
cd 05-aplikasi\kurir-android
flutter run
(akun: budi@local.test / password123)

Outlet app:
cd 05-aplikasi\outlet-android
flutter run
(akun: outlet-a@local.test / password123)

Super Admin web:
cd 05-aplikasi\web-admin
npm run dev
Buka http://localhost:3000
(akun: admin@local.test / password123)

Cara menjalankan uji coba:

1. Buka folder 03-backend-lokal
2. Jalankan: npm run dev
3. Buka browser: http://localhost:3001

Password semua akun demo: password123
- admin@local.test
- andi@local.test
- outlet-a@local.test
- budi@local.test

Di dalam 03-backend-lokal/src:

server.ts              → pintu masuk, menyalakan server
db.ts                  → koneksi ke SQLite
seed.ts                → data contoh (Andi, Warung A, Budi, ORD-001)
lib/                   → token login, password, jarak
middleware/auth.ts     → cek siapa yang login
services/quote.ts      → hitung komisi & ongkir
services/orderHelpers.ts
routes/auth.ts         → login
routes/merchants.ts    → daftar outlet & menu
routes/orders.ts       → buat order, status, selesai
routes/couriers.ts     → GPS kurir
routes/admin.ts        → dashboard
routes/settlements.ts  → tagihan outlet
public/index.html      → halaman review di browser
