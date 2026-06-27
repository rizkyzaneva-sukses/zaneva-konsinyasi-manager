'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatDate } from '@/lib/utils';
import { ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
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

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

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
    [selectedVenue]
  );

  useEffect(() => {
    fetchSales(1);
  }, [fetchSales]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchSales(newPage);
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
          <h3 className="text-lg font-semibold text-white">Laporan Penjualan</h3>
          <div className="flex items-center gap-2 text-sm text-navy-400">
            <FileText className="w-4 h-4" />
            <span>{pagination.total} total transaksi</span>
          </div>
        </div>

        {/* Venue Filter */}
        <div className="max-w-sm">
          <label className="block text-sm font-medium text-navy-300 mb-1">Filter Venue</label>
          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            className="input-field"
          >
            <option value="">Semua Venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nama}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <>
            <div className="bg-navy-800/50 border border-navy-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-700">
                      <th className="text-left py-3 px-4 text-navy-400 font-medium">Tanggal</th>
                      <th className="text-left py-3 px-4 text-navy-400 font-medium">Venue</th>
                      <th className="text-left py-3 px-4 text-navy-400 font-medium">Produk</th>
                      <th className="text-right py-3 px-4 text-navy-400 font-medium">Qty Terjual</th>
                      <th className="text-right py-3 px-4 text-navy-400 font-medium">Qty Retur</th>
                      <th className="text-left py-3 px-4 text-navy-400 font-medium">Input Oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-navy-400">
                          Belum ada data penjualan
                        </td>
                      </tr>
                    ) : (
                      sales.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors"
                        >
                          <td className="py-3 px-4 text-navy-300 whitespace-nowrap">
                            {formatDate(s.tanggal)}
                          </td>
                          <td className="py-3 px-4 text-white">{s.venue.nama}</td>
                          <td className="py-3 px-4">
                            <div className="text-white font-medium">{s.produk.nama}</div>
                            <div className="text-xs text-navy-400 font-mono">{s.produk.sku}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-green-400 font-medium">{s.qtyTerjual}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {s.qtyRetur > 0 ? (
                              <span className="text-yellow-400 font-medium">{s.qtyRetur}</span>
                            ) : (
                              <span className="text-navy-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-navy-400">{s.user.nama}</td>
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
                <p className="text-sm text-navy-400">
                  Halaman {pagination.page} dari {pagination.totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 hover:bg-navy-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 text-navy-400" />
                  </button>

                  {getPageNumbers().map((pageNum, idx) =>
                    pageNum === '...' ? (
                      <span key={`dots-${idx}`} className="px-2 text-navy-500">
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum as number)}
                        className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                          pageNum === pagination.page
                            ? 'bg-accent text-navy-950'
                            : 'text-navy-400 hover:bg-navy-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 hover:bg-navy-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 text-navy-400" />
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
