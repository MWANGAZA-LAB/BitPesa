import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LightningService } from './lightning.service';
import { InvoiceService } from './invoice/invoice.service';
import { PaymentService } from './payment/payment.service';
import { ChannelService } from './channel/channel.service';
import { NodeService } from './node/node.service';

describe('LightningService', () => {
  let service: LightningService;
  let invoiceService: InvoiceService;
  let paymentService: PaymentService;

  const mockInvoiceService = {
    create: jest.fn(),
    findByPaymentHash: jest.fn(),
  };

  const mockPaymentService = {
    create: jest.fn(),
    findByPaymentHash: jest.fn(),
  };

  const mockChannelService = {
    getChannels: jest.fn(),
  };

  const mockNodeService = {
    getNodeInfo: jest.fn(),
    getBalance: jest.fn(),
    getStats: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LightningService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: InvoiceService,
          useValue: mockInvoiceService,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: ChannelService,
          useValue: mockChannelService,
        },
        {
          provide: NodeService,
          useValue: mockNodeService,
        },
      ],
    }).compile();

    service = module.get<LightningService>(LightningService);
    invoiceService = module.get<InvoiceService>(InvoiceService);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const createInvoiceDto = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        amountSats: 100000,
        description: 'Test invoice',
        expiry: 3600,
      };

      const mockInvoice = {
        id: '1',
        transactionId: createInvoiceDto.transactionId,
        paymentHash: 'mock-payment-hash',
        paymentRequest: 'lnbc100n1p0...',
        amountSats: BigInt(100000),
        description: 'Test invoice',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockInvoiceService.create.mockResolvedValue(mockInvoice);

      const result = await service.createInvoice(createInvoiceDto);

      expect(result).toEqual(mockInvoice);
      expect(mockInvoiceService.create).toHaveBeenCalledWith({
        transactionId: createInvoiceDto.transactionId,
        paymentHash: expect.any(String),
        paymentRequest: expect.any(String),
        amountSats: BigInt(100000),
        description: 'Test invoice',
        expiresAt: expect.any(Date),
      });
    });

    it('should throw BadRequestException when invoice creation fails', async () => {
      const createInvoiceDto = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        amountSats: 100000,
        description: 'Test invoice',
        expiry: 3600,
      };

      mockInvoiceService.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createInvoice(createInvoiceDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getInvoice', () => {
    it('should return an invoice by payment hash', async () => {
      const paymentHash = 'mock-payment-hash';
      const mockInvoice = {
        id: '1',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        paymentHash,
        paymentRequest: 'lnbc100n1p0...',
        amountSats: BigInt(100000),
        description: 'Test invoice',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockInvoiceService.findByPaymentHash.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice(paymentHash);

      expect(result).toEqual(mockInvoice);
      expect(mockInvoiceService.findByPaymentHash).toHaveBeenCalledWith(paymentHash);
    });

    it('should throw NotFoundException when invoice is not found', async () => {
      const paymentHash = 'non-existent-hash';

      mockInvoiceService.findByPaymentHash.mockResolvedValue(null);

      await expect(service.getInvoice(paymentHash)).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendPayment', () => {
    it('should send a payment successfully', async () => {
      const createPaymentDto = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        paymentRequest: 'lnbc100n1p0...',
        amountSats: 100000,
        feeLimitSats: 1000,
      };

      const mockPayment = {
        id: '1',
        transactionId: createPaymentDto.transactionId,
        paymentHash: 'mock-payment-hash',
        paymentRequest: createPaymentDto.paymentRequest,
        amountSats: BigInt(100000),
        feeSats: BigInt(100),
        status: 'SUCCEEDED',
        settledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPaymentService.create.mockResolvedValue(mockPayment);

      const result = await service.sendPayment(createPaymentDto);

      expect(result).toEqual(mockPayment);
      expect(mockPaymentService.create).toHaveBeenCalledWith({
        transactionId: createPaymentDto.transactionId,
        paymentHash: expect.any(String),
        paymentRequest: createPaymentDto.paymentRequest,
        amountSats: BigInt(100000),
        feeSats: expect.any(BigInt),
        status: 'SUCCEEDED',
        settledAt: expect.any(Date),
      });
    });

    it('should handle payment failure and store failed payment', async () => {
      const createPaymentDto = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        paymentRequest: 'lnbc100n1p0...',
        amountSats: 100000,
        feeLimitSats: 1000,
      };

      mockPaymentService.create.mockRejectedValue(new Error('Payment failed'));

      await expect(service.sendPayment(createPaymentDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPaymentService.create).toHaveBeenCalledWith({
        transactionId: createPaymentDto.transactionId,
        paymentHash: expect.any(String),
        paymentRequest: createPaymentDto.paymentRequest,
        amountSats: BigInt(100000),
        feeSats: BigInt(0),
        status: 'FAILED',
        failureReason: expect.any(String),
      });
    });
  });
});
