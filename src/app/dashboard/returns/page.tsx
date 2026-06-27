'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatDate } from '@/lib/utils';
import { Plus, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Venue {
  id: string;
  nama: string;
}

interface Produk {
  id: string;
  nama: string;
  sku: string;
}

interface ReturItem {
  id: string;
  tanggal: string;
  qty: number;
  kondisi: string;
  alasan: string;
  produk: { nama: string; sku: string };
  venue: { nama: string };
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturItem[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [produks, setProduks] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVenue, setFilterVenue] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ venueId: '', produkId: '', qty: 1, kondisi: '', alasan: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchReturns = useCallback(() => {
    setLoading(true);
    const url = filterVenue ? `/api/returns?venueId=${filterVenue}` : '/api/returns';
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.success) setReturns(d.data); })
      .catch(() => toast.error('Gagal memuat data retur'))
      .finally(() => setLoading(false));
  }, [filterVenue]);

  useEffect(() => {
    Promise.all([
      fetch('/api/venues').then((r) => r.json()),
      fetch('/api/produk').then((r) => r.json()),
    ]).then(([v, p]) => {
      if (v.success) setVenues(v.data);
      if (p.success) setProduks(p.data);
    });
  }, []);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.venueId) newErrors.venueId = 'Venue wajib dipilih';
    if (!form.produkId) newErrors.produkId = 'Produk wajib dipilih';
    if (!form.qty || form.qty <= 0) newErrors.qty = 'Qty harus lebih dari 0';
    if (!form.kondisi.trim()) newErrors.kondisi = 'Kondisi wajib diisi';
    if (!form.alasan.trim()) newErrors.alasan = 'Alasan wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Retur berhasil ditambahkan');
        setShowForm(false);
        setForm({ venueId: '', produkId: '', qty: 1, kondisi: '', alasan: '' });
        setErrors({});
        fetchReturns();
      } else {
        toast.error(data.error || 'Gagal menambahkan retur');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setForm({ venueId: '', produkId: '', qty: 1, kondisi: '', alasan: '' });
    setErrors({});
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-accent" /> Retur Barang
          </h3>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Retur
          </button>
        </div>

        {/* Filter */}
        <select value={filterVenue} onChange={(e) => setFilterVenue(e.target.value)} className="input-field max-w-xs">
          <option value="">Semua Venue</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.nama}</option>
          ))}
        </select>

        {/* Add Return Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={resetForm}>
            <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-white">Tambah Retur Barang</h4>
                <button onClick={resetForm} className="p-1 hover:bg-navy-700 rounded">
                  <X className="w-5 h-5 text-navy-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-navy-300 mb-1 block">Venue</label>
                  <select
                    value={form.venueId}
                    onChange={(e) => setForm({ ...form, venueId: e.target.value })}
                    className={`input-field w-full ${errors.venueId ? 'border-red-500' : ''}`}
                    required
                  >
                    <option value="">Pilih Venue</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.nama}</option>
                    ))}
                  </select>
                  {errors.venueId && <p className="text-red-400 text-xs mt-1">{errors.venueId}</p>}
                </div>
                <div>
                  <label className="text-sm text-navy-300 mb-1 block">Produk</label>
                  <select
                    value={form.produkId}
                    onChange={(e) => setForm({ ...form, produkId: e.target.value })}
                    className={`input-field w-full ${errors.produkId ? 'border-red-500' : ''}`}
                    required
                  >
                    <option value="">Pilih Produk</option>
                    {produks.map((p) => (
                      <option key={p.id} value={p.id}>{p.nama} ({p.sku})</option>
                    ))}
                  </select>
                  {errors.produkId && <p className="text-red-400 text-xs mt-1">{errors.produkId}</p>}
                </div>
                <div>
                  <label className="text-sm text-navy-300 mb-1 block">Qty</label>
                  <input
                    type="number"
                    value={form.qty || ''}
                    onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value) || 0 })}
                    className={`input-field w-full ${errors.qty ? 'border-red-500' : ''}`}
                    min={1}
                    required
                  />
                  {errors.qty && <p className="text-red-400 text-xs mt-1">{errors.qty}</p>}
                </div>
                <div>
                  <label className="text-sm text-navy-300 mb-1 block">Kondisi</label>
                  <input
                    type="text"
                    value={form.kondisi}
                    onChange={(e) => setForm({ ...form, kondisi: e.target.value })}
                    className={`input-field w-full ${errors.kondisi ? 'border-red-500' : ''}`}
                    placeholder="Contoh: Rusak, Expired, Kemasan Sobek"
                    required
                  />
                  {errors.kondisi && <p className="text-red-400 text-xs mt-1">{errors.kondisi}</p>}
                </div>
                <div>
                  <label className="text-sm text-navy-300 mb-1 block">Alasan</label>
                  <input
                    type="text"
                    value={form.alasan}
                    onChange={(e) => setForm({ ...form, alasan: e.target.value })}
                    className={`input-field w-full ${errors.alasan ? 'border-red-500' : ''}`}
                    placeholder="Alasan retur"
                    required
                  />
                  {errors.alasan && <p className="text-red-400 text-xs mt-1">{errors.alasan}</p>}
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                    {submitting ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button type="button" onClick={resetForm} className="btn-secondary">Batal</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="card h-16 bg-navy-800" />)}
          </div>
        ) : (
          <div className="bg-navy-800/50 border border-navy-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Tanggal</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Venue</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Produk</th>
                  <th className="text-right py-3 px-3 text-navy-400 font-medium">Qty</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Kondisi</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Alasan</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id} className="border-b border-navy-700/50 hover:bg-navy-800/50">
                    <td className="py-3 px-3 text-navy-300">{formatDate(r.tanggal)}</td>
                    <td className="py-3 px-3 text-white">{r.venue?.nama}</td>
                    <td className="py-3 px-3">
                      <p className="text-white">{r.produk?.nama}</p>
                      <p className="text-navy-500 text-xs font-mono">{r.produk?.sku}</p>
                    </td>
                    <td className="py-3 px-3 text-right text-yellow-400 font-medium">{r.qty}</td>
                    <td className="py-3 px-3 text-navy-300">{r.kondisi}</td>
                    <td className="py-3 px-3 text-navy-400">{r.alasan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {returns.length === 0 && (
              <p className="text-center text-navy-500 py-12">Belum ada data retur</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
