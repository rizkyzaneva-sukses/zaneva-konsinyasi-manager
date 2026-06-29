'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  BookOpen, Building2, Package, Truck, ShoppingCart,
  FileText, CreditCard, RotateCcw, ClipboardList,
  ChevronDown, ChevronRight, ArrowRight, Zap,
  HelpCircle, CheckCircle2, AlertTriangle, Info, Shield,
} from 'lucide-react';

type Role = 'ADMIN' | 'STAFF' | 'VENUE';

// ─── Section component ───────────────────────────────────────────
function GuideSection({
  icon: Icon,
  title,
  color,
  children,
  defaultOpen = false,
}: {
  icon: any;
  title: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card overflow-hidden transition-all duration-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[hsl(var(--surface-hover))] transition-colors duration-150"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <span className="font-semibold text-sm text-[hsl(var(--foreground))] flex-1 text-left font-display">
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        )}
      </button>
      {open && <div className="px-5 pb-5 border-t border-[hsl(var(--border))]">{children}</div>}
    </div>
  );
}

// ─── Step list component ─────────────────────────────────────────
function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="mt-4 space-y-3">{children}</ol>;
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <li className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono mt-0.5">
        {num}
      </div>
      <div>
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{title}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{desc}</p>
      </div>
    </li>
  );
}

// ─── Tip/Info box ────────────────────────────────────────────────
function TipBox({ type, children }: { type: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', icon: Info, color: 'text-blue-500' },
    warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: AlertTriangle, color: 'text-amber-500' },
    tip: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', icon: CheckCircle2, color: 'text-emerald-500' },
  };
  const s = styles[type];

  return (
    <div className={`${s.bg} ${s.border} border rounded-lg p-3 mt-3 flex gap-2`}>
      <s.icon className={`w-4 h-4 ${s.color} flex-shrink-0 mt-0.5`} />
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{children}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function PanduanPage() {
  const [role, setRole] = useState<Role>('VENUE');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRole(d.data.role);
      })
      .catch(() => {});
  }, []);

  const isTeam = role === 'ADMIN' || role === 'STAFF';

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-[hsl(var(--border))] pb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-[hsl(var(--header-text))]">
                Panduan ZKM
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {isTeam
                  ? 'Dokumentasi lengkap sistem Zaneva Konsinyasi Manager untuk tim'
                  : 'Panduan penggunaan aplikasi untuk venue'}
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* VENUE GUIDES — visible to ALL roles                    */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] px-1">
            {isTeam ? '📱 Panduan Venue' : '📱 Panduan Penggunaan'}
          </h2>

          {/* Input Penjualan */}
          <GuideSection
            icon={ShoppingCart}
            title="Input Penjualan"
            color="#10b981"
            defaultOpen={role === 'VENUE'}
          >
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
              Cara mencatat penjualan harian produk Zaneva di venue Anda.
            </p>
            <Steps>
              <Step
                num={1}
                title="Buka menu Input Penjualan"
                desc="Klik menu 'Input Penjualan' di sidebar kiri."
              />
              <Step
                num={2}
                title="Pilih Produk & Masukkan Qty"
                desc="Pilih produk dari dropdown, masukkan jumlah yang terjual. Ulangi untuk setiap produk."
              />
              <Step
                num={3}
                title="Isi Tanggal"
                desc="Tanggal default hari ini. Ubah jika mencatat penjualan kemarin."
              />
              <Step
                num={4}
                title="Klik Simpan"
                desc="Data akan langsung tercatat dan masuk ke rekap penjualan Anda."
              />
            </Steps>
            <TipBox type="tip">
              Catat penjualan setiap hari agar data akurat. Jika ada kesalahan, hubungi admin untuk koreksi.
            </TipBox>
          </GuideSection>

          {/* Retur Produk */}
          <GuideSection
            icon={RotateCcw}
            title="Retur Produk"
            color="#f59e0b"
            defaultOpen={false}
          >
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
              Cara mengajukan retur produk yang rusak, kadaluarsa, atau tidak laku.
            </p>
            <Steps>
              <Step
                num={1}
                title="Buka menu Retur"
                desc="Klik 'Retur' di sidebar."
              />
              <Step
                num={2}
                title="Pilih Produk & Alasan"
                desc="Pilih produk yang akan diretur, masukkan jumlah dan alasan retur (rusak/kadaluarsa/tidak laku)."
              />
              <Step
                num={3}
                title="Ajukan Retur"
                desc="Klik 'Ajukan Retur'. Tim akan memverifikasi dan memproses."
              />
            </Steps>
            <TipBox type="info">
              Retur yang sudah disetujui otomatis mengurangi stok di venue Anda.
            </TipBox>
          </GuideSection>

          {/* Riwayat & Laporan */}
          <GuideSection
            icon={ClipboardList}
            title="Riwayat & Riwayat Transaksi"
            color="#6366f1"
            defaultOpen={false}
          >
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
              Melihat semua riwayat penjualan, retur, dan stok di venue Anda.
            </p>
            <Steps>
              <Step
                num={1}
                title="Buka menu Riwayat"
                desc="Tersedia 3 tab: Stok, Penjualan, dan Invoice."
              />
              <Step
                num={2}
                title="Filter & Cari"
                desc="Gunakan filter tanggal atau tab untuk menemukan data yang Anda cari."
              />
              <Step
                num={3}
                title="Lihat Detail"
                desc="Klik baris untuk melihat detail transaksi."
              />
            </Steps>
          </GuideSection>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TEAM GUIDES — visible to ADMIN & STAFF only            */}
        {/* ═══════════════════════════════════════════════════════ */}
        {isTeam && (
          <div className="space-y-3 pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] px-1">
              🔧 Panduan Tim (Admin & Staff)
            </h2>

            <GuideSection
              icon={Shield}
              title="Role Tim: Owner & Staff Operasional"
              color="#0ea5e9"
              defaultOpen={role === 'ADMIN'}
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Di sistem ini akun ADMIN dipakai sebagai Owner, sedangkan STAFF dipakai untuk operasional harian.
              </p>
              <Steps>
                <Step num={1} title="Owner / ADMIN" desc="Akses penuh: kelola user, venue, produk, margin, invoice, pembayaran, audit, dan laporan." />
                <Step num={2} title="Staff Operasional" desc="Fokus input harian: stok, penjualan, retur, draft invoice, pembayaran, export laporan, dan monitoring venue." />
                <Step num={3} title="Batas Staff" desc="Staff tidak mengelola user, tidak mengubah margin/harga sensitif, dan tidak menghapus data penting permanen." />
              </Steps>
              <TipBox type="info">
                Role VENUE adalah akun partner/venue eksternal, bukan bagian dari 2 role internal tim.
              </TipBox>
            </GuideSection>

            <GuideSection
              icon={Shield}
              title="Owner Settings: Dummy & Reset Trial"
              color="#ef4444"
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Menu Settings hanya muncul untuk Owner/Admin. Gunakan ini untuk persiapan demo atau membersihkan data setelah trial.
              </p>
              <Steps>
                <Step num={1} title="Suntik Dummy Data" desc="Buka Settings → klik 'Suntik Dummy Data' untuk mengisi contoh produk, venue, stok, penjualan, retur, invoice, dan pembayaran." />
                <Step num={2} title="Reset Data Trial" desc="Ketik RESET DATA lalu klik reset untuk mengosongkan data operasional setelah trial." />
                <Step num={3} title="Akun Tetap Aman" desc="Reset tidak menghapus akun Owner/Admin dan Staff, supaya tim tetap bisa login setelah data dikosongkan." />
              </Steps>
              <TipBox type="warning">
                Jangan jalankan reset di data produksi kecuali sudah yakin dan sudah punya backup.
              </TipBox>
            </GuideSection>

            {/* Alur Konsinyasi */}
            <GuideSection
              icon={Zap}
              title="Alur Konsinyasi — Gambaran Besar"
              color="#4ade80"
              defaultOpen={true}
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Alur kerja end-to-end sistem konsinyasi Zaneva:
              </p>
              <div className="mt-4 space-y-2">
                {[
                  { step: 'Produk', desc: 'Tambah produk & harga jual di menu Produk', icon: Package },
                  { step: 'Venue', desc: 'Daftarkan venue (toko/booth) yang akan menjual', icon: Building2 },
                  { step: 'Stok', desc: 'Kirim stok awal ke venue dari gudang', icon: Truck },
                  { step: 'Penjualan', desc: 'Venue input penjualan harian → data masuk otomatis', icon: ShoppingCart },
                  { step: 'Invoice', desc: 'Buat invoice tagihan ke venue per periode', icon: FileText },
                  { step: 'Pembayaran', desc: 'Catat pembayaran dari venue', icon: CreditCard },
                  { step: 'Retur', desc: 'Proses retur produk jika ada', icon: RotateCcw },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[hsl(var(--secondary))]/50">
                    <div className="w-7 h-7 rounded-md bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                      <item.icon className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[hsl(var(--foreground))]">{item.step}</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))] ml-2">— {item.desc}</span>
                    </div>
                    {i < 6 && <ArrowRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </GuideSection>

            {/* Manajemen Produk */}
            <GuideSection
              icon={Package}
              title="Manajemen Produk"
              color="#8b5cf6"
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Mengelola daftar produk Zaneva yang akan dijual di venue.
              </p>
              <Steps>
                <Step num={1} title="Tambah Produk" desc="Buka menu Produk → klik 'Tambah Produk'. Isi nama, SKU (kode unik), dan harga jual." />
                <Step num={2} title="Edit Produk" desc="Klik ikon edit pada baris produk untuk mengubah harga atau nama." />
                <Step num={3} title="Nonaktifkan" desc="Produk yang sudah tidak dijual bisa dinonaktifkan tanpa menghapus data historis." />
              </Steps>
              <TipBox type="warning">
                Jangan hapus produk yang sudah punya riwayat penjualan. Nonaktifkan saja agar data tetap utuh.
              </TipBox>
            </GuideSection>

            {/* Manajemen Venue */}
            <GuideSection
              icon={Building2}
              title="Manajemen Venue"
              color="#f97316"
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Menambah dan mengelola venue (toko/booth) tempat produk Zaneva dijual.
              </p>
              <Steps>
                <Step num={1} title="Tambah Venue" desc="Buka menu Venue → 'Tambah Venue'. Isi nama, lokasi, dan kontak PIC." />
                <Step num={2} title="Buat Akun Venue" desc="Setiap venue punya akun login sendiri agar bisa input penjualan mandiri." />
                <Step num={3} title="Monitor Aktivitas" desc="Gunakan Scorecard untuk melihat performa penjualan setiap venue." />
              </Steps>
            </GuideSection>

            {/* Manajemen Stok */}
            <GuideSection
              icon={Truck}
              title="Distribusi & Stok"
              color="#06b6d4"
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Mengelola distribusi stok dari gudang ke venue-venue.
              </p>
              <Steps>
                <Step num={1} title="Drop Awal" desc="Kirim stok pertama kali ke venue baru. Pilih venue → tambahkan produk & qty → submit." />
                <Step num={2} title="Restock" desc="Isi ulang stok venue yang sudah berjalan. Sistem akan menambah qty yang ada." />
                <Step num={3} title="Penarikan" desc="Tarik stok dari venue (misal produk tidak laku). Sistem mengurangi saldo stok venue dan mencatatnya sebagai movement penarikan." />
                <Step num={4} title="Bulk Assign" desc="Untuk distribusi ke banyak venue sekaligas, gunakan tombol 'Bulk Assign'." />
              </Steps>
              <TipBox type="info">
                Stok real-time dihitung dari drop/restock dikurangi penarikan, penjualan, dan retur.
              </TipBox>
            </GuideSection>

            {/* Invoice & Pembayaran */}
            <GuideSection
              icon={FileText}
              title="Invoice & Pembayaran"
              color="#ec4899"
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Membuat tagihan dan mencatat pembayaran dari venue.
              </p>
              <Steps>
                <Step num={1} title="Buat Invoice" desc="Buka menu Invoice → 'Buat Invoice'. Pilih venue dan periode. Sistem memberi nomor invoice otomatis dan menolak periode yang sudah pernah ditagih." />
                <Step num={2} title="Kirim ke Venue" desc="Export invoice ke PDF dan kirim ke venue via WhatsApp/email." />
                <Step num={3} title="Catat Pembayaran" desc="Saat venue bayar, buka menu Pembayaran → catat jumlah dan metode bayar." />
                <Step num={4} title="Verifikasi" desc="Invoice otomatis berubah status menjadi lunas saat total pembayaran sudah sama dengan total tagihan." />
              </Steps>
              <TipBox type="tip">
                Invoice yang jatuh tempo akan muncul sebagai notifikasi di bell icon.
              </TipBox>
            </GuideSection>

            {/* Retur (Admin) */}
            <GuideSection
              icon={RotateCcw}
              title="Proses Retur"
              color="#f59e0b"
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Memverifikasi dan memproses retur dari venue.
              </p>
              <Steps>
                <Step num={1} title="Terima Pengajuan" desc="Venue mengajukan retur dari aplikasi mereka. Cek di menu Retur." />
                <Step num={2} title="Verifikasi" desc="Periksa kondisi produk. Setujui atau tolak retur." />
                <Step num={3} title="Stok Otomatis" desc="Retur hanya bisa dicatat jika stok venue cukup, lalu otomatis mengurangi saldo stok venue." />
              </Steps>
            </GuideSection>

            {/* Audit Trail */}
            <GuideSection
              icon={ClipboardList}
              title="Audit Trail"
              color="#64748b"
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Melacak semua perubahan data di sistem.
              </p>
              <Steps>
                <Step num={1} title="Buka Audit Trail" desc="Menu ini mencatat siapa, kapan, dan apa yang diubah." />
                <Step num={2} title="Filter & Cari" desc="Filter berdasarkan jenis aksi (create, update, delete) atau user." />
                <Step num={3} title="Lihat Diff" desc="Klik baris untuk melihat perbandingan data sebelum dan sesudah perubahan." />
              </Steps>
              <TipBox type="info">
                Audit trail tidak bisa dihapus — semua perubahan tercatat permanen.
              </TipBox>
            </GuideSection>

            {/* Export & Laporan */}
            <GuideSection
              icon={FileText}
              title="Export Data & Laporan"
              color="#10b981"
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                Export data ke PDF dan Excel dari berbagai halaman.
              </p>
              <Steps>
                <Step num={1} title="Export PDF" desc="Klik tombol 'Export PDF' di halaman Invoice/Sales/PDF. File otomatis terdownload dengan header Zaneva." />
                <Step num={2} title="Export Excel" desc="Klik 'Export Excel' untuk mendapat file .xlsx yang bisa dibuka di spreadsheet." />
                <Step num={3} title="Bulk Upload" desc="Upload data penjualan via CSV di halaman Penjualan. Download template, isi data, upload." />
              </Steps>
            </GuideSection>

            {/* Search & Notifikasi */}
            <GuideSection
              icon={HelpCircle}
              title="Tips & Shortcut"
              color="#64748b"
            >
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[hsl(var(--secondary))]/50">
                  <kbd className="px-2 py-0.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-xs font-mono text-[hsl(var(--foreground))]">⌘K</kbd>
                  <span className="text-sm text-[hsl(var(--foreground))]">Buka Global Search — cari venue, produk, invoice, transaksi</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[hsl(var(--secondary))]/50">
                  <kbd className="px-2 py-0.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-xs font-mono text-[hsl(var(--foreground))]">🔔</kbd>
                  <span className="text-sm text-[hsl(var(--foreground))]">Bell icon — cek notifikasi tagihan jatuh tempo & stok rendah</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[hsl(var(--secondary))]/50">
                  <kbd className="px-2 py-0.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-xs font-mono text-[hsl(var(--foreground))]">☀️/🌙</kbd>
                  <span className="text-sm text-[hsl(var(--foreground))]">Toggle dark/light mode di sidebar atau header</span>
                </div>
              </div>
            </GuideSection>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 border-t border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-text))]">
            ZKM — Zaneva Konsinyasi Manager · Butuh bantuan? Hubungi admin.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
