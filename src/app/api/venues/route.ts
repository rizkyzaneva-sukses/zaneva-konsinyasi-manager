import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { venueSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await requireRole('ADMIN', 'STAFF');

    const venues = await prisma.venue.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            stokMasuk: true,
            laporanPenjualan: true,
            invoices: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: venues });
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET venues error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');
    const body = await request.json();
    const data = venueSchema.parse(body);

    const venue = await prisma.venue.create({
      data: {
        nama: data.nama,
        alamat: data.alamat,
        picNama: data.picNama,
        picKontakWa: data.picKontakWa,
        status: data.status || 'PROSPEK',
        marginPersenZaneva: data.marginPersenZaneva || 30,
        periodeSettlementHari: data.periodeSettlementHari || 14,
      },
    });

    await createAuditLog({
      userId: session.userId,
      aksi: 'CREATE',
      tabelTerkait: 'Venue',
      recordId: venue.id,
      dataSesudah: venue,
    });

    return NextResponse.json({ success: true, data: venue }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST venue error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
