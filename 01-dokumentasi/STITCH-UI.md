# Google Stitch — Prompt UI ANTARQ

Nama produk: **ANTARQ**.  
Tujuan: generate mockup MVP (customer Android, kurir Android, outlet web, admin web).

## Project Stitch (sudah jadi)

Semua UI (Customer, Kurir, Outlet, Super Admin) ada di satu project:

**https://stitch.withgoogle.com/projects/10051657497505071507**

Gunakan project ini sebagai acuan visual saat coding Flutter / Next.js.

## Cara pakai prompt (jika generate layar baru)

1. Buka project Stitch di atas, atau buat project baru jika perlu.
2. Masukkan isi `DESIGN.md` sebagai design system.
3. Generate **satu layar per prompt**. Copy blok di bawah, tempel utuh.
4. Urutan: Login → layar utama → alur order. Jangan generate semua sekaligus.
5. Bahasa di layar: **Indonesia**. Device customer/kurir: **Android mobile**. Outlet: **responsive web**. Admin: **desktop web**.

Jangan masukkan logika backend, API, atau Firebase ke dalam prompt.

---

# A. Customer — Android

## A1. Login

```
Design a mobile Android login screen for a food delivery app named ANTARQ.

Include:
- Top: warm food illustration area with wordmark ANTARQ and tagline “Makanan sampai, tanpa ribet”
- Center card: email field, password field, primary button “Masuk”
- Text link “Daftar akun baru”
- Small note “Pembayaran MVP: tunai ke kurir”

Style: warm, clean, trustworthy Indonesian food app, cream canvas, orange primary, large tap targets, no dark mode.

Optimize for Android mobile 390x844, Indonesian UI copy, high-contrast accessibility.
```

## A2. Daftar akun

```
Design a mobile Android registration screen for ANTARQ customer signup.

Include:
- Simple top app bar with back and title “Buat akun”
- Form fields: nama, nomor HP, email, password
- Primary button “Daftar”
- Footer text “Sudah punya akun? Masuk”

Style: same warm food-delivery look, spacious form, cream background, orange CTA.

Optimize for Android mobile, Indonesian labels.
```

## A3. Beranda outlet

```
Design a mobile Android home screen listing nearby food outlets for ANTARQ.

Include:
- Header with delivery address “Jl. Veteran, Banjarmasin” and a change-address chevron
- Search bar “Cari warung atau menu”
- Horizontal chips: Semua, Buka, Terdekat, Hemat
- Vertical list of outlet cards: photo, name Warung A / Warung B, rating, status Buka, distance, time estimate
- Bottom navigation: Beranda, Keranjang, Pesanan, Akun. Beranda active

Style: appetizing, card-based, airy spacing, orange accents, food marketplace not grocery.

Optimize for Android mobile scrolling list.
```

## A4. Detail outlet + menu

```
Design a mobile Android restaurant menu screen for Warung A in ANTARQ.

Include:
- Cover photo and outlet header: name, buka, alamat singkat
- Sticky category tabs: Makanan, Minuman
- Menu rows: Nasi Goreng Spesial Rp50.000, Ayam Goreng Rp50.000, each with plus button
- Floating or bottom bar showing “Keranjang · 2 item · Rp100.000”

Style: clean menu commerce layout, strong price hierarchy, orange add buttons.

Optimize for Android mobile, Indonesian copy.
```

## A5. Keranjang multi-outlet

```
Design a mobile Android cart screen that groups items by outlet for ANTARQ.

Include:
- Title “Keranjang”
- Section Warung A: Nasi Goreng Spesial qty 1, Ayam Goreng qty 1, subtotal Rp100.000
- Section Warung B empty-state optional or Mie Ayam + Es Teh if multi
- Link “Tambah dari warung lain”
- Bottom checkout bar: makanan Rp100.000, primary button “Checkout”

Do not show 15% commission. Customer only sees food subtotal here.

Style: grouped cards per merchant, clear qty steppers, warm and simple.

Optimize for Android mobile.
```

## A6. Checkout cash

```
Design a mobile Android checkout screen for ANTARQ cash payment.

Include:
- Address card: “Jl. Veteran, Banjarmasin” with map thumbnail
- Order summary: Makanan Rp100.000, Ongkir Rp10.000, Service fee Rp0
- Total Rp110.000, large and bold
- Payment method card selected: “Tunai ke kurir”
- Note “Bayar total kepada kurir saat makanan sampai. Tidak ada biaya aplikasi.”
- Primary button “Buat pesanan”

Do not show platform commission.

Style: calm checkout, trustworthy totals, orange place-order button.

Optimize for Android mobile.
```

## A7. Tracking pesanan

```
Design a mobile Android live order tracking screen for ANTARQ.

Include:
- Map occupying upper half with courier marker “Budi” moving toward customer
- Bottom sheet: order ORD-001, status “Kurir menuju kamu”
- Vertical stepper: Outlet terima, Dimasak, Diambil, Diantar, Selesai
- Courier row: photo, Budi, rating, button “Navigasi”
- Cash reminder: “Siapkan tunai Rp110.000”
- Bottom nav hidden; back to orders

Style: map-first, live, reassuring, teal for delivering state, orange for brand.

Optimize for Android mobile.
```

## A8. Riwayat pesanan

```
Design a mobile Android order history screen for ANTARQ.

Include:
- Tabs: Aktif, Selesai
- Cards: ORD-001, Warung A, total Rp110.000, status Selesai, Bayar tunai, date
- Active card example: “Kurir menuju kamu”
- Bottom navigation with Pesanan active

Style: simple list, status chips, easy to scan.

Optimize for Android mobile.
```

## A9. Profil & alamat

```
Design a mobile Android profile screen for customer Andi in ANTARQ.

Include:
- Avatar, name Andi, phone
- List rows: Alamat tersimpan, Riwayat, Bantuan, Keluar
- Address card: Rumah, Jl. Veteran, Banjarmasin, default badge
- Bottom navigation with Akun active

Style: quiet settings layout, warm header, no clutter.

Optimize for Android mobile.
```

---

# B. Kurir — Android

## B1. Login kurir

```
Design a mobile Android login screen for ANTARQ courier app.

Include:
- Wordmark ANTARQ Kurir
- Email and password fields
- Primary button “Masuk sebagai kurir”
- No customer signup link

Style: same orange brand but more utilitarian, helmet/delivery vibe without looking like a game.

Optimize for Android mobile.
```

## B2. Beranda online/offline

```
Design a mobile Android courier home screen with a large online/offline toggle.

Include:
- Header: Budi, status Online green pill
- Big toggle “Sedang online — siap terima order”
- Today earnings card: Rp10.000, “Ongkir hari ini”
- Empty or waiting state: “Menunggu pesanan masuk”
- Bottom navigation: Beranda, Order, Pendapatan, Akun

Style: high-contrast toggle, trustworthy, field-worker friendly, large controls.

Optimize for Android mobile, one-thumb use.
```

## B3. Order masuk

```
Design a mobile Android incoming order offer screen for courier Budi.

Include:
- Timer or “Order baru”
- Pickup: Warung A, Jl. A. Yani Km 3
- Dropoff: Andi, Jl. Veteran
- Distance 5 km, ongkir Rp10.000 highlighted as courier earning
- Items summary 2 makanan, bayar tunai Rp110.000
- Two big buttons: Tolak outline, Terima primary orange

Style: urgent but clear, map snippet on top, huge accept button.

Optimize for Android mobile.
```

## B4. Menuju outlet / pickup

```
Design a mobile Android courier navigation screen to the outlet.

Include:
- Map with route to Warung A
- Bottom sheet: status “Menuju outlet”, address, button “Navigasi”
- Checklist: ambil Nasi Goreng Spesial, Ayam Goreng
- Primary button “Konfirmasi pickup”
- Cash note for later, not collected yet

Style: navigation-first, large confirm button, teal/orange status.

Optimize for Android mobile.
```

## B5. Antar & tunai

```
Design a mobile Android courier delivery confirmation screen at customer location.

Include:
- Map to Andi, Jl. Veteran
- Status “Antar pesanan”
- Big cash panel: “Tagih tunai Rp110.000”
- Breakdown small text: makanan Rp100.000 + ongkir Rp10.000
- Primary button “Pesanan sampai · tunai diterima”
- Secondary “Hubungi customer”

Style: very clear cash collection, no clutter, strong total.

Optimize for Android mobile.
```

## B6. Pendapatan kurir

```
Design a mobile Android courier earnings screen.

Include:
- Today Rp10.000, week summary
- List of completed orders with ongkir only as earning
- Note “Pendapatan kurir = ongkir. Komisi makanan bukan milik kurir.”
- Bottom nav Pendapatan active

Style: simple wallet/earnings, not a bank app, orange and teal.

Optimize for Android mobile.
```

---

# C. Outlet — Web responsive

## C1. Login outlet

```
Design a responsive web login page for ANTARQ merchant outlet.

Include:
- Left brand panel on desktop, stacked on mobile
- Login card: email, password, button “Masuk ke panel outlet”
- Link “Daftar outlet baru”

PLATFORM: Web, mobile-first

Style: warm food brand, clean SaaS form, orange primary, lots of whitespace.

Optimize for mobile web and desktop, Indonesian copy.
```

## C2. Antrian pesanan

```
Design a responsive web orders inbox for a restaurant named Warung A.

Include:
- Top bar: ANTARQ Outlet, toggle “Buka”, Warung A
- Left nav on desktop: Pesanan, Menu, Penjualan, Tagihan, Profil
- Main: tabs Baru, Diproses, Siap diambil
- Order cards: ORD-001, Andi, Nasi Goreng + Ayam Goreng, subtotal Rp100.000
- Actions: Tolak, Terima, then status chips Memasak / Siap
- Do not show customer delivery fee as merchant revenue. Show food subtotal.

PLATFORM: Web, mobile-first

Style: kitchen-friendly, large buttons, high readability, orange brand.

Optimize for tablet in kitchen and phone.
```

## C3. Kelola menu

```
Design a responsive web menu management page for Warung A.

Include:
- Header “Menu” and button “Tambah menu”
- Table/cards: photo, name, price, stok, toggle tersedia
- Example rows: Nasi Goreng Spesial Rp50.000, Ayam Goreng Rp50.000
- Edit and nonaktifkan actions

PLATFORM: Web, mobile-first

Style: simple admin-for-warung, not enterprise ERP.

Optimize for responsive web.
```

## C4. Tagihan settlement

```
Design a responsive web settlement/billing page for Warung A.

Include:
- KPI cards: Penjualan Rp100.000, Komisi 15% Rp15.000, Sudah dibayar Rp0, Outstanding Rp15.000
- Explanation: “Komisi 15% dari nilai makanan. Hak outlet Rp85.000.”
- Button “Bayar tagihan” and upload bukti transfer dropzone
- Table of invoices with status PENDING / VERIFIED
- Note if below minimum, hide urgency; this example is payable for local demo

PLATFORM: Web, mobile-first

Style: clear money hierarchy, trustworthy finance, still warm brand not banking-cold.

Optimize for responsive web, Indonesian.
```

## C5. Profil outlet

```
Design a responsive web outlet profile settings page.

Include:
- Form: nama Warung A, alamat, jam operasional, foto
- Map pin for GPS
- Toggle buka/tutup
- Save button

PLATFORM: Web, mobile-first

Style: simple settings, orange save, clean inputs.

Optimize for responsive web.
```

---

# D. Admin — Web desktop

Prompt redesign Super Admin (copy-paste per layar): `STITCH-SUPER-ADMIN.md`

## D1. Login admin

```
Design a desktop web admin login for ANTARQ platform.

Include:
- Centered secure login card, email password, button “Masuk dashboard”
- Subtle brand, no consumer food photography overload

PLATFORM: Web, desktop-first

Style: calmer than customer app, still orange accent, professional operations dashboard.

Optimize for desktop 1440.
```

## D2. Dashboard KPI

```
Design a desktop admin dashboard for a food delivery marketplace.

Include:
- Left sidebar: Dashboard, Pesanan, Customer, Outlet, Kurir, Settlement, Peta Live, Pengaturan
- Top bar: Admin Platform, date
- KPI cards: GMV Rp110.000, Platform fee Rp15.000, Order 1, Selesai 1, Kurir online 1, Outstanding Rp15.000
- Two columns: recent orders table, courier online list Budi
- No marketing charts clutter; operations first

PLATFORM: Web, desktop-first

Style: dense but breathable ops dashboard, orange + teal status, light gray canvas.

Optimize for desktop 1440.
```

## D3. Live map kurir

```
Design a desktop admin live map page of couriers.

Include:
- Sidebar same as dashboard, Peta Live active
- Full map with markers: Budi green Online with order ORD-001, another courier gray Offline
- Right inspector panel after selecting marker: Nama Budi, Status Delivering, Order ORD-001, Customer Andi, Last update 10 detik lalu

PLATFORM: Web, desktop-first

Style: control-room map, clear legend Online/Busy/Offline, orange brand chrome.

Optimize for desktop 1440.
```

## D4. Kelola outlet

```
Design a desktop admin merchant list page.

Include:
- Table: Warung A Active, Warung B Active, outstanding, penjualan
- Filters: semua, pending approve, suspended
- Row actions: Detail, Suspend
- Detail drawer fields: komisi 15% locked, tagihan, status

PLATFORM: Web, desktop-first

Style: data table admin, clean, orange primary buttons.

Optimize for desktop.
```

## D5. Verifikasi settlement

```
Design a desktop admin settlement verification page.

Include:
- Table of transfer proofs: outlet, amount Rp15.000, status PENDING
- Detail: bukti transfer preview, buttons Verifikasi and Tolak
- After verify, outstanding decreases

PLATFORM: Web, desktop-first

Style: finance ops, careful CTAs, red reject, green/orange verify.

Optimize for desktop.
```

## D6. Daftar pesanan admin

```
Design a desktop admin orders table for ANTARQ.

Include:
- Filters by status chips: WAITING_OUTLET, PREPARING, DELIVERING, COMPLETED, CANCELLED
- Columns: ID, customer Andi, outlets, makanan, ongkir, total, kurir, payment CASH
- Click row opens detail split: items per outlet, fee 15%, courier earning

PLATFORM: Web, desktop-first

Style: operational table, readable money columns, status pills.

Optimize for desktop 1440.
```

---

# Urutan generate yang disarankan

Customer: A1 → A3 → A4 → A5 → A6 → A7  
Kurir: B1 → B2 → B3 → B4 → B5  
Outlet: C1 → C2 → C3 → C4  
Admin: D1 → D2 → D3 → D5  

Super Admin Kurir: antrian approve/reject (pending cards + filter + aksi Setujui/Tolak/Suspend). Pendaftaran kurir wajib disetujui dulu sebelum akun bisa login.

Setelah 1 layar bagus, minta Stitch: “Keep the same design system and components, generate the next screen.”

## Yang tidak usah di-design dulu (Phase 2)

Chat, voucher, QRIS, e-wallet, rating lengkap, sponsored outlet, membership.
