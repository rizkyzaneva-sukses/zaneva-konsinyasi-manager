import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { stokMasukSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';
import { sendWebhook } from '@/lib/webhook';
import { calculateStok, getVenueStock } from '@/lib/stock';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF', 'VENUE');
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');

    // VENUE role can only see their own stock
    const targetVenueId = session.role === 'VENUE' ? session.venueId : venueId;

    if (!targetVenueId) {
      return NextResponse.json({ success: false, error: 'venueId wajib' }, { status: 400 });
    }

    const result = await getVenueStock(targetVenueId);

    return NextResponse.json({ success: true, data: result });
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
    const data = stokMasukSchema.parse(body);

    // PENARIKAN reduces venue stock, validate enough stock before recording movement.
    if (data.jenis === 'PENARIKAN') {
      const stok = await calculateStok(data.venueId, data.produkId);
      if (stok < data.qty) {
        return NextResponse.json(
          { success: false, error: `Stok tidak cukup. Sisa stok: ${stok}` },
          { status: 400 }
        );
      }
    }

    const stokMasuk = await prisma.stokMasuk.create({
      data: {
        venueId: data.venueId,
        produkId: data.produkId,
        qty: data.qty,
        jenis: data.jenis,
        tanggal: data.tanggal ? new Date(data.tanggal) : new Date(),
        keterangan: data.keterangan,
        createdBy: session.userId,
      },
      include: { produk: true, venue: true },
    });

    await createAuditLog({
      userId: session.userId,
      aksi: 'CREATE',
      tabelTerkait: 'StokMasuk',
      recordId: stokMasuk.id,
      dataSesudah: stokMasuk,
    });

    // Webhook: BAST terbit
    await sendWebhook('BAST_TERBIT', {
      venueNama: stokMasuk.venue.nama,
      produkNama: stokMasuk.produk.nama,
      qty: stokMasuk.qty,
      jenis: stokMasuk.jenis,
    });

    const venueStock = await getVenueStock(data.venueId);
    const currentStock = venueStock.find((item) => item.produkId === data.produkId);
    if (currentStock && currentStock.sisaStok <= currentStock.minStok) {
      await sendWebhook('STOK_RENDAH', {
        venueNama: stokMasuk.venue.nama,
        produkNama: stokMasuk.produk.nama,
        sisaStok: currentStock.sisaStok,
        minStok: currentStock.minStok,
      });
    }

    return NextResponse.json({ success: true, data: stokMasuk }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
