'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Plus, X, Eye, FileText, CreditCard, Download, FileSpreadsheet, Loader2, CalendarDays, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF, exportToExcel } from '@/lib/export';

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
  status?: string;
  statusLabel?: string;
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

function InvoicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVenue, setFilterVenue] = useState(searchParams.get('venueId') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ venueId: '', periodeMulai: '', periodeAkhir: '' });
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Update URL params when filters change
  const updateUrlParams = useCallback(
    (venue: string, status: string, from: string, to: string) => {
      const params = new URLSearchParams();
      if (venue) params.set('venueId', venue);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      router.push(`/dashboard/invoices${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router]
  );

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterVenue) params.set('venueId', filterVenue);
    if (filterStatus) params.set('status', filterStatus);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    fetch(`/api/invoices?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setInvoices(d.data); })
      .catch(() => toast.error('Gagal memuat invoice'))
      .finally(() => setLoading(false));
  }, [filterVenue, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetch('/api/venues').then((r) => r.json()).then((d) => { if (d.success) setVenues(d.data); });
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    updateUrlParams(filterVenue, filterStatus, dateFrom, dateTo);
  }, [filterVenue, filterStatus, dateFrom, dateTo, updateUrlParams]);

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

  const handleExportPDF = async () => {
    if (invoices.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    setExporting('pdf');
    try {
      const headers = ['No Invoice', 'Venue', 'Periode', 'Total Tagihan', 'Status', 'Jatuh Tempo'];
      const data = invoices.map((inv) => [
        inv.noInvoice,
        inv.venue?.nama || '',
        `${formatDate(inv.periodeMulai)} - ${formatDate(inv.periodeAkhir)}`,
        inv.totalTagihan,
        getStatusLabel(inv.status),
        formatDate(inv.jatuhTempo),
      ]);
      const total = invoices.reduce((sum, inv) => sum + inv.totalTagihan, 0);
      data.push(['', '', 'TOTAL', total, '', '']);
      exportToPDF('Daftar Invoice', headers, data, `invoice-${new Date().toISOString().slice(0, 10)}`,
        `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} · ${invoices.length} invoice`);
      toast.success('PDF berhasil diunduh');
    } catch {
      toast.error('Gagal mengekspor PDF');
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = () => {
    if (invoices.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    setExporting('excel');
    try {
      const headers = ['No Invoice', 'Venue', 'Periode Mulai', 'Periode Akhir', 'Total Tagihan', 'Status', 'Jatuh Tempo'];
      const data = invoices.map((inv) => [
        inv.noInvoice,
        inv.venue?.nama || '',
        inv.periodeMulai,
        inv.periodeAkhir,
        inv.totalTagihan,
        getStatusLabel(inv.status),
        inv.jatuhTempo,
      ]);
      exportToExcel(headers, data, `invoice-${new Date().toISOString().slice(0, 10)}`);
      toast.success('Excel berhasil diunduh');
    } catch {
      toast.error('Gagal mengekspor Excel');
    } finally {
      setExporting(null);
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

  const clearFilter = (filter: string) => {
    switch (filter) {
      case 'venue': setFilterVenue(''); break;
      case 'status': setFilterStatus(''); break;
      case 'from': setDateFrom(''); break;
      case 'to': setDateTo(''); break;
    }
  };

  const clearAllFilters = () => {
    setFilterVenue('');
    setFilterStatus('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = filterVenue || filterStatus || dateFrom || dateTo;

  const activeFilters = [
    filterVenue && { key: 'venue', label: `Venue: ${venues.find((v) => v.id === filterVenue)?.nama || filterVenue}` },
    filterStatus && { key: 'status', label: `Status: ${getStatusLabel(filterStatus)}` },
    dateFrom && { key: 'from', label: `Dari: ${formatDate(dateFrom)}` },
    dateTo && { key: 'to', label: `Sampai: ${formatDate(dateTo)}` },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">Invoice</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleExportPDF} disabled={exporting === 'pdf'} className="btn-secondary flex items-center gap-2 text-sm">
              {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export PDF
            </button>
            <button onClick={handleExportExcel} disabled={exporting === 'excel'} className="btn-secondary flex items-center gap-2 text-sm">
              {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Export Excel
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Buat Invoice
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">Filter</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Dari Tanggal
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Sampai Tanggal
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Venue</label>
              <select value={filterVenue} onChange={(e) => setFilterVenue(e.target.value)} className="input-field w-full text-sm">
                <option value="">Semua Venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field w-full text-sm">
                <option value="">Semua Status</option>
                <option value="BELUM_DIBAYAR">Belum Dibayar</option>
                <option value="SUDAH_DIBAYAR">Sudah Dibayar</option>
                <option value="TELAT">Telat</option>
              </select>
            </div>
          </div>

          {/* Active filters chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[hsl(var(--border))]">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Filter aktif:</span>
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20"
                >
                  {f.label}
                  <button
                    onClick={() => clearFilter(f.key)}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-[hsl(var(--primary))]/20 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={clearAllFilters}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline ml-1"
              >
                Hapus semua
              </button>
            </div>
          )}
        </div>

        {/* Create Invoice Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div className="card w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold font-display text-[hsl(var(--foreground))]">Buat Invoice Baru</h4>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-[hsl(var(--surface-hover))] rounded">
                  <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-[hsl(var(--foreground))] mb-1 block">Venue</label>
                  <select value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })} className="input-field w-full" required>
                    <option value="">Pilih Venue</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[hsl(var(--foreground))] mb-1 block">Periode Mulai</label>
                  <input type="date" value={form.periodeMulai} onChange={(e) => setForm({ ...form, periodeMulai: e.target.value })} className="input-field w-full" required />
                </div>
                <div>
                  <label className="text-sm text-[hsl(var(--foreground))] mb-1 block">Periode Akhir</label>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedInvoice(null)}>
            <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold font-display text-[hsl(var(--foreground))] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
                  Detail Invoice {selectedInvoice.noInvoice}
                </h4>
                <button onClick={() => setSelectedInvoice(null)} className="p-1 hover:bg-[hsl(var(--surface-hover))] rounded">
                  <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>

              {detailLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-[hsl(var(--secondary))] rounded w-3/4" />
                  <div className="h-4 bg-[hsl(var(--secondary))] rounded w-1/2" />
                  <div className="h-20 bg-[hsl(var(--secondary))] rounded" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[hsl(var(--muted-foreground))]">Venue</p>
                      <p className="text-[hsl(var(--foreground))] font-medium">{selectedInvoice.venue?.nama}</p>
                    </div>
                    <div>
                      <p className="text-[hsl(var(--muted-foreground))]">Status</p>
                      <span className={`badge ${getStatusColor(selectedInvoice.status)}`}>
                        {getStatusLabel(selectedInvoice.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-[hsl(var(--muted-foreground))]">Periode</p>
                      <p className="text-[hsl(var(--foreground))]">{formatDate(selectedInvoice.periodeMulai)} - {formatDate(selectedInvoice.periodeAkhir)}</p>
                    </div>
                    <div>
                      <p className="text-[hsl(var(--muted-foreground))]">Jatuh Tempo</p>
                      <p className="text-[hsl(var(--foreground))]">{formatDate(selectedInvoice.jatuhTempo)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[hsl(var(--muted-foreground))]">Total Tagihan</p>
                      <p className="text-[hsl(var(--primary))] text-xl font-bold">{formatRupiah(selectedInvoice.totalTagihan)}</p>
                    </div>
                  </div>

                  {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">Item Invoice</h5>
                      <div className="card overflow-hidden p-0">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[hsl(var(--border))]">
                              <th className="text-left py-2 px-3 text-[hsl(var(--table-header))] font-medium">Produk</th>
                              <th className="text-right py-2 px-3 text-[hsl(var(--table-header))] font-medium">Qty</th>
                              <th className="text-right py-2 px-3 text-[hsl(var(--table-header))] font-medium">Harga</th>
                              <th className="text-right py-2 px-3 text-[hsl(var(--table-header))] font-medium">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.items.map((item) => (
                              <tr key={item.id} className="border-b border-[hsl(var(--table-border))]">
                                <td className="py-2 px-3 text-[hsl(var(--foreground))]">{item.produkNama}</td>
                                <td className="py-2 px-3 text-right text-[hsl(var(--muted-foreground))]">{item.qty}</td>
                                <td className="py-2 px-3 text-right text-[hsl(var(--muted-foreground))]">{formatRupiah(item.hargaSatuan)}</td>
                                <td className="py-2 px-3 text-right text-[hsl(var(--primary))]">{formatRupiah(item.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedInvoice.pembayarans && selectedInvoice.pembayarans.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Riwayat Pembayaran
                      </h5>
                      <div className="space-y-2">
                        {selectedInvoice.pembayarans.map((p) => (
                          <div key={p.id} className="card p-3 flex justify-between items-center">
                            <div>
                              <p className="text-[hsl(var(--foreground))] text-sm">{formatDate(p.tanggal)}</p>
                              <p className="text-[hsl(var(--muted-text))] text-xs">
                                {p.statusLabel || p.status || 'Menunggu Verifikasi Owner'} · {p.keterangan || '-'}
                              </p>
                            </div>
                            <p className="text-[hsl(var(--primary))] font-medium">{formatRupiah(p.jumlah)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedInvoice.pembayarans && selectedInvoice.pembayarans.length === 0 && (
                    <p className="text-center text-[hsl(var(--muted-text))] text-sm py-2">Belum ada pembayaran</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="card h-16" />)}
          </div>
        ) : (
          <div className="card overflow-hidden p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">No Invoice</th>
                  <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Venue</th>
                  <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Periode</th>
                  <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">Total Tagihan</th>
                  <th className="text-center py-3 px-3 text-[hsl(var(--table-header))] font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Jatuh Tempo</th>
                  <th className="text-center py-3 px-3 text-[hsl(var(--table-header))] font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[hsl(var(--table-border))] hover:bg-[hsl(var(--table-row-hover))] cursor-pointer" onClick={() => openDetail(inv)}>
                    <td className="py-3 px-3 text-[hsl(var(--foreground))] font-mono text-xs">{inv.noInvoice}</td>
                    <td className="py-3 px-3 text-[hsl(var(--foreground))]">{inv.venue?.nama}</td>
                    <td className="py-3 px-3 text-[hsl(var(--muted-foreground))] text-xs">{formatDate(inv.periodeMulai)} - {formatDate(inv.periodeAkhir)}</td>
                    <td className="py-3 px-3 text-right text-[hsl(var(--primary))] font-medium">{formatRupiah(inv.totalTagihan)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`badge ${getStatusColor(inv.status)}`}>{getStatusLabel(inv.status)}</span>
                    </td>
                    <td className="py-3 px-3 text-[hsl(var(--muted-foreground))]">{formatDate(inv.jatuhTempo)}</td>
                    <td className="py-3 px-3 text-center">
                      <button onClick={(e) => { e.stopPropagation(); openDetail(inv); }} className="p-1 hover:bg-[hsl(var(--surface-hover))] rounded">
                        <Eye className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <p className="text-center text-[hsl(var(--muted-text))] py-12">
                {hasActiveFilters ? 'Tidak ada invoice sesuai filter' : 'Belum ada invoice'}
              </p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div></div>}>
      <InvoicesPageContent />
    </Suspense>
  );
}
