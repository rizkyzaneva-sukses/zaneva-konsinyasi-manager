import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp';

export async function POST(request: NextRequest) {
  try {
    const { username, otp, newPassword } = await request.json();

    if (!username || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Username, OTP, dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal 6 karakter' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user || !user.resetOtpHash || !user.resetOtpExpiry) {
      return NextResponse.json(
        { success: false, error: 'OTP tidak valid atau sudah kedaluwarsa' },
        { status: 400 }
      );
    }

    if (new Date() > user.resetOtpExpiry) {
      // Clear expired OTP
      await prisma.user.update({
        where: { id: user.id },
        data: { resetOtpHash: null, resetOtpExpiry: null },
      });
      return NextResponse.json(
        { success: false, error: 'OTP sudah kedaluwarsa. Silakan minta OTP baru.' },
        { status: 400 }
      );
    }

    const isValid = await verifyOtp(otp, user.resetOtpHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'OTP tidak valid' },
        { status: 400 }
      );
    }

    // Reset password and clear OTP
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetOtpHash: null,
        resetOtpExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password berhasil direset. Silakan login dengan password baru.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}
