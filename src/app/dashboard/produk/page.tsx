'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah } from '@/lib/utils';
import { produkSchema } from '@/lib/validations';
import { Plus, Edit2, X, Loader2, Search, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Produk {
  id: string;
  nama: string;
  sku: string;
  kategori: string;
  hargaJual: number;
  aktif: boolean;
}

const defaultForm = {
  nama: '',
  sku: '',
  kategori: '',
  hargaJual: 0,
};

export default function ProdukPage() {
  const [produks, setProduks] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProduks = useCallback(async () => {
    try {
      const res = await fetch('/api/produk');
      const data = await res.json();
      if (data.success) {
        setProduks(data.data);
      } else {
        toast.error(data.error || 'Gagal memuat data produk');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProduks();
  }, [fetchProduks]);

  const openAddModal = () => {
    setForm(defaultForm);
    setEditingId(null);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (p: Produk) => {
    setForm({
      nama: p.nama,
      sku: p.sku,
      kategori: p.kategori,
      hargaJual: p.hargaJual,
    });
    setEditingId(p.id);
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setErrors({});
  };

  const validateForm = (): boolean => {
    try {
      produkSchema.parse(form);
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
      const url = editingId ? `/api/produk/${editingId}` : '/api/produk';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(editingId ? 'Produk berhasil diupdate' : 'Produk berhasil ditambahkan');
        closeModal();
        fetchProduks();
      } else {
        toast.error(data.error || 'Gagal menyimpan produk');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/produk/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produk_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('File berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh file');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('File harus berformat CSV');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/produk/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Import berhasil');
        fetchProduks();
      } else {
        toast.error(data.error || 'Gagal import data');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredProduks = produks.filter(
    (p) =>
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.kategori.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">Daftar Produk</h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10 w-full sm:w-64"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="btn-secondary flex items-center gap-2 whitespace-nowrap"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import CSV
            </button>
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2 whitespace-nowrap">
              <Download className="w-4 h-4" /> Download
            </button>
            <button onClick={openAddModal} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Tambah Produk
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">Nama</th>
                    <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">SKU</th>
                    <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">Kategori</th>
                    <th className="text-right py-3 px-4 text-[hsl(var(--table-header))] font-medium">Harga Jual</th>
                    <th className="text-center py-3 px-4 text-[hsl(var(--table-header))] font-medium">Status</th>
                    <th className="text-center py-3 px-4 text-[hsl(var(--table-header))] font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProduks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[hsl(var(--muted-foreground))]">
                        {search ? 'Produk tidak ditemukan' : 'Belum ada data produk'}
                      </td>
                    </tr>
                  ) : (
                    filteredProduks.map((p) => (
                      <tr key={p.id} className="border-b border-[hsl(var(--table-border))] hover:bg-[hsl(var(--table-row-hover))] transition-colors">
                        <td className="py-3 px-4 text-[hsl(var(--foreground))] font-medium">{p.nama}</td>
                        <td className="py-3 px-4 text-[hsl(var(--muted-foreground))] font-mono">{p.sku}</td>
                        <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">{p.kategori}</td>
                        <td className="py-3 px-4 text-right text-[hsl(var(--primary))] font-medium">{formatRupiah(p.hargaJual)}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`badge ${
                              p.aktif
                                ? 'text-green-600 dark:text-green-400 bg-green-500/10'
                                : 'text-red-600 dark:text-red-400 bg-red-500/10'
                            }`}
                          >
                            {p.aktif ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 hover:bg-[hsl(var(--surface-hover))] rounded-lg transition-colors"
                            title="Edit produk"
                          >
                            <Edit2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredProduks.length > 0 && (
              <div className="px-4 py-3 border-t border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))]">
                Menampilkan {filteredProduks.length} dari {produks.length} produk
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-[hsl(var(--modal-bg))] border border-[hsl(var(--modal-border))] rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
              <h4 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">
                {editingId ? 'Edit Produk' : 'Tambah Produk'}
              </h4>
              <button onClick={closeModal} className="p-1 hover:bg-[hsl(var(--surface-hover))] rounded-lg transition-colors">
                <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Nama Produk</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="input-field"
                  placeholder="Masukkan nama produk"
                />
                {errors.nama && <p className="text-red-500 text-xs mt-1">{errors.nama}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">SKU</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="input-field"
                  placeholder="Masukkan SKU produk"
                />
                {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Kategori</label>
                <input
                  type="text"
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  className="input-field"
                  placeholder="Masukkan kategori produk"
                />
                {errors.kategori && <p className="text-red-500 text-xs mt-1">{errors.kategori}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Harga Jual (Rp)</label>
                <input
                  type="number"
                  value={form.hargaJual}
                  onChange={(e) => setForm({ ...form, hargaJual: parseInt(e.target.value) || 0 })}
                  className="input-field"
                  min={0}
                  placeholder="0"
                />
                {errors.hargaJual && <p className="text-red-500 text-xs mt-1">{errors.hargaJual}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Update' : 'Simpan'}
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
