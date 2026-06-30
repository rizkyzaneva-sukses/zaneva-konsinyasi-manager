import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import type { DashboardStats } from '@/types';
import { getVenueStock } from '@/lib/stock';

export async function GET() {
  try {
    await requireRole('ADMIN', 'STAFF');

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

    // Get low stock venues — fetch all in parallel
    const venues = await prisma.venue.findMany({ where: { status: 'AKTIF' } });

    const stockResults = await Promise.all(
      venues.map(async (venue) => {
        const stockRows = await getVenueStock(venue.id);
        return { venueNama: venue.nama, stockRows };
      })
    );

    const stokRendah: DashboardStats['stokRendah'] = [];
    for (const { venueNama, stockRows } of stockResults) {
      for (const row of stockRows) {
        if (row.sisaStok <= 5) {
          stokRendah.push({
            venueNama,
            produkNama: row.produkNama,
            sisaStok: row.sisaStok,
          });
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
