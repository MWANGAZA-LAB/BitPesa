import { NextRequest, NextResponse } from 'next/server';

interface SecurityCheckResult {
  allowed: boolean;
  riskScore: number;
  reason?: string;
  recommendations?: string[];
}

export async function securityMiddleware(request: NextRequest): Promise<SecurityCheckResult> {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const path = request.nextUrl.pathname;
  const method = request.method;
  
  try {
    // Check with security service
    const response = await fetch(`${process.env.SECURITY_SERVICE_URL}/security/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ipAddress: ip,
        userAgent,
        path,
        method,
        headers: Object.fromEntries(request.headers.entries()),
        referer: request.headers.get('referer'),
        xForwardedFor: request.headers.get('x-forwarded-for'),
        xRealIp: request.headers.get('x-real-ip'),
      }),
    });

    if (response.status === 403) {
      const errorData = await response.json();
      return {
        allowed: false,
        riskScore: errorData.error.riskScore,
        reason: errorData.error.reason,
      };
    }

    if (response.ok) {
      const data = await response.json();
      return {
        allowed: data.data.allowed,
        riskScore: data.data.riskScore,
        reason: data.data.reason,
        recommendations: data.data.recommendations,
      };
    }

    // Fallback to local security checks if service is unavailable
    return await localSecurityCheck(request);
  } catch (error) {
    console.error('Security service error:', error);
    // Fallback to local security checks
    return await localSecurityCheck(request);
  }
}

async function localSecurityCheck(request: NextRequest): Promise<SecurityCheckResult> {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const path = request.nextUrl.pathname;
  
  let riskScore = 0;
  const recommendations: string[] = [];
  let reason: string | undefined;

  // Check for suspicious patterns in path
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /eval\(/i, // Code injection
    /javascript:/i, // JavaScript injection
    /onload=/i, // Event handler injection
    /onerror=/i, // Event handler injection
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(path))) {
    riskScore += 30;
    recommendations.push('Path contains suspicious patterns');
  }

  // Check for suspicious user agents
  const suspiciousUserAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /php/i,
  ];

  if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
    riskScore += 20;
    recommendations.push('Suspicious user agent detected');
  }

  // Check for missing common headers (bot behavior)
  const commonHeaders = ['accept', 'accept-language', 'accept-encoding'];
  const missingHeaders = commonHeaders.filter(header => 
    !request.headers.get(header)
  );

  if (missingHeaders.length >= 2) {
    riskScore += 15;
    recommendations.push('Missing common headers (possible bot)');
  }

  // Check for proxy/VPN usage
  const proxyHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  const hasProxyHeaders = proxyHeaders.some(header => 
    request.headers.get(header)
  );

  if (hasProxyHeaders) {
    riskScore += 10;
    recommendations.push('Possible proxy/VPN usage');
  }

  // Check request size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
    riskScore += 15;
    recommendations.push('Large request body detected');
  }

  // Check for rate limiting violations
  const rateLimitViolations = await checkRateLimitViolations(ip);
  if (rateLimitViolations > 0) {
    riskScore += rateLimitViolations * 5;
    recommendations.push('Rate limit violations detected');
  }

  const allowed = riskScore < 70; // Block if risk score >= 70

  if (!allowed) {
    reason = `High risk score: ${riskScore}. Reasons: ${recommendations.join(', ')}`;
  }

  return {
    allowed,
    riskScore,
    reason,
    recommendations,
  };
}

async function checkRateLimitViolations(ip: string): Promise<number> {
  // This is a simplified implementation
  // In production, you'd check against your rate limiting service
  try {
    const response = await fetch(`${process.env.RATE_LIMIT_SERVICE_URL}/rate-limits/info/${ip}`);
    if (response.ok) {
      const data = await response.json();
      return data.data.exceeded ? 1 : 0;
    }
  } catch (error) {
    console.error('Failed to check rate limit violations:', error);
  }
  
  return 0;
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

export function createSecurityResponse(result: SecurityCheckResult): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: {
        message: 'Security violation detected',
        reason: result.reason,
        riskScore: result.riskScore,
        recommendations: result.recommendations,
      },
    },
    { status: 403 }
  );

  // Add security headers
  response.headers.set('X-Risk-Score', result.riskScore.toString());
  response.headers.set('X-Security-Check', 'failed');
  
  if (result.recommendations) {
    response.headers.set('X-Security-Recommendations', result.recommendations.join(', '));
  }

  return response;
}
