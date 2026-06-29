'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatDate } from '@/lib/utils';
import {
  RotateCcw,
  Info,
  RefreshCw,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReturnRecord {
  id: string;
  tanggal: string;
  produk: { nama: string };
  qty: number;
  kondisi: string;
  alasan: string;
}

export default function VenueReturnsPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/returns');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat data retur');
      setReturns(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Retur Produk</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Daftar retur produk yang tercatat</p>
        </div>

        {/* Info Banner */}
        <div className="card border-l-4 border-blue-500 bg-blue-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-500">
                Pengajuan Retur
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                Venue tidak dapat mengajukan retur langsung melalui sistem. Untuk mengajukan retur
                produk, silakan hubungi admin melalui kontak yang tersedia.
              </p>
            </div>
          </div>
        </div>

        {/* Returns Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Riwayat Retur</h2>
            </div>
            <button
              onClick={fetchReturns}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-[hsl(var(--secondary))] rounded animate-pulse" />
              ))}
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Belum ada data retur</p>
              <p className="text-sm mt-1">Retur akan muncul di sini setelah diproses oleh admin</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--table-border))]">
                    <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Tanggal</th>
                    <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Produk</th>
                    <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">Qty</th>
                    <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Kondisi</th>
                    <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((ret) => (
                    <tr
                      key={ret.id}
                      className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--table-row-hover))] transition-colors"
                    >
                      <td className="py-3 px-3 text-[hsl(var(--muted-foreground))]">{formatDate(ret.tanggal)}</td>
                      <td className="py-3 px-3 font-medium text-[hsl(var(--foreground))]">
                        {ret.produk.nama}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-[hsl(var(--foreground))]">
                        {ret.qty}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]">
                          {ret.kondisi || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[hsl(var(--muted-foreground))] max-w-xs truncate">
                        {ret.alasan || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
