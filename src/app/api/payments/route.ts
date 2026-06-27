import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { pembayaranSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';
import { sendWebhook } from '@/lib/webhook';

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF');
    const body = await request.json();
    const data = pembayaranSchema.parse(body);

    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { venue: true },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice tidak ditemukan' }, { status: 404 });
    }

    if (invoice.status === 'SUDAH_DIBAYAR') {
      return NextResponse.json({ success: false, error: 'Invoice sudah dibayar' }, { status: 400 });
    }

    // Calculate total already paid
    const existingPayments = await prisma.pembayaran.aggregate({
      where: { invoiceId: data.invoiceId },
      _sum: { jumlah: true },
    });
    const totalPaid = (existingPayments._sum.jumlah || 0) + data.jumlah;

    if (totalPaid > invoice.totalTagihan) {
      return NextResponse.json(
        { success: false, error: `Jumlah melebihi tagihan. Sisa: ${invoice.totalTagihan - (existingPayments._sum.jumlah || 0)}` },
        { status: 400 }
      );
    }

    const isLunas = totalPaid >= invoice.totalTagihan;

    const pembayaran = await prisma.pembayaran.create({
      data: {
        invoiceId: data.invoiceId,
        jumlah: data.jumlah,
        keterangan: data.keterangan,
      },
    });

    // Update invoice status if fully paid
    if (isLunas) {
      await prisma.invoice.update({
        where: { id: data.invoiceId },
        data: { status: 'SUDAH_DIBAYAR' },
      });
    }

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
