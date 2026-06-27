export type { Role, VenueStatus, InvoiceStatus, JenisStokMasuk } from '@prisma/client';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  totalVenueAktif: number;
  totalProduk: number;
  totalPenjualanBulanIni: number;
  totalTagihanBelumBayar: number;
  invoiceTelat: number;
  stokRendah: Array<{
    venueNama: string;
    produkNama: string;
    sisaStok: number;
  }>;
}

export interface StokInfo {
  produkId: string;
  produkNama: string;
  sku: string;
  totalMasuk: number;
  totalTerjual: number;
  totalRetur: number;
  sisaStok: number;
}

export interface InvoiceWithDetails {
  id: string;
  venueNama: string;
  periodeMulai: Date;
  periodeAkhir: Date;
  totalTagihan: number;
  status: string;
  jatuhTempo: Date;
  items: Array<{
    produkNama: string;
    qtyTerjual: number;
    hargaSatuan: number;
    subtotal: number;
  }>;
}
