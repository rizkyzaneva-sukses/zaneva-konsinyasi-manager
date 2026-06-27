import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';

const publicPaths = ['/auth/login', '/api/auth/login'];
const venuePaths = ['/venue'];
const adminPaths = ['/dashboard'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow public paths
  if (publicPaths.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files
  if (path.startsWith('/_next') || path.startsWith('/favicon') || path === '/') {
    return NextResponse.next();
  }

  // Check session
  const response = NextResponse.next();
  const session = await getIronSession(request, response, {
    password: process.env.SESSION_SECRET!,
    cookieName: 'zkm-session',
  });

  const { userId, role } = session as { userId?: string; role?: string };

  if (!userId) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Role-based route protection
  if (role === 'VENUE' && adminPaths.some((p) => path.startsWith(p))) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/venue/dashboard', request.url));
  }

  if ((role === 'ADMIN' || role === 'STAFF') && venuePaths.some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
