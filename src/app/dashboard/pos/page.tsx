'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah, formatDateTime, formatDate } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Loader2,
  X,
  CalendarDays,
  Filter,
  Eye,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';

interface POSOrderItem {
  id: string;
  qty: number;
  harga: number;
  diskon: number;
  subtotal: number;
  produk: { nama: string; sku: string };
}

interface POSOrder {
  id: string;
  orderNo: string;
  tanggal: string;
  customerNama: string;
  customerTelp: string;
  grandTotal: number;
  totalBayar: number;
  kembalian: number;
  status: string;
  metodeBayar: string;
  catatan: string;
  items: POSOrderItem[];
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

function POSOrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<POSOrder | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const [selectedVenue, setSelectedVenue] = useState(searchParams.get('venueId') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');

  const updateUrlParams = useCallback(
    (venue: string, from: string, to: string) => {
      const params = new URLSearchParams();
      if (venue) params.set('venueId', venue);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      router.push(`/dashboard/pos${qs ? `?${qs}` : ''}`, { scroll: false });
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

  const fetchOrders = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedVenue) params.set('venueId', selectedVenue);
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
        params.set('page', page.toString());
        params.set('limit', '50');

        const res = await fetch(`/api/pos/orders?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setOrders(data.data);
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
          toast.error(data.error || 'Gagal memuat data pesanan');
        }
      } catch {
        toast.error('Terjadi kesalahan koneksi');
      } finally {
        setLoading(false);
      }
    },
    [selectedVenue, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchOrders(1);
    updateUrlParams(selectedVenue, dateFrom, dateTo);
  }, [fetchOrders, selectedVenue, dateFrom, dateTo, updateUrlParams]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchOrders(newPage);
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
    }
  };

  const clearAllFilters = () => {
    setSelectedVenue('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = selectedVenue || dateFrom || dateTo;

  const activeFilters = [
    selectedVenue && {
      key: 'venue',
      label: `Venue: ${venues.find((v) => v.id === selectedVenue)?.nama || selectedVenue}`,
    },
    dateFrom && { key: 'from', label: `Dari: ${formatDate(dateFrom)}` },
    dateTo && { key: 'to', label: `Sampai: ${formatDate(dateTo)}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-green-600 dark:text-green-400 bg-green-500/10';
      case 'PENDING':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10';
      case 'CANCELLED':
        return 'text-red-600 dark:text-red-400 bg-red-500/10';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-500/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Dibayar';
      case 'PENDING':
        return 'Pending';
      case 'CANCELLED':
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  const getMetodeBayarLabel = (metode: string) => {
    switch (metode) {
      case 'CASH':
        return 'Tunai';
      case 'QRIS':
        return 'QRIS';
      case 'TRANSFER':
        return 'Transfer';
      case 'EDC':
        return 'EDC';
      default:
        return metode;
    }
  };

  const getPageNumbers = (): (number | '...')[] => {
    const { page, totalPages } = pagination;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status === 'PAID' ? o.grandTotal : 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">
            Pesanan POS
          </h3>
          <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4" />
              <span>{pagination.total} pesanan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              <span className="font-medium text-[hsl(var(--primary))]">{formatRupiah(totalRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">Filter</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                Venue
              </label>
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
          </div>

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
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Order No
                      </th>
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Venue
                      </th>
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Tanggal
                      </th>
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Customer
                      </th>
                      <th className="text-right py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Grand Total
                      </th>
                      <th className="text-center py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Status
                      </th>
                      <th className="text-center py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Pembayaran
                      </th>
                      <th className="text-center py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-12 text-[hsl(var(--muted-foreground))]"
                        >
                          {hasActiveFilters
                            ? 'Tidak ada data sesuai filter'
                            : 'Belum ada data pesanan POS'}
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-[hsl(var(--table-border))] hover:bg-[hsl(var(--table-row-hover))] transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-[hsl(var(--foreground))] font-medium">
                            {order.orderNo}
                          </td>
                          <td className="py-3 px-4 text-[hsl(var(--foreground))]">
                            {order.venue.nama}
                          </td>
                          <td className="py-3 px-4 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                            {formatDateTime(order.tanggal)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[hsl(var(--foreground))]">{order.customerNama || '-'}</div>
                            {order.customerTelp && (
                              <div className="text-xs text-[hsl(var(--muted-text))]">{order.customerTelp}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[hsl(var(--foreground))]">
                            {formatRupiah(order.grandTotal)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`badge ${getStatusBadge(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-[hsl(var(--muted-foreground))]">
                            {getMetodeBayarLabel(order.metodeBayar)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-2 hover:bg-[hsl(var(--surface-hover))] rounded-lg transition-colors"
                              title="Lihat detail"
                            >
                              <Eye className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                            </button>
                          </td>
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="relative bg-[hsl(var(--modal-bg))] border border-[hsl(var(--modal-border))] rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
              <div>
                <h4 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">
                  Detail Pesanan
                </h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono mt-0.5">
                  {selectedOrder.orderNo}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 hover:bg-[hsl(var(--surface-hover))] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-0.5">Venue</p>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {selectedOrder.venue.nama}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-0.5">Tanggal</p>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {formatDateTime(selectedOrder.tanggal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-0.5">Customer</p>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {selectedOrder.customerNama || '-'}
                  </p>
                  {selectedOrder.customerTelp && (
                    <p className="text-xs text-[hsl(var(--muted-text))]">{selectedOrder.customerTelp}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-0.5">Status</p>
                  <span className={`badge ${getStatusBadge(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-0.5">Pembayaran</p>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {getMetodeBayarLabel(selectedOrder.metodeBayar)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-0.5">Input Oleh</p>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {selectedOrder.user.nama}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">
                  Item Pesanan
                </p>
                <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[hsl(var(--secondary))]/50">
                        <th className="text-left py-2 px-3 text-[hsl(var(--table-header))] font-medium">
                          Produk
                        </th>
                        <th className="text-right py-2 px-3 text-[hsl(var(--table-header))] font-medium">
                          Harga
                        </th>
                        <th className="text-right py-2 px-3 text-[hsl(var(--table-header))] font-medium">
                          Qty
                        </th>
                        <th className="text-right py-2 px-3 text-[hsl(var(--table-header))] font-medium">
                          Diskon
                        </th>
                        <th className="text-right py-2 px-3 text-[hsl(var(--table-header))] font-medium">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id} className="border-t border-[hsl(var(--border))]">
                          <td className="py-2 px-3">
                            <span className="text-[hsl(var(--foreground))]">{item.produk.nama}</span>
                            <span className="text-[hsl(var(--muted-text))] ml-1.5 font-mono text-xs">
                              {item.produk.sku}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-[hsl(var(--muted-foreground))]">
                            {formatRupiah(item.harga)}
                          </td>
                          <td className="py-2 px-3 text-right text-[hsl(var(--foreground))]">
                            {item.qty}
                          </td>
                          <td className="py-2 px-3 text-right text-[hsl(var(--muted-foreground))]">
                            {item.diskon > 0 ? `-${formatRupiah(item.diskon)}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-[hsl(var(--foreground))]">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Grand Total</span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {formatRupiah(selectedOrder.grandTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Total Bayar</span>
                    <span className="font-medium text-[hsl(var(--foreground))]">
                      {formatRupiah(selectedOrder.totalBayar)}
                    </span>
                  </div>
                  {selectedOrder.kembalian > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[hsl(var(--muted-foreground))]">Kembalian</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatRupiah(selectedOrder.kembalian)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.catatan && (
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">
                    Catatan
                  </p>
                  <p className="text-sm text-[hsl(var(--foreground))] bg-[hsl(var(--secondary))]/50 rounded-lg p-3">
                    {selectedOrder.catatan}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-[hsl(var(--border))]">
                <a
                  href={`/venue/pos/receipt/${selectedOrder.id}`}
                  target="_blank"
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Lihat Struk
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function POSOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
        </div>
      }
    >
      <POSOrdersPageContent />
    </Suspense>
  );
}
