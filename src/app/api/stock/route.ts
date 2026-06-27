import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { stokMasukSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';
import { sendWebhook } from '@/lib/webhook';

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

    // Calculate stock: masuk - terjual - retur
    const [stokMasuk, laporanPenjualan, returBarang] = await Promise.all([
      prisma.stokMasuk.groupBy({
        by: ['produkId'],
        where: { venueId: targetVenueId },
        _sum: { qty: true },
      }),
      prisma.laporanPenjualan.groupBy({
        by: ['produkId'],
        where: { venueId: targetVenueId },
        _sum: { qtyTerjual: true, qtyRetur: true },
      }),
      prisma.returBarang.groupBy({
        by: ['produkId'],
        where: { venueId: targetVenueId },
        _sum: { qty: true },
      }),
    ]);

    const produks = await prisma.produk.findMany({
      where: { aktif: true },
      orderBy: { nama: 'asc' },
    });

    const stokMap = new Map<string, number>();

    for (const s of stokMasuk) {
      stokMap.set(s.produkId, (stokMap.get(s.produkId) || 0) + (s._sum.qty || 0));
    }

    const terjualMap = new Map<string, number>();
    const returVenueMap = new Map<string, number>();

    for (const l of laporanPenjualan) {
      terjualMap.set(l.produkId, (terjualMap.get(l.produkId) || 0) + (l._sum.qtyTerjual || 0));
      returVenueMap.set(l.produkId, (returVenueMap.get(l.produkId) || 0) + (l._sum.qtyRetur || 0));
    }

    for (const r of returBarang) {
      returVenueMap.set(r.produkId, (returVenueMap.get(r.produkId) || 0) + (r._sum.qty || 0));
    }

    const result = produks.map((p: { id: string; nama: string; sku: string; kategori: string; hargaJual: number }) => {
      const masuk = stokMap.get(p.id) || 0;
      const terjual = terjualMap.get(p.id) || 0;
      const retur = returVenueMap.get(p.id) || 0;
      const sisa = masuk - terjual - retur;

      return {
        produkId: p.id,
        produkNama: p.nama,
        sku: p.sku,
        kategori: p.kategori,
        hargaJual: p.hargaJual,
        totalMasuk: masuk,
        totalTerjual: terjual,
        totalRetur: retur,
        sisaStok: sisa,
      };
    });

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

    // PENARIKAN reduces stock, validate enough stock
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
    sendWebhook('BAST_TERBIT', {
      venueNama: stokMasuk.venue.nama,
      produkNama: stokMasuk.produk.nama,
      qty: stokMasuk.qty,
      jenis: stokMasuk.jenis,
    });

    // Check if stock is low (threshold: 5)
    const sisaStok = await calculateStok(data.venueId, data.produkId);
    if (sisaStok <= 5) {
      sendWebhook('STOK_RENDAH', {
        venueNama: stokMasuk.venue.nama,
        produkNama: stokMasuk.produk.nama,
        sisaStok,
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

async function calculateStok(venueId: string, produkId: string): Promise<number> {
  const [masuk, terjual, returVenue, returBarang] = await Promise.all([
    prisma.stokMasuk.aggregate({
      where: { venueId, produkId },
      _sum: { qty: true },
    }),
    prisma.laporanPenjualan.aggregate({
      where: { venueId, produkId },
      _sum: { qtyTerjual: true },
    }),
    prisma.laporanPenjualan.aggregate({
      where: { venueId, produkId },
      _sum: { qtyRetur: true },
    }),
    prisma.returBarang.aggregate({
      where: { venueId, produkId },
      _sum: { qty: true },
    }),
  ]);

  return (
    (masuk._sum.qty || 0) -
    (terjual._sum.qtyTerjual || 0) -
    (returVenue._sum.qtyRetur || 0) -
    (returBarang._sum.qty || 0)
  );
}
