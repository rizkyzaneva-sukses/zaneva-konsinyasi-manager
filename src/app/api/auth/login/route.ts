import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { loginSchema } from '@/lib/validations';

// Simple in-memory rate limiter for login
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { allowed: true };
  }

  record.count++;
  if (record.count > MAX_LOGIN_ATTEMPTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of loginAttempts) {
      if (now > value.resetAt) loginAttempts.delete(key);
    }
  }, 5 * 60 * 1000).unref();
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const rateCheck = checkLoginRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: `Terlalu banyak percobaan login. Coba lagi dalam ${rateCheck.retryAfter} detik.` },
        { status: 429 }
      );
    }
    const body = await request.json();
    const { username, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { username },
      include: { venue: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    const session = await getSession();

    // Regenerate session to prevent session fixation
    session.destroy();

    session.userId = user.id;
    session.role = user.role;
    session.venueId = user.venueId || undefined;
    session.nama = user.nama;
    session.username = user.username;
    await session.save();

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        nama: user.nama,
        role: user.role,
        venueId: user.venueId,
        venueNama: user.venue?.nama,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}
