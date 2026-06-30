import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { venueProdukSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF', 'VENUE');
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');

    if (session.role === 'VENUE') {
      // VENUE role: only show their own venue's active products
      const venueProduks = await prisma.venueProduk.findMany({
        where: {
          venueId: session.venueId!,
          aktif: true,
        },
        include: {
          produk: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ success: true, data: venueProduks });
    }

    // ADMIN/STAFF role
    if (venueId) {
      // If venueId provided, include products NOT in venueProduk (for admin to see what's missing)
      const allProduks = await prisma.produk.findMany({
        where: { aktif: true },
        orderBy: { nama: 'asc' },
      });

      const existingVenueProduks = await prisma.venueProduk.findMany({
        where: { venueId },
        include: { produk: true },
      });

      const existingProdukIds = new Set(
        existingVenueProduks.map((vp) => vp.produkId)
      );

      const allWithVenueStatus = allProduks.map((produk) => {
        const venueProduk = existingVenueProduks.find(
          (vp) => vp.produkId === produk.id
        );
        return {
          venueId,
          produkId: produk.id,
          hargaJual: venueProduk?.hargaJual ?? produk.hargaJual,
          aktif: venueProduk?.aktif ?? false,
          isInVenue: !!venueProduk,
          produk,
          ...(venueProduk && { id: venueProduk.id, createdAt: venueProduk.createdAt, updatedAt: venueProduk.updatedAt }),
        };
      });

      return NextResponse.json({ success: true, data: allWithVenueStatus });
    }

    // No venueId: list all venue-produk relationships
    const venueProduks = await prisma.venueProduk.findMany({
      include: {
        produk: true,
        venue: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: venueProduks });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('GET venue-produk error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');
    const body = await request.json();
    const data = venueProdukSchema.parse(body);

    // Verify venue and produk exist
    const venue = await prisma.venue.findUnique({ where: { id: data.venueId } });
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue tidak ditemukan' }, { status: 404 });
    }

    const produk = await prisma.produk.findUnique({ where: { id: data.produkId } });
    if (!produk) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    // Upsert venue produk
    const venueProduk = await prisma.venueProduk.upsert({
      where: {
        venueId_produkId: {
          venueId: data.venueId,
          produkId: data.produkId,
        },
      },
      update: {
        hargaJual: data.hargaJual,
        aktif: data.aktif ?? true,
      },
      create: {
        venueId: data.venueId,
        produkId: data.produkId,
        hargaJual: data.hargaJual,
        aktif: data.aktif ?? true,
      },
      include: {
        produk: true,
        venue: true,
      },
    });

    await createAuditLog({
      userId: session.userId,
      aksi: venueProduk.createdAt.getTime() === venueProduk.updatedAt.getTime() ? 'CREATE' : 'UPDATE',
      tabelTerkait: 'VenueProduk',
      recordId: venueProduk.id,
      dataSesudah: venueProduk,
    });

    return NextResponse.json({ success: true, data: venueProduk }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('POST venue-produk error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
