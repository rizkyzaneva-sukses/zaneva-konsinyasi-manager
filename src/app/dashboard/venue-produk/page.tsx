'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah } from '@/lib/utils';
import { Save, Loader2, Package, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Venue {
  id: string;
  nama: string;
}

interface VenueProdukItem {
  id: string | null;
  produkId: string;
  produkNama: string;
  sku: string;
  kategori: string;
  hargaDefault: number;
  hargaVenue: number;
  aktif: boolean;
  isNew: boolean;
}

export default function VenueProdukPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [items, setItems] = useState<VenueProdukItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetch('/api/venues')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setVenues(d.data);
      })
      .catch(() => toast.error('Gagal memuat data venue'))
      .finally(() => setInitialLoading(false));
  }, []);

  const fetchVenueProduk = useCallback(async (venueId: string) => {
    if (!venueId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setHasChanges(false);
    try {
      const res = await fetch(`/api/venue-produk?venueId=${venueId}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      } else {
        toast.error(data.error || 'Gagal memuat data venue produk');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      fetchVenueProduk(selectedVenue);
    } else {
      setItems([]);
    }
  }, [selectedVenue, fetchVenueProduk]);

  const updateItem = (produkId: string, field: 'hargaVenue' | 'aktif', value: number | boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.produkId === produkId ? { ...item, [field]: value } : item
      )
    );
    setHasChanges(true);
  };

  const handleBulkSave = async () => {
    if (!selectedVenue) return;

    setSaving(true);
    try {
      const payload = items.map((item) => ({
        produkId: item.produkId,
        hargaVenue: item.hargaVenue,
        aktif: item.aktif,
      }));

      const res = await fetch('/api/venue-produk/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: selectedVenue, items: payload }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Data venue produk berhasil disimpan');
        setHasChanges(false);
        fetchVenueProduk(selectedVenue);
      } else {
        toast.error(data.error || 'Gagal menyimpan data');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.produkNama.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.kategori.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = items.filter((i) => i.aktif).length;

  if (initialLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-10 card w-48" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 card" />
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
          <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">
            Venue Produk
          </h3>
          <button
            onClick={handleBulkSave}
            disabled={!selectedVenue || saving || !hasChanges}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Menyimpan...' : 'Simpan Semua'}
          </button>
        </div>

        {/* Venue Selector */}
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Pilih Venue
              </label>
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
            {selectedVenue && (
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Cari Produk
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="text"
                    placeholder="Cari nama atau SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {!selectedVenue ? (
          <div className="card flex flex-col items-center justify-center py-16">
            <Package className="w-12 h-12 text-[hsl(var(--muted-text))] mb-3" />
            <p className="text-[hsl(var(--muted-foreground))] text-sm">
              Pilih venue untuk mengelola produk
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 card animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
              <span>{items.length} produk total</span>
              <span>·</span>
              <span className="text-green-600 dark:text-green-400">
                {activeCount} aktif
              </span>
              <span>·</span>
              <span className="text-red-600 dark:text-red-400">
                {items.length - activeCount} nonaktif
              </span>
              {hasChanges && (
                <>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Ada perubahan belum disimpan
                  </span>
                </>
              )}
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))]">
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        SKU
                      </th>
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Nama Produk
                      </th>
                      <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Kategori
                      </th>
                      <th className="text-right py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Harga Default
                      </th>
                      <th className="text-right py-3 px-4 text-[hsl(var(--table-header))] font-medium">
                        Harga Venue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-12 text-[hsl(var(--muted-foreground))]"
                        >
                          {search
                            ? 'Produk tidak ditemukan'
                            : 'Belum ada data produk untuk venue ini'}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr
                          key={item.produkId}
                          className={`border-b border-[hsl(var(--table-border))] hover:bg-[hsl(var(--table-row-hover))] transition-colors ${
                            !item.aktif ? 'opacity-60' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <button
                              onClick={() =>
                                updateItem(item.produkId, 'aktif', !item.aktif)
                              }
                              className="transition-colors"
                              title={item.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                              {item.aktif ? (
                                <ToggleRight className="w-7 h-7 text-green-500" />
                              ) : (
                                <ToggleLeft className="w-7 h-7 text-[hsl(var(--muted-text))]" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-[hsl(var(--muted-foreground))] font-mono">
                            {item.sku}
                          </td>
                          <td className="py-3 px-4 text-[hsl(var(--foreground))] font-medium">
                            {item.produkNama}
                          </td>
                          <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">
                            {item.kategori}
                          </td>
                          <td className="py-3 px-4 text-right text-[hsl(var(--muted-foreground))]">
                            {formatRupiah(item.hargaDefault)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <input
                              type="number"
                              min={0}
                              value={item.hargaVenue}
                              onChange={(e) =>
                                updateItem(
                                  item.produkId,
                                  'hargaVenue',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="input-field w-32 py-1 text-right text-sm"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredItems.length > 0 && (
                <div className="px-4 py-3 border-t border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))]">
                  Menampilkan {filteredItems.length} dari {items.length} produk
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
