// tests/diagnostics/lightning-service.diagnostic.ts

import { Test, TestingModule } from '@nestjs/testing';
import { LightningService } from '@/lightning/lightning.service';

describe('Lightning Service Diagnostic', () => {
  let service: LightningService;
  let module: TestingModule;
  
  beforeAll(async () => {
    console.log('\n🔍 LIGHTNING SERVICE DIAGNOSTIC\n');
    console.log('================================\n');
    
    module = await Test.createTestingModule({
      providers: [LightningService],
    }).compile();
    
    service = module.get<LightningService>(LightningService);
  });
  
  describe('1. Configuration', () => {
    it('should have LND configuration', () => {
      console.log('📋 Checking LND Configuration...');
      
      const config = {
        host: process.env.LND_GRPC_HOST,
        macaroon: process.env.LND_MACAROON_PATH,
        cert: process.env.LND_TLS_CERT_PATH,
      };
      
      expect(config.host).toBeDefined();
      expect(config.macaroon).toBeDefined();
      expect(config.cert).toBeDefined();
      
      console.log('  ✅ LND configuration present');
      console.log(`     Host: ${config.host}`);
      console.log(`     Macaroon: ${config.macaroon}`);
      console.log(`     Cert: ${config.cert}\n`);
    });
  });
  
  describe('2. Node Connectivity', () => {
    it('should connect to LND node', async () => {
      console.log('🔌 Testing LND Node Connection...');
      
      try {
        const info = await service.getNodeInfo();
        
        expect(info).toBeDefined();
        expect(info.identity_pubkey).toBeDefined();
        
        console.log('  ✅ Connected to LND node');
        console.log(`     Pubkey: ${info.identity_pubkey}`);
        console.log(`     Alias: ${info.alias}`);
        console.log(`     Synced: ${info.synced_to_chain}`);
        console.log(`     Channels: ${info.num_active_channels}\n`);
      } catch (error) {
        console.log('  ❌ Failed to connect to LND node');
        console.log(`     Error: ${error.message}\n`);
        throw error;
      }
    });
    
    it('should have sufficient channel liquidity', async () => {
      console.log('💧 Checking Channel Liquidity...');
      
      const channels = await service.listChannels();
      const totalInbound = channels.reduce((sum, ch) => sum + ch.remote_balance, 0);
      const totalOutbound = channels.reduce((sum, ch) => sum + ch.local_balance, 0);
      
      console.log(`  Total Inbound: ${totalInbound} sats`);
      console.log(`  Total Outbound: ${totalOutbound} sats`);
      
      expect(totalInbound).toBeGreaterThan(1000000); // 0.01 BTC minimum
      expect(totalOutbound).toBeGreaterThan(1000000);
      
      console.log('  ✅ Sufficient liquidity available\n');
    });
  });
  
  describe('3. Invoice Generation', () => {
    it('should generate valid invoice', async () => {
      console.log('📄 Testing Invoice Generation...');
      
      const invoice = await service.createInvoice({
        amount: 10000, // 10,000 sats
        description: 'Test invoice',
        expiry: 300
      });
      
      expect(invoice).toBeDefined();
      expect(invoice.payment_hash).toBeDefined();
      expect(invoice.payment_request).toBeDefined();
      expect(invoice.payment_request).toMatch(/^ln/);
      
      console.log('  ✅ Invoice generated successfully');
      console.log(`     Payment Hash: ${invoice.payment_hash}`);
      console.log(`     Invoice: ${invoice.payment_request.substring(0, 50)}...\n`);
    });
    
    it('should include correct amount in invoice', async () => {
      console.log('💰 Verifying Invoice Amount...');
      
      const testAmount = 50000; // 50,000 sats
      const invoice = await service.createInvoice({
        amount: testAmount,
        description: 'Amount verification test'
      });
      
      const decoded = await service.decodeInvoice(invoice.payment_request);
      
      expect(decoded.num_satoshis).toBe(testAmount.toString());
      
      console.log('  ✅ Invoice amount correct');
      console.log(`     Expected: ${testAmount} sats`);
      console.log(`     Actual: ${decoded.num_satoshis} sats\n`);
    });
  });
  
  describe('4. Payment Verification', () => {
    it('should verify payment status', async () => {
      console.log('✓ Testing Payment Verification...');
      
      // Create test invoice
      const invoice = await service.createInvoice({
        amount: 1000,
        description: 'Payment verification test'
      });
      
      // Check initial status
      const status = await service.checkInvoiceStatus(invoice.payment_hash);
      
      expect(status).toBe('PENDING');
      
      console.log('  ✅ Payment verification working');
      console.log(`     Status: ${status}\n`);
    });
  });
  
  describe('5. Error Handling', () => {
    it('should handle invalid invoice gracefully', async () => {
      console.log('⚠️  Testing Error Handling...');
      
      try {
        await service.checkInvoiceStatus('invalid_hash');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
        console.log('  ✅ Invalid invoice handled correctly');
        console.log(`     Error: ${error.message}\n`);
      }
    });
  });
  
  afterAll(async () => {
    console.log('================================');
    console.log('LIGHTNING SERVICE DIAGNOSTIC COMPLETE\n');
    await module.close();
  });
});
