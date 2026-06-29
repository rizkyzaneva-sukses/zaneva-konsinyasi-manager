import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

type TrialSummary = {
  venues: number;
  venueUsers: number;
  products: number;
  stockMovements: number;
  sales: number;
  returns: number;
  invoices: number;
  payments: number;
};

const emptySummary: TrialSummary = {
  venues: 0,
  venueUsers: 0,
  products: 0,
  stockMovements: 0,
  sales: 0,
  returns: 0,
  invoices: 0,
  payments: 0,
};

const dummyProducts = [
  { nama: 'Zaneva AirFlex Top Black', sku: 'ZNV-AFT-BLK', kategori: 'Top', hargaJual: 189000 },
  { nama: 'Zaneva AirFlex Top Sage', sku: 'ZNV-AFT-SGE', kategori: 'Top', hargaJual: 189000 },
  { nama: 'Zaneva Move Skirt Navy', sku: 'ZNV-MVS-NVY', kategori: 'Bottom', hargaJual: 179000 },
  { nama: 'Zaneva Sport Hijab Black', sku: 'ZNV-SHJ-BLK', kategori: 'Hijab', hargaJual: 99000 },
  { nama: 'Zaneva Active Set Maroon', sku: 'ZNV-AST-MRN', kategori: 'Set', hargaJual: 329000 },
];

const dummyVenues = [
  {
    nama: 'Zaneva Booth Bandung',
    alamat: 'Jl. Riau No. 12, Bandung',
    picNama: 'Nadia Rahma',
    picKontakWa: '628121110001',
    username: 'venue-bandung',
  },
  {
    nama: 'Zaneva Partner Bekasi',
    alamat: 'Summarecon Bekasi, Jawa Barat',
    picNama: 'Salsa Amira',
    picKontakWa: '628121110002',
    username: 'venue-bekasi',
  },
  {
    nama: 'Zaneva Pop Up Surabaya',
    alamat: 'Pakuwon Mall, Surabaya',
    picNama: 'Dewi Lestari',
    picKontakWa: '628121110003',
    username: 'venue-surabaya',
  },
];

export async function resetTrialData(): Promise<TrialSummary> {
  await prisma.$transaction([
    prisma.pembayaran.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.returBarang.deleteMany(),
    prisma.laporanPenjualan.deleteMany(),
    prisma.stokMasuk.deleteMany(),
    prisma.reorderPoint.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany({ where: { role: 'VENUE' } }),
    prisma.produk.deleteMany(),
    prisma.venue.deleteMany(),
  ]);

  return { ...emptySummary };
}

export async function seedDummyData(ownerUserId: string): Promise<TrialSummary> {
  await resetTrialData();

  const summary = { ...emptySummary };
  const venuePasswordHash = await bcrypt.hash('venue123', 10);

  const products = await Promise.all(
    dummyProducts.map((product) => prisma.produk.create({ data: product }))
  );
  summary.products = products.length;

  const venues = [];
  for (const venue of dummyVenues) {
    const createdVenue = await prisma.venue.create({
      data: {
        nama: venue.nama,
        alamat: venue.alamat,
        picNama: venue.picNama,
        picKontakWa: venue.picKontakWa,
        status: 'AKTIF',
        marginPersenZaneva: 30,
        periodeSettlementHari: 14,
      },
    });
    venues.push({ ...createdVenue, username: venue.username, picNama: venue.picNama });

    await prisma.user.create({
      data: {
        nama: venue.picNama,
        username: venue.username,
        passwordHash: venuePasswordHash,
        role: 'VENUE',
        venueId: createdVenue.id,
      },
    });
  }
  summary.venues = venues.length;
  summary.venueUsers = venues.length;

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);

  for (const venue of venues) {
    for (const [index, product] of products.entries()) {
      await prisma.stokMasuk.create({
        data: {
          venueId: venue.id,
          produkId: product.id,
          qty: 15 + index * 2,
          jenis: 'DROP_AWAL',
          tanggal: sevenDaysAgo,
          keterangan: 'Dummy trial drop awal',
          createdBy: ownerUserId,
        },
      });
      await prisma.reorderPoint.create({
        data: {
          venueId: venue.id,
          produkId: product.id,
          minStok: 4 + index,
        },
      });
      summary.stockMovements++;
    }
  }

  for (const [venueIndex, venue] of venues.entries()) {
    for (const [productIndex, product] of products.slice(0, 4).entries()) {
      await prisma.laporanPenjualan.create({
        data: {
          venueId: venue.id,
          produkId: product.id,
          qtyTerjual: venueIndex + productIndex + 1,
          qtyRetur: productIndex === 2 ? 1 : 0,
          tanggal: productIndex % 2 === 0 ? threeDaysAgo : now,
          keterangan: 'Dummy trial penjualan',
          inputBy: ownerUserId,
        },
      });
      summary.sales++;
    }
  }

  await prisma.returBarang.create({
    data: {
      venueId: venues[0].id,
      produkId: products[1].id,
      qty: 1,
      kondisi: 'Kemasan rusak',
      alasan: 'Sample retur dummy trial',
      tanggal: now,
    },
  });
  summary.returns = 1;

  for (const [index, venue] of venues.entries()) {
    const periodeMulai = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodeAkhir = new Date(now.getFullYear(), now.getMonth(), 15);
    const jatuhTempo = new Date(periodeAkhir);
    jatuhTempo.setDate(jatuhTempo.getDate() + 7);

    const venueSales = await prisma.laporanPenjualan.findMany({
      where: { venueId: venue.id },
      include: { produk: true },
    });
    const items = venueSales.map((sale) => {
      const hargaSatuan = Math.round(sale.produk.hargaJual * 0.7);
      return {
        produkId: sale.produkId,
        qtyTerjual: sale.qtyTerjual,
        hargaSatuan,
        subtotal: sale.qtyTerjual * hargaSatuan,
      };
    });
    const totalTagihan = items.reduce((sum, item) => sum + item.subtotal, 0);

    const invoice = await prisma.invoice.create({
      data: {
        noInvoice: `ZKM-${now.getFullYear()}-${String(index + 1).padStart(4, '0')}`,
        venueId: venue.id,
        periodeMulai,
        periodeAkhir,
        totalTagihan,
        status: index === 0 ? 'SUDAH_DIBAYAR' : 'BELUM_DIBAYAR',
        jatuhTempo,
        items: { create: items },
      },
    });
    summary.invoices++;

    if (index === 0) {
      await prisma.pembayaran.create({
        data: {
          invoiceId: invoice.id,
          jumlah: totalTagihan,
          status: 'APPROVED',
          verifiedBy: ownerUserId,
          verifiedAt: new Date(),
          keterangan: 'Dummy trial pembayaran lunas',
        },
      });
      summary.payments++;
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: ownerUserId,
      aksi: 'SEED_DUMMY',
      tabelTerkait: 'TrialData',
      recordId: 'trial-data',
      dataSesudah: summary,
      keterangan: 'Owner/Admin menyuntik data dummy trial',
    },
  });

  return summary;
}
