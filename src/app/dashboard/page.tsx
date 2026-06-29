'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah } from '@/lib/utils';
import {
  Building2,
  ShoppingCart,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  DollarSign,
  Receipt,
  BarChart3,
  Plus,
  Warehouse,
  CreditCard,
  RotateCcw,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardStats } from '@/types';

// TODO: Replace with real API data
const revenueTrendData = [
  { month: 'Jan', revenue: 42000000, sales: 38 },
  { month: 'Feb', revenue: 48000000, sales: 42 },
  { month: 'Mar', revenue: 45000000, sales: 39 },
  { month: 'Apr', revenue: 52000000, sales: 47 },
  { month: 'Mei', revenue: 58000000, sales: 51 },
  { month: 'Jun', revenue: 63000000, sales: 55 },
];

// TODO: Replace with real API data
const recentActivities = [
  { id: 1, type: 'sale' as const, description: 'Penjualan ke Kafe Nusantara', amount: 2850000, time: '2 jam lalu' },
  { id: 2, type: 'payment' as const, description: 'Pembayaran invoice #INV-0042', amount: 5200000, time: '4 jam lalu' },
  { id: 3, type: 'sale' as const, description: 'Penjualan ke Warung Kopi Senja', amount: 1750000, time: '6 jam lalu' },
  { id: 4, type: 'return' as const, description: 'Retur dari Toko Berkah', amount: -450000, time: '1 hari lalu' },
  { id: 5, type: 'payment' as const, description: 'Pembayaran invoice #INV-0041', amount: 3800000, time: '1 hari lalu' },
  { id: 6, type: 'sale' as const, description: 'Penjualan ke Minimarket Jaya', amount: 4100000, time: '2 hari lalu' },
  { id: 7, type: 'return' as const, description: 'Retur dari Depot Segar', amount: -320000, time: '2 hari lalu' },
];

const quickActions = [
  { label: 'Input Penjualan', icon: ShoppingCart, href: '/dashboard/sales', color: 'text-emerald-500 bg-emerald-500/10' },
  { label: 'Buat Invoice', icon: Receipt, href: '/dashboard/invoices', color: 'text-blue-500 bg-blue-500/10' },
  { label: 'Cek Stok', icon: Warehouse, href: '/dashboard/stock', color: 'text-purple-500 bg-purple-500/10' },
  { label: 'Tambah Venue', icon: Plus, href: '/dashboard/venues', color: 'text-amber-500 bg-amber-500/10' },
];

function getActivityIcon(type: string) {
  switch (type) {
    case 'sale':
      return <ShoppingCart className="w-4 h-4 text-emerald-500" />;
    case 'payment':
      return <CreditCard className="w-4 h-4 text-blue-500" />;
    case 'return':
      return <RotateCcw className="w-4 h-4 text-red-500" />;
    default:
      return <FileText className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />;
  }
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="card border border-[hsl(var(--border))] shadow-lg px-3 py-2">
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-mono text-[hsl(var(--muted-foreground))]">
            {entry.name === 'revenue' ? formatRupiah(entry.value) : `${entry.value} unit`}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

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
        <div className="space-y-6">
          {/* KPI Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card h-28 animate-pulse" />
            ))}
          </div>
          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card h-72 animate-pulse" />
            <div className="card h-72 animate-pulse" />
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* ─── KPI Cards ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary KPI — Revenue */}
            <div className="card relative overflow-hidden border-l-4 border-l-[hsl(var(--primary))]">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))]/5 to-transparent pointer-events-none" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Pendapatan Bulan Ini</p>
                  <p className="text-2xl font-bold font-mono text-[hsl(var(--foreground))]">
                    {/* TODO: Replace with real API data */}
                    {formatRupiah(63000000)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">+8.6%</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">vs bulan lalu</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[hsl(var(--primary))]/10">
                  <DollarSign className="w-6 h-6 text-[hsl(var(--primary))]" />
                </div>
              </div>
            </div>

            {/* Sales Count */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Penjualan Bulan Ini</p>
                  <p className="text-2xl font-bold font-mono text-[hsl(var(--foreground))]">
                    {stats.totalPenjualanBulanIni} unit
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">+12 unit</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">vs bulan lalu</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <ShoppingCart className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Average per Venue */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Rata-rata per Venue</p>
                  <p className="text-2xl font-bold font-mono text-[hsl(var(--foreground))]">
                    {/* TODO: Replace with real API data */}
                    {formatRupiah(stats.totalVenueAktif > 0 ? Math.round(63000000 / stats.totalVenueAktif) : 0)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">{stats.totalVenueAktif} venue aktif</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Outstanding Payments */}
            <div className="card border-l-4 border-l-amber-500">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Tagihan Belum Dibayar</p>
                  <p className="text-2xl font-bold font-mono text-[hsl(var(--foreground))]">
                    {formatRupiah(stats.totalTagihanBelumBayar)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {stats.invoiceTelat > 0 ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          {stats.invoiceTelat} invoice telat
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Semua lancar</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <FileText className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Quick Actions ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="card group flex items-center gap-3 hover:border-[hsl(var(--primary))]/30 transition-all hover:shadow-md"
              >
                <div className={`p-2.5 rounded-lg ${action.color} transition-transform group-hover:scale-110`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>

          {/* ─── Charts ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Trend — Line Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))] mb-1">
                Tren Pendapatan
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">6 bulan terakhir</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(152, 60%, 42%)"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: 'hsl(152, 60%, 42%)', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: 'hsl(152, 60%, 42%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sales Count — Bar Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))] mb-1">
                Jumlah Penjualan
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Unit terjual per bulan</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueTrendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="sales"
                      fill="hsl(152, 60%, 42%)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ─── Bottom Row: Alerts + Activity ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Alerts & Low Stock */}
            <div className="space-y-4">
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">Stok Rendah</h3>
                    <Link href="/dashboard/stock" className="text-sm text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                      Lihat semua <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
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
                        <span
                          className={`badge ${
                            item.sisaStok <= 0
                              ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          Sisa: {item.sisaStok}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Recent Activity */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">Aktivitas Terbaru</h3>
                <Link href="/dashboard/sales" className="text-sm text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                  Lihat semua <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-1">
                {recentActivities.slice(0, 6).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 py-2.5 border-b border-[hsl(var(--border))] last:border-0"
                  >
                    <div className="p-2 rounded-lg bg-[hsl(var(--muted))]/50">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[hsl(var(--foreground))] truncate">{activity.description}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {activity.time}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-mono font-medium whitespace-nowrap ${
                        activity.amount < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {activity.amount < 0 ? '-' : '+'}{formatRupiah(Math.abs(activity.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
