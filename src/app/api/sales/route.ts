import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { laporanPenjualanSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';
import { sendWebhook } from '@/lib/webhook';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF', 'VENUE');
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = session.role === 'VENUE'
      ? { venueId: session.venueId! }
      : venueId ? { venueId } : {};

    const [data, total] = await Promise.all([
      prisma.laporanPenjualan.findMany({
        where,
        orderBy: { tanggal: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          produk: { select: { nama: true, sku: true } },
          venue: { select: { nama: true } },
          user: { select: { nama: true } },
        },
      }),
      prisma.laporanPenjualan.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data,
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

async function calculateStok(venueId: string, produkId: string): Promise<number> {
  const [masuk, terjual, returVenue, returBarang] = await Promise.all([
    prisma.stokMasuk.aggregate({ where: { venueId, produkId }, _sum: { qty: true } }),
    prisma.laporanPenjualan.aggregate({ where: { venueId, produkId }, _sum: { qtyTerjual: true } }),
    prisma.laporanPenjualan.aggregate({ where: { venueId, produkId }, _sum: { qtyRetur: true } }),
    prisma.returBarang.aggregate({ where: { venueId, produkId }, _sum: { qty: true } }),
  ]);

  return (
    (masuk._sum.qty || 0) -
    (terjual._sum.qtyTerjual || 0) -
    (returVenue._sum.qtyRetur || 0) -
    (returBarang._sum.qty || 0)
  );
}
