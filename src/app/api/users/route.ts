import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';

function sanitizeUser(user: {
  id: string;
  nama: string;
  username: string;
  role: string;
  venueId: string | null;
  createdAt: Date;
  updatedAt: Date;
  venue?: { id: string; nama: string } | null;
}) {
  return {
    id: user.id,
    nama: user.nama,
    username: user.username,
    role: user.role,
    venueId: user.venueId,
    venue: user.venue,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET() {
  try {
    await requireRole('ADMIN');

    const users = await prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      include: { venue: { select: { id: true, nama: true } } },
    });

    return NextResponse.json({ success: true, data: users.map(sanitizeUser) });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');
    const body = await request.json();
    const nama = String(body.nama || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const role = body.role === 'VENUE' ? 'VENUE' : 'STAFF';
    const venueId = role === 'VENUE' ? String(body.venueId || '') : null;

    if (!nama || !username || !password) {
      return NextResponse.json({ success: false, error: 'Nama, username, dan password wajib' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password minimal 6 karakter' }, { status: 400 });
    }
    if (role === 'VENUE' && !venueId) {
      return NextResponse.json({ success: false, error: 'Akun venue wajib pilih venue' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Username sudah dipakai' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        nama,
        username,
        passwordHash: await bcrypt.hash(password, 10),
        role,
        venueId,
      },
      include: { venue: { select: { id: true, nama: true } } },
    });

    await createAuditLog({
      userId: session.userId,
      aksi: 'CREATE',
      tabelTerkait: 'User',
      recordId: user.id,
      dataSesudah: sanitizeUser(user),
    });

    return NextResponse.json({ success: true, data: sanitizeUser(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
