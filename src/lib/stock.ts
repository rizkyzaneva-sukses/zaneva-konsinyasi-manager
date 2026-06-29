import { prisma } from './prisma';

type DbClient = typeof prisma;

type StockRow = {
  produkId: string;
  produkNama: string;
  sku: string;
  kategori: string;
  hargaJual: number;
  totalMasuk: number;
  totalPenarikan: number;
  totalTerjual: number;
  totalRetur: number;
  sisaStok: number;
  minStok: number;
  isBelowRop: boolean;
};

function signedStockQty(jenis: string, qty: number): number {
  return jenis === 'PENARIKAN' ? -qty : qty;
}

export async function calculateStok(
  venueId: string,
  produkId: string,
  db: DbClient = prisma
): Promise<number> {
  const [stokMovements, sales, returBarang] = await Promise.all([
    db.stokMasuk.findMany({
      where: { venueId, produkId },
      select: { qty: true, jenis: true },
    }),
    db.laporanPenjualan.aggregate({
      where: { venueId, produkId },
      _sum: { qtyTerjual: true, qtyRetur: true },
    }),
    db.returBarang.aggregate({
      where: { venueId, produkId },
      _sum: { qty: true },
    }),
  ]);

  const totalMovement = stokMovements.reduce(
    (sum, item) => sum + signedStockQty(item.jenis, item.qty),
    0
  );

  return (
    totalMovement -
    (sales._sum.qtyTerjual || 0) -
    (sales._sum.qtyRetur || 0) -
    (returBarang._sum.qty || 0)
  );
}

export async function getVenueStock(venueId: string, db: DbClient = prisma): Promise<StockRow[]> {
  const [stokMovements, laporanPenjualan, returBarang, reorderPoints, produks] = await Promise.all([
    db.stokMasuk.groupBy({
      by: ['produkId', 'jenis'],
      where: { venueId },
      _sum: { qty: true },
    }),
    db.laporanPenjualan.groupBy({
      by: ['produkId'],
      where: { venueId },
      _sum: { qtyTerjual: true, qtyRetur: true },
    }),
    db.returBarang.groupBy({
      by: ['produkId'],
      where: { venueId },
      _sum: { qty: true },
    }),
    db.reorderPoint.findMany({
      where: { venueId },
      select: { produkId: true, minStok: true },
    }),
    db.produk.findMany({
      where: { aktif: true },
      orderBy: { nama: 'asc' },
    }),
  ]);

  const masukMap = new Map<string, number>();
  const penarikanMap = new Map<string, number>();

  for (const item of stokMovements) {
    const qty = item._sum.qty || 0;
    if (item.jenis === 'PENARIKAN') {
      penarikanMap.set(item.produkId, (penarikanMap.get(item.produkId) || 0) + qty);
    } else {
      masukMap.set(item.produkId, (masukMap.get(item.produkId) || 0) + qty);
    }
  }

  const terjualMap = new Map<string, number>();
  const returMap = new Map<string, number>();

  for (const item of laporanPenjualan) {
    terjualMap.set(item.produkId, (terjualMap.get(item.produkId) || 0) + (item._sum.qtyTerjual || 0));
    returMap.set(item.produkId, (returMap.get(item.produkId) || 0) + (item._sum.qtyRetur || 0));
  }

  for (const item of returBarang) {
    returMap.set(item.produkId, (returMap.get(item.produkId) || 0) + (item._sum.qty || 0));
  }

  const ropMap = new Map(reorderPoints.map((item) => [item.produkId, item.minStok]));

  return produks.map((produk) => {
    const totalMasuk = masukMap.get(produk.id) || 0;
    const totalPenarikan = penarikanMap.get(produk.id) || 0;
    const totalTerjual = terjualMap.get(produk.id) || 0;
    const totalRetur = returMap.get(produk.id) || 0;
    const sisaStok = totalMasuk - totalPenarikan - totalTerjual - totalRetur;
    const minStok = ropMap.get(produk.id) ?? 5;

    return {
      produkId: produk.id,
      produkNama: produk.nama,
      sku: produk.sku,
      kategori: produk.kategori,
      hargaJual: produk.hargaJual,
      totalMasuk,
      totalPenarikan,
      totalTerjual,
      totalRetur,
      sisaStok,
      minStok,
      isBelowRop: sisaStok <= minStok,
    };
  });
}
