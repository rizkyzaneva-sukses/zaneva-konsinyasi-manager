import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { laporanPenjualanSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';
import { sendWebhook } from '@/lib/webhook';
import { calculateStok } from '@/lib/stock';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF', 'VENUE');
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: {
      venueId?: string;
      tanggal?: { gte?: Date; lte?: Date };
    } = session.role === 'VENUE'
      ? { venueId: session.venueId! }
      : venueId ? { venueId } : {};

    if (from || to) {
      where.tanggal = {};
      if (from) where.tanggal.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.tanggal.lte = end;
      }
    }

    const [data, total] = await Promise.all([
      prisma.laporanPenjualan.findMany({
        where,
        orderBy: { tanggal: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          produk: { select: { nama: true, sku: true, hargaJual: true } },
          venue: { select: { nama: true } },
          user: { select: { nama: true } },
        },
      }),
      prisma.laporanPenjualan.count({ where }),
    ]);

    const enrichedData = data.map((item) => ({
      ...item,
      totalHarga: item.qtyTerjual * item.produk.hargaJual,
    }));

    return NextResponse.json({
      success: true,
      data: enrichedData,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('VENUE', 'ADMIN', 'STAFF');
    const body = await request.json();
    const data = laporanPenjualanSchema.parse(body);

    const venueId = session.role === 'VENUE' ? session.venueId! : body.venueId;

    if (!venueId) {
      return NextResponse.json({ success: false, error: 'venueId wajib' }, { status: 400 });
    }

    // Validate stock for each item
    for (const item of data.items) {
      const stok = await calculateStok(venueId, item.produkId);
      if (stok < (item.qtyTerjual + (item.qtyRetur || 0))) {
        const produk = await prisma.produk.findUnique({ where: { id: item.produkId } });
        return NextResponse.json(
          { success: false, error: `Stok ${produk?.nama} tidak cukup. Sisa: ${stok}` },
          { status: 400 }
        );
      }
    }

    // Create all sales records in transaction
    const results = await prisma.$transaction(
      data.items.map((item) =>
        prisma.laporanPenjualan.create({
          data: {
            venueId,
            produkId: item.produkId,
            qtyTerjual: item.qtyTerjual,
            qtyRetur: item.qtyRetur || 0,
            tanggal: data.tanggal ? new Date(data.tanggal) : new Date(),
            keterangan: data.keterangan,
            inputBy: session.userId,
          },
          include: { produk: true },
        })
      )
    );

    // Audit log
    for (const result of results) {
      await createAuditLog({
        userId: session.userId,
        aksi: 'CREATE',
        tabelTerkait: 'LaporanPenjualan',
        recordId: result.id,
        dataSesudah: result,
      });
    }

    // Webhook: laporan penjualan masuk
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    sendWebhook('LAPORAN_PENJUALAN', {
      venueNama: venue?.nama,
      itemCount: results.length,
      tanggal: data.tanggal || new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: results }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('POST sales error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
