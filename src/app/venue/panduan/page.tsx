'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  BookOpen, ShoppingCart, RotateCcw, ClipboardList,
  ChevronDown, ChevronRight, CheckCircle2, Info,
} from 'lucide-react';
import { useState } from 'react';

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

function TipBox({ type, children }: { type: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', icon: Info, color: 'text-blue-500' },
    warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: Info, color: 'text-amber-500' },
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

export default function VenuePanduanPage() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-[hsl(var(--border))] pb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-[hsl(var(--header-text))]">
                Panduan Venue
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Cara menggunakan aplikasi ZKM untuk mencatat penjualan dan mengelola produk
              </p>
            </div>
          </div>
        </div>

        {/* Input Penjualan */}
        <GuideSection icon={ClipboardList} title="Input Penjualan Harian" color="#10b981" defaultOpen={true}>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
            Catat penjualan produk Zaneva setiap hari agar data akurat.
          </p>
          <Steps>
            <Step num={1} title="Buka menu Input Penjualan" desc="Klik menu 'Input Penjualan' di sidebar kiri." />
            <Step num={2} title="Pilih Produk & Masukkan Qty" desc="Pilih produk dari dropdown, masukkan jumlah yang terjual. Ulangi untuk setiap produk." />
            <Step num={3} title="Isi Tanggal" desc="Tanggal default hari ini. Ubah jika mencatat penjualan kemarin." />
            <Step num={4} title="Klik Simpan" desc="Data akan langsung tercatat dan masuk ke rekap penjualan Anda." />
          </Steps>
          <TipBox type="tip">
            Catat penjualan setiap hari di waktu yang sama (misal sebelum tutup toko) agar tidak lupa.
          </TipBox>
        </GuideSection>

        {/* POS (Point of Sale) */}
        <GuideSection icon={ShoppingCart} title="POS — Jual Langsung ke Customer" color="#f59e0b">
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
            Interface kasir untuk jual produk langsung. Lebih cepat dari input manual — pilih produk, bayar, selesai. Stok otomatis berkurang.
          </p>
          <Steps>
            <Step num={1} title="Buka menu POS" desc="Klik menu 'POS' di sidebar. Tampilan pecah dua: katalog produk (kiri) dan keranjang (kanan)." />
            <Step num={2} title="Pilih Produk" desc="Klik produk di katalog untuk menambahkan ke keranjang. Gunakan search atau filter kategori untuk cari cepat." />
            <Step num={3} title="Atur Qty & Diskon" desc="Ubah jumlah (qty) dengan tombol +/-. Bisa kasih diskon per item atau diskon total." />
            <Step num={4} title="Isi Data Customer (Opsional)" desc="Masukkan nama dan nomor HP customer jika ingin dicatat." />
            <Step num={5} title="Pilih Pembayaran" desc="Klik 'Bayar' → pilih metode (Tunai/QRIS/Transfer/EDC). Bisa split payment beberapa metode sekaligus." />
            <Step num={6} title="Selesai!" desc="Setelah bayar, muncul struk. Bisa langsung print atau share. Klik 'Transaksi Baru' untuk mulai lagi." />
          </Steps>
          <TipBox type="info">
            Harga yang tampil di POS sudah sesuai harga per venue (bukan harga default). Stok otomatis berkurang setiap transaksi.
          </TipBox>
          <TipBox type="warning">
            Pastikan stok mencukupi sebelum transaksi. Jika stok habis, produk tidak bisa dijual.
          </TipBox>
        </GuideSection>

        {/* Retur Produk */}
        <GuideSection icon={RotateCcw} title="Retur Produk" color="#f59e0b">
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
            Ajukan retur untuk produk yang rusak, kadaluarsa, atau tidak laku.
          </p>
          <Steps>
            <Step num={1} title="Buka menu Retur" desc="Klik 'Retur' di sidebar." />
            <Step num={2} title="Pilih Produk & Alasan" desc="Pilih produk, masukkan jumlah dan alasan retur (rusak / kadaluarsa / tidak laku)." />
            <Step num={3} title="Ajukan Retur" desc="Klik 'Ajukan Retur'. Tim akan memverifikasi dan memproses." />
          </Steps>
          <TipBox type="info">
            Retur yang disetujui otomatis mengurangi stok di venue Anda. Stok akan dikembalikan ke gudang.
          </TipBox>
        </GuideSection>

        {/* Riwayat */}
        <GuideSection icon={ClipboardList} title="Riwayat & Laporan" color="#6366f1">
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
            Lihat semua riwayat penjualan, retur, dan stok di venue Anda.
          </p>
          <Steps>
            <Step num={1} title="Buka menu Riwayat" desc="Tersedia 3 tab: Stok, Penjualan, dan Invoice." />
            <Step num={2} title="Filter & Cari" desc="Gunakan filter tanggal atau tab untuk menemukan data yang Anda cari." />
            <Step num={3} title="Lihat Detail" desc="Klik baris untuk melihat detail transaksi." />
          </Steps>
        </GuideSection>

        {/* FAQ */}
        <GuideSection icon={BookOpen} title="Pertanyaan Umum (FAQ)" color="#8b5cf6">
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                ❓ POS dan Input Penjualan, bedanya apa?
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 ml-9">
                <strong>POS</strong> = jual langsung ke customer dengan keranjang + bayar. Stok otomatis berkurang. Cocok untuk toko fisik.<br />
                <strong>Input Penjualan</strong> = catat manual qty terjual. Cocok untuk laporan harian tanpa alur kasir.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                ❓ Lupa input penjualan kemarin, bisa diisi?
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 ml-9">
                Bisa. Saat input, ganti tanggal ke kemarin lalu simpan seperti biasa.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                ❓ Ada kesalahan input, bagaimana cara mengubah?
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 ml-9">
                Hubungi admin untuk koreksi data. Venue tidak bisa mengedit data yang sudah tersimpan.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                ❓ Stok di aplikasi tidak sesuai dengan fisik?
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 ml-9">
                Segera hubungi admin. Kemungkinan ada retur yang belum tercatat atau kesalahan input qty.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                ❓ Bagaimana cara melihat invoice tagihan?
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 ml-9">
                Buka menu Riwayat → tab Invoice. Di sana terlihat semua tagihan beserta statusnya.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                ❓ Produk yang saya jual di POS beda harga, kenapa?
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 ml-9">
                Harga bisa disesuaikan per venue oleh admin. Hubungi admin jika ada harga yang salah.
              </p>
            </div>
          </div>
        </GuideSection>

        {/* Footer */}
        <div className="text-center py-6 border-t border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-text))]">
            Butuh bantuan? Hubungi admin Zaneva.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
