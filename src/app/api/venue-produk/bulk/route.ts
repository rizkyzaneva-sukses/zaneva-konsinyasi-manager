import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { bulkHargaSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');
    const body = await request.json();
    const data = bulkHargaSchema.parse(body);

    // Verify venue exists
    const venue = await prisma.venue.findUnique({ where: { id: data.venueId } });
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue tidak ditemukan' }, { status: 404 });
    }

    // Verify all products exist
    const produkIds = data.items.map((item) => item.produkId);
    const existingProduks = await prisma.produk.findMany({
      where: { id: { in: produkIds } },
    });
    if (existingProduks.length !== produkIds.length) {
      const missingIds = produkIds.filter((id) => !existingProduks.find((p) => p.id === id));
      return NextResponse.json(
        { success: false, error: `Produk tidak ditemukan: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Bulk upsert in transaction
    const results = await prisma.$transaction(
      data.items.map((item) =>
        prisma.venueProduk.upsert({
          where: {
            venueId_produkId: {
              venueId: data.venueId,
              produkId: item.produkId,
            },
          },
          update: {
            hargaJual: item.hargaJual,
            aktif: item.aktif ?? true,
          },
          create: {
            venueId: data.venueId,
            produkId: item.produkId,
            hargaJual: item.hargaJual,
            aktif: item.aktif ?? true,
          },
        })
      )
    );

    await createAuditLog({
      userId: session.userId,
      aksi: 'BULK_UPSERT',
      tabelTerkait: 'VenueProduk',
      recordId: data.venueId,
      dataSesudah: {
        venueId: data.venueId,
        itemsCount: results.length,
        items: results.map((r) => ({ id: r.id, produkId: r.produkId, hargaJual: r.hargaJual })),
      },
    });

    return NextResponse.json({ success: true, data: results }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('POST venue-produk/bulk error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
