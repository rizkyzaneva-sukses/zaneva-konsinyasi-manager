'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah } from '@/lib/utils';
import { Building2, Package, ShoppingCart, AlertTriangle, FileText } from 'lucide-react';
import type { DashboardStats } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-24" />
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Building2 className="w-6 h-6 text-[hsl(var(--primary))]" />}
              label="Venue Aktif"
              value={stats.totalVenueAktif.toString()}
              iconBg="bg-[hsl(var(--primary))]/10"
            />
            <StatCard
              icon={<Package className="w-6 h-6 text-blue-500" />}
              label="Total Produk"
              value={stats.totalProduk.toString()}
              iconBg="bg-blue-500/10"
            />
            <StatCard
              icon={<ShoppingCart className="w-6 h-6 text-purple-500" />}
              label="Penjualan Bulan Ini"
              value={`${stats.totalPenjualanBulanIni} unit`}
              iconBg="bg-purple-500/10"
            />
            <StatCard
              icon={<FileText className="w-6 h-6 text-amber-500" />}
              label="Tagihan Belum Dibayar"
              value={formatRupiah(stats.totalTagihanBelumBayar)}
              iconBg="bg-amber-500/10"
            />
          </div>

          {stats.invoiceTelat > 0 && (
            <div className="card border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {stats.invoiceTelat} invoice melewati jatuh tempo
                </span>
              </div>
            </div>
          )}

          {stats.stokRendah.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))] mb-4">Stok Rendah</h3>
              <div className="space-y-2">
                {stats.stokRendah.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))] last:border-0"
                  >
                    <div>
                      <span className="text-[hsl(var(--foreground))] font-medium">{item.venueNama}</span>
                      <span className="text-[hsl(var(--muted-foreground))] mx-2">·</span>
                      <span className="text-[hsl(var(--muted-foreground))]">{item.produkNama}</span>
                    </div>
                    <span className={`badge ${item.sisaStok <= 0 ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                      Sisa: {item.sisaStok}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, iconBg }: { icon: React.ReactNode; label: string; value: string; iconBg: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${iconBg}`}>{icon}</div>
        <div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{value}</p>
        </div>
      </div>
    </div>
  );
}
