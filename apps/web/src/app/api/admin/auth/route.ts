import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@bitpesa/shared-utils';

// Validate JWT secret is configured
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Token is required' },
        },
        { status: 400 }
      );
    }

    // Verify token
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Invalid or expired token' },
        },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (payload.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Insufficient permissions' },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
        },
      },
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Authentication failed' },
      },
      { status: 500 }
    );
  }
}
