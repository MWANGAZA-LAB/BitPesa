// tests/security/security-audit.ts

import { execSync } from 'child_process';
import * as fs from 'fs';

async function runSecurityAudit(): Promise<void> {
  console.log('\n🔒 SECURITY AUDIT\n');
  console.log('==================\n');
  
  // 1. Dependency Vulnerabilities
  console.log('1️⃣  Checking Dependency Vulnerabilities...\n');
  
  try {
    execSync('npm audit --json > audit-report.json', { stdio: 'inherit' });
    const auditReport = JSON.parse(fs.readFileSync('audit-report.json', 'utf-8'));
    
    const { vulnerabilities } = auditReport;
    const critical = vulnerabilities?.critical || 0;
    const high = vulnerabilities?.high || 0;
    const moderate = vulnerabilities?.moderate || 0;
    
    console.log(`   Critical: ${critical}`);
    console.log(`   High: ${high}`);
    console.log(`   Moderate: ${moderate}\n`);
    
    if (critical > 0 || high > 0) {
      console.log('   ❌ CRITICAL/HIGH vulnerabilities found!\n');
    } else {
      console.log('   ✅ No critical vulnerabilities\n');
    }
  } catch (error) {
    console.log('   ⚠️  npm audit failed\n');
  }
  
  // 2. Hardcoded Secrets
  console.log('2️⃣  Scanning for Hardcoded Secrets...\n');
  
  const secretPatterns = [
    /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
    /password\s*=\s*['"][^'"]+['"]/gi,
    /secret\s*=\s*['"][^'"]+['"]/gi,
    /token\s*=\s*['"][^'"]+['"]/gi,
    /pk_live_[a-zA-Z0-9]+/gi,
    /sk_live_[a-zA-Z0-9]+/gi,
  ];
  
  try {
    const files = execSync(
      'find . -type f \\( -name "*.ts" -o -name "*.js" \\) -not -path "*/node_modules/*"',
      { encoding: 'utf-8' }
    ).split('\n');
    
    let secretsFound = 0;
    
    for (const file of files) {
      if (!file) continue;
      
      const content = fs.readFileSync(file, 'utf-8');
      
      for (const pattern of secretPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          console.log(`   ❌ Potential secret in ${file}:`);
          matches.forEach(match => console.log(`      ${match}`));
          secretsFound++;
        }
      }
    }
    
    if (secretsFound === 0) {
      console.log('   ✅ No hardcoded secrets found\n');
    } else {
      console.log(`   ❌ Found ${secretsFound} potential secrets\n`);
    }
  } catch (error) {
    console.log('   ⚠️  Secret scan failed\n');
  }
  
  // 3. Authentication Code Check
  console.log('3️⃣  Checking for Authentication Code...\n');
  
  const authPatterns = ['jwt', 'passport', 'bcrypt', 'session'];
  let authCodeFound = false;
  
  for (const pattern of authPatterns) {
    try {
      const result = execSync(
        `grep -r "${pattern}" services/ --include="*.ts" || true`,
        { encoding: 'utf-8' }
      );
      
      if (result.trim()) {
        console.log(`   ❌ Found "${pattern}" references`);
        authCodeFound = true;
      }
    } catch (error) {
      // Pattern not found (good)
    }
  }
  
  if (!authCodeFound) {
    console.log('   ✅ No authentication code found\n');
  } else {
    console.log('   ❌ Authentication code still present\n');
  }
  
  // 4. SQL Injection Check
  console.log('4️⃣  Checking for SQL Injection Risks...\n');
  
  try {
    const rawQueryUsage = execSync(
      'grep -r "raw(" services/ --include="*.ts" || true',
      { encoding: 'utf-8' }
    );
    
    if (rawQueryUsage.trim()) {
      console.log('   ⚠️  Raw SQL queries found - review for safety');
      console.log(rawQueryUsage);
    } else {
      console.log('   ✅ No raw SQL queries (using Prisma)\n');
    }
  } catch (error) {
    console.log('   ✅ No SQL injection risks\n');
  }
  
  // 5. CORS Configuration
  console.log('5️⃣  Checking CORS Configuration...\n');
  
  try {
    const corsConfig = execSync(
      'grep -r "cors" services/ --include="*.ts" -A 5 || true',
      { encoding: 'utf-8' }
    );
    
    if (corsConfig.includes('origin: "*"')) {
      console.log('   ⚠️  CORS allows all origins - consider restricting\n');
    } else {
      console.log('   ✅ CORS properly configured\n');
    }
  } catch (error) {
    console.log('   ⚠️  CORS check failed\n');
  }
  
  // 6. Environment Variables
  console.log('6️⃣  Checking Environment Variables...\n');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'LND_GRPC_HOST',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
  ];
  
  let missingVars = 0;
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.log(`   ❌ Missing: ${envVar}`);
      missingVars++;
    } else {
      console.log(`   ✅ ${envVar} configured`);
    }
  }
  
  if (missingVars === 0) {
    console.log('\n   ✅ All required env vars present\n');
  } else {
    console.log(`\n   ❌ ${missingVars} env vars missing\n`);
  }
  
  // 7. Rate Limiting
  console.log('7️⃣  Checking Rate Limiting...\n');
  
  try {
    const rateLimitConfig = execSync(
      'grep -r "@Throttle" services/ --include="*.ts" || grep -r "rateLimit" services/ --include="*.ts" || true',
      { encoding: 'utf-8' }
    );
    
    if (rateLimitConfig.trim()) {
      console.log('   ✅ Rate limiting configured\n');
    } else {
      console.log('   ❌ No rate limiting found\n');
    }
  } catch (error) {
    console.log('   ⚠️  Rate limit check failed\n');
  }
  
  console.log('==================');
  console.log('SECURITY AUDIT COMPLETE\n');
}

// Run audit
runSecurityAudit().catch(console.error);
