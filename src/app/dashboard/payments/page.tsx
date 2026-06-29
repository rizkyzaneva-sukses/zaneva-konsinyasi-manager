'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { X, CreditCard, CheckCircle, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF, exportToExcel } from '@/lib/export';

interface Invoice {
  id: string;
  noInvoice: string;
  venue: { nama: string };
  periodeMulai: string;
  periodeAkhir: string;
  totalTagihan: number;
  status: string;
  jatuhTempo: string;
  pembayarans?: Pembayaran[];
}

interface Pembayaran {
  id: string;
  tanggal: string;
  jumlah: number;
  keterangan: string;
  invoice: { noInvoice: string; venue: { nama: string } };
}

export default function PaymentsPage() {
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState({ invoiceId: '', jumlah: 0, keterangan: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/invoices?status=BELUM_DIBAYAR').then((r) => r.json()),
      fetch('/api/invoices?status=TELAT').then((r) => r.json()),
      fetch('/api/payments').then((r) => r.json()),
    ])
      .then(([unpaid, late, payments]) => {
        const invoices: Invoice[] = [];
        if (unpaid.success) invoices.push(...unpaid.data);
        if (late.success) invoices.push(...late.data);
        setUnpaidInvoices(invoices);
        if (payments.success) setPaymentHistory(payments.data);
      })
      .catch(() => toast.error('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.invoiceId) newErrors.invoiceId = 'Invoice wajib dipilih';
    if (!form.jumlah || form.jumlah <= 0) newErrors.jumlah = 'Jumlah harus lebih dari 0';
    if (selectedInvoice && form.jumlah > selectedInvoice.totalTagihan) {
      newErrors.jumlah = 'Jumlah melebihi total tagihan';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openPayModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setForm({ invoiceId: invoice.id, jumlah: invoice.totalTagihan, keterangan: '' });
    setErrors({});
    setShowPayModal(true);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Pembayaran berhasil dicatat');
        setShowPayModal(false);
        setSelectedInvoice(null);
        fetchData();
      } else {
        toast.error(data.error || 'Gagal memproses pembayaran');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + inv.totalTagihan, 0);

  const handleExportPDF = async () => {
    if (paymentHistory.length === 0) {
      toast.error('Tidak ada data pembayaran untuk diekspor');
      return;
    }
    setExporting('pdf');
    try {
      const headers = ['Tanggal', 'Invoice', 'Venue', 'Jumlah', 'Keterangan'];
      const data = paymentHistory.map((p) => [
        formatDate(p.tanggal),
        p.invoice?.noInvoice || '',
        p.invoice?.venue?.nama || '',
        p.jumlah,
        p.keterangan || '-',
      ]);
      const total = paymentHistory.reduce((sum, p) => sum + p.jumlah, 0);
      data.push(['', '', 'TOTAL', total, '']);
      exportToPDF('Riwayat Pembayaran', headers, data, `pembayaran-${new Date().toISOString().slice(0, 10)}`,
        `${paymentHistory.length} transaksi pembayaran`);
      toast.success('PDF berhasil diunduh');
    } catch {
      toast.error('Gagal mengekspor PDF');
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = () => {
    if (paymentHistory.length === 0) {
      toast.error('Tidak ada data pembayaran untuk diekspor');
      return;
    }
    setExporting('excel');
    try {
      const headers = ['Tanggal', 'Invoice', 'Venue', 'Jumlah', 'Keterangan'];
      const data = paymentHistory.map((p) => [
        p.tanggal,
        p.invoice?.noInvoice || '',
        p.invoice?.venue?.nama || '',
        p.jumlah,
        p.keterangan || '',
      ]);
      exportToExcel(headers, data, `pembayaran-${new Date().toISOString().slice(0, 10)}`);
      toast.success('Excel berhasil diunduh');
    } catch {
      toast.error('Gagal mengekspor Excel');
    } finally {
      setExporting(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">Pembayaran</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleExportPDF} disabled={exporting === 'pdf'} className="btn-secondary flex items-center gap-2 text-sm">
              {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export PDF
            </button>
            <button onClick={handleExportExcel} disabled={exporting === 'excel'} className="btn-secondary flex items-center gap-2 text-sm">
              {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Export Excel
            </button>
            <div className="card px-4 py-2">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Total Belum Dibayar</p>
              <p className="text-[hsl(var(--primary))] font-bold text-lg">{formatRupiah(totalUnpaid)}</p>
            </div>
          </div>
        </div>

        {/* Unpaid Invoices */}
        <div>
          <h4 className="text-sm font-medium text-[hsl(var(--foreground))] mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Invoice Belum Dibayar / Telat
          </h4>
          {loading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="card h-16" />)}
            </div>
          ) : unpaidInvoices.length === 0 ? (
            <div className="card text-center text-[hsl(var(--muted-text))] py-8">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--primary))]" />
              Semua invoice sudah dibayar
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
                  {unpaidInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-[hsl(var(--table-border))] hover:bg-[hsl(var(--table-row-hover))]">
                      <td className="py-3 px-3 text-[hsl(var(--foreground))] font-mono text-xs">{inv.noInvoice}</td>
                      <td className="py-3 px-3 text-[hsl(var(--foreground))]">{inv.venue?.nama}</td>
                      <td className="py-3 px-3 text-[hsl(var(--muted-foreground))] text-xs">{formatDate(inv.periodeMulai)} - {formatDate(inv.periodeAkhir)}</td>
                      <td className="py-3 px-3 text-right text-[hsl(var(--primary))] font-medium">{formatRupiah(inv.totalTagihan)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`badge ${getStatusColor(inv.status)}`}>{getStatusLabel(inv.status)}</span>
                      </td>
                      <td className="py-3 px-3 text-[hsl(var(--muted-foreground))]">{formatDate(inv.jatuhTempo)}</td>
                      <td className="py-3 px-3 text-center">
                        <button onClick={() => openPayModal(inv)} className="btn-primary text-xs px-3 py-1">
                          Bayar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div>
          <h4 className="text-sm font-medium text-[hsl(var(--foreground))] mb-3">Riwayat Pembayaran</h4>
          {loading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2].map((i) => <div key={i} className="card h-14" />)}
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="card text-center text-[hsl(var(--muted-text))] py-8">Belum ada riwayat pembayaran</div>
          ) : (
            <div className="card overflow-hidden p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Tanggal</th>
                    <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Invoice</th>
                    <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Venue</th>
                    <th className="text-right py-3 px-3 text-[hsl(var(--table-header))] font-medium">Jumlah</th>
                    <th className="text-left py-3 px-3 text-[hsl(var(--table-header))] font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((p) => (
                    <tr key={p.id} className="border-b border-[hsl(var(--table-border))] hover:bg-[hsl(var(--table-row-hover))]">
                      <td className="py-3 px-3 text-[hsl(var(--muted-foreground))]">{formatDate(p.tanggal)}</td>
                      <td className="py-3 px-3 text-[hsl(var(--foreground))] font-mono text-xs">{p.invoice?.noInvoice}</td>
                      <td className="py-3 px-3 text-[hsl(var(--foreground))]">{p.invoice?.venue?.nama}</td>
                      <td className="py-3 px-3 text-right text-[hsl(var(--primary))] font-medium">{formatRupiah(p.jumlah)}</td>
                      <td className="py-3 px-3 text-[hsl(var(--muted-foreground))]">{p.keterangan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pay Modal */}
        {showPayModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPayModal(false)}>
            <div className="card w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold font-display text-[hsl(var(--foreground))] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[hsl(var(--primary))]" />
                  Bayar Invoice
                </h4>
                <button onClick={() => setShowPayModal(false)} className="p-1 hover:bg-[hsl(var(--surface-hover))] rounded">
                  <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>

              <div className="card p-3 mb-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-[hsl(var(--muted-foreground))]">Invoice</span>
                  <span className="text-[hsl(var(--foreground))] font-mono text-xs">{selectedInvoice.noInvoice}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[hsl(var(--muted-foreground))]">Venue</span>
                  <span className="text-[hsl(var(--foreground))]">{selectedInvoice.venue?.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">Total Tagihan</span>
                  <span className="text-[hsl(var(--primary))] font-bold">{formatRupiah(selectedInvoice.totalTagihan)}</span>
                </div>
              </div>

              <form onSubmit={handlePay} className="space-y-4">
                <div>
                  <label className="text-sm text-[hsl(var(--foreground))] mb-1 block">Jumlah Pembayaran</label>
                  <input
                    type="number"
                    value={form.jumlah || ''}
                    onChange={(e) => setForm({ ...form, jumlah: parseInt(e.target.value) || 0 })}
                    className={`input-field w-full ${errors.jumlah ? 'border-red-500' : ''}`}
                    min={1}
                    required
                  />
                  {errors.jumlah && <p className="text-red-500 text-xs mt-1">{errors.jumlah}</p>}
                </div>
                <div>
                  <label className="text-sm text-[hsl(var(--foreground))] mb-1 block">Keterangan</label>
                  <input
                    type="text"
                    value={form.keterangan}
                    onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                    className="input-field w-full"
                    placeholder="Opsional"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                    {submitting ? 'Memproses...' : 'Bayar'}
                  </button>
                  <button type="button" onClick={() => setShowPayModal(false)} className="btn-secondary">Batal</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
