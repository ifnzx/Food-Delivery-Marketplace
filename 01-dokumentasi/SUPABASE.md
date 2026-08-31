# Supabase — database bersama untuk uji coba multi-device

Supabase = **database PostgreSQL di cloud**. Semua laptop/device yang pakai backend yang sama akan melihat **data order, menu, akun** yang sama.

> **Penting:** Supabase **bukan** pengganti backend API. Server Express (`03-backend-lokal`) tetap harus jalan di satu tempat (laptop atau hosting). App customer/outlet/kurir memanggil **API backend**, bukan langsung ke Supabase.

```
[ HP / laptop lain ]  ──HTTP──►  [ Backend :3001 ]  ──►  [ Supabase PostgreSQL ]
```

---

## 1. Ambil connection string dari Supabase

1. Buka https://supabase.com/dashboard  
2. Pilih project Anda (mis. **ifnzx's Project**)  
3. **Project Settings** (ikon gear) → **Database**  
4. Scroll ke **Connection string** → tab **URI**  
5. Copy string seperti:
   ```
   postgresql://postgres.[ref]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
   ```
6. Ganti `[PASSWORD]` dengan password database project (dibuat saat project dibuat).

---

## 2. Setup backend di laptop ini

```powershell
cd Desktop\Food-Delivery-Marketplace\03-backend-lokal
copy .env.example .env
```

Edit `.env`, isi baris:

```env
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@....supabase.com:6543/postgres
```

Jalankan (sekali saat pertama kali):

```powershell
npm install
npm run db:supabase:setup
```

Perintah itu akan:
- buat tabel di Supabase
- isi data demo (akun Andi, Budi, outlet, dll.)

Nyalakan server (bisa diakses device lain di WiFi yang sama):

```powershell
npm run dev:lan
```

Catat IP laptop Anda, mis. `192.168.1.10`.

---

## 3. Device lain — arahkan ke backend laptop

### Browser (customer / kurir web)

Buka di HP/laptop lain (satu WiFi):

```
http://192.168.1.10:3001/customer.html
http://192.168.1.10:3001/courier.html
```

### App Android (Flutter)

```powershell
flutter run --dart-define=API_BASE=http://192.168.1.10:3001
```

Ganti `192.168.1.10` dengan IP laptop yang menjalankan backend.

---

## 4. Laptop lain (clone dari GitHub)

```powershell
git clone https://github.com/ifnzx/Food-Delivery-Marketplace.git
cd Food-Delivery-Marketplace\03-backend-lokal
copy .env.example .env
```

Isi **DATABASE_URL yang sama** di `.env` (Supabase), lalu:

```powershell
npm install
npm run dev:lan
```

Semua laptop yang pakai `DATABASE_URL` sama = **data sama** di Supabase.

> File `.env` **tidak** ada di GitHub. Setiap laptop harus isi sendiri.

---

## 5. Kembali ke SQLite lokal (tanpa Supabase)

Hapus atau kosongkan `DATABASE_URL` di `.env`, lalu:

```powershell
npm run db:local:generate
npm run dev
```

Data pakai file `04-database/local.db` lagi.

---

## Akun demo (setelah seed)

| Role     | Email              | Password     |
|----------|--------------------|--------------|
| Customer | andi@local.test    | password123  |
| Kurir    | budi@local.test    | password123  |
| Outlet   | outlet-a@local.test| password123  |
| Admin    | admin@local.test   | password123  |

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| HP tidak bisa buka API | Pastikan satu WiFi; cek firewall Windows izinkan port 3001 |
| `Can't reach database` | Cek password & URI di `.env`; pastikan project Supabase aktif |
| Data kosong | Jalankan `npm run db:supabase:setup` lagi (seed) |
