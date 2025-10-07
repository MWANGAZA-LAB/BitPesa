import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { SecurityCheckDto } from './dto/security-check.dto';
import { SecurityReportDto } from './dto/security-report.dto';
import * as geoip from 'geoip-lite';
import * as userAgents from 'user-agents';

interface SecurityCheckResult {
  allowed: boolean;
  riskScore: number;
  reason?: string;
  recommendations?: string[];
}

interface ThreatInfo {
  ipAddress: string;
  riskScore: number;
  reason: string;
  timestamp: string;
  country?: string;
  userAgent: string;
  path: string;
}

@Injectable()
export class SecurityService {
  private readonly suspiciousPatterns = [
    /\.\./, // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /eval\(/i, // Code injection
    /javascript:/i, // JavaScript injection
    /onload=/i, // Event handler injection
    /onerror=/i, // Event handler injection
  ];

  private readonly suspiciousUserAgents = [
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

  private readonly blockedCountries = [
    'CN', 'RU', 'KP', 'IR', // High-risk countries
  ];

  constructor(
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async checkSecurity(dto: SecurityCheckDto): Promise<SecurityCheckResult> {
    try {
      let riskScore = 0;
      const recommendations: string[] = [];
      let reason: string | undefined;

      // Check if IP is blocked
      const isBlocked = await this.isIPBlocked(dto.ipAddress);
      if (isBlocked) {
        return {
          allowed: false,
          riskScore: 100,
          reason: 'IP address is blocked',
        };
      }

      // Check suspicious patterns in path
      if (this.checkSuspiciousPatterns(dto.path)) {
        riskScore += 30;
        recommendations.push('Path contains suspicious patterns');
      }

      // Check user agent
      if (this.checkSuspiciousUserAgent(dto.userAgent)) {
        riskScore += 20;
        recommendations.push('Suspicious user agent detected');
      }

      // Check request size
      if (dto.bodySize && dto.bodySize > 10 * 1024 * 1024) { // 10MB
        riskScore += 15;
        recommendations.push('Large request body detected');
      }

      // Check geographic location
      const geo = geoip.lookup(dto.ipAddress);
      if (geo) {
        if (this.blockedCountries.includes(geo.country)) {
          riskScore += 40;
          recommendations.push('Request from high-risk country');
        }
      }

      // Check request frequency
      const requestCount = await this.getRequestCount(dto.ipAddress);
      if (requestCount > 1000) { // 1000 requests in last hour
        riskScore += 25;
        recommendations.push('High request frequency detected');
      }

      // Check for proxy/VPN
      if (this.checkForProxy(dto)) {
        riskScore += 10;
        recommendations.push('Possible proxy/VPN usage');
      }

      // Check for bot behavior
      if (this.checkBotBehavior(dto)) {
        riskScore += 35;
        recommendations.push('Bot-like behavior detected');
      }

      // Record this security check
      await this.recordSecurityCheck(dto, riskScore);

      const allowed = riskScore < 70; // Block if risk score >= 70

      if (!allowed) {
        reason = `High risk score: ${riskScore}. Reasons: ${recommendations.join(', ')}`;
        
        // Auto-block if risk score is very high
        if (riskScore >= 90) {
          await this.blockIP(dto.ipAddress, `Auto-blocked: ${reason}`, 3600); // 1 hour
        }
      }

      return {
        allowed,
        riskScore,
        reason,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Failed to check security', error);
      // Fail open - allow request if security check fails
      return {
        allowed: true,
        riskScore: 0,
      };
    }
  }

  async getSecurityReport(ipAddress: string): Promise<SecurityReportDto> {
    try {
      const isBlocked = await this.isIPBlocked(ipAddress);
      const blockInfo = isBlocked ? await this.getBlockInfo(ipAddress) : null;
      
      const geo = geoip.lookup(ipAddress);
      const requestStats = await this.getRequestStats(ipAddress);
      const suspiciousActivities = await this.getSuspiciousActivities(ipAddress);
      const userAgents = await this.getUserAgents(ipAddress);
      const paths = await this.getPaths(ipAddress);

      const riskScore = this.calculateRiskScore({
        requestStats,
        suspiciousActivities,
        geo,
        isBlocked,
      });

      return {
        ipAddress,
        riskScore,
        isBlocked,
        blockReason: blockInfo?.reason,
        blockExpiry: blockInfo?.expiry,
        country: geo?.country,
        city: geo?.city,
        isp: geo?.isp,
        totalRequests24h: requestStats.total24h,
        failedRequests24h: requestStats.failed24h,
        suspiciousActivities,
        firstSeen: requestStats.firstSeen,
        lastSeen: requestStats.lastSeen,
        userAgents,
        paths,
      };
    } catch (error) {
      this.logger.error('Failed to get security report', error);
      throw error;
    }
  }

  async blockIP(ipAddress: string, reason: string, duration: number = 3600): Promise<void> {
    try {
      const blockData = {
        reason,
        blockedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + duration * 1000).toISOString(),
      };

      await this.redis.set(
        `blocked:${ipAddress}`,
        JSON.stringify(blockData),
        duration,
      );

      this.logger.warn(`IP ${ipAddress} blocked: ${reason}`);
    } catch (error) {
      this.logger.error('Failed to block IP', error);
      throw error;
    }
  }

  async unblockIP(ipAddress: string): Promise<void> {
    try {
      await this.redis.del(`blocked:${ipAddress}`);
      this.logger.log(`IP ${ipAddress} unblocked`);
    } catch (error) {
      this.logger.error('Failed to unblock IP', error);
      throw error;
    }
  }

  async getThreats(limit: number = 50): Promise<ThreatInfo[]> {
    try {
      const threatsKey = 'threats:recent';
      const threats = await this.redis.get(threatsKey);
      
      if (!threats) {
        return [];
      }

      const threatList = JSON.parse(threats);
      return threatList.slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get threats', error);
      return [];
    }
  }

  private checkSuspiciousPatterns(path: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(path));
  }

  private checkSuspiciousUserAgent(userAgent: string): boolean {
    return this.suspiciousUserAgents.some(pattern => pattern.test(userAgent));
  }

  private checkForProxy(dto: SecurityCheckDto): boolean {
    // Check for common proxy headers
    const proxyHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-cluster-client-ip',
      'x-forwarded',
      'forwarded-for',
      'forwarded',
    ];

    return proxyHeaders.some(header => 
      dto.headers && dto.headers[header]
    );
  }

  private checkBotBehavior(dto: SecurityCheckDto): boolean {
    // Check for bot-like behavior patterns
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
    ];

    if (botPatterns.some(pattern => pattern.test(dto.userAgent))) {
      return true;
    }

    // Check for missing common headers
    const commonHeaders = ['accept', 'accept-language', 'accept-encoding'];
    const missingHeaders = commonHeaders.filter(header => 
      !dto.headers || !dto.headers[header]
    );

    return missingHeaders.length >= 2;
  }

  private async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      const blockData = await this.redis.get(`blocked:${ipAddress}`);
      if (!blockData) {
        return false;
      }

      const block = JSON.parse(blockData);
      const now = new Date();
      const expiresAt = new Date(block.expiresAt);

      if (now > expiresAt) {
        // Block has expired, remove it
        await this.redis.del(`blocked:${ipAddress}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to check if IP is blocked', error);
      return false;
    }
  }

  private async getBlockInfo(ipAddress: string): Promise<{ reason: string; expiry: string } | null> {
    try {
      const blockData = await this.redis.get(`blocked:${ipAddress}`);
      if (!blockData) {
        return null;
      }

      const block = JSON.parse(blockData);
      return {
        reason: block.reason,
        expiry: block.expiresAt,
      };
    } catch (error) {
      this.logger.error('Failed to get block info', error);
      return null;
    }
  }

  private async getRequestCount(ipAddress: string): Promise<number> {
    try {
      const count = await this.redis.get(`requests:${ipAddress}:${Math.floor(Date.now() / 3600000)}`);
      return count ? parseInt(count) : 0;
    } catch (error) {
      this.logger.error('Failed to get request count', error);
      return 0;
    }
  }

  private async recordSecurityCheck(dto: SecurityCheckDto, riskScore: number): Promise<void> {
    try {
      const hour = Math.floor(Date.now() / 3600000);
      const requestKey = `requests:${dto.ipAddress}:${hour}`;
      await this.redis.incr(requestKey);
      await this.redis.expire(requestKey, 3600);

      // Record high-risk requests as threats
      if (riskScore >= 70) {
        const threat: ThreatInfo = {
          ipAddress: dto.ipAddress,
          riskScore,
          reason: `High risk score: ${riskScore}`,
          timestamp: new Date().toISOString(),
          country: geoip.lookup(dto.ipAddress)?.country,
          userAgent: dto.userAgent,
          path: dto.path,
        };

        await this.recordThreat(threat);
      }
    } catch (error) {
      this.logger.error('Failed to record security check', error);
    }
  }

  private async recordThreat(threat: ThreatInfo): Promise<void> {
    try {
      const threatsKey = 'threats:recent';
      const existingThreats = await this.redis.get(threatsKey);
      
      let threats = existingThreats ? JSON.parse(existingThreats) : [];
      threats.unshift(threat);
      
      // Keep only last 1000 threats
      threats = threats.slice(0, 1000);
      
      await this.redis.set(threatsKey, JSON.stringify(threats), 86400); // 24 hours
    } catch (error) {
      this.logger.error('Failed to record threat', error);
    }
  }

  private async getRequestStats(ipAddress: string): Promise<{
    total24h: number;
    failed24h: number;
    firstSeen: string;
    lastSeen: string;
  }> {
    // Simplified implementation - in production, you'd use time-series data
    return {
      total24h: 0,
      failed24h: 0,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };
  }

  private async getSuspiciousActivities(ipAddress: string): Promise<string[]> {
    // Simplified implementation
    return [];
  }

  private async getUserAgents(ipAddress: string): Promise<string[]> {
    // Simplified implementation
    return [];
  }

  private async getPaths(ipAddress: string): Promise<string[]> {
    // Simplified implementation
    return [];
  }

  private calculateRiskScore(data: any): number {
    let score = 0;
    
    if (data.isBlocked) score += 50;
    if (data.requestStats.total24h > 1000) score += 20;
    if (data.requestStats.failed24h > 100) score += 30;
    if (data.suspiciousActivities.length > 0) score += 25;
    if (data.geo && this.blockedCountries.includes(data.geo.country)) score += 40;
    
    return Math.min(score, 100);
  }
}
