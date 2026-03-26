import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export function middleware(request: NextRequest) {
  // Allow public routes
  if (
    request.nextUrl.pathname.startsWith('/api/auth/login') ||
    request.nextUrl.pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // Dev mode auth bypass (for local development only)
  if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    console.warn('⚠️  DEV MODE: Authentication bypass is enabled');
    return NextResponse.next();
  }

  // Check for JWT token in Authorization header or cookie
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : request.cookies.get('token')?.value;

  if (!token) {
    // Redirect to login if no token
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not configured');
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Authentication configuration error',
      },
      { status: 500 }
    );
  }

  try {
    jwt.verify(token, secret);
    return NextResponse.next();
  } catch (error) {
    // Invalid token
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

