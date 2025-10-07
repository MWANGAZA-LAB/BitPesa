import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123', // In production, use environment variables and hashed passwords
};

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate credentials
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Invalid credentials' },
        },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await new SignJWT({ 
      username,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          username,
          role: 'admin',
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Authentication failed' },
      },
      { status: 500 }
    );
  }
}
