import bcrypt from 'bcryptjs';

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit OTP
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
