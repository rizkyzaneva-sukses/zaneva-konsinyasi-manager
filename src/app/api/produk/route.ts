import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { produkSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await requireRole('ADMIN', 'STAFF', 'VENUE');

    const where = session.role === 'VENUE' ? { aktif: true } : {};

    const produks = await prisma.produk.findMany({
      where,
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json({ success: true, data: produks });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');
    const body = await request.json();
    const data = produkSchema.parse(body);

    const existing = await prisma.produk.findUnique({ where: { sku: data.sku } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'SKU sudah ada' }, { status: 400 });
    }

    const produk = await prisma.produk.create({ data });

    await createAuditLog({
      userId: session.userId,
      aksi: 'CREATE',
      tabelTerkait: 'Produk',
      recordId: produk.id,
      dataSesudah: produk,
    });

    return NextResponse.json({ success: true, data: produk }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
