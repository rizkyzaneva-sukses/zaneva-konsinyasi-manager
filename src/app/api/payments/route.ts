import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { pembayaranSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';
import { sendWebhook } from '@/lib/webhook';
import { getInvoiceNumber } from '@/lib/invoice';

export async function GET() {
  try {
    await requireRole('ADMIN', 'STAFF');

    const payments = await prisma.pembayaran.findMany({
      orderBy: { tanggalBayar: 'desc' },
      include: {
        invoice: {
          include: {
            venue: { select: { nama: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: payments.map((payment) => ({
        ...payment,
        tanggal: payment.tanggalBayar,
        invoice: {
          ...payment.invoice,
          noInvoice: getInvoiceNumber(payment.invoice),
        },
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF');
    const body = await request.json();
    const data = pembayaranSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { venue: true },
      });

      if (!invoice) {
        return { error: 'Invoice tidak ditemukan', status: 404 as const };
      }

      if (invoice.status === 'SUDAH_DIBAYAR') {
        return { error: 'Invoice sudah dibayar', status: 400 as const };
      }

      const existingPayments = await tx.pembayaran.aggregate({
        where: { invoiceId: data.invoiceId },
        _sum: { jumlah: true },
      });
      const paidBefore = existingPayments._sum.jumlah || 0;
      const totalPaid = paidBefore + data.jumlah;

      if (totalPaid > invoice.totalTagihan) {
        return {
          error: `Jumlah melebihi tagihan. Sisa: ${invoice.totalTagihan - paidBefore}`,
          status: 400 as const,
        };
      }

      const isLunas = totalPaid >= invoice.totalTagihan;

      const pembayaran = await tx.pembayaran.create({
        data: {
          invoiceId: data.invoiceId,
          jumlah: data.jumlah,
          keterangan: data.keterangan,
        },
      });

      if (isLunas) {
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: { status: 'SUDAH_DIBAYAR' },
        });
      }

      return { invoice, pembayaran, isLunas };
    });

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    const { invoice, pembayaran, isLunas } = result;

    await createAuditLog({
      userId: session.userId,
      aksi: 'CREATE',
      tabelTerkait: 'Pembayaran',
      recordId: pembayaran.id,
      dataSesudah: { ...pembayaran, isLunas },
    });

    // Webhook: pembayaran diterima
    sendWebhook('PEMBAYARAN_DITERIMA', {
      invoiceId: invoice.id,
      venueNama: invoice.venue.nama,
      jumlah: data.jumlah,
      isLunas,
    });

    return NextResponse.json({ success: true, data: { ...pembayaran, isLunas } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('POST payment error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
