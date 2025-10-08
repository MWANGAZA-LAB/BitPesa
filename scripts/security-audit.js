#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 BitPesa Security Audit');
console.log('========================\n');

const securityIssues = [];
const warnings = [];
const recommendations = [];

// Check for hardcoded secrets
function checkHardcodedSecrets() {
  console.log('🔍 Checking for hardcoded secrets...');
  
  const secretPatterns = [
    { pattern: /password\s*=\s*['"][^'"]+['"]/gi, type: 'Hardcoded password' },
    { pattern: /secret\s*=\s*['"][^'"]+['"]/gi, type: 'Hardcoded secret' },
    { pattern: /key\s*=\s*['"][^'"]+['"]/gi, type: 'Hardcoded key' },
    { pattern: /token\s*=\s*['"][^'"]+['"]/gi, type: 'Hardcoded token' },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, type: 'Hardcoded API key' },
    { pattern: /private[_-]?key\s*=\s*['"][^'"]+['"]/gi, type: 'Hardcoded private key' },
  ];

  const files = getAllFiles('.');
  let foundSecrets = 0;

  files.forEach(file => {
    if (shouldSkipFile(file)) return;

    try {
      const content = fs.readFileSync(file, 'utf8');
      secretPatterns.forEach(({ pattern, type }) => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            securityIssues.push({
              file,
              type,
              match: match.substring(0, 50) + '...',
              severity: 'HIGH'
            });
            foundSecrets++;
          });
        }
      });
    } catch (error) {
      // Skip files that can't be read
    }
  });

  if (foundSecrets > 0) {
    console.log(`❌ Found ${foundSecrets} potential hardcoded secrets`);
  } else {
    console.log('✅ No hardcoded secrets found');
  }
}

// Check for insecure dependencies
function checkDependencies() {
  console.log('\n🔍 Checking dependencies for vulnerabilities...');
  
  try {
    const auditResult = execSync('pnpm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(auditResult);
    
    if (audit.vulnerabilities) {
      const vulnCount = Object.keys(audit.vulnerabilities).length;
      if (vulnCount > 0) {
        console.log(`❌ Found ${vulnCount} vulnerable dependencies`);
        
        Object.entries(audit.vulnerabilities).forEach(([name, vuln]) => {
          securityIssues.push({
            file: 'package.json',
            type: 'Vulnerable dependency',
            match: `${name}: ${vuln.severity}`,
            severity: vuln.severity.toUpperCase()
          });
        });
      } else {
        console.log('✅ No vulnerable dependencies found');
      }
    }
  } catch (error) {
    warnings.push('Could not run dependency audit - ensure pnpm is installed');
  }
}

// Check for missing security headers
function checkSecurityHeaders() {
  console.log('\n🔍 Checking security headers configuration...');
  
  const securityFiles = [
    'apps/web/src/middleware.ts',
    'services/api-gateway/src/main.ts',
  ];

  let securityHeadersFound = 0;
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Content-Security-Policy'
  ];

  securityFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      requiredHeaders.forEach(header => {
        if (content.includes(header)) {
          securityHeadersFound++;
        } else {
          warnings.push(`Missing security header: ${header} in ${file}`);
        }
      });
    }
  });

  if (securityHeadersFound > 0) {
    console.log(`✅ Found ${securityHeadersFound} security headers configured`);
  } else {
    console.log('❌ No security headers found');
  }
}

// Check for proper authentication implementation
function checkAuthentication() {
  console.log('\n🔍 Checking authentication implementation...');
  
  const authFiles = [
    'apps/web/src/app/api/admin/auth/route.ts',
    'apps/web/src/app/api/auth/login/route.ts',
    'services/auth-service/src/user/user.service.ts',
  ];

  let authIssues = 0;

  authFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for hardcoded credentials
      if (content.includes('admin123') || content.includes('password')) {
        authIssues++;
        securityIssues.push({
          file,
          type: 'Hardcoded credentials',
          match: 'Found hardcoded credentials',
          severity: 'CRITICAL'
        });
      }

      // Check for proper password hashing
      if (content.includes('bcrypt') || content.includes('hashPassword')) {
        console.log(`✅ Password hashing implemented in ${file}`);
      } else {
        warnings.push(`No password hashing found in ${file}`);
      }

      // Check for JWT implementation
      if (content.includes('jwt') || content.includes('SignJWT')) {
        console.log(`✅ JWT implementation found in ${file}`);
      } else {
        warnings.push(`No JWT implementation found in ${file}`);
      }
    }
  });

  if (authIssues > 0) {
    console.log(`❌ Found ${authIssues} authentication security issues`);
  } else {
    console.log('✅ Authentication implementation looks secure');
  }
}

// Check for environment variable usage
function checkEnvironmentVariables() {
  console.log('\n🔍 Checking environment variable usage...');
  
  const envExample = 'infrastructure/docker/env.example';
  if (fs.existsSync(envExample)) {
    const content = fs.readFileSync(envExample, 'utf8');
    
    if (content.includes('JWT_SECRET') && content.includes('ADMIN_PASSWORD_HASH')) {
      console.log('✅ Environment variables properly configured');
    } else {
      warnings.push('Missing critical environment variables in env.example');
    }
  } else {
    warnings.push('No env.example file found');
  }
}

// Check for database security
function checkDatabaseSecurity() {
  console.log('\n🔍 Checking database security...');
  
  const prismaFiles = getAllFiles('.').filter(file => file.includes('schema.prisma'));
  
  let dbSecurityIssues = 0;

  prismaFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for proper indexing
    if (content.includes('@@index')) {
      console.log(`✅ Database indexing found in ${file}`);
    } else {
      warnings.push(`No database indexing found in ${file}`);
    }

    // Check for sensitive data handling
    if (content.includes('password') && !content.includes('@map')) {
      dbSecurityIssues++;
      securityIssues.push({
        file,
        type: 'Sensitive data without mapping',
        match: 'Password field without proper mapping',
        severity: 'MEDIUM'
      });
    }
  });

  if (dbSecurityIssues > 0) {
    console.log(`❌ Found ${dbSecurityIssues} database security issues`);
  } else {
    console.log('✅ Database security looks good');
  }
}

// Check for logging security
function checkLoggingSecurity() {
  console.log('\n🔍 Checking logging security...');
  
  const logFiles = getAllFiles('.').filter(file => 
    file.includes('logger') || file.includes('log')
  );

  let logSecurityIssues = 0;

  logFiles.forEach(file => {
    if (shouldSkipFile(file)) return;

    try {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('sanitizeForLogging') || content.includes('redact')) {
        console.log(`✅ Log sanitization found in ${file}`);
      } else if (content.includes('password') || content.includes('secret')) {
        logSecurityIssues++;
        warnings.push(`Potential sensitive data logging in ${file}`);
      }
    } catch (error) {
      // Skip files that can't be read
    }
  });

  if (logSecurityIssues > 0) {
    console.log(`❌ Found ${logSecurityIssues} potential logging security issues`);
  } else {
    console.log('✅ Logging security looks good');
  }
}

// Generate security report
function generateReport() {
  console.log('\n📊 Security Audit Report');
  console.log('========================\n');

  if (securityIssues.length > 0) {
    console.log('🚨 CRITICAL ISSUES:');
    securityIssues.forEach(issue => {
      console.log(`  ${issue.severity}: ${issue.type} in ${issue.file}`);
      console.log(`    ${issue.match}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }

  if (securityIssues.length === 0 && warnings.length === 0) {
    console.log('✅ No security issues found!');
  }

  // Generate recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  recommendations.push('1. Implement proper secret management (e.g., HashiCorp Vault)');
  recommendations.push('2. Set up automated security scanning in CI/CD pipeline');
  recommendations.push('3. Implement rate limiting and DDoS protection');
  recommendations.push('4. Add input validation and sanitization');
  recommendations.push('5. Implement proper error handling without information disclosure');
  recommendations.push('6. Set up security monitoring and alerting');
  recommendations.push('7. Regular security audits and penetration testing');
  recommendations.push('8. Implement proper session management');
  recommendations.push('9. Add CSRF protection');
  recommendations.push('10. Implement proper CORS configuration');

  recommendations.forEach(rec => console.log(`  ${rec}`));

  // Exit with error code if critical issues found
  if (securityIssues.some(issue => issue.severity === 'CRITICAL')) {
    console.log('\n❌ Security audit failed due to critical issues');
    process.exit(1);
  } else if (securityIssues.length > 0) {
    console.log('\n⚠️  Security audit completed with issues');
    process.exit(1);
  } else {
    console.log('\n✅ Security audit passed');
    process.exit(0);
  }
}

// Helper functions
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function shouldSkipFile(file) {
  const skipPatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '.env',
    'package-lock.json',
    'pnpm-lock.yaml',
    '.DS_Store'
  ];
  
  return skipPatterns.some(pattern => file.includes(pattern));
}

// Run security audit
async function runSecurityAudit() {
  try {
    checkHardcodedSecrets();
    checkDependencies();
    checkSecurityHeaders();
    checkAuthentication();
    checkEnvironmentVariables();
    checkDatabaseSecurity();
    checkLoggingSecurity();
    generateReport();
  } catch (error) {
    console.error('Security audit failed:', error);
    process.exit(1);
  }
}

// Run the audit
runSecurityAudit();
