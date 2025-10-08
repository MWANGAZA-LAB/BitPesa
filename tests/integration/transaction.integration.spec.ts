import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../services/transaction-service/src/prisma/prisma.service';
import { TransactionService } from '../../services/transaction-service/src/transaction/transaction.service';
import { ConversionService } from '../../services/conversion-service/src/conversion/conversion.service';
import { NotificationService } from '../../services/transaction-service/src/notification/notification.service';
import { LoggerService } from '../../services/transaction-service/src/logger/logger.service';
import { TransactionType, TransactionStatus } from '@bitpesa/shared-types';

describe('Transaction Integration Tests', () => {
  let app: INestApplication;
  let transactionService: TransactionService;
  let prismaService: PrismaService;
  let conversionService: ConversionService;

  const mockConversionService = {
    getCurrentRate: jest.fn(),
  };

  const mockNotificationService = {
    sendNotification: jest.fn(),
  };

  const mockLoggerService = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: PrismaService,
          useValue: {
            transaction: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: ConversionService,
          useValue: mockConversionService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    transactionService = module.get<TransactionService>(TransactionService);
    prismaService = module.get<PrismaService>(PrismaService);
    conversionService = module.get<ConversionService>(ConversionService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Transaction Creation Flow', () => {
    it('should create a complete transaction with all required steps', async () => {
      // Mock conversion rate
      mockConversionService.getCurrentRate.mockResolvedValue({
        fromCurrency: 'BTC',
        toCurrency: 'KES',
        rate: 5000000, // 1 BTC = 5M KES
        finalRate: 5000000,
        source: 'binance',
        spread: 0.001,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 60000),
      });

      // Mock database operations
      const mockTransaction = {
        id: 'tx-123',
        paymentHash: 'payment-hash-123',
        transactionType: TransactionType.SEND_MONEY,
        status: TransactionStatus.PENDING,
        btcAmount: 0.0002, // 1000 KES / 5M KES
        kesAmount: 1000,
        exchangeRate: 5000000,
        feeAmount: 25, // 2.5% of 1000
        totalKesAmount: 1025,
        recipientPhone: '+254712345678',
        recipientName: 'John Doe',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        invoiceExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.transaction.create.mockResolvedValue(mockTransaction);

      // Create transaction
      const createTransactionDto = {
        transactionType: TransactionType.SEND_MONEY,
        kesAmount: 1000,
        recipientPhone: '+254712345678',
        recipientName: 'John Doe',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      };

      const result = await transactionService.createTransaction(createTransactionDto);

      // Verify conversion service was called
      expect(mockConversionService.getCurrentRate).toHaveBeenCalledWith('BTC', 'KES');

      // Verify transaction was created with correct data
      expect(prismaService.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transactionType: TransactionType.SEND_MONEY,
          status: TransactionStatus.PENDING,
          kesAmount: 1000,
          recipientPhone: '+254712345678',
          recipientName: 'John Doe',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
        }),
      });

      // Verify result structure
      expect(result).toMatchObject({
        id: 'tx-123',
        paymentHash: 'payment-hash-123',
        transactionType: TransactionType.SEND_MONEY,
        status: TransactionStatus.PENDING,
        kesAmount: 1000,
        recipientPhone: '+254712345678',
      });
    });

    it('should handle conversion service failure gracefully', async () => {
      // Mock conversion service failure
      mockConversionService.getCurrentRate.mockResolvedValue(null);

      const createTransactionDto = {
        transactionType: TransactionType.SEND_MONEY,
        kesAmount: 1000,
        recipientPhone: '+254712345678',
      };

      await expect(transactionService.createTransaction(createTransactionDto))
        .rejects.toThrow('Unable to get current exchange rate');

      // Verify transaction was not created
      expect(prismaService.transaction.create).not.toHaveBeenCalled();
    });

    it('should calculate fees correctly', async () => {
      mockConversionService.getCurrentRate.mockResolvedValue({
        fromCurrency: 'BTC',
        toCurrency: 'KES',
        rate: 5000000,
        finalRate: 5000000,
        source: 'binance',
        spread: 0.001,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 60000),
      });

      const mockTransaction = {
        id: 'tx-123',
        paymentHash: 'payment-hash-123',
        transactionType: TransactionType.SEND_MONEY,
        status: TransactionStatus.PENDING,
        btcAmount: 0.0002,
        kesAmount: 1000,
        exchangeRate: 5000000,
        feeAmount: 25, // 2.5% of 1000
        totalKesAmount: 1025,
        recipientPhone: '+254712345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.transaction.create.mockResolvedValue(mockTransaction);

      const createTransactionDto = {
        transactionType: TransactionType.SEND_MONEY,
        kesAmount: 1000,
        recipientPhone: '+254712345678',
      };

      await transactionService.createTransaction(createTransactionDto);

      // Verify fee calculation
      expect(prismaService.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          feeAmount: 25, // 2.5% of 1000
          totalKesAmount: 1025, // 1000 + 25
        }),
      });
    });
  });

  describe('Transaction Status Updates', () => {
    it('should update transaction status correctly', async () => {
      const mockTransaction = {
        id: 'tx-123',
        paymentHash: 'payment-hash-123',
        status: TransactionStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.transaction.findUnique.mockResolvedValue(mockTransaction);
      prismaService.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.PROCESSING,
      });

      const result = await transactionService.updateTransactionStatus(
        'tx-123',
        TransactionStatus.PROCESSING
      );

      expect(prismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-123' },
        data: { status: TransactionStatus.PROCESSING },
      });

      expect(result.status).toBe(TransactionStatus.PROCESSING);
    });

    it('should handle non-existent transaction', async () => {
      prismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(
        transactionService.updateTransactionStatus('non-existent', TransactionStatus.PROCESSING)
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('Transaction Retrieval', () => {
    it('should retrieve transaction by payment hash', async () => {
      const mockTransaction = {
        id: 'tx-123',
        paymentHash: 'payment-hash-123',
        transactionType: TransactionType.SEND_MONEY,
        status: TransactionStatus.PENDING,
        kesAmount: 1000,
        recipientPhone: '+254712345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await transactionService.getTransactionByPaymentHash('payment-hash-123');

      expect(prismaService.transaction.findUnique).toHaveBeenCalledWith({
        where: { paymentHash: 'payment-hash-123' },
      });

      expect(result).toEqual(mockTransaction);
    });

    it('should handle non-existent payment hash', async () => {
      prismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(
        transactionService.getTransactionByPaymentHash('non-existent-hash')
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('Transaction List Retrieval', () => {
    it('should retrieve paginated transaction list', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          paymentHash: 'hash-1',
          transactionType: TransactionType.SEND_MONEY,
          status: TransactionStatus.COMPLETED,
          kesAmount: 1000,
          createdAt: new Date(),
        },
        {
          id: 'tx-2',
          paymentHash: 'hash-2',
          transactionType: TransactionType.BUY_AIRTIME,
          status: TransactionStatus.PENDING,
          kesAmount: 500,
          createdAt: new Date(),
        },
      ];

      prismaService.transaction.findMany.mockResolvedValue(mockTransactions);
      prismaService.transaction.count.mockResolvedValue(2);

      const result = await transactionService.getTransactions(0, 10);

      expect(prismaService.transaction.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({
        transactions: mockTransactions,
        total: 2,
      });
    });
  });
});
