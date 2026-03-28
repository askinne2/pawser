import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware runs on the Edge runtime, which does NOT support Node.js
 * built-ins (no `crypto` module). This means `jsonwebtoken` cannot be used here.
 *
 * Security model:
 *  - Middleware: coarse-grained guard — checks the cookie exists and looks like a JWT.
 *    This prevents casual unauthenticated browsing and provides UX redirects.
 *  - API proxy routes: forward the token as a Bearer header to the Express API,
 *    which verifies the JWT signature with the full Node.js crypto stack.
 *
 * In other words: middleware handles redirects, Express handles real auth.
 */

/** Minimal structural check — a JWT is three base64url segments separated by dots. */
function looksLikeJwt(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

const PUBLIC_PATHS = new Set(['/login', '/forgot-password', '/reset-password']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public auth routes and Next.js internals
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/')
  ) {
    return NextResponse.next();
  }

  // Dev mode auth bypass — skips all cookie checks
  if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    console.warn('⚠️  DEV MODE: Authentication bypass is enabled');
    return NextResponse.next();
  }

  // Check for a plausibly valid JWT token in the httpOnly cookie
  const token = request.cookies.get('token')?.value;

  if (!token || !looksLikeJwt(token)) {
    // API sub-routes get a 401 JSON response; page routes get a redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
