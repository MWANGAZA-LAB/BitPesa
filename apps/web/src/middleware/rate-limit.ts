import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  '/api/transactions': {
    windowMs: 300000, // 5 minutes
    maxRequests: 10,
  },
  '/api/rates': {
    windowMs: 60000, // 1 minute
    maxRequests: 30,
  },
  '/api/receipts': {
    windowMs: 60000, // 1 minute
    maxRequests: 20,
  },
  default: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
};

export async function rateLimitMiddleware(
  request: NextRequest,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const ip = getClientIP(request);
  const path = request.nextUrl.pathname;
  
  const rateLimitConfig = config || getRateLimitConfig(path);
  const key = `rate_limit:${ip}:${path}`;
  
  try {
    // Check with rate limit service
    const response = await fetch(`${process.env.RATE_LIMIT_SERVICE_URL}/rate-limits/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ipAddress: ip,
        type: 'API',
        userAgent: request.headers.get('user-agent') || '',
        path: path,
      }),
    });

    if (response.status === 429) {
      const errorData = await response.json();
      return {
        allowed: false,
        limit: errorData.error.limit,
        remaining: errorData.error.remaining,
        resetTime: Date.now() + (errorData.error.retryAfter * 1000),
        retryAfter: errorData.error.retryAfter,
      };
    }

    if (response.ok) {
      const data = await response.json();
      return {
        allowed: true,
        limit: data.data.limit,
        remaining: data.data.remaining,
        resetTime: data.data.resetTime,
      };
    }

    // Fallback to local rate limiting if service is unavailable
    return await localRateLimit(key, rateLimitConfig);
  } catch (error) {
    console.error('Rate limit service error:', error);
    // Fallback to local rate limiting
    return await localRateLimit(key, rateLimitConfig);
  }
}

async function localRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // This is a simplified local rate limiting implementation
  // In production, you'd use Redis or a proper rate limiting library
  
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // For demo purposes, we'll use a simple in-memory store
  // In production, this should be Redis or a database
  const requests = getStoredRequests(key) || [];
  const validRequests = requests.filter((timestamp: number) => timestamp > windowStart);
  
  const current = validRequests.length;
  const limit = config.maxRequests;
  const remaining = Math.max(0, limit - current);
  const exceeded = current >= limit;
  
  const resetTime = windowStart + config.windowMs;
  const retryAfter = exceeded ? Math.ceil((resetTime - now) / 1000) : undefined;

  // Record this request
  validRequests.push(now);
  storeRequests(key, validRequests.slice(-1000)); // Keep only last 1000 requests

  return {
    allowed: !exceeded,
    limit,
    remaining,
    resetTime,
    retryAfter,
  };
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || '127.0.0.1';
}

function getRateLimitConfig(path: string): RateLimitConfig {
  for (const [pattern, config] of Object.entries(rateLimitConfigs)) {
    if (pattern !== 'default' && path.startsWith(pattern)) {
      return config;
    }
  }
  
  return rateLimitConfigs.default;
}

// Simple in-memory store for demo purposes
// In production, use Redis or a proper database
const requestStore = new Map<string, number[]>();

function getStoredRequests(key: string): number[] | null {
  return requestStore.get(key) || null;
}

function storeRequests(key: string, requests: number[]): void {
  requestStore.set(key, requests);
}

export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: {
        message: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining,
      },
    },
    { status: 429 }
  );

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  
  if (result.retryAfter) {
    response.headers.set('Retry-After', result.retryAfter.toString());
  }

  return response;
}
