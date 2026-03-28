import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3002';

type RouteContext = { params: { path: string[] } };

/**
 * Generic reverse proxy to the Express API.
 * Reads the httpOnly `token` cookie and forwards it as a Bearer token.
 * If the API returns 401, automatically attempts one refresh cycle before giving up.
 */
async function proxy(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { path } = params;
  const url = new URL(request.url);
  const targetUrl = `${API_URL}/api/v1/${path.join('/')}${url.search}`;

  const token = request.cookies.get('token')?.value;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const isReadMethod = ['GET', 'HEAD'].includes(request.method);
  const body = isReadMethod ? undefined : await request.text();

  let apiRes = await fetch(targetUrl, { method: request.method, headers, body });

  // Attempt silent token refresh on 401
  if (apiRes.status === 401) {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (refreshToken) {
      const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccessToken: string | undefined = refreshData.data?.accessToken;
        const newRefreshToken: string | undefined = refreshData.data?.refreshToken;

        if (newAccessToken) {
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          apiRes = await fetch(targetUrl, { method: request.method, headers, body });

          const data = await apiRes.json();
          const res = NextResponse.json(data, { status: apiRes.status });

          // Set refreshed cookies
          const isProduction = process.env.NODE_ENV === 'production';
          res.cookies.set('token', newAccessToken, {
            httpOnly: true, sameSite: 'lax', path: '/', maxAge: 900, secure: isProduction,
          });
          if (newRefreshToken) {
            res.cookies.set('refresh_token', newRefreshToken, {
              httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30, secure: isProduction,
            });
          }
          return res;
        }
      }

      // Refresh failed — session is dead, tell the client to log in
      const res = NextResponse.json(
        { success: false, error: { code: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' } },
        { status: 401 }
      );
      res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 });
      res.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: 0 });
      return res;
    }

    // No refresh token — return 401 directly
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const data = await apiRes.json().catch(() => null);
  return NextResponse.json(data, { status: apiRes.status });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
