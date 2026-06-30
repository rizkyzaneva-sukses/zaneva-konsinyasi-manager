import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('ADMIN', 'STAFF', 'VENUE');
    const { id } = await params;

    const order = await prisma.posOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: { produk: true },
        },
        payments: true,
        venue: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order tidak ditemukan' }, { status: 404 });
    }

    // VENUE role can only see their own orders
    if (session.role === 'VENUE' && order.venueId !== session.venueId) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat mengakses order venue lain' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('GET pos/orders/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
