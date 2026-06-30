import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const produks = await prisma.produk.findMany({
      where: { aktif: true },
      orderBy: { nama: 'asc' },
    });

    const header = 'nama,sku,kategori,hargaJual';
    const rows = produks.map((p) =>
      [
        `"${p.nama.replace(/"/g, '""')}"`,
        `"${p.sku.replace(/"/g, '""')}"`,
        `"${p.kategori.replace(/"/g, '""')}"`,
        p.hargaJual,
      ].join(',')
    );

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="produk_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: 'Gagal export data' }, { status: 500 });
  }
}
