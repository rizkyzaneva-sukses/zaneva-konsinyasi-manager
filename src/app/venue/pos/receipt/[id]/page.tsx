'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';

interface ReceiptItem {
  id: string;
  qty: number;
  harga: number;
  diskon: number;
  subtotal: number;
  produk: { nama: string; sku: string };
}

interface ReceiptOrder {
  id: string;
  orderNo: string;
  tanggal: string;
  customerNama: string;
  customerTelp: string;
  grandTotal: number;
  totalBayar: number;
  kembalian: number;
  diskonTotal: number;
  metodeBayar: string;
  catatan: string;
  items: ReceiptItem[];
  venue: { nama: string; alamat: string; telepon: string };
  user: { nama: string };
}

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<ReceiptOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/pos/orders/${orderId}`);
        const data = await res.json();
        if (data.success) {
          setOrder(data.data);
        } else {
          setError(data.error || 'Gagal memuat data pesanan');
        }
      } catch {
        setError('Terjadi kesalahan koneksi');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const getMetodeBayarLabel = (metode: string) => {
    switch (metode) {
      case 'CASH': return 'Tunai';
      case 'QRIS': return 'QRIS';
      case 'TRANSFER': return 'Transfer';
      case 'EDC': return 'EDC';
      default: return metode;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--background))]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[hsl(var(--background))] p-4">
        <p className="text-[hsl(var(--muted-foreground))] mb-4">{error || 'Pesanan tidak ditemukan'}</p>
        <button onClick={() => router.back()} className="btn-primary">
          Kembali
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Screen-only controls */}
      <div className="no-print fixed top-4 left-4 right-4 flex items-center justify-between z-40">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-hover))] transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold hover:opacity-90 transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4" />
          Cetak Struk
        </button>
      </div>

      {/* Receipt */}
      <div className="flex justify-center py-20 print:py-0">
        <div className="receipt w-[300px] bg-white text-black font-mono text-xs">
          {/* Header */}
          <div className="text-center mb-3">
            <p className="text-base font-bold tracking-wide">{order.venue.nama}</p>
            {order.venue.alamat && <p className="mt-0.5">{order.venue.alamat}</p>}
            {order.venue.telepon && <p>Telp: {order.venue.telepon}</p>}
          </div>

          <hr className="border-dashed border-black/30 my-2" />

          {/* Order Info */}
          <div className="space-y-0.5 mb-2">
            <div className="flex justify-between">
              <span>No. Pesanan</span>
              <span className="font-bold">{order.orderNo}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal</span>
              <span>{formatDateTime(order.tanggal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir</span>
              <span>{order.user.nama}</span>
            </div>
            {order.customerNama && (
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{order.customerNama}</span>
              </div>
            )}
            {order.customerTelp && (
              <div className="flex justify-between">
                <span>Telp</span>
                <span>{order.customerTelp}</span>
              </div>
            )}
          </div>

          <hr className="border-dashed border-black/30 my-2" />

          {/* Items */}
          <div className="space-y-1.5 mb-2">
            {order.items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between">
                  <span className="flex-1 pr-2">{item.produk.nama}</span>
                  <span className="text-right">{formatRupiah(item.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>
                    {item.qty} x {formatRupiah(item.harga)}
                    {item.diskon > 0 ? ` (-${formatRupiah(item.diskon)})` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <hr className="border-dashed border-black/30 my-2" />

          {/* Totals */}
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Grand Total</span>
              <span className="font-bold">{formatRupiah(order.grandTotal)}</span>
            </div>
            {order.diskonTotal > 0 && (
              <div className="flex justify-between">
                <span>Diskon</span>
                <span>-{formatRupiah(order.diskonTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Bayar ({getMetodeBayarLabel(order.metodeBayar)})</span>
              <span>{formatRupiah(order.totalBayar)}</span>
            </div>
            {order.kembalian > 0 && (
              <div className="flex justify-between">
                <span>Kembalian</span>
                <span>{formatRupiah(order.kembalian)}</span>
              </div>
            )}
          </div>

          <hr className="border-dashed border-black/30 my-2" />

          {/* Notes */}
          {order.catatan && (
            <div className="text-center text-gray-600 mb-2">
              <p>Catatan: {order.catatan}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-3">
            <p className="text-[10px] tracking-widest">TERIMA KASIH</p>
            <p className="text-[10px] text-gray-500 mt-1">{order.venue.nama}</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        .receipt {
          border: 1px dashed #ccc;
          padding: 16px;
          line-height: 1.6;
        }

        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .receipt {
            border: none;
            width: 100% !important;
            max-width: 300px;
            margin: 0;
            padding: 8px;
            box-shadow: none;
          }
        }
      `}</style>
    </>
  );
}
