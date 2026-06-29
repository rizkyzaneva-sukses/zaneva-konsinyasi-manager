'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import {
  ArrowDownToLine,
  ShoppingCart,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'stock' | 'sales' | 'invoices';

interface StockItem {
  id: string;
  produk: { id: string; nama: string; hargaJual: number };
  qty: number;
  qtyMinimum: number;
  updatedAt: string;
}

interface SaleRecord {
  id: string;
  tanggal: string;
  produk: { nama: string; hargaJual: number };
  qtyTerjual: number;
  qtyRetur: number;
  totalHarga: number;
  createdAt: string;
}

interface Invoice {
  id: string;
  nomor: string;
  tanggal: string;
  jatuhTempo: string;
  total: number;
  status: string;
  admin?: { nama: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'stock', label: 'Stok Masuk', icon: ArrowDownToLine },
  { key: 'sales', label: 'Penjualan', icon: ShoppingCart },
  { key: 'invoices', label: 'Invoice', icon: FileText },
];

export default function VenueHistoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('stock');
  const [loading, setLoading] = useState(true);

  // Stock state
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  // Sales state
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [salesPagination, setSalesPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePagination, setInvoicePagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stock');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat stok');
      setStockItems(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales?page=${page}&limit=50`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat penjualan');
      setSales(data.data || []);
      if (data.pagination) setSalesPagination(data.pagination);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?page=${page}&limit=50`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat invoice');
      setInvoices(data.data || []);
      if (data.pagination) setInvoicePagination(data.pagination);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = useCallback(
    (page = 1) => {
      switch (activeTab) {
        case 'stock':
          return fetchStock();
        case 'sales':
          return fetchSales(page);
        case 'invoices':
          return fetchInvoices(page);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    fetchData();
  }, [activeTab, fetchData]);

  const handleRefresh = () => {
    const currentPagination = activeTab === 'sales' ? salesPagination : invoicePagination;
    fetchData(currentPagination.page);
  };

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };

  const pagination = activeTab === 'sales' ? salesPagination : invoicePagination;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Riwayat</h1>
            <p className="text-[hsl(var(--muted-foreground))] mt-1">Catatan stok, penjualan, dan invoice</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[hsl(var(--secondary))] rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card">
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-[hsl(var(--secondary))] rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Stock Tab */}
              {activeTab === 'stock' && (
                <>
                  {stockItems.length === 0 ? (
                    <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Belum ada data stok</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[hsl(var(--table-border))]">
                            <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Produk
                            </th>
                            <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Harga Jual
                            </th>
                            <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Stok Saat Ini
                            </th>
                            <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Stok Minimum
                            </th>
                            <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Status
                            </th>
                            <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Terakhir Diperbarui
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockItems.map((item) => {
                            const isLow = item.qty <= item.qtyMinimum;
                            return (
                              <tr
                                key={item.id}
                                className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--table-row-hover))] transition-colors"
                              >
                                <td className="py-3 px-3 font-medium text-[hsl(var(--foreground))]">
                                  {item.produk.nama}
                                </td>
                                <td className="py-3 px-3 text-right text-[hsl(var(--muted-foreground))]">
                                  {formatRupiah(item.produk.hargaJual)}
                                </td>
                                <td className="py-3 px-3 text-right font-semibold text-[hsl(var(--foreground))]">
                                  {item.qty}
                                </td>
                                <td className="py-3 px-3 text-right text-[hsl(var(--muted-foreground))]">
                                  {item.qtyMinimum}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {isLow ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                      <AlertTriangle className="w-3 h-3" />
                                      Rendah
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                      Aman
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right text-[hsl(var(--muted-foreground))] text-xs">
                                  {formatDate(item.updatedAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Sales Tab */}
              {activeTab === 'sales' && (
                <>
                  {sales.length === 0 ? (
                    <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Belum ada data penjualan</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[hsl(var(--table-border))]">
                            <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Tanggal
                            </th>
                            <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Produk
                            </th>
                            <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Harga
                            </th>
                            <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Qty Terjual
                            </th>
                            <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Qty Retur
                            </th>
                            <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map((sale) => (
                            <tr
                              key={sale.id}
                              className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--table-row-hover))] transition-colors"
                            >
                              <td className="py-3 px-3 text-[hsl(var(--muted-foreground))]">
                                {formatDate(sale.tanggal)}
                              </td>
                              <td className="py-3 px-3 font-medium text-[hsl(var(--foreground))]">
                                {sale.produk.nama}
                              </td>
                              <td className="py-3 px-3 text-right text-[hsl(var(--muted-foreground))]">
                                {formatRupiah(sale.produk.hargaJual)}
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-[hsl(var(--foreground))]">
                                {sale.qtyTerjual}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {sale.qtyRetur > 0 ? (
                                  <span className="text-red-500 font-medium">{sale.qtyRetur}</span>
                                ) : (
                                  <span className="text-[hsl(var(--muted-foreground))]">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-[hsl(var(--foreground))]">
                                {formatRupiah(sale.totalHarga || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                <>
                  {invoices.length === 0 ? (
                    <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Belum ada invoice</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[hsl(var(--table-border))]">
                            <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              No. Invoice
                            </th>
                            <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Tanggal
                            </th>
                            <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Jatuh Tempo
                            </th>
                            <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Total
                            </th>
                            <th className="text-center py-3 px-3 text-[hsl(var(--table-header))] font-medium">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr
                              key={inv.id}
                              className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--table-row-hover))] transition-colors"
                            >
                              <td className="py-3 px-3 font-medium text-[hsl(var(--foreground))]">
                                {inv.nomor}
                              </td>
                              <td className="py-3 px-3 text-[hsl(var(--muted-foreground))]">
                                {formatDate(inv.tanggal)}
                              </td>
                              <td className="py-3 px-3 text-[hsl(var(--muted-foreground))]">
                                {formatDate(inv.jatuhTempo)}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-[hsl(var(--foreground))]">
                                {formatRupiah(inv.total)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                    inv.status
                                  )}`}
                                >
                                  {getStatusLabel(inv.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Pagination */}
              {(activeTab === 'sales' || activeTab === 'invoices') &&
                pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-[hsl(var(--border))]">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Halaman {pagination.page} dari {pagination.totalPages} · Total{' '}
                      {pagination.total} data
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="btn-secondary px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                          let pageNum: number;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                                pageNum === pagination.page
                                  ? 'bg-accent text-white'
                                  : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="btn-secondary px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
