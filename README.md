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
| Owner/Admin | admin | admin123 |
| Staff Operasional | staff | staff123 |
| Venue  | venue1   | venue123  |

> Ganti semua password seed sebelum production.

## Role Tim

- **Owner/Admin**: akses penuh untuk user, venue, produk, margin, invoice, approval pembayaran, audit, dan laporan.
- **Staff Operasional**: menjalankan pekerjaan harian seperti input stok, penjualan, retur, draft invoice, ajukan pembayaran, export laporan, dan monitoring venue.
- **Venue**: akun partner eksternal untuk input penjualan/retur dan melihat riwayat venue sendiri.

## User & Password Venue

Owner/Admin memiliki menu **Users** untuk:

- Menambah akun **Staff Operasional**.
- Menambah akun **Venue** dan menghubungkannya ke data venue tertentu.
- Mengganti/reset password Staff atau Venue.

Menu **Venue** dipakai untuk data toko/partner, sedangkan username/password login venue diatur dari menu **Users**.

## Catatan Alur Data

- Stok venue dihitung dari `DROP_AWAL + RESTOCK - PENARIKAN - PENJUALAN - RETUR`.
- ROP/min stok bisa diatur per kombinasi venue + produk dari menu **Stok**.
- Invoice punya nomor otomatis `ZKM-YYYY-0001`.
- Sistem menolak invoice dobel untuk venue dan periode yang sama.
- Pembayaran dari Staff masuk status `PENDING` dan wajib diverifikasi Owner/Admin.
- Pembayaran dari Owner/Admin otomatis `APPROVED`; invoice lunas hanya dihitung dari pembayaran approved.

## Trial Tools Owner

Owner/Admin memiliki menu **Settings** untuk kebutuhan demo dan trial:

- **Suntik Dummy Data**: mengisi contoh produk Zaneva, venue partner, stok, penjualan, retur, invoice, dan pembayaran.
- **Reset Data Trial**: mengosongkan data operasional setelah trial selesai.
- Reset trial tidak menghapus akun internal Owner/Admin dan Staff, supaya tim tetap bisa login.

Jalankan reset hanya setelah yakin data trial boleh dikosongkan.

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
   - `WAHA_API_URL` = URL WAHA, contoh `http://waha:3000`
   - `WAHA_API_KEY` = API key WAHA jika diaktifkan
   - `WAHA_SESSION` = nama session WAHA, default `default`
   - `WAHA_WEBHOOK_SECRET` = secret webhook inbound WAHA
   - `WAHA_OWNER_NUMBERS` = nomor WA owner dipisah koma, contoh `62812xxxx,62813xxxx`
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
| PEMBAYARAN_MENUNGGU_VERIFIKASI | —     | ✅                  |
| PEMBAYARAN_DIVERIFIKASI | ✅           | ✅                  |

## WAHA / WhatsApp Workflow

Rekomendasi integrasi WAHA:

- Kirim invoice terbit ke PIC venue.
- Kirim reminder jatuh tempo H-3, H-1, hari H, dan telat.
- Kirim konfirmasi pembayaran setelah Owner/Admin approve.
- Kirim alert stok rendah berdasarkan ROP per venue-produk.
- Broadcast pengumuman bisa pilih semua venue atau sebagian venue.

Endpoint inbound WAHA di app:

- `POST /api/waha/webhook`
- Jika `WAHA_WEBHOOK_SECRET` diisi, pasang URL webhook dengan query `?secret=...` atau header secret.
- App membalas via WAHA `POST /api/sendText`.

Untuk chat masuk dari venue, gunakan command terbatas, bukan AI bebas:

- `STOK` → balas ringkasan stok venue dari nomor WA yang terdaftar.
- `STOK <SKU>` → balas stok produk tertentu.
- `INVOICE` → balas invoice belum lunas milik venue tersebut.
- `INVOICE <NO_INVOICE>` → balas detail invoice tertentu.
- `HELP` → balas daftar format yang didukung.

Untuk owner, nomor harus masuk `WAHA_OWNER_NUMBERS`, lalu command bisa eksekusi langsung:

- `STOK <nama venue>` → cek stok venue.
- `INVOICE <nama venue>` → cek invoice belum lunas venue.
- `BROADCAST ALL | pesan` → kirim pesan ke semua venue aktif.
- `BROADCAST Venue A, Venue B | pesan` → kirim pesan ke sebagian venue.
- `HELP` → balas daftar format owner.

Jika pesan tidak cocok format, bot cukup balas contoh format. Jangan biarkan AI menjawab di luar ruang lingkup stok/invoice.

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
