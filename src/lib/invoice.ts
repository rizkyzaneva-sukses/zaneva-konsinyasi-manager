import { prisma } from './prisma';

type InvoiceLike = {
  id: string;
  noInvoice?: string | null;
  createdAt?: Date | string;
  items?: Array<{
    id: string;
    produkId: string;
    qtyTerjual: number;
    hargaSatuan: number;
    subtotal: number;
    produk?: { nama?: string | null } | null;
  }>;
  pembayaran?: unknown[];
  pembayarans?: unknown[];
};

type PaymentLike = {
  tanggalBayar?: Date | string;
  status?: string;
  [key: string]: unknown;
};

export function getInvoiceNumber(invoice: InvoiceLike): string {
  if (invoice.noInvoice) return invoice.noInvoice;
  const date = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
  const year = date.getFullYear();
  return `ZKM-${year}-${invoice.id.slice(0, 8).toUpperCase()}`;
}

export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();

  // Use a transaction with row-level lock to prevent race conditions
  return prisma.$transaction(async (tx) => {
    // Find the highest invoice number for this year
    const lastInvoice = await tx.invoice.findFirst({
      where: {
        noInvoice: { startsWith: `ZKM-${year}-` },
      },
      orderBy: { noInvoice: 'desc' },
      select: { noInvoice: true },
    });

    let nextSeq = 1;
    if (lastInvoice?.noInvoice) {
      const parts = lastInvoice.noInvoice.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `ZKM-${year}-${String(nextSeq).padStart(4, '0')}`;
  });
}

export function presentInvoice<T extends InvoiceLike>(invoice: T) {
  const pembayaran = (invoice.pembayaran || invoice.pembayarans || []) as PaymentLike[];

  return {
    ...invoice,
    noInvoice: getInvoiceNumber(invoice),
    pembayarans: pembayaran.map((payment) => ({
      ...payment,
      tanggal: payment.tanggalBayar,
      statusLabel:
        payment.status === 'APPROVED'
          ? 'Disetujui'
          : payment.status === 'REJECTED'
            ? 'Ditolak'
            : 'Menunggu Verifikasi Owner',
    })),
    pembayaran,
    items: invoice.items?.map((item) => ({
      ...item,
      produkNama: item.produk?.nama || '',
      qty: item.qtyTerjual,
    })),
  };
}
