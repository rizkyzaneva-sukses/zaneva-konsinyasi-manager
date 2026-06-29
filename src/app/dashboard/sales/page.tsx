'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatDate } from '@/lib/utils';
import { ChevronLeft, ChevronRight, FileText, Loader2, X, CalendarDays, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface Sale {
  id: string;
  qtyTerjual: number;
  qtyRetur: number;
  tanggal: string;
  keterangan: string;
  produk: { nama: string; sku: string };
  venue: { nama: string };
  user: { nama: string };
}

interface Venue {
  id: string;
  nama: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function SalesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sales, setSales] = useState<Sale[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Filter state from URL params
  const [selectedVenue, setSelectedVenue] = useState(searchParams.get('venueId') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');

  // Update URL params when filters change
  const updateUrlParams = useCallback(
    (venue: string, from: string, to: string, status: string) => {
      const params = new URLSearchParams();
      if (venue) params.set('venueId', venue);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (status) params.set('status', status);
      const qs = params.toString();
      router.push(`/dashboard/sales${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    fetch('/api/venues')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setVenues(d.data);
      })
      .catch(() => toast.error('Gagal memuat data venue'));
  }, []);

  const fetchSales = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedVenue) params.set('venueId', selectedVenue);
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
        if (filterStatus) params.set('status', filterStatus);
        params.set('page', page.toString());
        params.set('limit', '50');

        const res = await fetch(`/api/sales?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setSales(data.data);
          if (data.pagination) {
            setPagination(data.pagination);
          } else {
            setPagination((prev) => ({
              ...prev,
              page: 1,
              total: data.data.length,
              totalPages: 1,
            }));
          }
        } else {
          toast.error(data.error || 'Gagal memuat data penjualan');
        }
      } catch {
        toast.error('Terjadi kesalahan koneksi');
      } finally {
        setLoading(false);
      }
    },
    [selectedVenue, dateFrom, dateTo, filterStatus]
  );

  useEffect(() => {
    fetchSales(1);
    updateUrlParams(selectedVenue, dateFrom, dateTo, filterStatus);
  }, [fetchSales, selectedVenue, dateFrom, dateTo, filterStatus, updateUrlParams]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchSales(newPage);
    }
  };

  const clearFilter = (filter: string) => {
    switch (filter) {
      case 'venue':
        setSelectedVenue('');
        break;
      case 'from':
        setDateFrom('');
        break;
      case 'to':
        setDateTo('');
        break;
      case 'status':
        setFilterStatus('');
        break;
    }
  };

  const clearAllFilters = () => {
    setSelectedVenue('');
    setDateFrom('');
    setDateTo('');
    setFilterStatus('');
  };

  const hasActiveFilters = selectedVenue || dateFrom || dateTo || filterStatus;

  const activeFilters = [
    selectedVenue && {
      key: 'venue',
      label: `Venue: ${venues.find((v) => v.id === selectedVenue)?.nama || selectedVenue}`,
    },
    dateFrom && { key: 'from', label: `Dari: ${formatDate(dateFrom)}` },
    dateTo && { key: 'to', label: `Sampai: ${formatDate(dateTo)}` },
    filterStatus && { key: 'status', label: `Status: ${filterStatus}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const getPageNumbers = (): (number | '...')[] => {
    const { page, totalPages } = pagination;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [1];

    if (page > 3) pages.push('...');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 2) pages.push('...');

    pages.push(totalPages);
    return pages;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">Laporan Penjualan</h3>
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
            <FileText className="w-4 h-4" />
            <span>{pagination.total} total transaksi</span>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">Filter</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Date from */}
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                Dari Tanggal
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>

            {/* Venue filter */}
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Venue</label>
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="input-field w-full text-sm"
              >
                <option value="">Semua Venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field w-full text-sm"
              >
                <option value="">Semua Status</option>
                <option value="DROP_AWAL">Drop Awal</option>
                <option value="RESTOCK">Restock</option>
                <option value="PENARIKAN">Penarikan</option>
              </select>
            </div>
          </div>

          {/* Active filters chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[hsl(var(--border))]">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Filter aktif:</span>
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20"
                >
                  {f.label}
                  <button
                    onClick={() => clearFilter(f.key)}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-[hsl(var(--primary))]/20 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={clearAllFilters}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline ml-1"
              >
                Hapus semua
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
          </div>
        ) : (
          <>
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))]">
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">Tanggal</th>
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">Venue</th>
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">Produk</th>
                      <th className="text-right py-3 px-4 text-[hsl(var(--table-header))] font-medium">Qty Terjual</th>
                      <th className="text-right py-3 px-4 text-[hsl(var(--table-header))] font-medium">Qty Retur</th>
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">Input Oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-[hsl(var(--muted-foreground))]">
                          {hasActiveFilters
                            ? 'Tidak ada data sesuai filter'
                            : 'Belum ada data penjualan'}
                        </td>
                      </tr>
                    ) : (
                      sales.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-[hsl(var(--table-border))] hover:bg-[hsl(var(--table-row-hover))] transition-colors"
                        >
                          <td className="py-3 px-4 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                            {formatDate(s.tanggal)}
                          </td>
                          <td className="py-3 px-4 text-[hsl(var(--foreground))]">{s.venue.nama}</td>
                          <td className="py-3 px-4">
                            <div className="text-[hsl(var(--foreground))] font-medium">{s.produk.nama}</div>
                            <div className="text-xs text-[hsl(var(--muted-text))] font-mono">{s.produk.sku}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-green-600 dark:text-green-400 font-medium">{s.qtyTerjual}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {s.qtyRetur > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">{s.qtyRetur}</span>
                            ) : (
                              <span className="text-[hsl(var(--muted-text))]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">{s.user.nama}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Halaman {pagination.page} dari {pagination.totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 hover:bg-[hsl(var(--surface-hover))] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  </button>

                  {getPageNumbers().map((pageNum, idx) =>
                    pageNum === '...' ? (
                      <span key={`dots-${idx}`} className="px-2 text-[hsl(var(--muted-text))]">
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum as number)}
                        className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                          pageNum === pagination.page
                            ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                            : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-hover))]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 hover:bg-[hsl(var(--surface-hover))] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div></div>}>
      <SalesPageContent />
    </Suspense>
  );
}
