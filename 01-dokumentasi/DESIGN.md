# Design System — ANTARQ

Nama produk: **ANTARQ**  
Produk: marketplace makanan (customer Android, kurir Android, outlet web, admin web)  
Bahasa UI: **Indonesia**  
Mood: hangat, bersih, mudah, terpercaya. Mirip aplikasi pesan makanan, bukan fintech kaku.

Pakai file ini sebagai DESIGN.md / Design System di Google Stitch agar semua layar seragam.

Project Stitch (UI lengkap sudah ada):
https://stitch.withgoogle.com/projects/10051657497505071507

## Brand

- Logo wordmark: **ANTARQ**
- Tagline: Makanan sampai, tanpa ribet
- Ikon: mark ANTARQ (hexagon + panah), sederhana, rounded

## Platform

- Customer & Kurir: Mobile Android, 390×844
- Outlet: Web responsive, mobile-first, breakpoint 768 / 1024
- Admin: Web desktop-first, 1440 lebar, sidebar kiri

## Color

| Token | Hex | Pakai untuk |
|---|---|---|
| Primary | `#E85D04` | CTA, harga, tab aktif |
| Primary dark | `#D00000` | Tekanan / promo kecil |
| Primary soft | `#FFF1E6` | Chip, badge, background kartu aktif |
| Success | `#2A9D8F` | Online, diterima, selesai |
| Warning | `#E9C46A` | Menunggu, persiapan |
| Danger | `#E63946` | Tolak, batal, overdue |
| Ink | `#1D1D1F` | Judul |
| Body | `#4B5563` | Teks sekunder |
| Line | `#E5E7EB` | Border |
| Canvas | `#FFF8F3` | Background app mobile |
| Surface | `#FFFFFF` | Kartu |
| Admin canvas | `#F3F4F6` | Background dashboard |

Jangan pakai ungu neon, glassmorphism berlebihan, atau dark mode untuk MVP.

## Typography

- Heading: Sans modern, semibold, tracking rapat
- Body: Sans regular, 14–16px
- Angka uang: tabular, bold
- Format uang: `Rp110.000` (titik ribuan, tanpa koma desimal)

## Radius & spacing

- Kartu: 16px
- Tombol: 12px
- Input: 12px
- Spacing: 8 / 12 / 16 / 24
- Shadow kartu: sangat lembut, bukan drop-shadow tebal

## Components

- **Primary button:** full-width di mobile, oranye, teks putih, tinggi 48px
- **Secondary button:** outline oranye
- **Destructive:** outline merah
- **Cash badge:** hijau toska, teks “Bayar tunai”
- **Status chip:** WAITING = kuning, PREPARING = oranye muda, DELIVERING = toska, COMPLETED = hijau, CANCELLED = merah
- **Price:** oranye, bold, kanan
- **Bottom nav customer:** Beranda, Keranjang, Pesanan, Akun
- **Bottom nav kurir:** Beranda, Order, Pendapatan, Akun
- **Outlet sidebar:** Pesanan, Menu, Penjualan, Tagihan, Profil
- **Admin sidebar:** Dashboard, Pesanan, Customer, Outlet, Kurir, Settlement, Peta Live, Pengaturan

## Content rules

- Customer **tidak** melihat komisi 15%
- Customer hanya melihat: harga makanan + ongkir + total
- Outlet melihat: penjualan, komisi 15%, hak outlet, outstanding
- Kurir melihat: ongkir sebagai pendapatan
- Payment MVP hanya **Tunai / Cash**
- Tidak ada service fee
- Multi-outlet: keranjang dikelompokkan per warung

## Dummy data

- Kota: Banjarmasin
- Customer: Andi
- Kurir: Budi
- Outlet A: Warung A — Nasi Goreng Spesial Rp50.000, Ayam Goreng Rp50.000
- Outlet B: Warung B — Mie Ayam Rp40.000, Es Teh Rp40.000
- Contoh order: makanan Rp100.000, ongkir Rp10.000, total Rp110.000
