import { NextResponse } from 'next/server';

/**
 * Admin logout — clears httpOnly auth cookies.
 * Optionally calls the API to revoke the refresh token.
 */
export async function POST() {
  const res = NextResponse.json({ success: true });

  // Clear access token
  res.cookies.set('token', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  // Clear refresh token
  res.cookies.set('refresh_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return res;
}
