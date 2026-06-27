# ZKM — Zaneva Konsinyasi Manager

Aplikasi manajemen konsinyasi Zaneva untuk venue padel.

## Tech Stack

- **Frontend & Backend:** Next.js 15 (App Router)
- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **Auth:** iron-session
- **Deploy:** Docker + EasyPanel

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (via Docker)
docker compose up db -d

# 3. Setup environment
cp .env.example .env

# 4. Generate Prisma client & push schema
npx prisma generate
npx prisma db push

# 5. Seed database
npm run db:seed

# 6. Run development server
npm run dev
```

## Quick Start (Docker Production)

```bash
# Build & run everything
docker compose up -d --build

# Seed database
docker compose exec app npx prisma db push
docker compose exec app npx tsx prisma/seed.ts
```

## Login Credentials (Seed)

| Role   | Username | Password  |
|--------|----------|-----------|
| Admin  | admin    | admin123  |
| Staff  | staff    | staff123  |
| Venue  | venue1   | venue123  |

## Deploy ke EasyPanel

1. Push repo ke GitHub
2. Di EasyPanel, buat **Service** baru → pilih **GitHub**
3. Pilih repo ini
4. Set **Build Pack** → Dockerfile
5. Tambah **Database** → PostgreSQL
6. Set environment variables:
   - `DATABASE_URL` = connection string dari PostgreSQL
   - `SESSION_SECRET` = random string min 32 karakter
   - `N8N_WEBHOOK_URL` = URL webhook n8n (opsional)
   - `NEXT_PUBLIC_APP_URL` = URL app
7. Deploy!

## n8n Integration

Webhook events yang dikirim ke n8n:

| Event               | WhatsApp (Venue) | Telegram (Internal) |
|---------------------|------------------|---------------------|
| BAST_TERBIT         | ✅               | ✅                  |
| STOK_RENDAH         | ✅               | ✅                  |
| LAPORAN_PENJUALAN   | —                | ✅                  |
| INVOICE_TERBIT      | ✅               | ✅                  |
| PEMBAYARAN_DITERIMA | ✅               | —                   |
| INVOICE_TELAT       | ✅               | ✅                  |
| RETUR_DIPROSES      | ✅               | —                   |

## Project Structure

```
├── prisma/           # Schema & seed
├── src/
│   ├── app/
│   │   ├── api/      # API routes
│   │   ├── auth/     # Login page
│   │   ├── dashboard/ # Admin/Staff pages
│   │   └── venue/    # Venue pages
│   ├── components/   # Reusable components
│   ├── lib/          # Prisma, session, utils, webhook
│   └── types/        # TypeScript types
├── docker-compose.yml
├── Dockerfile
└── easypanel.json    # EasyPanel config
```
