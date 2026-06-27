import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { Role } from '@prisma/client';

export interface SessionData {
  userId: string;
  role: Role;
  venueId?: string;
  nama: string;
  username: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'zkm-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24, // 24 hours
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) {
    throw new Error('Unauthorized');
  }
  return session as SessionData;
}

export async function requireRole(...roles: Role[]): Promise<SessionData> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) {
    throw new Error('Forbidden');
  }
  return session;
}
