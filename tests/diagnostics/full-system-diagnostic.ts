// tests/diagnostics/full-system-diagnostic.ts

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface DiagnosticResult {
  section: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

class SystemDiagnostic {
  private results: DiagnosticResult[] = [];
  
  async runFullDiagnostic(): Promise<void> {
    console.log('\n');
    console.log('═══════════════════════════════════════════════');
    console.log('   BITPESA BRIDGE - FULL SYSTEM DIAGNOSTIC');
    console.log('═══════════════════════════════════════════════');
    console.log('\n');
    
    await this.checkProjectStructure();
    await this.checkDatabaseSchema();
    await this.checkServices();
    await this.checkDependencies();
    await this.checkConfiguration();
    await this.checkSecurity();
    await this.checkTests();
    await this.checkDocumentation();
    
    this.generateReport();
  }
  
  private async checkProjectStructure(): Promise<void> {
    console.log('📁 CHECKING PROJECT STRUCTURE');
    console.log('==============================\n');
    
    const requiredDirs = [
      'apps/web',
      'apps/mobile',
      'apps/admin',
      'services/lightning-service',
      'services/mpesa-service',
      'services/transaction-service',
      'services/conversion-service',
      'packages/shared-types',
      'infrastructure',
    ];
    
    for (const dir of requiredDirs) {
      if (fs.existsSync(dir)) {
        console.log(`  ✅ ${dir}`);
        this.results.push({
          section: 'Project Structure',
          status: 'pass',
          message: `${dir} exists`,
        });
      } else {
        console.log(`  ❌ ${dir} - MISSING`);
        this.results.push({
          section: 'Project Structure',
          status: 'fail',
          message: `${dir} is missing`,
        });
      }
    }
    
    console.log('\n');
  }
  
  private async checkDatabaseSchema(): Promise<void> {
    console.log('🗄️  CHECKING DATABASE SCHEMA');
    console.log('============================\n');
    
    try {
      const schemaFiles = execSync(
        'find . -name "schema.prisma" -not -path "*/node_modules/*"',
        { encoding: 'utf-8' }
      ).split('\n').filter(Boolean);
      
      for (const schemaFile of schemaFiles) {
        console.log(`Analyzing: ${schemaFile}`);
        const content = fs.readFileSync(schemaFile, 'utf-8');
        
        // Check for User model (should be removed)
        if (content.includes('model User')) {
          console.log('  ❌ User model still exists');
          this.results.push({
            section: 'Database Schema',
            status: 'fail',
            message: 'User model must be removed',
            details: { file: schemaFile },
          });
        } else {
          console.log('  ✅ User model removed');
          this.results.push({
            section: 'Database Schema',
            status: 'pass',
            message: 'No User model found',
          });
        }
        
        // Check for paymentHash
        if (content.match(/paymentHash.*@unique/)) {
          console.log('  ✅ paymentHash configured');
          this.results.push({
            section: 'Database Schema',
            status: 'pass',
            message: 'paymentHash properly configured',
          });
        } else {
          console.log('  ❌ paymentHash not configured');
          this.results.push({
            section: 'Database Schema',
            status: 'fail',
            message: 'paymentHash must be @unique',
            details: { file: schemaFile },
          });
        }
        
        // Check Transaction model
        if (content.includes('model Transaction')) {
          console.log('  ✅ Transaction model exists');
          
          const requiredFields = [
            'paymentHash',
            'recipientPhone',
            'btcAmount',
            'kesAmount',
            'status'
          ];
          
          requiredFields.forEach(field => {
            if (content.includes(field)) {
              console.log(`    ✅ ${field}`);
            } else {
              console.log(`    ❌ ${field} missing`);
              this.results.push({
                section: 'Database Schema',
                status: 'fail',
                message: `Transaction model missing ${field}`,
              });
            }
          });
        }
      }
    } catch (error) {
      console.log('  ❌ Error checking schema');
      this.results.push({
        section: 'Database Schema',
        status: 'fail',
        message: error.message,
      });
    }
    
    console.log('\n');
  }
  
  private async checkServices(): Promise<void> {
    console.log('⚙️  CHECKING SERVICES');
    console.log('====================\n');
    
    const services = [
      'lightning-service',
      'mpesa-service',
      'transaction-service',
      'conversion-service',
    ];
    
    for (const service of services) {
      const servicePath = `services/${service}`;
      
      if (!fs.existsSync(servicePath)) {
        console.log(`  ❌ ${service} - MISSING`);
        this.results.push({
          section: 'Services',
          status: 'fail',
          message: `${service} directory missing`,
        });
        continue;
      }
      
      console.log(`  Checking ${service}...`);
      
      // Check for required files
      const requiredFiles = [
        'package.json',
        'tsconfig.json',
        'src/main.ts',
      ];
      
      let serviceComplete = true;
      
      for (const file of requiredFiles) {
        const filePath = path.join(servicePath, file);
        if (fs.existsSync(filePath)) {
          console.log(`    ✅ ${file}`);
        } else {
          console.log(`    ❌ ${file} missing`);
          serviceComplete = false;
        }
      }
      
      if (serviceComplete) {
        this.results.push({
          section: 'Services',
          status: 'pass',
          message: `${service} is complete`,
        });
      } else {
        this.results.push({
          section: 'Services',
          status: 'fail',
          message: `${service} is incomplete`,
        });
      }
    }
    
    console.log('\n');
  }
  
  private async checkDependencies(): Promise<void> {
    console.log('📦 CHECKING DEPENDENCIES');
    console.log('========================\n');
    
    try {
      // Check for authentication dependencies (should be removed)
      const authDeps = [
        '@nestjs/jwt',
        '@nestjs/passport',
        'passport',
        'bcrypt',
        'jsonwebtoken',
      ];
      
      const packageJson = JSON.parse(
        fs.readFileSync('package.json', 'utf-8')
      );
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      
      let authDepsFound = false;
      
      for (const dep of authDeps) {
        if (allDeps[dep]) {
          console.log(`  ❌ ${dep} - SHOULD BE REMOVED`);
          authDepsFound = true;
        }
      }
      
      if (!authDepsFound) {
        console.log('  ✅ No authentication dependencies');
        this.results.push({
          section: 'Dependencies',
          status: 'pass',
          message: 'Authentication dependencies properly removed',
        });
      } else {
        this.results.push({
          section: 'Dependencies',
          status: 'fail',
          message: 'Authentication dependencies still present',
        });
      }
      
      // Check for required dependencies
      const requiredDeps = [
        '@nestjs/core',
        '@prisma/client',
        'redis',
      ];
      
      let allRequired = true;
      
      for (const dep of requiredDeps) {
        if (allDeps[dep]) {
          console.log(`  ✅ ${dep}`);
        } else {
          console.log(`  ❌ ${dep} - MISSING`);
          allRequired = false;
        }
      }
      
      if (allRequired) {
        this.results.push({
          section: 'Dependencies',
          status: 'pass',
          message: 'All required dependencies present',
        });
      }
      
    } catch (error) {
      console.log('  ❌ Error checking dependencies');
      this.results.push({
        section: 'Dependencies',
        status: 'fail',
        message: error.message,
      });
    }
    
    console.log('\n');
  }
  
  private async checkConfiguration(): Promise<void> {
    console.log('⚙️  CHECKING CONFIGURATION');
    console.log('=========================\n');
    
    if (fs.existsSync('.env.example')) {
      console.log('  ✅ .env.example exists');
      
      const envExample = fs.readFileSync('.env.example', 'utf-8');
      
      // Check for removed auth variables
      const authVars = ['JWT_SECRET', 'SESSION_SECRET', 'PASSWORD_SALT'];
      let authVarsFound = false;
      
      for (const authVar of authVars) {
        if (envExample.includes(authVar)) {
          console.log(`    ❌ ${authVar} should be removed`);
          authVarsFound = true;
        }
      }
      
      if (!authVarsFound) {
        console.log('    ✅ No authentication variables');
      }
      
      // Check for required variables
      const requiredVars = [
        'DATABASE_URL',
        'LND_GRPC_HOST',
        'MPESA_CONSUMER_KEY',
      ];
      
      let allVarsPresent = true;
      
      for (const reqVar of requiredVars) {
        if (envExample.includes(reqVar)) {
          console.log(`    ✅ ${reqVar}`);
        } else {
          console.log(`    ❌ ${reqVar} missing`);
          allVarsPresent = false;
        }
      }
      
      this.results.push({
        section: 'Configuration',
        status: allVarsPresent && !authVarsFound ? 'pass' : 'fail',
        message: 'Environment configuration',
      });
      
    } else {
      console.log('  ❌ .env.example missing');
      this.results.push({
        section: 'Configuration',
        status: 'fail',
        message: '.env.example missing',
      });
    }
    
    console.log('\n');
  }
  
  private async checkSecurity(): Promise<void> {
    console.log('🔒 CHECKING SECURITY');
    console.log('===================\n');
    
    // Check for hardcoded secrets
    try {
      const secretPatterns = [
        /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
        /password\s*=\s*['"][^'"]+['"]/gi,
        /secret\s*=\s*['"][^'"]+['"]/gi,
      ];
      
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
            console.log(`  ❌ Potential secret in ${file}`);
            secretsFound++;
          }
        }
      }
      
      if (secretsFound === 0) {
        console.log('  ✅ No hardcoded secrets found');
        this.results.push({
          section: 'Security',
          status: 'pass',
          message: 'No hardcoded secrets',
        });
      } else {
        console.log(`  ❌ Found ${secretsFound} potential secrets`);
        this.results.push({
          section: 'Security',
          status: 'fail',
          message: `${secretsFound} potential secrets found`,
        });
      }
    } catch (error) {
      console.log('  ⚠️  Security check failed');
      this.results.push({
        section: 'Security',
        status: 'warning',
        message: 'Security check failed',
      });
    }
    
    console.log('\n');
  }
  
  private async checkTests(): Promise<void> {
    console.log('🧪 CHECKING TESTS');
    console.log('=================\n');
    
    try {
      const testFiles = execSync(
        'find . -name "*.test.ts" -o -name "*.spec.ts" -not -path "*/node_modules/*"',
        { encoding: 'utf-8' }
      ).split('\n').filter(Boolean);
      
      if (testFiles.length > 0) {
        console.log(`  ✅ Found ${testFiles.length} test files`);
        this.results.push({
          section: 'Tests',
          status: 'pass',
          message: `${testFiles.length} test files found`,
        });
      } else {
        console.log('  ❌ No test files found');
        this.results.push({
          section: 'Tests',
          status: 'fail',
          message: 'No test files found',
        });
      }
    } catch (error) {
      console.log('  ❌ Error checking tests');
      this.results.push({
        section: 'Tests',
        status: 'fail',
        message: 'Error checking tests',
      });
    }
    
    console.log('\n');
  }
  
  private async checkDocumentation(): Promise<void> {
    console.log('📚 CHECKING DOCUMENTATION');
    console.log('=========================\n');
    
    if (fs.existsSync('README.md')) {
      console.log('  ✅ README.md exists');
      this.results.push({
        section: 'Documentation',
        status: 'pass',
        message: 'README.md exists',
      });
    } else {
      console.log('  ❌ README.md missing');
      this.results.push({
        section: 'Documentation',
        status: 'fail',
        message: 'README.md missing',
      });
    }
    
    console.log('\n');
  }
  
  private generateReport(): void {
    console.log('═══════════════════════════════════════════════');
    console.log('   DIAGNOSTIC REPORT');
    console.log('═══════════════════════════════════════════════\n');
    
    const sections = [...new Set(this.results.map(r => r.section))];
    
    sections.forEach(section => {
      console.log(`📋 ${section.toUpperCase()}`);
      console.log('─'.repeat(section.length + 3));
      
      const sectionResults = this.results.filter(r => r.section === section);
      const passed = sectionResults.filter(r => r.status === 'pass').length;
      const failed = sectionResults.filter(r => r.status === 'fail').length;
      const warnings = sectionResults.filter(r => r.status === 'warning').length;
      
      console.log(`  ✅ Passed: ${passed}`);
      console.log(`  ❌ Failed: ${failed}`);
      console.log(`  ⚠️  Warnings: ${warnings}`);
      console.log('');
    });
    
    const totalPassed = this.results.filter(r => r.status === 'pass').length;
    const totalFailed = this.results.filter(r => r.status === 'fail').length;
    const totalWarnings = this.results.filter(r => r.status === 'warning').length;
    
    console.log('═══════════════════════════════════════════════');
    console.log('   OVERALL SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`  ✅ Total Passed: ${totalPassed}`);
    console.log(`  ❌ Total Failed: ${totalFailed}`);
    console.log(`  ⚠️  Total Warnings: ${totalWarnings}`);
    console.log('');
    
    if (totalFailed === 0) {
      console.log('🎉 ALL CHECKS PASSED! System is ready for production.');
    } else if (totalFailed <= 3) {
      console.log('⚠️  Minor issues detected. Review failed items before production.');
    } else {
      console.log('❌ Critical issues detected. Fix failed items before production.');
    }
    
    console.log('\n═══════════════════════════════════════════════');
  }
}

// Run diagnostic
const diagnostic = new SystemDiagnostic();
diagnostic.runFullDiagnostic().catch(console.error);
