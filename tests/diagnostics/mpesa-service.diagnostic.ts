// tests/diagnostics/mpesa-service.diagnostic.ts

import { Test, TestingModule } from '@nestjs/testing';
import { MpesaService } from '@/mpesa/mpesa.service';

describe('M-Pesa Service Diagnostic', () => {
  let service: MpesaService;
  let module: TestingModule;
  
  beforeAll(async () => {
    console.log('\n🔍 M-PESA SERVICE DIAGNOSTIC\n');
    console.log('================================\n');
    
    module = await Test.createTestingModule({
      providers: [MpesaService],
    }).compile();
    
    service = module.get<MpesaService>(MpesaService);
  });
  
  describe('1. Configuration', () => {
    it('should have Daraja API credentials', () => {
      console.log('📋 Checking Daraja API Configuration...');
      
      const config = {
        consumerKey: process.env.MPESA_CONSUMER_KEY,
        consumerSecret: process.env.MPESA_CONSUMER_SECRET,
        shortcode: process.env.MPESA_SHORTCODE,
        passkey: process.env.MPESA_PASSKEY,
        environment: process.env.MPESA_ENVIRONMENT,
      };
      
      expect(config.consumerKey).toBeDefined();
      expect(config.consumerSecret).toBeDefined();
      expect(config.shortcode).toBeDefined();
      expect(config.passkey).toBeDefined();
      
      console.log('  ✅ Daraja API credentials configured');
      console.log(`     Environment: ${config.environment}`);
      console.log(`     Shortcode: ${config.shortcode}\n`);
    });
  });
  
  describe('2. Authentication', () => {
    it('should obtain OAuth token', async () => {
      console.log('🔑 Testing OAuth Token Generation...');
      
      const token = await service.getAccessToken();
      
      expect(token).toBeDefined();
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
      
      console.log('  ✅ OAuth token obtained');
      console.log(`     Token: ${token.substring(0, 20)}...\n`);
    });
    
    it('should cache token and reuse', async () => {
      console.log('💾 Testing Token Caching...');
      
      const token1 = await service.getAccessToken();
      const token2 = await service.getAccessToken();
      
      expect(token1).toBe(token2);
      
      console.log('  ✅ Token caching working\n');
    });
  });
  
  describe('3. Send Money (B2C)', () => {
    it('should validate phone number format', () => {
      console.log('📱 Testing Phone Number Validation...');
      
      const validPhone = '254712345678';
      const invalidPhone1 = '0712345678';
      const invalidPhone2 = '+254712345678';
      
      expect(service.validatePhoneNumber(validPhone)).toBe(true);
      expect(service.validatePhoneNumber(invalidPhone1)).toBe(false);
      expect(service.validatePhoneNumber(invalidPhone2)).toBe(false);
      
      console.log('  ✅ Phone validation working\n');
    });
    
    it('should initiate B2C payment (sandbox)', async () => {
      console.log('💸 Testing B2C Payment Initiation...');
      
      if (process.env.MPESA_ENVIRONMENT !== 'sandbox') {
        console.log('  ⚠️  Skipping (not in sandbox)\n');
        return;
      }
      
      const result = await service.sendMoney({
        phone: '254708374149', // Safaricom sandbox test number
        amount: 10,
        reference: 'TEST001',
        description: 'Diagnostic test'
      });
      
      expect(result).toBeDefined();
      expect(result.ConversationID).toBeDefined();
      
      console.log('  ✅ B2C payment initiated');
      console.log(`     Conversation ID: ${result.ConversationID}\n`);
    });
  });
  
  describe('4. Buy Airtime', () => {
    it('should validate airtime amount', () => {
      console.log('📞 Testing Airtime Amount Validation...');
      
      expect(service.validateAirtimeAmount(5)).toBe(true);
      expect(service.validateAirtimeAmount(1000)).toBe(true);
      expect(service.validateAirtimeAmount(4)).toBe(false); // Below minimum
      expect(service.validateAirtimeAmount(15000)).toBe(false); // Above maximum
      
      console.log('  ✅ Airtime validation working\n');
    });
  });
  
  describe('5. Paybill (Lipa na M-Pesa)', () => {
    it('should validate business number', () => {
      console.log('🏢 Testing Business Number Validation...');
      
      expect(service.validateBusinessNumber('12345')).toBe(true);
      expect(service.validateBusinessNumber('123456')).toBe(true);
      expect(service.validateBusinessNumber('1234567')).toBe(true);
      expect(service.validateBusinessNumber('1234')).toBe(false); // Too short
      expect(service.validateBusinessNumber('12345678')).toBe(false); // Too long
      
      console.log('  ✅ Business number validation working\n');
    });
  });
  
  describe('6. Buy Goods (Till)', () => {
    it('should validate till number', () => {
      console.log('🛒 Testing Till Number Validation...');
      
      expect(service.validateTillNumber('12345')).toBe(true);
      expect(service.validateTillNumber('123456')).toBe(true);
      expect(service.validateTillNumber('1234')).toBe(false);
      
      console.log('  ✅ Till number validation working\n');
    });
  });
  
  describe('7. Callback Handler', () => {
    it('should parse callback data correctly', () => {
      console.log('📥 Testing Callback Parsing...');
      
      const mockCallback = {
        Body: {
          stkCallback: {
            MerchantRequestID: '123-456-789',
            CheckoutRequestID: 'ws_CO_123456789',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 100 },
                { Name: 'MpesaReceiptNumber', Value: 'ABC123XYZ' },
                { Name: 'PhoneNumber', Value: 254712345678 }
              ]
            }
          }
        }
      };
      
      const parsed = service.parseCallback(mockCallback);
      
      expect(parsed.resultCode).toBe(0);
      expect(parsed.mpesaReceipt).toBe('ABC123XYZ');
      expect(parsed.amount).toBe(100);
      
      console.log('  ✅ Callback parsing working');
      console.log(`     Receipt: ${parsed.mpesaReceipt}`);
      console.log(`     Amount: ${parsed.amount}\n`);
    });
  });
  
  afterAll(async () => {
    console.log('================================');
    console.log('M-PESA SERVICE DIAGNOSTIC COMPLETE\n');
    await module.close();
  });
});
