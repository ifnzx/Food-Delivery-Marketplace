# Mode lokal (untuk uji coba & review)

Firebase ditunda. Backend memakai **SQLite** di `04-database/local.db`.

## Jalankan

```bash
cd 03-backend-lokal
npm install
npm run db:reset
npm run dev
```

Buka:

- Review UI: http://localhost:3001
- Prisma Studio: `npm run studio` → http://localhost:5555
- File database: `04-database/local.db`

## Akun demo

Password semua akun: `password123`

| Role | Email |
|---|---|
| Admin | admin@local.test |
| Customer | andi@local.test |
| Outlet A | outlet-a@local.test |
| Outlet B | outlet-b@local.test |
| Kurir | budi@local.test |

Rumus uang ada di `02-aturan-bisnis/businessRules.ts`.
Perhitungan order ada di `03-backend-lokal/src/services/quote.ts`.
