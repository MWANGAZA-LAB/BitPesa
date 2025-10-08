export enum RiskLevel {
  MINIMAL = 'MINIMAL',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ComplianceStatus {
  APPROVED = 'APPROVED',
  MONITOR = 'MONITOR',
  REQUIRES_REVIEW = 'REQUIRES_REVIEW',
  BLOCKED = 'BLOCKED',
  SUSPENDED = 'SUSPENDED',
}

export enum ComplianceTransactionType {
  SEND_MONEY = 'SEND_MONEY',
  BUY_AIRTIME = 'BUY_AIRTIME',
  PAYBILL = 'PAYBILL',
  BUY_GOODS = 'BUY_GOODS',
  SCAN_PAY = 'SCAN_PAY',
}

export interface AMLAssessment {
  id: string;
  transactionId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: string[];
  complianceStatus: ComplianceStatus;
  requiresReview: boolean;
  recommendedActions: string[];
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalTransactions: number;
  riskDistribution: {
    minimal: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  complianceStatus: {
    approved: number;
    monitor: number;
    requiresReview: number;
    blocked: number;
    suspended: number;
  };
  highRiskTransactions: {
    transactionId: string;
    riskScore: number;
    riskFactors: string[];
    recommendedActions: string[];
  }[];
  suspiciousPatterns: {
    pattern: string;
    count: number;
    description: string;
  }[];
  recommendations: string[];
}

export interface KYCDocument {
  id: string;
  userId: string;
  documentType: 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE' | 'UTILITY_BILL';
  documentNumber: string;
  issuingCountry: string;
  expiryDate?: Date;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface KYCProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  nationality: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  phoneNumber: string;
  email: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  verificationLevel: 'BASIC' | 'ENHANCED' | 'DUE_DILIGENCE';
  riskRating: RiskLevel;
  documents: KYCDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SanctionsScreening {
  id: string;
  entityType: 'PERSON' | 'ORGANIZATION' | 'ADDRESS';
  entityName: string;
  entityId: string;
  screeningResult: 'CLEAR' | 'MATCH' | 'POTENTIAL_MATCH' | 'ERROR';
  matchScore: number;
  matchedLists: string[];
  screeningDate: Date;
  nextScreeningDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatoryReporting {
  id: string;
  reportType: 'SUSPICIOUS_ACTIVITY' | 'LARGE_TRANSACTION' | 'CURRENCY_TRANSACTION' | 'MONTHLY_SUMMARY';
  reportingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  submittedAt?: Date;
  acceptedAt?: Date;
  rejectionReason?: string;
  reportData: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceConfig {
  amlThresholds: {
    maxDailyAmount: number;
    maxSingleTransaction: number;
    suspiciousPatternThreshold: number;
  };
  kycRequirements: {
    basicVerification: string[];
    enhancedVerification: string[];
    dueDiligence: string[];
  };
  reportingRequirements: {
    suspiciousActivityThreshold: number;
    largeTransactionThreshold: number;
    reportingDeadlines: {
      suspiciousActivity: number; // days
      largeTransaction: number; // days
      monthly: number; // days
    };
  };
  sanctionsScreening: {
    enabled: boolean;
    screeningFrequency: number; // days
    watchlistSources: string[];
  };
}
