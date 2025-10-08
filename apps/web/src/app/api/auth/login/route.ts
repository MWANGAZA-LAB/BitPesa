import { NextRequest, NextResponse } from 'next/server';
import { createToken, verifyPassword, validatePasswordStrength } from '@bitpesa/shared-utils';

// This would typically connect to your auth service
// For now, we'll implement a secure admin user creation
const ADMIN_USER = {
  id: 'admin-001',
  username: process.env.ADMIN_USERNAME || 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@bitpesa.com',
  role: 'admin' as const,
  isActive: true,
  passwordHash: process.env.ADMIN_PASSWORD_HASH, // This should be pre-hashed
};

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Username and password are required' },
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: { 
            message: 'Password does not meet security requirements',
            details: passwordValidation.feedback
          },
        },
        { status: 400 }
      );
    }

    // Check if admin user exists and password is configured
    if (!ADMIN_USER.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Admin user not configured. Please set ADMIN_PASSWORD_HASH environment variable.' },
        },
        { status: 500 }
      );
    }

    // Verify credentials
    if (username !== ADMIN_USER.username) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Invalid credentials' },
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, ADMIN_USER.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Invalid credentials' },
        },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!ADMIN_USER.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Account is deactivated' },
        },
        { status: 403 }
      );
    }

    // Create JWT token
    const token = await createToken(ADMIN_USER);

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: ADMIN_USER.id,
          username: ADMIN_USER.username,
          email: ADMIN_USER.email,
          role: ADMIN_USER.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Authentication failed' },
      },
      { status: 500 }
    );
  }
}
