import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';
import { sendWebhook } from '@/lib/webhook';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function refreshInvoiceStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { totalTagihan: true, jatuhTempo: true },
  });

  if (!invoice) return false;

  const approvedPayments = await prisma.pembayaran.aggregate({
    where: { invoiceId, status: 'APPROVED' },
    _sum: { jumlah: true },
  });

  const isLunas = (approvedPayments._sum.jumlah || 0) >= invoice.totalTagihan;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: isLunas
        ? 'SUDAH_DIBAYAR'
        : invoice.jatuhTempo < new Date()
          ? 'TELAT'
          : 'BELUM_DIBAYAR',
    },
  });

  return isLunas;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRole('ADMIN');
    const { id } = await context.params;
    const body = await request.json();
    const action = body.action as 'approve' | 'reject' | undefined;

    if (!['approve', 'reject'].includes(action || '')) {
      return NextResponse.json({ success: false, error: 'Action tidak valid' }, { status: 400 });
    }

    const payment = await prisma.pembayaran.findUnique({
      where: { id },
      include: { invoice: { include: { venue: true } } },
    });

    if (!payment) {
      return NextResponse.json({ success: false, error: 'Pembayaran tidak ditemukan' }, { status: 404 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Pembayaran sudah diproses' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      const approvedPayments = await prisma.pembayaran.aggregate({
        where: { invoiceId: payment.invoiceId, status: 'APPROVED' },
        _sum: { jumlah: true },
      });
      const approvedTotal = approvedPayments._sum.jumlah || 0;

      if (approvedTotal + payment.jumlah > payment.invoice.totalTagihan) {
        return NextResponse.json(
          {
            success: false,
            error: `Approval melebihi tagihan. Sisa: ${payment.invoice.totalTagihan - approvedTotal}`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.pembayaran.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        verifiedBy: session.userId,
        verifiedAt: new Date(),
        rejectedReason: action === 'reject' ? body.rejectedReason || 'Ditolak Owner' : null,
      },
      include: { invoice: { include: { venue: true } } },
    });

    const isLunas = await refreshInvoiceStatus(payment.invoiceId);

    await createAuditLog({
      userId: session.userId,
      aksi: action === 'approve' ? 'APPROVE' : 'REJECT',
      tabelTerkait: 'Pembayaran',
      recordId: id,
      dataSebelum: payment,
      dataSesudah: updated,
    });

    sendWebhook(action === 'approve' ? 'PEMBAYARAN_DIVERIFIKASI' : 'PEMBAYARAN_DITOLAK', {
      invoiceId: payment.invoiceId,
      venueNama: payment.invoice.venue.nama,
      jumlah: payment.jumlah,
      isLunas,
    });

    return NextResponse.json({ success: true, data: { ...updated, isLunas } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('PUT payment approval error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
