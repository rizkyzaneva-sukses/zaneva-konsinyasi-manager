'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getStatusLabel } from '@/lib/utils';
import { stokMasukSchema } from '@/lib/validations';
import { Plus, X, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface StockItem {
  produkId: string;
  produkNama: string;
  sku: string;
  kategori: string;
  hargaJual: number;
  totalMasuk: number;
  totalTerjual: number;
  totalRetur: number;
  sisaStok: number;
}

interface Venue {
  id: string;
  nama: string;
}

interface Produk {
  id: string;
  nama: string;
}

const defaultForm = {
  venueId: '',
  produkId: '',
  qty: 1,
  jenis: 'RESTOCK',
  keterangan: '',
};

export default function StockPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [produks, setProduks] = useState<Produk[]>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    Promise.all([
      fetch('/api/venues').then((r) => r.json()),
      fetch('/api/produk').then((r) => r.json()),
    ])
      .then(([v, p]) => {
        if (v.success) setVenues(v.data);
        if (p.success) setProduks(p.data);
      })
      .catch(() => toast.error('Gagal memuat data'))
      .finally(() => setInitialLoading(false));
  }, []);

  const fetchStock = useCallback(async (venueId: string) => {
    if (!venueId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stock?venueId=${venueId}`);
      const data = await res.json();
      if (data.success) {
        setStock(data.data);
      } else {
        toast.error(data.error || 'Gagal memuat data stok');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      fetchStock(selectedVenue);
    } else {
      setStock([]);
    }
  }, [selectedVenue, fetchStock]);

  const openModal = () => {
    setForm({ ...defaultForm, venueId: selectedVenue });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setErrors({});
  };

  const validateForm = (): boolean => {
    try {
      stokMasukSchema.parse({
        ...form,
        qty: Number(form.qty),
      });
      setErrors({});
      return true;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err) {
        const zodErr = err as { errors: { path: string[]; message: string }[] };
        const newErrors: Record<string, string> = {};
        zodErr.errors.forEach((e) => {
          newErrors[e.path[0]] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          qty: Number(form.qty),
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Stok berhasil ditambahkan');
        closeModal();
        if (selectedVenue) fetchStock(selectedVenue);
      } else {
        toast.error(data.error || 'Gagal menyimpan stok');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setSaving(false);
    }
  };

  const getStokColor = (sisa: number): string => {
    if (sisa < 0) return 'text-red-400';
    if (sisa < 5) return 'text-yellow-400';
    return 'text-accent';
  };

  const getStokBgColor = (sisa: number): string => {
    if (sisa < 0) return 'bg-red-500/10';
    if (sisa < 5) return 'bg-yellow-500/10';
    return 'bg-green-500/10';
  };

  if (initialLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-navy-800 rounded w-48" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-navy-800/50 border border-navy-700 rounded-xl" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Stok per Venue</h3>
          <button
            onClick={openModal}
            className="btn-primary flex items-center gap-2"
            disabled={!selectedVenue}
          >
            <Plus className="w-4 h-4" /> Tambah Stok
          </button>
        </div>

        {/* Venue Selector */}
        <div className="max-w-sm">
          <label className="block text-sm font-medium text-navy-300 mb-1">Pilih Venue</label>
          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            className="input-field"
          >
            <option value="">-- Pilih Venue --</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nama}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        {!selectedVenue ? (
          <div className="bg-navy-800/50 border border-navy-700 rounded-xl flex flex-col items-center justify-center py-16">
            <Package className="w-12 h-12 text-navy-600 mb-3" />
            <p className="text-navy-400 text-sm">Pilih venue untuk melihat data stok</p>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-navy-800/50 border border-navy-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-navy-800/50 border border-navy-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left py-3 px-4 text-navy-400 font-medium">Produk</th>
                    <th className="text-left py-3 px-4 text-navy-400 font-medium">SKU</th>
                    <th className="text-right py-3 px-4 text-navy-400 font-medium">Total Masuk</th>
                    <th className="text-right py-3 px-4 text-navy-400 font-medium">Total Terjual</th>
                    <th className="text-right py-3 px-4 text-navy-400 font-medium">Total Retur</th>
                    <th className="text-right py-3 px-4 text-navy-400 font-medium">Sisa Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-navy-400">
                        Belum ada data stok untuk venue ini
                      </td>
                    </tr>
                  ) : (
                    stock.map((s) => (
                      <tr key={s.produkId} className="border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{s.produkNama}</div>
                          <div className="text-xs text-navy-400">{s.kategori}</div>
                        </td>
                        <td className="py-3 px-4 text-navy-300 font-mono">{s.sku}</td>
                        <td className="py-3 px-4 text-right text-blue-400 font-medium">{s.totalMasuk}</td>
                        <td className="py-3 px-4 text-right text-green-400 font-medium">{s.totalTerjual}</td>
                        <td className="py-3 px-4 text-right text-yellow-400 font-medium">{s.totalRetur}</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-lg text-sm font-bold ${getStokColor(
                              s.sisaStok
                            )} ${getStokBgColor(s.sisaStok)}`}
                          >
                            {s.sisaStok}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {stock.length > 0 && (
              <div className="px-4 py-3 border-t border-navy-700 text-sm text-navy-400">
                {stock.length} produk ·{' '}
                <span className="text-red-400">{stock.filter((s) => s.sisaStok < 0).length} over-sold</span>
                {' · '}
                <span className="text-yellow-400">{stock.filter((s) => s.sisaStok >= 0 && s.sisaStok < 5).length} stok rendah</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-navy-800 border border-navy-700 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-navy-700">
              <h4 className="text-lg font-semibold text-white">Tambah Stok Masuk</h4>
              <button onClick={closeModal} className="p-1 hover:bg-navy-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-navy-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Venue</label>
                <select
                  value={form.venueId}
                  onChange={(e) => setForm({ ...form, venueId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Pilih Venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nama}
                    </option>
                  ))}
                </select>
                {errors.venueId && <p className="text-red-400 text-xs mt-1">{errors.venueId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Produk</label>
                <select
                  value={form.produkId}
                  onChange={(e) => setForm({ ...form, produkId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Pilih Produk</option>
                  {produks.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
                {errors.produkId && <p className="text-red-400 text-xs mt-1">{errors.produkId}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Qty</label>
                  <input
                    type="number"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    min={1}
                  />
                  {errors.qty && <p className="text-red-400 text-xs mt-1">{errors.qty}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Jenis</label>
                  <select
                    value={form.jenis}
                    onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                    className="input-field"
                  >
                    <option value="DROP_AWAL">Drop Awal</option>
                    <option value="RESTOCK">Restock</option>
                    <option value="PENARIKAN">Penarikan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Keterangan (opsional)</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  className="input-field"
                  placeholder="Tambahkan keterangan..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
