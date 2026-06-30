import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { posRefundSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF');
    const body = await request.json();
    const data = posRefundSchema.parse(body);

    // Find the order
    const order = await prisma.posOrder.findUnique({
      where: { id: data.posOrderId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order tidak ditemukan' }, { status: 404 });
    }

    // Can only refund/void PAID orders
    if (order.status !== 'PAID') {
      return NextResponse.json(
        { success: false, error: `Order dengan status ${order.status} tidak dapat direfund/dibatalkan` },
        { status: 400 }
      );
    }

    // Validate refund amount doesn't exceed grand total
    if (data.type === 'Refund' && data.amount) {
      if (data.amount > order.grandTotal) {
        return NextResponse.json(
          { success: false, error: `Jumlah refund (${data.amount}) melebihi grand total (${order.grandTotal})` },
          { status: 400 }
        );
      }
    }

    // Update order status
    const newStatus = data.type === 'Refund' ? 'REFUNDED' : 'VOID';
    const updatedOrder = await prisma.posOrder.update({
      where: { id: data.posOrderId },
      data: {
        status: newStatus as 'REFUNDED' | 'VOID',
        notes: `${order.notes ? order.notes + '\n' : ''}[${data.type}] ${data.reason}`,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    await createAuditLog({
      userId: session.userId,
      aksi: data.type.toUpperCase(),
      tabelTerkait: 'PosOrder',
      recordId: order.id,
      dataSebelum: order,
      dataSesudah: updatedOrder,
      keterangan: data.reason,
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('POST pos/refund error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
