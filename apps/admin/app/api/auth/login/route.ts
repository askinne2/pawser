import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin login - proxies to the API backend
 * The admin frontend should NOT directly access the database
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        },
        { status: 400 }
      );
    }

    // Call the API backend for authentication
    const apiUrl = process.env.API_URL || 'http://localhost:3002';
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Return the API response (tokens + user)
    return NextResponse.json({
      success: true,
      token: data.data?.accessToken,
      refreshToken: data.data?.refreshToken,
      user: data.data?.user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Login failed',
        },
      },
      { status: 500 }
    );
  }
}

