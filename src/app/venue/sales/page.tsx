'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah, formatDate } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Send,
  ShoppingCart,
  Package,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Produk {
  id: string;
  nama: string;
  hargaJual: number;
}

interface SaleItem {
  produkId: string;
  qtyTerjual: number;
  qtyRetur: number;
}

interface SaleRecord {
  id: string;
  tanggal: string;
  produk: { nama: string; hargaJual: number };
  qtyTerjual: number;
  qtyRetur: number;
  totalHarga: number;
}

export default function VenueSalesPage() {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [items, setItems] = useState<SaleItem[]>([{ produkId: '', qtyTerjual: 1, qtyRetur: 0 }]);
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchProduk = async () => {
    try {
      const res = await fetch('/api/produk');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat produk');
      setProdukList(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const res = await fetch('/api/sales?limit=20');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat penjualan');
      setRecentSales(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchProduk(), fetchRecentSales()]);
      setLoading(false);
    };
    init();
  }, []);

  const addItem = () => {
    setItems([...items, { produkId: '', qtyTerjual: 1, qtyRetur: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((item) => item.produkId && item.qtyTerjual > 0);
    if (validItems.length === 0) {
      toast.error('Tambahkan minimal 1 item dengan produk yang dipilih');
      return;
    }

    const hasInvalid = validItems.some(
      (item) => item.qtyTerjual < 0 || item.qtyRetur < 0
    );
    if (hasInvalid) {
      toast.error('Qty tidak boleh negatif');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems, tanggal }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan penjualan');

      toast.success('Laporan penjualan berhasil disimpan');
      setItems([{ produkId: '', qtyTerjual: 1, qtyRetur: 0 }]);
      await fetchRecentSales();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getItemTotal = (item: SaleItem) => {
    const produk = produkList.find((p) => p.id === item.produkId);
    if (!produk) return 0;
    return produk.hargaJual * Math.max(0, item.qtyTerjual - item.qtyRetur);
  };

  const grandTotal = items.reduce((sum, item) => sum + getItemTotal(item), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Input Penjualan Harian</h1>
          <p className="text-navy-500 mt-1">Catat penjualan produk setiap hari</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingCart className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-navy-900">Form Penjualan</h2>
          </div>

          {/* Date */}
          <div className="mb-6 max-w-xs">
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Tanggal
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Items */}
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-12 gap-3 text-xs font-medium text-navy-500 uppercase tracking-wide px-1">
              <div className="col-span-5">Produk</div>
              <div className="col-span-2">Qty Terjual</div>
              <div className="col-span-2">Qty Retur</div>
              <div className="col-span-2 text-right">Subtotal</div>
              <div className="col-span-1" />
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-3 items-center bg-navy-50/50 rounded-lg p-3"
              >
                <div className="col-span-5">
                  <select
                    value={item.produkId}
                    onChange={(e) => updateItem(index, 'produkId', e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Pilih Produk</option>
                    {produkList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} — {formatRupiah(p.hargaJual)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    value={item.qtyTerjual}
                    onChange={(e) =>
                      updateItem(index, 'qtyTerjual', parseInt(e.target.value) || 0)
                    }
                    className="input-field"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    value={item.qtyRetur}
                    onChange={(e) =>
                      updateItem(index, 'qtyRetur', parseInt(e.target.value) || 0)
                    }
                    className="input-field"
                  />
                </div>
                <div className="col-span-2 text-right font-medium text-navy-900">
                  {formatRupiah(getItemTotal(item))}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="p-2 text-navy-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Hapus item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-navy-100">
            <button type="button" onClick={addItem} className="btn-secondary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tambah Item
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-navy-500">Total</p>
                <p className="text-lg font-bold text-navy-900">{formatRupiah(grandTotal)}</p>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                <Send className={`w-4 h-4 ${submitting ? 'animate-pulse' : ''}`} />
                {submitting ? 'Menyimpan...' : 'Simpan Penjualan'}
              </button>
            </div>
          </div>
        </form>

        {/* Recent Sales Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-navy-400" />
              <h2 className="text-lg font-semibold text-navy-900">Riwayat Penjualan Terakhir</h2>
            </div>
            <button
              onClick={fetchRecentSales}
              className="p-2 text-navy-400 hover:text-navy-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-navy-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recentSales.length === 0 ? (
            <div className="text-center py-12 text-navy-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Belum ada data penjualan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100">
                    <th className="text-left py-3 px-3 text-navy-500 font-medium">Tanggal</th>
                    <th className="text-left py-3 px-3 text-navy-500 font-medium">Produk</th>
                    <th className="text-right py-3 px-3 text-navy-500 font-medium">Harga</th>
                    <th className="text-right py-3 px-3 text-navy-500 font-medium">Qty Terjual</th>
                    <th className="text-right py-3 px-3 text-navy-500 font-medium">Qty Retur</th>
                    <th className="text-right py-3 px-3 text-navy-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/50 transition-colors">
                      <td className="py-3 px-3 text-navy-600">
                        {formatDate(sale.tanggal)}
                      </td>
                      <td className="py-3 px-3 font-medium text-navy-800">
                        {sale.produk.nama}
                      </td>
                      <td className="py-3 px-3 text-right text-navy-600">
                        {formatRupiah(sale.produk.hargaJual)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-navy-900">
                        {sale.qtyTerjual}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {sale.qtyRetur > 0 ? (
                          <span className="text-red-500 font-medium">{sale.qtyRetur}</span>
                        ) : (
                          <span className="text-navy-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-navy-900">
                        {formatRupiah(sale.totalHarga || 0)}
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
