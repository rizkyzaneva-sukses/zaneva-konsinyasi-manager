'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah } from '@/lib/utils';
import {
  Trophy,
  TrendingUp,
  ShoppingCart,
  Package,
  Star,
  ThumbsUp,
  AlertTriangle,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';

interface VenueScore {
  id: string;
  nama: string;
  alamat: string;
  totalRevenue: number;
  salesCount: number;
  avgSaleValue: number;
  topProduct: string;
  topProductQty: number;
  performance: 'excellent' | 'good' | 'attention';
  weeklyRevenue: number[];
}

function getPerformanceBadge(performance: VenueScore['performance']) {
  switch (performance) {
    case 'excellent':
      return {
        label: 'Excellent',
        icon: Star,
        className: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      };
    case 'good':
      return {
        label: 'Good',
        icon: ThumbsUp,
        className: 'text-green-500 bg-green-500/10 border-green-500/20',
      };
    case 'attention':
      return {
        label: 'Needs Attention',
        icon: AlertTriangle,
        className: 'text-red-500 bg-red-500/10 border-red-500/20',
      };
  }
}

function MiniSparkline({ data, color = 'currentColor' }: { data: number[]; color?: string }) {
  if (data.length === 0 || data.every((v) => v === 0)) {
    return (
      <div className="h-8 w-20 flex items-center justify-center">
        <div className="h-px w-full bg-[hsl(var(--border))]" />
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 32;
  const padding = 2;
  const stepX = (width - padding * 2) / (data.length - 1);

  const points = data.map((val, i) => {
    const x = padding + i * stepX;
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
      {/* Last point dot */}
      {points.length > 0 && (
        <circle
          cx={parseFloat(points[points.length - 1].split(',')[0])}
          cy={parseFloat(points[points.length - 1].split(',')[1])}
          r="2"
          fill={color}
        />
      )}
    </svg>
  );
}

export default function VenueScorecardPage() {
  const [venues, setVenues] = useState<VenueScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchScorecard = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch venues
      const venuesRes = await fetch('/api/venues');
      const venuesData = await venuesRes.json();
      if (!venuesData.success) {
        toast.error('Gagal memuat data venue');
        return;
      }

      // Fetch sales with date range
      const salesParams = new URLSearchParams();
      salesParams.set('limit', '1000');
      const salesRes = await fetch(`/api/sales?${salesParams.toString()}`);
      const salesData = await salesRes.json();

      if (!salesData.success) {
        toast.error('Gagal memuat data penjualan');
        return;
      }

      const sales: Array<{
        venueId: string;
        venue: { id: string; nama: string };
        produk: { nama: string };
        qtyTerjual: number;
        tanggal: string;
      }> = salesData.data || [];

      // Filter sales by date range
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);

      const filteredSales = sales.filter((s) => {
        const d = new Date(s.tanggal);
        return d >= fromDate && d <= toDate;
      });

      // Group by venue
      const venueMap = new Map<string, {
        id: string;
        nama: string;
        alamat: string;
        sales: typeof filteredSales;
      }>();

      venuesData.data.forEach((v: { id: string; nama: string; alamat: string }) => {
        venueMap.set(v.id, { id: v.id, nama: v.nama, alamat: v.alamat, sales: [] });
      });

      filteredSales.forEach((s) => {
        const venue = venueMap.get(s.venueId);
        if (venue) {
          venue.sales.push(s);
        }
      });

      // Calculate scores
      const scores: VenueScore[] = [];
      const maxRevenue = Math.max(
        ...Array.from(venueMap.values()).map((v) =>
          v.sales.reduce((sum, s) => sum + s.qtyTerjual, 0)
        ),
        1
      );

      venueMap.forEach((venue) => {
        const salesCount = venue.sales.length;
        const totalQty = venue.sales.reduce((sum, s) => sum + s.qtyTerjual, 0);
        // Estimate revenue using qty (since we don't have harga in sales response)
        // Use a placeholder - the actual calculation would need product prices
        const avgSaleValue = salesCount > 0 ? Math.round(totalQty / salesCount) : 0;

        // Top product
        const productMap = new Map<string, number>();
        venue.sales.forEach((s) => {
          const nama = s.produk?.nama || 'Unknown';
          productMap.set(nama, (productMap.get(nama) || 0) + s.qtyTerjual);
        });

        let topProduct = '-';
        let topProductQty = 0;
        productMap.forEach((qty, nama) => {
          if (qty > topProductQty) {
            topProduct = nama;
            topProductQty = qty;
          }
        });

        // Weekly revenue for sparkline (last 4 weeks of qty)
        const weeklyRevenue = [0, 0, 0, 0];
        const now = new Date();
        venue.sales.forEach((s) => {
          const d = new Date(s.tanggal);
          const weeksAgo = Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
          if (weeksAgo >= 0 && weeksAgo < 4) {
            weeklyRevenue[3 - weeksAgo] += s.qtyTerjual;
          }
        });

        // Performance determination
        let performance: VenueScore['performance'];
        const ratio = totalQty / maxRevenue;
        if (ratio >= 0.5) performance = 'excellent';
        else if (ratio >= 0.2) performance = 'good';
        else performance = 'attention';

        scores.push({
          id: venue.id,
          nama: venue.nama,
          alamat: venue.alamat,
          totalRevenue: totalQty, // Using qty as proxy for revenue
          salesCount,
          avgSaleValue,
          topProduct,
          topProductQty,
          performance,
          weeklyRevenue,
        });
      });

      // Sort by total revenue descending
      scores.sort((a, b) => b.totalRevenue - a.totalRevenue);
      setVenues(scores);
    } catch {
      toast.error('Terjadi kesalahan saat memuat scorecard');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchScorecard();
  }, [fetchScorecard]);

  const totalRevenueAll = venues.reduce((sum, v) => sum + v.totalRevenue, 0);
  const totalSalesAll = venues.reduce((sum, v) => sum + v.salesCount, 0);
  const excellentCount = venues.filter((v) => v.performance === 'excellent').length;
  const attentionCount = venues.filter((v) => v.performance === 'attention').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Venue Scorecard
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              Performa venue berdasarkan periode yang dipilih
            </p>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field py-1.5 px-2 text-xs"
            />
            <span className="text-[hsl(var(--muted-foreground))]">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field py-1.5 px-2 text-xs"
            />
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Total Qty Terjual</p>
            <p className="text-xl font-bold font-mono text-[hsl(var(--primary))]">
              {totalRevenueAll.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Total Transaksi</p>
            <p className="text-xl font-bold font-mono text-[hsl(var(--foreground))]">
              {totalSalesAll.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Excellent</p>
            <p className="text-xl font-bold font-mono text-amber-500">
              {excellentCount}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Needs Attention</p>
            <p className="text-xl font-bold font-mono text-red-500">
              {attentionCount}
            </p>
          </div>
        </div>

        {/* Venue cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
          </div>
        ) : venues.length === 0 ? (
          <div className="card p-12 text-center">
            <Trophy className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-50" />
            <p className="text-[hsl(var(--muted-foreground))]">
              Belum ada data venue atau penjualan
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {venues.map((venue, index) => {
              const badge = getPerformanceBadge(venue.performance);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={venue.id}
                  className="card p-0 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Rank header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/30">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0
                            ? 'bg-amber-500/20 text-amber-500'
                            : index === 1
                            ? 'bg-gray-400/20 text-gray-400'
                            : index === 2
                            ? 'bg-orange-600/20 text-orange-600'
                            : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-semibold text-sm font-display text-[hsl(var(--foreground))]">
                          {venue.nama}
                        </h4>
                        <p className="text-[10px] text-[hsl(var(--muted-text))] truncate max-w-[180px]">
                          {venue.alamat}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${badge.className}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="p-4 space-y-3">
                    {/* Main metric */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Total Qty Terjual
                        </p>
                        <p className="text-lg font-bold font-mono text-[hsl(var(--primary))]">
                          {venue.totalRevenue.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <MiniSparkline
                        data={venue.weeklyRevenue}
                        color={
                          venue.performance === 'excellent'
                            ? '#f59e0b'
                            : venue.performance === 'good'
                            ? '#22c55e'
                            : '#ef4444'
                        }
                      />
                    </div>

                    {/* Secondary stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                        <div>
                          <p className="text-[10px] text-[hsl(var(--muted-text))]">Transaksi</p>
                          <p className="text-sm font-medium font-mono text-[hsl(var(--foreground))]">
                            {venue.salesCount}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                        <div>
                          <p className="text-[10px] text-[hsl(var(--muted-text))]">Rata-rata</p>
                          <p className="text-sm font-medium font-mono text-[hsl(var(--foreground))]">
                            {venue.avgSaleValue}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Top product */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[hsl(var(--border))]">
                      <Package className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[hsl(var(--muted-text))]">Produk Terlaris</p>
                        <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">
                          {venue.topProduct}
                          {venue.topProductQty > 0 && (
                            <span className="text-[hsl(var(--muted-foreground))] font-normal">
                              {' '}
                              ({venue.topProductQty} terjual)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
