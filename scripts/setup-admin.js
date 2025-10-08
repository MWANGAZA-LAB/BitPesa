#!/usr/bin/env node

const crypto = require('crypto');
const { hashPassword, generateSecurePassword } = require('../packages/shared-utils/dist/auth');

async function setupAdmin() {
  console.log('🔐 BitPesa Admin Setup');
  console.log('=====================\n');

  // Generate secure password
  const password = generateSecurePassword(16);
  console.log('Generated secure password:', password);
  console.log('');

  // Hash the password
  const passwordHash = await hashPassword(password);
  console.log('Password hash:', passwordHash);
  console.log('');

  // Generate JWT secret
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  console.log('JWT Secret:', jwtSecret);
  console.log('');

  // Generate environment variables
  console.log('📝 Add these to your .env file:');
  console.log('================================');
  console.log(`JWT_SECRET=${jwtSecret}`);
  console.log(`ADMIN_USERNAME=admin`);
  console.log(`ADMIN_EMAIL=admin@bitpesa.com`);
  console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
  console.log('');

  console.log('⚠️  IMPORTANT SECURITY NOTES:');
  console.log('==============================');
  console.log('1. Save the password securely - it will not be shown again');
  console.log('2. Never commit the .env file to version control');
  console.log('3. Use a password manager to store the credentials');
  console.log('4. Rotate the JWT secret regularly in production');
  console.log('5. Consider using a proper secret management system');
  console.log('');

  console.log('✅ Admin setup complete!');
}

// Run the setup
setupAdmin().catch(console.error);
