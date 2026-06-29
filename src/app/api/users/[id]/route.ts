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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('ADMIN');
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { venue: { select: { id: true, nama: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    const nama = String(body.nama || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const role = body.role === 'VENUE' ? 'VENUE' : body.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
    const venueId = role === 'VENUE' ? String(body.venueId || '') : null;

    if (!nama || !username) {
      return NextResponse.json({ success: false, error: 'Nama dan username wajib' }, { status: 400 });
    }
    if (password && password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password minimal 6 karakter' }, { status: 400 });
    }
    if (role === 'VENUE' && !venueId) {
      return NextResponse.json({ success: false, error: 'Akun venue wajib pilih venue' }, { status: 400 });
    }

    if (username !== existing.username) {
      const duplicate = await prisma.user.findUnique({ where: { username } });
      if (duplicate) {
        return NextResponse.json({ success: false, error: 'Username sudah dipakai' }, { status: 400 });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        nama,
        username,
        role,
        venueId,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
      include: { venue: { select: { id: true, nama: true } } },
    });

    await createAuditLog({
      userId: session.userId,
      aksi: 'UPDATE',
      tabelTerkait: 'User',
      recordId: user.id,
      dataSebelum: sanitizeUser(existing),
      dataSesudah: sanitizeUser(user),
      keterangan: password ? 'User updated with password reset' : 'User updated',
    });

    return NextResponse.json({ success: true, data: sanitizeUser(user) });
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
