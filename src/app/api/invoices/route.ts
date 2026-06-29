import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';
import { sendWebhook } from '@/lib/webhook';
import { generateInvoiceNumber, presentInvoice } from '@/lib/invoice';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF', 'VENUE');
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = {};
    if (session.role === 'VENUE') {
      where.venueId = session.venueId;
    } else if (venueId) {
      where.venueId = venueId;
    }
    if (status) {
      where.status = status;
    }
    if (from || to) {
      const createdAt: { gte?: Date; lte?: Date } = {};
      if (from) createdAt.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        venue: { select: { nama: true } },
        items: { include: { produk: { select: { nama: true } } } },
        pembayaran: true,
      },
    });

    return NextResponse.json({ success: true, data: invoices.map(presentInvoice) });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF');
    const body = await request.json();
    const { venueId, periodeMulai, periodeAkhir } = body;

    if (!venueId || !periodeMulai || !periodeAkhir) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { laporanPenjualan: true },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue tidak ditemukan' }, { status: 404 });
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        venueId,
        periodeMulai: new Date(periodeMulai),
        periodeAkhir: new Date(periodeAkhir),
      },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice untuk venue dan periode ini sudah pernah dibuat' },
        { status: 409 }
      );
    }

    // Get sales data for the period
    const salesData = await prisma.laporanPenjualan.groupBy({
      by: ['produkId'],
      where: {
        venueId,
        tanggal: {
          gte: new Date(periodeMulai),
          lte: new Date(periodeAkhir),
        },
      },
      _sum: { qtyTerjual: true },
    });

    if (salesData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada data penjualan pada periode ini' },
        { status: 400 }
      );
    }

    // Get products for pricing
    const produkIds = salesData.map((s: { produkId: string }) => s.produkId);
    const produks = await prisma.produk.findMany({
      where: { id: { in: produkIds } },
    });
    const produkMap = new Map(produks.map((p: { id: string; hargaJual: number }) => [p.id, p]));

    // Calculate invoice items
    let totalTagihan = 0;
    const items = salesData.map((sale: { produkId: string; _sum: { qtyTerjual: number | null } }) => {
      const produk = produkMap.get(sale.produkId) as { hargaJual: number } | undefined;
      if (!produk) return null;
      const qtyTerjual = sale._sum.qtyTerjual || 0;
      // Margin: venue gets (100 - marginPersenZaneva)% of harga jual
      const hargaSatuan = Math.round(produk.hargaJual * (100 - venue.marginPersenZaneva) / 100);
      const subtotal = qtyTerjual * hargaSatuan;
      totalTagihan += subtotal;

      return {
        produkId: sale.produkId,
        qtyTerjual,
        hargaSatuan,
        subtotal,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    // Calculate jatuh tempo
    const jatuhTempo = new Date(periodeAkhir);
    jatuhTempo.setDate(jatuhTempo.getDate() + 7); // 7 days after period end

    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        noInvoice: await generateInvoiceNumber(),
        venueId,
        periodeMulai: new Date(periodeMulai),
        periodeAkhir: new Date(periodeAkhir),
        totalTagihan,
        status: 'BELUM_DIBAYAR',
        jatuhTempo,
        items: {
          create: items,
        },
      },
      include: {
        items: { include: { produk: true } },
        venue: true,
      },
    });

    await createAuditLog({
      userId: session.userId,
      aksi: 'CREATE',
      tabelTerkait: 'Invoice',
      recordId: invoice.id,
      dataSesudah: invoice,
    });

    // Webhook: invoice terbit
    sendWebhook('INVOICE_TERBIT', {
      invoiceId: invoice.id,
      venueNama: venue.nama,
      totalTagihan,
      jatuhTempo: jatuhTempo.toISOString(),
    });

    return NextResponse.json({ success: true, data: presentInvoice(invoice) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('POST invoice error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
