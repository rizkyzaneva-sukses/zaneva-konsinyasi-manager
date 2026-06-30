import { z } from 'zod';

// Auth
export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

// Venue
export const venueSchema = z.object({
  nama: z.string().min(1, 'Nama venue wajib diisi'),
  alamat: z.string().min(1, 'Alamat wajib diisi'),
  picNama: z.string().min(1, 'Nama PIC wajib diisi'),
  picKontakWa: z.string().min(1, 'Kontak WA PIC wajib diisi'),
  status: z.enum(['PROSPEK', 'NEGO', 'AKTIF', 'NONAKTIF']).optional(),
  marginPersenZaneva: z.number().min(0).max(100).optional(),
  periodeSettlementHari: z.number().min(1).optional(),
});

// Produk
export const produkSchema = z.object({
  nama: z.string().min(1, 'Nama produk wajib diisi'),
  sku: z.string().min(1, 'SKU wajib diisi'),
  kategori: z.string().min(1, 'Kategori wajib diisi'),
  hargaJual: z.number().min(0, 'Harga jual harus positif'),
  foto: z.string().optional(),
});

// Stok Masuk
export const stokMasukSchema = z.object({
  venueId: z.string().uuid(),
  produkId: z.string().uuid(),
  qty: z.number().min(1, 'Qty harus lebih dari 0'),
  jenis: z.enum(['DROP_AWAL', 'RESTOCK', 'PENARIKAN']),
  tanggal: z.string().optional(),
  keterangan: z.string().optional(),
});

// Laporan Penjualan
export const laporanPenjualanSchema = z.object({
  items: z.array(z.object({
    produkId: z.string().uuid(),
    qtyTerjual: z.number().min(0),
    qtyRetur: z.number().min(0).optional(),
  })).min(1, 'Minimal 1 item'),
  tanggal: z.string().optional(),
  keterangan: z.string().optional(),
});

// Pembayaran
export const pembayaranSchema = z.object({
  invoiceId: z.string().uuid(),
  jumlah: z.number().min(1, 'Jumlah harus lebih dari 0'),
  keterangan: z.string().optional(),
});

// Retur
export const returSchema = z.object({
  venueId: z.string().uuid(),
  produkId: z.string().uuid(),
  qty: z.number().min(1, 'Qty harus lebih dari 0'),
  kondisi: z.string().min(1, 'Kondisi wajib diisi'),
  alasan: z.string().min(1, 'Alasan wajib diisi'),
  tanggal: z.string().optional(),
});

// Venue Produk
export const venueProdukSchema = z.object({
  venueId: z.string().uuid(),
  produkId: z.string().uuid(),
  hargaJual: z.number().min(0),
  aktif: z.boolean().optional(),
});

export const bulkHargaSchema = z.object({
  venueId: z.string().uuid(),
  items: z.array(z.object({
    produkId: z.string().uuid(),
    hargaJual: z.number().min(0),
    aktif: z.boolean().optional(),
  })).min(1),
});

// POS
export const posOrderSchema = z.object({
  venueId: z.string().uuid(),
  items: z.array(z.object({
    produkId: z.string().uuid(),
    qty: z.number().min(1),
    harga: z.number().min(0),
    basePrice: z.number().min(0),
    diskonAmount: z.number().min(0).optional(),
  })).min(1),
  payments: z.array(z.object({
    method: z.string(),
    amount: z.number().min(0),
    referenceNo: z.string().optional(),
  })).min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  diskonTotal: z.number().min(0).optional(),
  notes: z.string().optional(),
  cashierName: z.string().optional(),
});

export const posRefundSchema = z.object({
  posOrderId: z.string().uuid(),
  type: z.enum(['Refund', 'Void']),
  amount: z.number().min(0).optional(),
  reason: z.string().min(1, 'Alasan wajib diisi'),
});
