import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MinmoService } from './minmo.service';
import { MinmoClient } from './minmo-client';
import { CreateSwapDto } from './dto/create-swap.dto';

describe('MinmoService', () => {
  let service: MinmoService;
  let minmoClient: MinmoClient;
  let configService: ConfigService;

  const mockMinmoClient = {
    createSwap: jest.fn(),
    getExchangeRate: jest.fn(),
    getSwapStatus: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinmoService,
        {
          provide: MinmoClient,
          useValue: mockMinmoClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MinmoService>(MinmoService);
    minmoClient = module.get<MinmoClient>(MinmoClient);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSwap', () => {
    it('should create a swap successfully', async () => {
      const createSwapDto: CreateSwapDto = {
        kesAmount: 5000,
        recipientPhone: '254700000000',
        recipientName: 'John Doe',
        transactionId: 'tx_123456789',
      };

      const mockSwapResponse = {
        id: 'swap_123456789',
        depositAddress: 'bc1qtest123',
        fromAmount: 0.001,
        toAmount: 5000,
        rate: 5000000,
        fee: 125,
        expiresAt: '2024-01-01T15:00:00Z',
        status: 'pending',
      };

      mockMinmoClient.createSwap.mockResolvedValue(mockSwapResponse);
      mockConfigService.get.mockReturnValue('https://api.bitpesa.co.ke');

      const result = await service.createSwap(createSwapDto);

      expect(result).toEqual({
        swapId: 'swap_123456789',
        btcAddress: 'bc1qtest123',
        btcAmount: 0.001,
        kesAmount: 5000,
        exchangeRate: 5000000,
        minmoFee: 125,
        expiresAt: new Date('2024-01-01T15:00:00Z'),
        status: 'pending',
      });

      expect(minmoClient.createSwap).toHaveBeenCalledWith({
        fromCurrency: 'BTC',
        toCurrency: 'KES',
        toAmount: 5000,
        payoutMethod: 'CUSTOM',
        metadata: {
          internalTransactionId: 'tx_123456789',
          recipientPhone: '254700000000',
          recipientName: 'John Doe',
        },
        webhookUrl: 'https://api.bitpesa.co.ke/api/v1/webhooks/minmo',
      });
    });

    it('should throw BadRequestException when swap creation fails', async () => {
      const createSwapDto: CreateSwapDto = {
        kesAmount: 5000,
        recipientPhone: '254700000000',
        transactionId: 'tx_123456789',
      };

      mockMinmoClient.createSwap.mockRejectedValue(new Error('API Error'));

      await expect(service.createSwap(createSwapDto)).rejects.toThrow('Failed to create swap: API Error');
    });
  });

  describe('getExchangeRate', () => {
    it('should get exchange rate successfully', async () => {
      const mockRateResponse = {
        rate: 5000000,
        timestamp: '2024-01-01T12:00:00Z',
        spread: 0.5,
      };

      mockMinmoClient.getExchangeRate.mockResolvedValue(mockRateResponse);

      const result = await service.getExchangeRate();

      expect(result).toEqual({
        rate: 5000000,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        spread: 0.5,
      });

      expect(minmoClient.getExchangeRate).toHaveBeenCalledWith('BTC-KES');
    });

    it('should throw BadRequestException when rate fetch fails', async () => {
      mockMinmoClient.getExchangeRate.mockRejectedValue(new Error('Rate API Error'));

      await expect(service.getExchangeRate()).rejects.toThrow('Failed to fetch exchange rate: Rate API Error');
    });
  });

  describe('getSwapStatus', () => {
    it('should get swap status successfully', async () => {
      const swapId = 'swap_123456789';
      const mockStatusResponse = {
        status: 'confirmed',
        btcReceived: true,
        fromAmount: 0.001,
        toAmount: 5000,
        completedAt: '2024-01-01T15:30:00Z',
      };

      mockMinmoClient.getSwapStatus.mockResolvedValue(mockStatusResponse);

      const result = await service.getSwapStatus(swapId);

      expect(result).toEqual({
        status: 'confirmed',
        btcReceived: true,
        btcAmount: 0.001,
        kesAmount: 5000,
        completedAt: new Date('2024-01-01T15:30:00Z'),
      });

      expect(minmoClient.getSwapStatus).toHaveBeenCalledWith(swapId);
    });

    it('should throw BadRequestException when status fetch fails', async () => {
      const swapId = 'swap_123456789';
      mockMinmoClient.getSwapStatus.mockRejectedValue(new Error('Status API Error'));

      await expect(service.getSwapStatus(swapId)).rejects.toThrow('Failed to get swap status: Status API Error');
    });
  });
});
