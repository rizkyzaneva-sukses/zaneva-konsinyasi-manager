import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { returSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';
import { sendWebhook } from '@/lib/webhook';
import { calculateStok } from '@/lib/stock';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF', 'VENUE');
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');

    const where = session.role === 'VENUE'
      ? { venueId: session.venueId! }
      : venueId ? { venueId } : {};

    const returns = await prisma.returBarang.findMany({
      where,
      orderBy: { tanggal: 'desc' },
      include: {
        produk: { select: { nama: true, sku: true } },
        venue: { select: { nama: true } },
      },
    });

    return NextResponse.json({ success: true, data: returns });
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
    const data = returSchema.parse(body);

    const stok = await calculateStok(data.venueId, data.produkId);
    if (stok < data.qty) {
      const produk = await prisma.produk.findUnique({ where: { id: data.produkId } });
      return NextResponse.json(
        { success: false, error: `Stok ${produk?.nama || 'produk'} tidak cukup. Sisa stok: ${stok}` },
        { status: 400 }
      );
    }

    const retur = await prisma.returBarang.create({
      data: {
        venueId: data.venueId,
        produkId: data.produkId,
        qty: data.qty,
        kondisi: data.kondisi,
        alasan: data.alasan,
        tanggal: data.tanggal ? new Date(data.tanggal) : new Date(),
      },
      include: { produk: true, venue: true },
    });

    await createAuditLog({
      userId: session.userId,
      aksi: 'CREATE',
      tabelTerkait: 'ReturBarang',
      recordId: retur.id,
      dataSesudah: retur,
    });

    // Webhook: retur diproses
    sendWebhook('RETUR_DIPROSES', {
      venueNama: retur.venue.nama,
      produkNama: retur.produk.nama,
      qty: retur.qty,
      kondisi: retur.kondisi,
    });

    return NextResponse.json({ success: true, data: retur }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
