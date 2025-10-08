// Diagnostic Script: scan-auth-code.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface AuthCodeScanResult {
  file: string;
  line: number;
  match: string;
  severity: 'critical' | 'warning' | 'info';
}

const AUTH_PATTERNS = {
  critical: [
    'jwt',
    'passport',
    'bcrypt',
    'jsonwebtoken',
    '@nestjs/jwt',
    '@nestjs/passport',
    'JwtAuthGuard',
    'JwtStrategy',
    'LocalStrategy',
    'hashPassword',
    'comparePassword',
    'model User',
    'userId.*@id',
    'session',
    'cookie-parser'
  ],
  warning: [
    'auth',
    'login',
    'signup',
    'register',
    'password',
    'token'
  ]
};

async function scanForAuthCode(): Promise<void> {
  console.log('🔍 Scanning for authentication code...\n');
  
  const results: AuthCodeScanResult[] = [];
  const excludeDirs = ['node_modules', '.git', 'dist', 'build'];
  
  // Scan critical patterns
  for (const pattern of AUTH_PATTERNS.critical) {
    try {
      const cmd = `grep -rn "${pattern}" . --include="*.ts" --include="*.tsx" --exclude-dir={${excludeDirs.join(',')}}`;
      const output = execSync(cmd, { encoding: 'utf-8' });
      
      if (output) {
        console.log(`❌ CRITICAL: Found "${pattern}" in codebase`);
        output.split('\n').forEach(line => {
          if (line.trim()) {
            console.log(`   ${line}`);
          }
        });
        console.log();
      }
    } catch (error) {
      // Pattern not found (good!)
    }
  }
  
  console.log('✅ Authentication code scan complete\n');
}

async function scanDatabaseSchema(): Promise<void> {
  console.log('🗄️  Scanning database schema...\n');
  
  const schemaFiles = execSync(
    'find . -name "schema.prisma" -not -path "*/node_modules/*"',
    { encoding: 'utf-8' }
  ).split('\n').filter(Boolean);
  
  for (const schemaFile of schemaFiles) {
    console.log(`Checking: ${schemaFile}`);
    const content = fs.readFileSync(schemaFile, 'utf-8');
    
    // Check for User model
    if (content.includes('model User')) {
      console.log('  ❌ CRITICAL: User model still exists');
    } else {
      console.log('  ✅ User model removed');
    }
    
    // Check for userId references
    if (content.match(/userId.*String/)) {
      console.log('  ❌ CRITICAL: userId field still exists');
    } else {
      console.log('  ✅ No userId fields found');
    }
    
    // Check for paymentHash
    if (content.includes('paymentHash') && content.includes('@unique')) {
      console.log('  ✅ PaymentHash configured as identifier');
    } else {
      console.log('  ❌ PaymentHash not properly configured');
    }
    
    // Check for Transaction model
    if (content.includes('model Transaction')) {
      console.log('  ✅ Transaction model exists');
      
      // Verify required fields
      const requiredFields = [
        'paymentHash',
        'recipientPhone',
        'btcAmount',
        'kesAmount',
        'status'
      ];
      
      requiredFields.forEach(field => {
        if (content.includes(field)) {
          console.log(`    ✅ ${field} field present`);
        } else {
          console.log(`    ❌ ${field} field MISSING`);
        }
      });
    } else {
      console.log('  ❌ Transaction model missing');
    }
    
    console.log();
  }
}

// Run diagnostics
(async () => {
  console.log('═══════════════════════════════════════════════');
  console.log('   BITPESA BRIDGE - CODE QUALITY DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════\n');
  
  await scanForAuthCode();
  await scanDatabaseSchema();
  
  console.log('═══════════════════════════════════════════════');
  console.log('   SCAN COMPLETE');
  console.log('═══════════════════════════════════════════════');
})();
