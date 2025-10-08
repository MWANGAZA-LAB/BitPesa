import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskLevel, TransactionType, ComplianceStatus } from '@bitpesa/shared-types';

export interface TransactionRiskAssessment {
  transactionId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: string[];
  complianceStatus: ComplianceStatus;
  requiresReview: boolean;
  recommendedActions: string[];
}

export interface AMLConfig {
  maxDailyAmount: number;
  maxSingleTransaction: number;
  suspiciousPatternThreshold: number;
  highRiskCountries: string[];
  blacklistedAddresses: string[];
  whitelistedAddresses: string[];
}

@Injectable()
export class AMLService {
  private readonly logger = new Logger(AMLService.name);
  private readonly amlConfig: AMLConfig;

  constructor(private readonly prisma: PrismaService) {
    this.amlConfig = {
      maxDailyAmount: parseFloat(process.env.AML_MAX_DAILY_AMOUNT || '1000000'), // 1M KES
      maxSingleTransaction: parseFloat(process.env.AML_MAX_SINGLE_TRANSACTION || '500000'), // 500K KES
      suspiciousPatternThreshold: parseFloat(process.env.AML_SUSPICIOUS_THRESHOLD || '0.7'),
      highRiskCountries: (process.env.AML_HIGH_RISK_COUNTRIES || 'AF,IR,KP,SY').split(','),
      blacklistedAddresses: (process.env.AML_BLACKLISTED_ADDRESSES || '').split(',').filter(Boolean),
      whitelistedAddresses: (process.env.AML_WHITELISTED_ADDRESSES || '').split(',').filter(Boolean),
    };
  }

  async assessTransactionRisk(transactionData: {
    id: string;
    amount: number;
    recipientPhone: string;
    transactionType: TransactionType;
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: any;
  }): Promise<TransactionRiskAssessment> {
    this.logger.log(`Assessing AML risk for transaction: ${transactionData.id}`);

    const riskFactors: string[] = [];
    let riskScore = 0;

    // Amount-based risk assessment
    const amountRisk = this.assessAmountRisk(transactionData.amount);
    riskScore += amountRisk.score;
    riskFactors.push(...amountRisk.factors);

    // Pattern-based risk assessment
    const patternRisk = await this.assessPatternRisk(transactionData);
    riskScore += patternRisk.score;
    riskFactors.push(...patternRisk.factors);

    // Geographic risk assessment
    const geoRisk = this.assessGeographicRisk(transactionData);
    riskScore += geoRisk.score;
    riskFactors.push(...geoRisk.factors);

    // Device and behavior risk assessment
    const behaviorRisk = this.assessBehaviorRisk(transactionData);
    riskScore += behaviorRisk.score;
    riskFactors.push(...behaviorRisk.factors);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);
    const complianceStatus = this.determineComplianceStatus(riskLevel, riskScore);
    const requiresReview = riskLevel === RiskLevel.HIGH || riskScore > this.amlConfig.suspiciousPatternThreshold;

    const assessment: TransactionRiskAssessment = {
      transactionId: transactionData.id,
      riskLevel,
      riskScore: Math.min(riskScore, 1.0), // Cap at 1.0
      riskFactors,
      complianceStatus,
      requiresReview,
      recommendedActions: this.getRecommendedActions(riskLevel, riskFactors),
    };

    // Store assessment in database
    await this.storeRiskAssessment(assessment);

    this.logger.log(`AML assessment completed for ${transactionData.id}: ${riskLevel} (${riskScore.toFixed(3)})`);
    return assessment;
  }

  private assessAmountRisk(amount: number): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // Single transaction amount check
    if (amount > this.amlConfig.maxSingleTransaction) {
      score += 0.4;
      factors.push(`Amount exceeds single transaction limit (${amount} > ${this.amlConfig.maxSingleTransaction})`);
    }

    // Round number amounts (potential structuring)
    if (amount % 10000 === 0 && amount >= 100000) {
      score += 0.2;
      factors.push('Round number amount may indicate structuring');
    }

    // Just below threshold amounts
    if (amount >= this.amlConfig.maxSingleTransaction * 0.9) {
      score += 0.1;
      factors.push('Amount just below reporting threshold');
    }

    return { score, factors };
  }

  private async assessPatternRisk(transactionData: {
    id: string;
    amount: number;
    recipientPhone: string;
    transactionType: TransactionType;
    ipAddress?: string;
  }): Promise<{ score: number; factors: string[] }> {
    const factors: string[] = [];
    let score = 0;

    // Check for rapid successive transactions
    const recentTransactions = await this.prisma.transaction.findMany({
      where: {
        ipAddress: transactionData.ipAddress,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (recentTransactions.length >= 5) {
      score += 0.3;
      factors.push(`High frequency of transactions (${recentTransactions.length} in last hour)`);
    }

    // Check for same recipient multiple times
    const recipientTransactions = await this.prisma.transaction.findMany({
      where: {
        recipientPhone: transactionData.recipientPhone,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recipientTransactions.length >= 3) {
      score += 0.2;
      factors.push(`Multiple transactions to same recipient (${recipientTransactions.length} in 24h)`);
    }

    // Check daily amount limits
    const dailyAmount = await this.getDailyAmount(transactionData.ipAddress);
    if (dailyAmount + transactionData.amount > this.amlConfig.maxDailyAmount) {
      score += 0.4;
      factors.push(`Would exceed daily amount limit (${dailyAmount + transactionData.amount} > ${this.amlConfig.maxDailyAmount})`);
    }

    return { score, factors };
  }

  private assessGeographicRisk(transactionData: {
    ipAddress?: string;
    recipientPhone: string;
  }): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // Check phone number country code
    const countryCode = this.extractCountryCode(transactionData.recipientPhone);
    if (countryCode && this.amlConfig.highRiskCountries.includes(countryCode)) {
      score += 0.3;
      factors.push(`Recipient in high-risk country (${countryCode})`);
    }

    // Check IP geolocation (simplified - in production, use proper geolocation service)
    if (transactionData.ipAddress) {
      const isSuspiciousIP = this.isSuspiciousIP(transactionData.ipAddress);
      if (isSuspiciousIP) {
        score += 0.2;
        factors.push('Suspicious IP address detected');
      }
    }

    return { score, factors };
  }

  private assessBehaviorRisk(transactionData: {
    userAgent?: string;
    deviceInfo?: any;
  }): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // Check for suspicious user agent
    if (transactionData.userAgent) {
      const suspiciousPatterns = ['bot', 'crawler', 'scraper', 'automated'];
      const isSuspiciousUA = suspiciousPatterns.some(pattern => 
        transactionData.userAgent!.toLowerCase().includes(pattern)
      );
      
      if (isSuspiciousUA) {
        score += 0.2;
        factors.push('Suspicious user agent detected');
      }
    }

    // Check device fingerprint consistency
    if (transactionData.deviceInfo) {
      const deviceRisk = this.assessDeviceRisk(transactionData.deviceInfo);
      score += deviceRisk.score;
      factors.push(...deviceRisk.factors);
    }

    return { score, factors };
  }

  private assessDeviceRisk(deviceInfo: any): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // Check for missing or suspicious device information
    if (!deviceInfo.screenResolution || !deviceInfo.timezone) {
      score += 0.1;
      factors.push('Incomplete device information');
    }

    // Check for virtual machine indicators
    if (deviceInfo.isVirtualMachine) {
      score += 0.2;
      factors.push('Virtual machine detected');
    }

    return { score, factors };
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 0.8) return RiskLevel.HIGH;
    if (score >= 0.5) return RiskLevel.MEDIUM;
    if (score >= 0.2) return RiskLevel.LOW;
    return RiskLevel.MINIMAL;
  }

  private determineComplianceStatus(riskLevel: RiskLevel, score: number): ComplianceStatus {
    if (riskLevel === RiskLevel.HIGH || score > this.amlConfig.suspiciousPatternThreshold) {
      return ComplianceStatus.REQUIRES_REVIEW;
    }
    if (riskLevel === RiskLevel.MEDIUM) {
      return ComplianceStatus.MONITOR;
    }
    return ComplianceStatus.APPROVED;
  }

  private getRecommendedActions(riskLevel: RiskLevel, factors: string[]): string[] {
    const actions: string[] = [];

    switch (riskLevel) {
      case RiskLevel.HIGH:
        actions.push('BLOCK_TRANSACTION');
        actions.push('REPORT_TO_AUTHORITIES');
        actions.push('FLAG_ACCOUNT');
        break;
      case RiskLevel.MEDIUM:
        actions.push('REQUIRE_ADDITIONAL_VERIFICATION');
        actions.push('MANUAL_REVIEW');
        break;
      case RiskLevel.LOW:
        actions.push('MONITOR_FUTURE_TRANSACTIONS');
        break;
      default:
        actions.push('CONTINUE_NORMAL_PROCESSING');
    }

    return actions;
  }

  private async getDailyAmount(ipAddress?: string): Promise<number> {
    if (!ipAddress) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.transaction.aggregate({
      where: {
        ipAddress,
        createdAt: { gte: today },
        status: { in: ['COMPLETED', 'PROCESSING'] },
      },
      _sum: { kesAmount: true },
    });

    return Number(result._sum.kesAmount || 0);
  }

  private extractCountryCode(phoneNumber: string): string | null {
    // Extract country code from phone number
    const match = phoneNumber.match(/^\+(\d{1,3})/);
    return match ? match[1] : null;
  }

  private isSuspiciousIP(ipAddress: string): boolean {
    // Simplified IP risk assessment
    // In production, use proper threat intelligence feeds
    const suspiciousRanges = [
      '10.0.0.0/8',    // Private networks
      '192.168.0.0/16', // Private networks
      '172.16.0.0/12',  // Private networks
    ];
    
    // This is a simplified check - implement proper CIDR matching
    return suspiciousRanges.some(range => {
      const [network, prefix] = range.split('/');
      // Simplified implementation - use proper IP library in production
      return ipAddress.startsWith(network.split('.').slice(0, 2).join('.'));
    });
  }

  private async storeRiskAssessment(assessment: TransactionRiskAssessment): Promise<void> {
    try {
      await this.prisma.amlAssessment.create({
        data: {
          transactionId: assessment.transactionId,
          riskLevel: assessment.riskLevel,
          riskScore: assessment.riskScore,
          riskFactors: assessment.riskFactors,
          complianceStatus: assessment.complianceStatus,
          requiresReview: assessment.requiresReview,
          recommendedActions: assessment.recommendedActions,
        },
      });
    } catch (error) {
      this.logger.error('Failed to store AML assessment', error);
    }
  }

  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    this.logger.log(`Generating compliance report from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const assessments = await this.prisma.amlAssessment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        transaction: true,
      },
    });

    const report = {
      period: { startDate, endDate },
      totalTransactions: assessments.length,
      riskDistribution: {
        minimal: assessments.filter(a => a.riskLevel === RiskLevel.MINIMAL).length,
        low: assessments.filter(a => a.riskLevel === RiskLevel.LOW).length,
        medium: assessments.filter(a => a.riskLevel === RiskLevel.MEDIUM).length,
        high: assessments.filter(a => a.riskLevel === RiskLevel.HIGH).length,
      },
      complianceStatus: {
        approved: assessments.filter(a => a.complianceStatus === ComplianceStatus.APPROVED).length,
        monitor: assessments.filter(a => a.complianceStatus === ComplianceStatus.MONITOR).length,
        requiresReview: assessments.filter(a => a.complianceStatus === ComplianceStatus.REQUIRES_REVIEW).length,
      },
      highRiskTransactions: assessments
        .filter(a => a.riskLevel === RiskLevel.HIGH)
        .map(a => ({
          transactionId: a.transactionId,
          riskScore: a.riskScore,
          riskFactors: a.riskFactors,
          recommendedActions: a.recommendedActions,
        })),
    };

    return report;
  }
}
