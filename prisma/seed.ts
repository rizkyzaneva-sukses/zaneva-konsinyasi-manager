import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      nama: 'Admin Zaneva',
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.username);

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 10);
  const staff = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      nama: 'Staff Operasional',
      username: 'staff',
      passwordHash: staffPassword,
      role: 'STAFF',
    },
  });
  console.log('✅ Staff user created:', staff.username);

  // Create sample venue
  const venue = await prisma.venue.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nama: 'Padel Arena Jakarta',
      alamat: 'Jl. Sudirman No. 123, Jakarta',
      picNama: 'Budi Santoso',
      picKontakWa: '6281234567890',
      status: 'AKTIF',
      marginPersenZaneva: 30,
      periodeSettlementHari: 14,
    },
  });
  console.log('✅ Venue created:', venue.nama);

  // Create venue user
  const venuePassword = await bcrypt.hash('venue123', 10);
  const venueUser = await prisma.user.upsert({
    where: { username: 'venue1' },
    update: {},
    create: {
      nama: 'Budi Santoso',
      username: 'venue1',
      passwordHash: venuePassword,
      role: 'VENUE',
      venueId: venue.id,
    },
  });
  console.log('✅ Venue user created:', venueUser.username);

  // Create sample products
  const products = [
    { nama: 'Bola Padel Wilson', sku: 'BP-WIL-001', kategori: 'Bola', hargaJual: 85000 },
    { nama: 'Bola Padel Head', sku: 'BP-HEAD-001', kategori: 'Bola', hargaJual: 90000 },
    { nama: 'Grip Padel Karakal', sku: 'GP-KAR-001', kategori: 'Aksesoris', hargaJual: 45000 },
    { nama: 'Overgrip Tourna', sku: 'OG-TOU-001', kategori: 'Aksesoris', hargaJual: 35000 },
    { nama: 'Botol Minum Zaneva', sku: 'BM-ZAN-001', kategori: 'Merchandise', hargaJual: 75000 },
  ];

  for (const product of products) {
    await prisma.produk.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  console.log('✅ Products created:', products.length);

  // Create sample stock
  const allProducts = await prisma.produk.findMany();
  for (const product of allProducts) {
    await prisma.stokMasuk.create({
      data: {
        venueId: venue.id,
        produkId: product.id,
        qty: 20,
        jenis: 'DROP_AWAL',
        createdBy: admin.id,
      },
    });
  }
  console.log('✅ Initial stock created for all products');

  console.log('\n🎉 Seed completed!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin:  admin / admin123');
  console.log('  Staff:  staff / staff123');
  console.log('  Venue:  venue1 / venue123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
