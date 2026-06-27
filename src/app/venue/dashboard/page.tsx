'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah } from '@/lib/utils';
import { ShoppingCart, Package, FileText } from 'lucide-react';

interface StockItem {
  produkId: string; produkNama: string; sku: string; sisaStok: number;
}

interface Invoice {
  id: string; totalTagihan: number; status: string; jatuhTempo: string;
}

export default function VenueDashboard() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stock').then((r) => r.json()),
      fetch('/api/invoices').then((r) => r.json()),
    ]).then(([s, i]) => {
      if (s.success) setStock(s.data);
      if (i.success) setInvoices(i.data);
    }).finally(() => setLoading(false));
  }, []);

  const unpaidInvoices = invoices.filter((i) => i.status !== 'SUDAH_DIBAYAR');
  const totalUnpaid = unpaidInvoices.reduce((a, b) => a + b.totalTagihan, 0);
  const lowStock = stock.filter((s) => s.sisaStok <= 5);

  return (
    <DashboardLayout>
      {loading ? (
        <div className="animate-pulse space-y-4">{[1, 2, 3].map((i) => <div key={i} className="card h-24 bg-navy-800" />)}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg"><Package className="w-6 h-6 text-blue-400" /></div>
                <div>
                  <p className="text-sm text-navy-400">Total Produk</p>
                  <p className="text-2xl font-bold text-white">{stock.length}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg"><FileText className="w-6 h-6 text-yellow-400" /></div>
                <div>
                  <p className="text-sm text-navy-400">Tagihan Belum Bayar</p>
                  <p className="text-2xl font-bold text-accent">{formatRupiah(totalUnpaid)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-lg"><ShoppingCart className="w-6 h-6 text-red-400" /></div>
                <div>
                  <p className="text-sm text-navy-400">Stok Rendah</p>
                  <p className="text-2xl font-bold text-red-400">{lowStock.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Stok Saat Ini</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left py-3 px-2 text-navy-400 font-medium">Produk</th>
                    <th className="text-left py-3 px-2 text-navy-400 font-medium">SKU</th>
                    <th className="text-right py-3 px-2 text-navy-400 font-medium">Sisa Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((s) => (
                    <tr key={s.produkId} className="border-b border-navy-700/50">
                      <td className="py-3 px-2 text-white">{s.produkNama}</td>
                      <td className="py-3 px-2 text-navy-300 font-mono">{s.sku}</td>
                      <td className={`py-3 px-2 text-right font-bold ${s.sisaStok <= 5 ? 'text-red-400' : 'text-accent'}`}>{s.sisaStok}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {lowStock.length > 0 && (
            <div className="card border-yellow-500/30 bg-yellow-500/5">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">⚠️ Stok Hampir Habis</h3>
              <p className="text-sm text-navy-300">
                {lowStock.map((s) => `${s.produkNama} (sisa ${s.sisaStok})`).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
