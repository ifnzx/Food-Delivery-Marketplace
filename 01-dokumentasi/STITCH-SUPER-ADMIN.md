# Google Stitch — Redesign Super Admin ANTARQ

Nama produk: **ANTARQ**  
Peran: **Founder / Super Admin** (bukan operator order harian)  
Platform: **Web desktop**, lebar **1440px**  
Bahasa UI: **Indonesia**

Project Stitch lama (acuan, boleh di-redesign):  
https://stitch.withgoogle.com/projects/10051657497505071507

## Cara pakai di Google Stitch

1. Buka project Stitch di atas, atau buat project baru **ANTARQ Super Admin**.
2. Tempel dulu blok **Design System** (satu kali).
3. Generate **satu layar per prompt**. Copy satu blok ` ``` ` utuh.
4. Urutan: Login → Overview → Live Transaksi → Outlet → Kurir → Fee & Tagihan → Customer.
5. Setelah layar pertama bagus, awali prompt berikutnya dengan:  
   `Keep the same design system, sidebar, typography, and components. Generate the next screen only.`

Jangan masukkan API, Firebase, atau logika backend ke dalam prompt.

Super Admin **tidak** menerima/menolak order, **tidak** assign kurir, **tidak** complete delivery.  
Yang boleh: pantau transaksi, pecahan uang, setujui kurir (setelah cek KTP), verifikasi bukti bayar komisi outlet.

---

# Design System (tempel sekali di awal)

```
Design system for ANTARQ Super Admin (founder monitor, desktop web).

Brand: ANTARQ. Tagline: Makanan sampai, tanpa ribet.
Mood: calm operations command center, trustworthy Indonesian food marketplace — not neon fintech, not dark mode, not glassmorphism.

Layout chrome (every authenticated screen):
- Left sidebar 260px, dark ink #1D1D1F, wordmark ANTARQ + subtitle “Founder Monitor” + note “Read-only operasi order”
- Nav items with label + tiny hint:
  Overview (KPI platform)
  Live Transaksi (Customer→Outlet→Kurir)
  Fee & Tagihan (Komisi outlet)
  Outlet (Merchant)
  Customer (Pemesan)
  Kurir (Approve & status)
- Footer sidebar: short note “Anda memantau sistem” + button Keluar
- Main canvas #F3F4F6
- Top bar: page title + subtitle, live clock, avatar “Founder”

Color:
- Primary orange #E85D04 (CTA, active nav accent)
- Primary soft #FFF1E6
- Success teal #2A9D8F
- Warning #E9C46A
- Danger #E63946
- Ink #1D1D1F
- Body #4B5563
- Line #E5E7EB
- Surface white #FFFFFF

Type: Plus Jakarta Sans / Inter. Headings semibold. Money tabular, format Rp110.000.
Radius: cards 16px, buttons 12px. Spacing 8/12/16/24. Soft shadow only.

Components: KPI cards, status chips, data tables, photo frames for KTP and transfer proof, orange primary buttons, red outline destructive, teal success chips.

Money rules visible to Super Admin:
- Commission 15% of FOOD SUBTOTAL only (not delivery)
- Delivery fee Rp2.000/km belongs to courier
- Customer service fee = 0
- Payment MVP = CASH
- Settlement every 10 calendar days
- Customer never sees the 15% fee on consumer screens (admin may see it)

Dummy city: Banjarmasin.
Dummy people: Founder Admin, customer Andi, outlet Warung A / Warung B, courier Budi (APPROVED), courier Citra Putri (PENDING, needs KTP check).
Example order ORD-001: food Rp100.000, fee 15% = Rp15.000, merchant amount Rp85.000, delivery Rp10.000, cash total Rp110.000.
```

---

# S1. Login Super Admin

```
Keep the ANTARQ Super Admin design system.

Design a desktop web login screen (1440 wide) for Super Admin / Founder Monitor. Not the customer food app.

Include:
- Soft gray canvas #F3F4F6
- Centered white card, max-width 420px
- Wordmark ANTARQ
- Title “Founder Monitor”
- Subtitle: “Pantau transaksi Customer → Outlet → Kurir. Bukan panel operasional order.”
- Fields: Email, Password
- Primary orange button “Masuk command center”
- Tiny hint: Demo admin@local.test
- No food photography collage, no mobile bottom nav, no map

Style: professional, calm, high contrast, orange accent only on the button.

Optimize for desktop 1440, Indonesian copy.
```

---

# S2. Overview (Command Center)

```
Keep the same ANTARQ Super Admin design system, sidebar, and top bar. Overview nav is active.

Design the founder Command Overview dashboard, desktop 1440.

Include:
- Hero panel left: eyebrow “Founder monitoring”, title “Pantau transaksi dari Customer ke Outlet ke Kurir — tanpa ikut operasional harian.”
- Flow chips: 1 · Customer order → 2 · Outlet masak → 3 · Kurir antar → 4 · Cash selesai
- Right mini stats: Order aktif 1, Kurir online 1/2, Settlement pending 1
- Pipeline row of 4 cards: Di outlet 0, Di kurir 1, Selesai 1, Dibatalkan 0
- Two columns:
  1) Arus uang: GMV Rp110.000, Fee platform 15% makanan Rp15.000, Ongkir ke kurir Rp10.000, Outstanding tagihan outlet Rp49.500. Links “Buka Live Transaksi” and “Cek Fee & Tagihan”
  2) Ekosistem: Customer 1, Outlet aktif 2, Kurir menunggu approve 1, Komisi terkunci 15%. Alert note: “Ada kurir baru menunggu persetujuan. Buka menu Kurir.”

Do not add charts spaghetti, do not add Accept/Reject order buttons.

Style: dense but breathable ops dashboard.

Optimize for desktop 1440, Indonesian copy.
```

---

# S3. Live Transaksi

```
Keep the same ANTARQ Super Admin design system. Live Transaksi nav is active.

Design a desktop live transaction monitoring page. Super Admin watches one order end-to-end. Read-only. Auto-refresh feel (small “Live” teal badge + “Diperbarui 3 dtk lalu”).

Include one large order card ORD-001:
- Header: ID, status chip DELIVERING (teal), payment chip TUNAI
- Three actor columns: Customer Andi · Jl. Veteran; Outlet Warung A · READY_FOR_PICKUP; Kurir Budi · 081400000001 · Online
- Money strip (5 boxes): Makanan Rp100.000 | Fee 15% Rp15.000 | Hak outlet Rp85.000 | Ongkir kurir Rp10.000 | Total cash Rp110.000
- Horizontal timeline steps with done/pending: Order masuk, Outlet terima, Dimasak, Siap dijemput, Kurir ambil, Diantar, Selesai cash

Empty state below: “Tidak ada order aktif lain.”

No assign-courier button. No complete-order button.

Style: control-room, scannable money, clear pipeline.

Optimize for desktop 1440, Indonesian copy.
```

---

# S4. Outlet — daftar + riwayat komisi 15%

```
Keep the same ANTARQ Super Admin design system. Outlet nav is active.

Design a desktop merchant monitoring page. This screen is the source of truth for 15% commission the outlet must pay.

Include:
- Info note: “Setiap order selesai tercatat. Fee platform = 15% dari subtotal makanan (bukan ongkir). Klik baris untuk riwayat transaksi.”
- Alert bar if overdue: “1 outlet bermasalah tagihan: Warung A”
- Table columns: Outlet | Status | Jatuh tempo fee | Order selesai | Penjualan makanan | Komisi 15% | Tagihan berjalan
- Row Warung A: ACTIVE, Buka, jatuh tempo 16 Agu 2026, 2 order, penjualan Rp330.000, komisi Rp49.500, tagihan Rp49.500 (danger color). Email outlet-a@local.test
- Row Warung B: ACTIVE, Buka, no due date, 0 order, all Rp0
- Expanded row under Warung A (clicked): nested table of completed transactions
  ORD-001 · 15 Agu 2026 · Makanan Rp100.000 · Komisi 15% Rp15.000 · Hak outlet Rp85.000
  ORD-SEED · 6 Agu 2026 · Makanan Rp230.000 · Komisi 15% Rp34.500 · Hak outlet Rp195.500

No menu editor. No “buka/tutup outlet” toggle for admin ops.

Style: finance-aware data table, expandable, orange accents, red on outstanding.

Optimize for desktop 1440, Indonesian copy.
```

---

# S5. Kurir — cek biodata KTP dulu, baru Setujui

```
Keep the same ANTARQ Super Admin design system. Kurir nav is active.

Design the courier governance page. New couriers CANNOT be used until Super Admin checks biodata (name, WhatsApp, KTP photo) and presses Setujui.

Include:
- Info note: “Akun kurir baru tidak bisa login sebelum Super Admin cek biodata lalu Setujui. Tanpa foto KTP, tombol Setujui terkunci.”
- KPI cards: Menunggu approve 1 | Kurir aktif 1 | Online sekarang 1 | Total ongkir dibayar Rp10.000

Antrian persetujuan (big cards, not a tiny table):
- Card Citra Putri, chip PENDING yellow
- Fields: Nama sesuai KTP, email citra@local.test, WA 081400000002 (link), ID arsip COURIER-002
- Large KTP photo frame (landscape ID card placeholder, readable)
- Upload control “Unggah / ganti foto KTP”
- Buttons: primary “Setujui akun”, danger “Tolak”, ghost “Buka arsip”
- If KTP missing, show muted “Foto KTP belum ada di arsip” and disable Setujui (gray, tooltip “Unggah foto KTP dulu”)

Database kurir table below with filter chips: Pending (active) | Aktif | Suspended | Ditolak | Semua
- Row Budi: KTP thumb, APPROVED green, ONLINE teal, selesai 1, pendapatan Rp10.000, actions Arsip + Suspend
- Row Citra: PENDING, OFFLINE, 0, Rp0, actions Arsip + Setujui + Tolak

Optional open dossier panel for Citra: KTP large, WA, status PENDING, empty order history, form “Catat kejadian / laporan”.

Style: KYC review desk, photo-first, careful CTAs.

Optimize for desktop 1440, Indonesian copy.
```

---

# S6. Fee & Tagihan (verifikasi bukti transfer)

```
Keep the same ANTARQ Super Admin design system. Fee & Tagihan nav is active.

Design the settlement verification page. Outlet pays 15% commission every 10 calendar days with a photo proof. Super Admin verifies.

Include:
- Summary cards: Outstanding platform Rp49.500 | Menunggu verifikasi 1 | Jatuh tempo 10 hari kalender
- Note: “Outlet unggah foto bukti transfer. Super Admin cek nominal, lalu Verifikasi atau Tolak. Setelah verifikasi, tagihan berkurang.”

Table:
- Warung A | tagihan Rp49.500 | status PENDING | bukti foto thumbnail | due 16 Agu 2026 | OVERDUE chip if late
- Row expand / detail pane: large transfer-proof photo, amount Rp49.500, buttons Verifikasi (teal/orange) and Tolak (red)

Do not show QRIS, e-wallet, or invoice PDF generator. Proof is a photo.

Style: careful finance ops, high-contrast money, large proof preview.

Optimize for desktop 1440, Indonesian copy.
```

---

# S7. Customer (monitoring saja)

```
Keep the same ANTARQ Super Admin design system. Customer nav is active.

Design a simple desktop customer monitoring table. Read-only.

Include:
- Table: Nama Andi | email andi@local.test | HP | alamat Jl. Veteran Banjarmasin | order 2 | selesai 1 | total belanja Rp110.000 | last order
- Click row: recent orders list with status chips, cash total. No refund console. No chat.

Style: clean admin table, same chrome as Outlet page.

Optimize for desktop 1440, Indonesian copy.
```

---

# Yang tidak perlu di-generate (bukan peran Super Admin)

- Terima / tolak order outlet
- Assign kurir ke order
- Chat, voucher, QRIS, e-wallet
- Dark mode
- Mobile bottom navigation (ini web desktop)

---

# Checklist setelah generate

- [ ] Sidebar sama di semua layar (kecuali Login)
- [ ] Fee 15% selalu dari makanan, bukan ongkir
- [ ] Live Transaksi menampilkan pecahan uang per order
- [ ] Outlet punya riwayat transaksi + kolom komisi
- [ ] Kurir: KTP besar, Setujui terkunci tanpa foto
- [ ] Tagihan: foto bukti + Verifikasi / Tolak
- [ ] Tidak ada tombol operasional order
