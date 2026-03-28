import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin login — proxies to Express API, sets httpOnly cookies server-side.
 * The access token never reaches the client's JavaScript context.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    const apiUrl = process.env.API_URL || 'http://localhost:3002';
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.error?.message || data.message || 'Invalid credentials' },
        { status: response.status }
      );
    }

    const accessToken: string | undefined = data.data?.accessToken;
    const refreshToken: string | undefined = data.data?.refreshToken;
    const user = data.data?.user;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed — no token returned' },
        { status: 500 }
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';

    const res = NextResponse.json({ success: true, user });

    // Access token: 15 minutes, httpOnly
    res.cookies.set('token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 900, // 15 minutes
      secure: isProduction,
    });

    // Refresh token: 30 days, httpOnly
    if (refreshToken) {
      res.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        secure: isProduction,
      });
    }

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
