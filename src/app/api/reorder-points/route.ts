import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF');
    const body = await request.json();
    const venueId = String(body.venueId || '');
    const produkId = String(body.produkId || '');
    const minStok = Number(body.minStok);

    if (!venueId || !produkId) {
      return NextResponse.json({ success: false, error: 'Venue dan produk wajib' }, { status: 400 });
    }

    if (!Number.isInteger(minStok) || minStok < 0) {
      return NextResponse.json({ success: false, error: 'ROP harus angka minimal 0' }, { status: 400 });
    }

    const existing = await prisma.reorderPoint.findUnique({
      where: { venueId_produkId: { venueId, produkId } },
    });

    const reorderPoint = await prisma.reorderPoint.upsert({
      where: { venueId_produkId: { venueId, produkId } },
      update: { minStok },
      create: { venueId, produkId, minStok },
      include: {
        venue: { select: { nama: true } },
        produk: { select: { nama: true, sku: true } },
      },
    });

    await createAuditLog({
      userId: session.userId,
      aksi: existing ? 'UPDATE' : 'CREATE',
      tabelTerkait: 'ReorderPoint',
      recordId: reorderPoint.id,
      dataSebelum: existing,
      dataSesudah: reorderPoint,
      keterangan: `ROP ${reorderPoint.produk.nama} di ${reorderPoint.venue.nama} = ${minStok}`,
    });

    return NextResponse.json({ success: true, data: reorderPoint });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('POST reorder point error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
