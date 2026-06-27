'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getStatusColor, getStatusLabel } from '@/lib/utils';
import { venueSchema } from '@/lib/validations';
import { Plus, Edit2, X, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Venue {
  id: string;
  nama: string;
  alamat: string;
  picNama: string;
  picKontakWa: string;
  status: string;
  marginPersenZaneva: number;
  periodeSettlementHari: number;
  createdAt: string;
  _count: { stokMasuk: number; laporanPenjualan: number; invoices: number };
}

const defaultForm = {
  nama: '',
  alamat: '',
  picNama: '',
  picKontakWa: '',
  marginPersenZaneva: 30,
  periodeSettlementHari: 14,
  status: 'AKTIF',
};

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(defaultForm);

  const fetchVenues = useCallback(async () => {
    try {
      const res = await fetch('/api/venues');
      const data = await res.json();
      if (data.success) {
        setVenues(data.data);
      } else {
        toast.error(data.error || 'Gagal memuat data venue');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const openAddModal = () => {
    setForm(defaultForm);
    setEditingId(null);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (v: Venue) => {
    setForm({
      nama: v.nama,
      alamat: v.alamat,
      picNama: v.picNama,
      picKontakWa: v.picKontakWa,
      marginPersenZaneva: v.marginPersenZaneva,
      periodeSettlementHari: v.periodeSettlementHari,
      status: v.status,
    });
    setEditingId(v.id);
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
      venueSchema.parse(form);
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
      const url = editingId ? `/api/venues/${editingId}` : '/api/venues';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(editingId ? 'Venue berhasil diupdate' : 'Venue berhasil ditambahkan');
        closeModal();
        fetchVenues();
      } else {
        toast.error(data.error || 'Gagal menyimpan venue');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setSaving(false);
    }
  };

  const filteredVenues = venues.filter(
    (v) =>
      v.nama.toLowerCase().includes(search.toLowerCase()) ||
      v.alamat.toLowerCase().includes(search.toLowerCase()) ||
      v.picNama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Daftar Venue</h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
              <input
                type="text"
                placeholder="Cari venue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10 w-full sm:w-64"
              />
            </div>
            <button onClick={openAddModal} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Tambah Venue
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
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
                    <th className="text-left py-3 px-4 text-navy-400 font-medium">Nama</th>
                    <th className="text-left py-3 px-4 text-navy-400 font-medium">Alamat</th>
                    <th className="text-left py-3 px-4 text-navy-400 font-medium">PIC</th>
                    <th className="text-center py-3 px-4 text-navy-400 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-navy-400 font-medium">Margin%</th>
                    <th className="text-center py-3 px-4 text-navy-400 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVenues.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-navy-400">
                        {search ? 'Venue tidak ditemukan' : 'Belum ada data venue'}
                      </td>
                    </tr>
                  ) : (
                    filteredVenues.map((v) => (
                      <tr key={v.id} className="border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="text-white font-medium">{v.nama}</span>
                        </td>
                        <td className="py-3 px-4 text-navy-300 max-w-[200px] truncate">{v.alamat}</td>
                        <td className="py-3 px-4">
                          <div className="text-white">{v.picNama}</div>
                          <div className="text-xs text-navy-400">{v.picKontakWa}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`badge ${getStatusColor(v.status)}`}>
                            {getStatusLabel(v.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-navy-300">{v.marginPersenZaneva}%</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => openEditModal(v)}
                            className="p-2 hover:bg-navy-700 rounded-lg transition-colors"
                            title="Edit venue"
                          >
                            <Edit2 className="w-4 h-4 text-navy-400 hover:text-white" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredVenues.length > 0 && (
              <div className="px-4 py-3 border-t border-navy-700 text-sm text-navy-400">
                Menampilkan {filteredVenues.length} dari {venues.length} venue
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-navy-800 border border-navy-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-navy-700">
              <h4 className="text-lg font-semibold text-white">
                {editingId ? 'Edit Venue' : 'Tambah Venue'}
              </h4>
              <button onClick={closeModal} className="p-1 hover:bg-navy-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-navy-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Nama Venue</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="input-field"
                  placeholder="Masukkan nama venue"
                />
                {errors.nama && <p className="text-red-400 text-xs mt-1">{errors.nama}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Alamat</label>
                <textarea
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="input-field min-h-[80px] resize-y"
                  placeholder="Masukkan alamat venue"
                />
                {errors.alamat && <p className="text-red-400 text-xs mt-1">{errors.alamat}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Nama PIC</label>
                  <input
                    type="text"
                    value={form.picNama}
                    onChange={(e) => setForm({ ...form, picNama: e.target.value })}
                    className="input-field"
                    placeholder="Nama penanggung jawab"
                  />
                  {errors.picNama && <p className="text-red-400 text-xs mt-1">{errors.picNama}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Kontak WA PIC</label>
                  <input
                    type="text"
                    value={form.picKontakWa}
                    onChange={(e) => setForm({ ...form, picKontakWa: e.target.value })}
                    className="input-field"
                    placeholder="08xxxxxxxxxx"
                  />
                  {errors.picKontakWa && <p className="text-red-400 text-xs mt-1">{errors.picKontakWa}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="PROSPEK">Prospek</option>
                    <option value="NEGO">Nego</option>
                    <option value="AKTIF">Aktif</option>
                    <option value="NONAKTIF">Nonaktif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Margin Zaneva (%)</label>
                  <input
                    type="number"
                    value={form.marginPersenZaneva}
                    onChange={(e) => setForm({ ...form, marginPersenZaneva: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    min={0}
                    max={100}
                    step={0.5}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Periode Settlement (hari)</label>
                <input
                  type="number"
                  value={form.periodeSettlementHari}
                  onChange={(e) => setForm({ ...form, periodeSettlementHari: parseInt(e.target.value) || 0 })}
                  className="input-field"
                  min={1}
                />
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
