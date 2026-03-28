import { NextRequest, NextResponse } from 'next/server';

/**
 * Token refresh — exchanges the httpOnly refresh_token cookie for a new access token.
 * Returns 401 if the refresh token is missing or invalid.
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token present' } },
      { status: 401 }
    );
  }

  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3002';
    const response = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Refresh token is invalid — clear cookies and force re-login
      const res = NextResponse.json(
        { success: false, error: { code: 'REFRESH_FAILED', message: 'Session expired, please log in again' } },
        { status: 401 }
      );
      res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 });
      res.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: 0 });
      return res;
    }

    const accessToken: string | undefined = data.data?.accessToken;
    const newRefreshToken: string | undefined = data.data?.refreshToken;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_ACCESS_TOKEN', message: 'Refresh succeeded but no token returned' } },
        { status: 500 }
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const res = NextResponse.json({ success: true });

    res.cookies.set('token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 900,
      secure: isProduction,
    });

    // Rotate refresh token if the API returned a new one
    if (newRefreshToken) {
      res.cookies.set('refresh_token', newRefreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        secure: isProduction,
      });
    }

    return res;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Refresh failed' } },
      { status: 500 }
    );
  }
}
