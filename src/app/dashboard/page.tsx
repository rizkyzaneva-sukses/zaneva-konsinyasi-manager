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
            <div key={i} className="card h-24 bg-navy-800" />
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Building2 className="w-6 h-6 text-accent" />}
              label="Venue Aktif"
              value={stats.totalVenueAktif.toString()}
            />
            <StatCard
              icon={<Package className="w-6 h-6 text-blue-400" />}
              label="Total Produk"
              value={stats.totalProduk.toString()}
            />
            <StatCard
              icon={<ShoppingCart className="w-6 h-6 text-purple-400" />}
              label="Penjualan Bulan Ini"
              value={`${stats.totalPenjualanBulanIni} unit`}
            />
            <StatCard
              icon={<FileText className="w-6 h-6 text-yellow-400" />}
              label="Tagihan Belum Dibayar"
              value={formatRupiah(stats.totalTagihanBelumBayar)}
            />
          </div>

          {stats.invoiceTelat > 0 && (
            <div className="card border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-medium">
                  {stats.invoiceTelat} invoice melewati jatuh tempo
                </span>
              </div>
            </div>
          )}

          {stats.stokRendah.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">⚠️ Stok Rendah</h3>
              <div className="space-y-2">
                {stats.stokRendah.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-navy-700 last:border-0"
                  >
                    <div>
                      <span className="text-white font-medium">{item.venueNama}</span>
                      <span className="text-navy-400 mx-2">·</span>
                      <span className="text-navy-300">{item.produkNama}</span>
                    </div>
                    <span className={`badge ${item.sisaStok <= 0 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-navy-700 rounded-lg">{icon}</div>
        <div>
          <p className="text-sm text-navy-400">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
