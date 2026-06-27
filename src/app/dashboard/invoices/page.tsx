'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Plus, X, Eye, ChevronDown, ChevronUp, FileText, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Venue {
  id: string;
  nama: string;
}

interface InvoiceItem {
  id: string;
  produkNama: string;
  qty: number;
  hargaSatuan: number;
  subtotal: number;
}

interface Pembayaran {
  id: string;
  tanggal: string;
  jumlah: number;
  keterangan: string;
}

interface Invoice {
  id: string;
  noInvoice: string;
  venueId: string;
  venue: { nama: string };
  periodeMulai: string;
  periodeAkhir: string;
  totalTagihan: number;
  status: string;
  jatuhTempo: string;
  createdAt: string;
  items?: InvoiceItem[];
  pembayarans?: Pembayaran[];
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVenue, setFilterVenue] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ venueId: '', periodeMulai: '', periodeAkhir: '' });
  const [submitting, setSubmitting] = useState(false);

  // Detail modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterVenue) params.set('venueId', filterVenue);
    if (filterStatus) params.set('status', filterStatus);
    fetch(`/api/invoices?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setInvoices(d.data); })
      .catch(() => toast.error('Gagal memuat invoice'))
      .finally(() => setLoading(false));
  }, [filterVenue, filterStatus]);

  useEffect(() => {
    fetch('/api/venues').then((r) => r.json()).then((d) => { if (d.success) setVenues(d.data); });
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.venueId || !form.periodeMulai || !form.periodeAkhir) {
      toast.error('Semua field wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Invoice berhasil dibuat');
        setShowForm(false);
        setForm({ venueId: '', periodeMulai: '', periodeAkhir: '' });
        fetchInvoices();
      } else {
        toast.error(data.error || 'Gagal membuat invoice');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (invoice: Invoice) => {
    setDetailLoading(true);
    setSelectedInvoice(invoice);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedInvoice(data.data);
      }
    } catch {
      toast.error('Gagal memuat detail invoice');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Invoice</h3>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Buat Invoice
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={filterVenue} onChange={(e) => setFilterVenue(e.target.value)} className="input-field max-w-xs">
            <option value="">Semua Venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.nama}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field max-w-xs">
            <option value="">Semua Status</option>
            <option value="BELUM_DIBAYAR">Belum Dibayar</option>
            <option value="SUDAH_DIBAYAR">Sudah Dibayar</option>
            <option value="TELAT">Telat</option>
          </select>
        </div>

        {/* Create Invoice Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-white">Buat Invoice Baru</h4>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-navy-700 rounded">
                  <X className="w-5 h-5 text-navy-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-navy-300 mb-1 block">Venue</label>
                  <select value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })} className="input-field w-full" required>
                    <option value="">Pilih Venue</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-navy-300 mb-1 block">Periode Mulai</label>
                  <input type="date" value={form.periodeMulai} onChange={(e) => setForm({ ...form, periodeMulai: e.target.value })} className="input-field w-full" required />
                </div>
                <div>
                  <label className="text-sm text-navy-300 mb-1 block">Periode Akhir</label>
                  <input type="date" value={form.periodeAkhir} onChange={(e) => setForm({ ...form, periodeAkhir: e.target.value })} className="input-field w-full" required />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                    {submitting ? 'Membuat...' : 'Buat Invoice'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedInvoice(null)}>
            <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  Detail Invoice {selectedInvoice.noInvoice}
                </h4>
                <button onClick={() => setSelectedInvoice(null)} className="p-1 hover:bg-navy-700 rounded">
                  <X className="w-5 h-5 text-navy-400" />
                </button>
              </div>

              {detailLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-navy-700 rounded w-3/4" />
                  <div className="h-4 bg-navy-700 rounded w-1/2" />
                  <div className="h-20 bg-navy-700 rounded" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Invoice Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-navy-400">Venue</p>
                      <p className="text-white font-medium">{selectedInvoice.venue?.nama}</p>
                    </div>
                    <div>
                      <p className="text-navy-400">Status</p>
                      <span className={`badge ${getStatusColor(selectedInvoice.status)}`}>
                        {getStatusLabel(selectedInvoice.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-navy-400">Periode</p>
                      <p className="text-white">{formatDate(selectedInvoice.periodeMulai)} - {formatDate(selectedInvoice.periodeAkhir)}</p>
                    </div>
                    <div>
                      <p className="text-navy-400">Jatuh Tempo</p>
                      <p className="text-white">{formatDate(selectedInvoice.jatuhTempo)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-navy-400">Total Tagihan</p>
                      <p className="text-accent text-xl font-bold">{formatRupiah(selectedInvoice.totalTagihan)}</p>
                    </div>
                  </div>

                  {/* Items */}
                  {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-navy-300 mb-2">Item Invoice</h5>
                      <div className="bg-navy-800/50 border border-navy-700 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-navy-700">
                              <th className="text-left py-2 px-3 text-navy-400 font-medium">Produk</th>
                              <th className="text-right py-2 px-3 text-navy-400 font-medium">Qty</th>
                              <th className="text-right py-2 px-3 text-navy-400 font-medium">Harga</th>
                              <th className="text-right py-2 px-3 text-navy-400 font-medium">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.items.map((item) => (
                              <tr key={item.id} className="border-b border-navy-700/50">
                                <td className="py-2 px-3 text-white">{item.produkNama}</td>
                                <td className="py-2 px-3 text-right text-navy-300">{item.qty}</td>
                                <td className="py-2 px-3 text-right text-navy-300">{formatRupiah(item.hargaSatuan)}</td>
                                <td className="py-2 px-3 text-right text-accent">{formatRupiah(item.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Payment History */}
                  {selectedInvoice.pembayarans && selectedInvoice.pembayarans.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-navy-300 mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Riwayat Pembayaran
                      </h5>
                      <div className="space-y-2">
                        {selectedInvoice.pembayarans.map((p) => (
                          <div key={p.id} className="bg-navy-800/50 border border-navy-700 rounded-lg p-3 flex justify-between items-center">
                            <div>
                              <p className="text-white text-sm">{formatDate(p.tanggal)}</p>
                              <p className="text-navy-400 text-xs">{p.keterangan || '-'}</p>
                            </div>
                            <p className="text-accent font-medium">{formatRupiah(p.jumlah)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedInvoice.pembayarans && selectedInvoice.pembayarans.length === 0 && (
                    <p className="text-center text-navy-500 text-sm py-2">Belum ada pembayaran</p>
                  )}
                </div>
              )}
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
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">No Invoice</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Venue</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Periode</th>
                  <th className="text-right py-3 px-3 text-navy-400 font-medium">Total Tagihan</th>
                  <th className="text-center py-3 px-3 text-navy-400 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Jatuh Tempo</th>
                  <th className="text-center py-3 px-3 text-navy-400 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-navy-700/50 hover:bg-navy-800/50 cursor-pointer" onClick={() => openDetail(inv)}>
                    <td className="py-3 px-3 text-white font-mono text-xs">{inv.noInvoice}</td>
                    <td className="py-3 px-3 text-white">{inv.venue?.nama}</td>
                    <td className="py-3 px-3 text-navy-300 text-xs">{formatDate(inv.periodeMulai)} - {formatDate(inv.periodeAkhir)}</td>
                    <td className="py-3 px-3 text-right text-accent font-medium">{formatRupiah(inv.totalTagihan)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`badge ${getStatusColor(inv.status)}`}>{getStatusLabel(inv.status)}</span>
                    </td>
                    <td className="py-3 px-3 text-navy-300">{formatDate(inv.jatuhTempo)}</td>
                    <td className="py-3 px-3 text-center">
                      <button onClick={(e) => { e.stopPropagation(); openDetail(inv); }} className="p-1 hover:bg-navy-700 rounded">
                        <Eye className="w-4 h-4 text-navy-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <p className="text-center text-navy-500 py-12">Belum ada invoice</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
