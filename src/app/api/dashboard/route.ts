import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import type { DashboardStats } from '@/types';

export async function GET() {
  try {
    const session = await requireRole('ADMIN', 'STAFF');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      totalVenueAktif,
      totalProduk,
      penjualanBulanIni,
      tagihanBelumBayar,
      invoiceTelat,
    ] = await Promise.all([
      prisma.venue.count({ where: { status: 'AKTIF' } }),
      prisma.produk.count({ where: { aktif: true } }),
      prisma.laporanPenjualan.aggregate({
        where: { tanggal: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { qtyTerjual: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'BELUM_DIBAYAR' },
        _sum: { totalTagihan: true },
      }),
      prisma.invoice.count({
        where: {
          status: 'BELUM_DIBAYAR',
          jatuhTempo: { lt: now },
        },
      }),
    ]);

    // Get low stock venues
    const venues = await prisma.venue.findMany({ where: { status: 'AKTIF' } });
    const stokRendah: DashboardStats['stokRendah'] = [];

    for (const venue of venues) {
      const stokMasuk = await prisma.stokMasuk.groupBy({
        by: ['produkId'],
        where: { venueId: venue.id },
        _sum: { qty: true },
      });

      const terjual = await prisma.laporanPenjualan.groupBy({
        by: ['produkId'],
        where: { venueId: venue.id },
        _sum: { qtyTerjual: true },
      });

      const masukMap = new Map(stokMasuk.map((s: { produkId: string; _sum: { qty: number | null } }) => [s.produkId, s._sum.qty || 0]));
      const terjualMap = new Map(terjual.map((t: { produkId: string; _sum: { qtyTerjual: number | null } }) => [t.produkId, t._sum.qtyTerjual || 0]));

      for (const [produkId, masuk] of masukMap) {
        const sisa = (masuk as number) - (terjualMap.get(produkId) || 0);
        if (sisa <= 5) {
          const produk = await prisma.produk.findUnique({ where: { id: produkId } });
          if (produk) {
            stokRendah.push({
              venueNama: venue.nama,
              produkNama: produk.nama,
              sisaStok: sisa,
            });
          }
        }
      }
    }

    const stats: DashboardStats = {
      totalVenueAktif,
      totalProduk,
      totalPenjualanBulanIni: penjualanBulanIni._sum.qtyTerjual || 0,
      totalTagihanBelumBayar: tagihanBelumBayar._sum.totalTagihan || 0,
      invoiceTelat,
      stokRendah,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
