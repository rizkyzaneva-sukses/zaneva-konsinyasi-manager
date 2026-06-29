'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Database, Loader2, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type TrialSummary = {
  venues: number;
  venueUsers: number;
  products: number;
  stockMovements: number;
  sales: number;
  returns: number;
  invoices: number;
  payments: number;
};

const emptySummary: TrialSummary = {
  venues: 0,
  venueUsers: 0,
  products: 0,
  stockMovements: 0,
  sales: 0,
  returns: 0,
  invoices: 0,
  payments: 0,
};

function SummaryGrid({ summary }: { summary: TrialSummary }) {
  const items = [
    ['Venue', summary.venues],
    ['Akun Venue', summary.venueUsers],
    ['Produk', summary.products],
    ['Stok', summary.stockMovements],
    ['Penjualan', summary.sales],
    ['Retur', summary.returns],
    ['Invoice', summary.invoices],
    ['Payment', summary.payments],
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/40 p-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
          <p className="text-xl font-bold text-[hsl(var(--foreground))]">{value}</p>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState<'seed' | 'reset' | null>(null);
  const [confirm, setConfirm] = useState('');
  const [summary, setSummary] = useState<TrialSummary>(emptySummary);

  const runTrialAction = async (action: 'seed' | 'reset') => {
    if (action === 'reset' && confirm !== 'RESET DATA') {
      toast.error('Ketik RESET DATA untuk konfirmasi reset');
      return;
    }

    setLoading(action);
    try {
      const res = await fetch('/api/admin/trial-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, confirm }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Aksi gagal');
      }
      setSummary(data.data || emptySummary);
      toast.success(data.message || 'Aksi berhasil');
      if (action === 'reset') setConfirm('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))] flex items-center gap-2">
            <Database className="w-5 h-5 text-[hsl(var(--primary))]" />
            Settings Owner
          </h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Tools khusus Owner/Admin untuk trial, demo, dan reset data operasional.
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[hsl(var(--foreground))]">
            <p className="font-semibold">Reset data tidak menghapus akun Owner/Admin dan Staff.</p>
            <p className="text-[hsl(var(--muted-foreground))] mt-1">
              Yang dihapus: venue, akun venue, produk, stok, penjualan, retur, invoice, payment, dan audit operasional.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h4 className="font-semibold text-[hsl(var(--foreground))]">Suntik Data Dummy</h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  Mengisi data contoh Zaneva: produk muslimah sportswear, venue partner, stok, penjualan, retur, invoice, dan payment.
                </p>
              </div>
            </div>
            <button
              onClick={() => runTrialAction('seed')}
              disabled={loading !== null}
              className="btn-primary flex items-center gap-2"
            >
              {loading === 'seed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Suntik Dummy Data
            </button>
          </div>

          <div className="card space-y-4 border-red-500/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h4 className="font-semibold text-[hsl(var(--foreground))]">Reset Data Trial</h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  Mengosongkan semua data operasional setelah trial selesai. Ketik konfirmasi dulu sebelum menjalankan.
                </p>
              </div>
            </div>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-field"
              placeholder="Ketik: RESET DATA"
            />
            <button
              onClick={() => runTrialAction('reset')}
              disabled={loading !== null || confirm !== 'RESET DATA'}
              className="btn-secondary flex items-center gap-2 border-red-500/40 text-red-500 disabled:opacity-50"
            >
              {loading === 'reset' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Reset Data Trial
            </button>
          </div>
        </div>

        <div className="card space-y-3">
          <div>
            <h4 className="font-semibold text-[hsl(var(--foreground))]">Ringkasan Aksi Terakhir</h4>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Jumlah data yang dibuat atau kondisi kosong setelah reset.</p>
          </div>
          <SummaryGrid summary={summary} />
        </div>
      </div>
    </DashboardLayout>
  );
}
