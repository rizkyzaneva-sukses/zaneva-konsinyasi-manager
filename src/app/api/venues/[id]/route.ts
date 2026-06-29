import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { venueSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN', 'STAFF');
    const { id } = await params;

    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, nama: true, username: true, role: true } },
        stokMasuk: {
          orderBy: { tanggal: 'desc' },
          take: 20,
          include: { produk: true, user: { select: { nama: true } } },
        },
        laporanPenjualan: {
          orderBy: { tanggal: 'desc' },
          take: 20,
          include: { produk: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: venue });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('ADMIN');
    const { id } = await params;
    const body = await request.json();
    const data = venueSchema.partial().parse(body);

    const existing = await prisma.venue.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Venue tidak ditemukan' }, { status: 404 });
    }

    const venue = await prisma.venue.update({
      where: { id },
      data,
    });

    await createAuditLog({
      userId: session.userId,
      aksi: 'UPDATE',
      tabelTerkait: 'Venue',
      recordId: id,
      dataSebelum: existing,
      dataSesudah: venue,
    });

    return NextResponse.json({ success: true, data: venue });
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
