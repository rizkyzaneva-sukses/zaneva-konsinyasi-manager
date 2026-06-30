import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { posOrderSchema } from '@/lib/validations';
import { createAuditLog } from '@/lib/audit';
import { generateOrderNo } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF', 'VENUE');
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const rawOffset = parseInt(searchParams.get('offset') || '0');
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100);
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

    const where: Record<string, unknown> = {};

    if (session.role === 'VENUE') {
      where.venueId = session.venueId!;
    } else if (venueId) {
      where.venueId = venueId;
    }

    const [orders, total] = await Promise.all([
      prisma.posOrder.findMany({
        where,
        include: {
          items: true,
          payments: true,
          venue: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.posOrder.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('GET pos/orders error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'STAFF', 'VENUE');
    const body = await request.json();
    const data = posOrderSchema.parse(body);

    // For VENUE role, ensure they can only create orders for their venue
    if (session.role === 'VENUE' && data.venueId !== session.venueId) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat membuat order untuk venue lain' },
        { status: 403 }
      );
    }

    // Verify venue exists
    const venue = await prisma.venue.findUnique({ where: { id: data.venueId } });
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue tidak ditemukan' }, { status: 404 });
    }

    // Verify all products exist and get their names/skus
    const produkIds = data.items.map((item) => item.produkId);
    const existingProduks = await prisma.produk.findMany({
      where: { id: { in: produkIds } },
    });

    const produkMap = new Map(existingProduks.map((p) => [p.id, p]));

    for (const item of data.items) {
      if (!produkMap.has(item.produkId)) {
        return NextResponse.json(
          { success: false, error: `Produk ${item.produkId} tidak ditemukan` },
          { status: 404 }
        );
      }
    }

    // Calculate totals server-side
    const subtotal = data.items.reduce((sum, item) => {
      const diskon = item.diskonAmount || 0;
      return sum + (item.harga * item.qty) - diskon;
    }, 0);

    const diskonTotal = data.diskonTotal || 0;
    const grandTotal = Math.max(0, subtotal - diskonTotal);

    // Validate payment total matches grandTotal
    const totalPayment = data.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPayment < grandTotal) {
      return NextResponse.json(
        { success: false, error: `Total pembayaran (${totalPayment}) kurang dari grand total (${grandTotal})` },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNo = generateOrderNo();

    // Create order with items and payments in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.posOrder.create({
        data: {
          orderNo,
          venueId: data.venueId,
          cashierName: data.cashierName || session.nama,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          subtotal,
          diskonTotal,
          grandTotal,
          notes: data.notes,
        },
      });

      // Create order items
      const orderItems = data.items.map((item) => {
        const produk = produkMap.get(item.produkId)!;
        const diskon = item.diskonAmount || 0;
        const lineTotal = item.harga * item.qty - diskon;

        return tx.posOrderItem.create({
          data: {
            posOrderId: newOrder.id,
            produkId: item.produkId,
            produkName: produk.nama,
            sku: produk.sku,
            qty: item.qty,
            harga: item.harga,
            basePrice: item.basePrice,
            diskonAmount: diskon,
            lineTotal,
          },
        });
      });

      // Create payments
      const payments = data.payments.map((payment) =>
        tx.posPayment.create({
          data: {
            posOrderId: newOrder.id,
            method: payment.method,
            amount: payment.amount,
            referenceNo: payment.referenceNo,
          },
        })
      );

      const [createdItems, createdPayments] = await Promise.all([
        Promise.all(orderItems),
        Promise.all(payments),
      ]);

      return { ...newOrder, items: createdItems, payments: createdPayments };
    });

    await createAuditLog({
      userId: session.userId,
      aksi: 'CREATE',
      tabelTerkait: 'PosOrder',
      recordId: order.id,
      dataSesudah: order,
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('POST pos/orders error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
