import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { produkSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('ADMIN');
    const { id } = await params;
    const body = await request.json();
    const data = produkSchema.partial().parse(body);

    const existing = await prisma.produk.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    const produk = await prisma.produk.update({
      where: { id },
      data,
    });

    await createAuditLog({
      userId: session.userId,
      aksi: 'UPDATE',
      tabelTerkait: 'Produk',
      recordId: id,
      dataSebelum: existing,
      dataSesudah: produk,
    });

    return NextResponse.json({ success: true, data: produk });
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
