import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOtp, hashOtp } from '@/lib/otp';
import { sendWahaText } from '@/lib/waha';

function normalizePhone(phone: string): string {
  return phone.replace(/@c\.us|@s\.whatsapp\.net|@lid/gi, '').replace(/\D/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Username wajib diisi' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
      include: { venue: true },
    });

    // Always return success to prevent username enumeration
    if (!user || !user.venue) {
      return NextResponse.json({
        success: true,
        message: 'Jika username terdaftar, OTP akan dikirim ke WhatsApp PIC venue.',
      });
    }

    const phone = normalizePhone(user.venue.picKontakWa);
    if (!phone) {
      return NextResponse.json({
        success: true,
        message: 'Jika username terdaftar, OTP akan dikirim ke WhatsApp PIC venue.',
      });
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtpHash: otpHash,
        resetOtpExpiry: otpExpiry,
      },
    });

    const chatId = `${phone}@c.us`;
    const message = `[ZKM] Kode OTP reset password untuk ${user.nama}:\n\n*${otp}*\n\nBerlaku 10 menit. Jangan bagikan kode ini ke siapapun.`;

    try {
      await sendWahaText(chatId, message);
    } catch (err) {
      console.error('Failed to send OTP via WAHA:', err);
      // Don't reveal failure to prevent enumeration
    }

    return NextResponse.json({
      success: true,
      message: 'Jika username terdaftar, OTP akan dikirim ke WhatsApp PIC venue.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}
