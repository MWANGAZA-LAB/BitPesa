// tests/diagnostics/transaction-service.diagnostic.ts

import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from '@/transactions/transaction.service';

describe('Transaction Service Diagnostic', () => {
  let service: TransactionService;
  let module: TestingModule;
  
  beforeAll(async () => {
    console.log('\n🔍 TRANSACTION SERVICE DIAGNOSTIC\n');
    console.log('================================\n');
    
    module = await Test.createTestingModule({
      providers: [TransactionService],
    }).compile();
    
    service = module.get<TransactionService>(TransactionService);
  });
  
  describe('1. Transaction Creation', () => {
    it('should create transaction without user context', async () => {
      console.log('📝 Testing Transaction Creation (No User)...');
      
      const tx = await service.createTransaction({
        type: 'SEND_MONEY',
        recipientPhone: '254712345678',
        amount: 1000, // KES
      });
      
      expect(tx).toBeDefined();
      expect(tx.id).toBeDefined();
      expect(tx.paymentHash).toBeDefined();
      expect(tx.status).toBe('PENDING');
      expect(tx.recipientPhone).toBe('254712345678');
      
      // Verify NO userId field
      expect((tx as any).userId).toBeUndefined();
      
      console.log('  ✅ Transaction created without user');
      console.log(`     ID: ${tx.id}`);
      console.log(`     Payment Hash: ${tx.paymentHash}`);
      console.log(`     Status: ${tx.status}\n`);
    });
  });
  
  describe('2. State Machine', () => {
    it('should have proper state transitions', () => {
      console.log('🔄 Testing State Machine...');
      
      const validTransitions = {
        PENDING: ['LIGHTNING_PENDING', 'CANCELLED'],
        LIGHTNING_PENDING: ['LIGHTNING_PAID', 'EXPIRED', 'CANCELLED'],
        LIGHTNING_PAID: ['CONVERTING'],
        CONVERTING: ['MPESA_PENDING'],
        MPESA_PENDING: ['COMPLETED', 'FAILED'],
        FAILED: ['REFUNDING'],
        REFUNDING: ['REFUNDED']
      };
      
      Object.entries(validTransitions).forEach(([from, toStates]) => {
        toStates.forEach(to => {
          const canTransition = service.canTransition(from as any, to as any);
          expect(canTransition).toBe(true);
          console.log(`  ✅ ${from} → ${to}`);
        });
      });
      
      console.log('\n');
    });
    
    it('should reject invalid state transitions', () => {
      console.log('⛔ Testing Invalid Transitions...');
      
      const invalidTransitions = [
        ['PENDING', 'COMPLETED'],
        ['LIGHTNING_PENDING', 'COMPLETED'],
        ['COMPLETED', 'PENDING']
      ];
      
      invalidTransitions.forEach(([from, to]) => {
        const canTransition = service.canTransition(from as any, to as any);
        expect(canTransition).toBe(false);
        console.log(`  ✅ Blocked: ${from} → ${to}`);
      });
      
      console.log('\n');
    });
  });
  
  describe('3. Transaction Lookup', () => {
    it('should find transaction by payment hash', async () => {
      console.log('🔍 Testing Transaction Lookup...');
      
      // Create test transaction
      const created = await service.createTransaction({
        type: 'SEND_MONEY',
        recipientPhone: '254712345678',
        amount: 500,
      });
      
      // Lookup by payment hash
      const found = await service.findByPaymentHash(created.paymentHash);
      
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.paymentHash).toBe(created.paymentHash);
      
      console.log('  ✅ Transaction lookup working');
      console.log(`     Found: ${found.id}\n`);
    });
  });
  
  describe('4. Idempotency', () => {
    it('should handle duplicate requests', async () => {
      console.log('🔁 Testing Idempotency...');
      
      const idempotencyKey = `test-${Date.now()}`;
      
      const tx1 = await service.createTransaction({
        type: 'SEND_MONEY',
        recipientPhone: '254712345678',
        amount: 1000,
      }, idempotencyKey);
      
      const tx2 = await service.createTransaction({
        type: 'SEND_MONEY',
        recipientPhone: '254712345678',
        amount: 1000,
      }, idempotencyKey);
      
      expect(tx1.id).toBe(tx2.id);
      
      console.log('  ✅ Idempotency working');
      console.log(`     Same transaction returned\n`);
    });
  });
  
  describe('5. Transaction Types', () => {
    const types = [
      'SEND_MONEY',
      'BUY_AIRTIME',
      'PAYBILL',
      'BUY_GOODS',
      'SCAN_PAY'
    ];
    
    types.forEach(type => {
      it(`should support ${type} transaction`, async () => {
        console.log(`📋 Testing ${type}...`);
        
        const tx = await service.createTransaction({
          type: type as any,
          recipientPhone: '254712345678',
          amount: 100,
          merchantCode: type.includes('PAY') || type.includes('GOODS') ? '12345' : undefined,
        });
        
        expect(tx.type).toBe(type);
        
        console.log(`  ✅ ${type} supported\n`);
      });
    });
  });
  
  afterAll(async () => {
    console.log('================================');
    console.log('TRANSACTION SERVICE DIAGNOSTIC COMPLETE\n');
    await module.close();
  });
});
