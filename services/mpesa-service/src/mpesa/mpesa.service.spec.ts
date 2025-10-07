import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { MpesaService } from './mpesa.service';
import { StkPushService } from './stk-push/stk-push.service';
import { B2CService } from './b2c/b2c.service';
import { C2BService } from './c2b/c2b.service';
import { CallbackService } from './callback/callback.service';

describe('MpesaService', () => {
  let service: MpesaService;
  let stkPushService: StkPushService;
  let b2cService: B2CService;

  const mockStkPushService = {
    initiateStkPush: jest.fn(),
  };

  const mockB2CService = {
    sendB2C: jest.fn(),
  };

  const mockC2BService = {
    registerC2B: jest.fn(),
  };

  const mockCallbackService = {
    handleStkPushCallback: jest.fn(),
    handleB2CCallback: jest.fn(),
    handleC2BCallback: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MpesaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: StkPushService,
          useValue: mockStkPushService,
        },
        {
          provide: B2CService,
          useValue: mockB2CService,
        },
        {
          provide: C2BService,
          useValue: mockC2BService,
        },
        {
          provide: CallbackService,
          useValue: mockCallbackService,
        },
      ],
    }).compile();

    service = module.get<MpesaService>(MpesaService);
    stkPushService = module.get<StkPushService>(StkPushService);
    b2cService = module.get<B2CService>(B2CService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateStkPush', () => {
    it('should initiate STK Push successfully', async () => {
      const stkPushDto = {
        phoneNumber: '+254712345678',
        amount: 1000,
        accountReference: 'TEST123',
        transactionDesc: 'Test payment',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const mockResponse = {
        merchantRequestId: 'mock-request-id',
        checkoutRequestId: 'mock-checkout-id',
        responseCode: '0',
        responseDescription: 'Success',
        customerMessage: 'Success. Request accepted for processing',
      };

      mockStkPushService.initiateStkPush.mockResolvedValue(mockResponse);

      const result = await service.initiateStkPush(stkPushDto);

      expect(result).toEqual(mockResponse);
      expect(mockStkPushService.initiateStkPush).toHaveBeenCalledWith(stkPushDto);
    });

    it('should throw BadRequestException when STK Push fails', async () => {
      const stkPushDto = {
        phoneNumber: '+254712345678',
        amount: 1000,
        accountReference: 'TEST123',
        transactionDesc: 'Test payment',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockStkPushService.initiateStkPush.mockRejectedValue(new Error('STK Push failed'));

      await expect(service.initiateStkPush(stkPushDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('sendB2C', () => {
    it('should send B2C payment successfully', async () => {
      const b2cDto = {
        phoneNumber: '+254712345678',
        amount: 1000,
        description: 'Test B2C payment',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const mockResponse = {
        originatorConversationId: 'mock-conversation-id',
        conversationId: 'mock-conversation-id',
        responseCode: '0',
        responseDescription: 'Accept the service request successfully.',
      };

      mockB2CService.sendB2C.mockResolvedValue(mockResponse);

      const result = await service.sendB2C(b2cDto);

      expect(result).toEqual(mockResponse);
      expect(mockB2CService.sendB2C).toHaveBeenCalledWith(b2cDto);
    });

    it('should throw BadRequestException when B2C payment fails', async () => {
      const b2cDto = {
        phoneNumber: '+254712345678',
        amount: 1000,
        description: 'Test B2C payment',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockB2CService.sendB2C.mockRejectedValue(new Error('B2C payment failed'));

      await expect(service.sendB2C(b2cDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('buyAirtime', () => {
    it('should buy airtime successfully', async () => {
      const airtimeDto = {
        phoneNumber: '+254712345678',
        amount: 100,
        description: 'Test airtime purchase',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const mockResponse = {
        merchantRequestId: 'mock-request-id',
        checkoutRequestId: 'mock-checkout-id',
        responseCode: '0',
        responseDescription: 'Success',
        customerMessage: 'Success. Request accepted for processing',
      };

      mockStkPushService.initiateStkPush.mockResolvedValue(mockResponse);

      const result = await service.buyAirtime(airtimeDto);

      expect(result).toEqual(mockResponse);
      expect(mockStkPushService.initiateStkPush).toHaveBeenCalledWith({
        phoneNumber: airtimeDto.phoneNumber,
        amount: airtimeDto.amount,
        accountReference: 'AIRTIME',
        transactionDesc: airtimeDto.description,
        transactionId: airtimeDto.transactionId,
      });
    });
  });

  describe('payBill', () => {
    it('should pay bill successfully', async () => {
      const paybillDto = {
        phoneNumber: '+254712345678',
        amount: 1000,
        accountNumber: '123456',
        description: 'Test paybill payment',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const mockResponse = {
        merchantRequestId: 'mock-request-id',
        checkoutRequestId: 'mock-checkout-id',
        responseCode: '0',
        responseDescription: 'Success',
        customerMessage: 'Success. Request accepted for processing',
      };

      mockStkPushService.initiateStkPush.mockResolvedValue(mockResponse);

      const result = await service.payBill(paybillDto);

      expect(result).toEqual(mockResponse);
      expect(mockStkPushService.initiateStkPush).toHaveBeenCalledWith({
        phoneNumber: paybillDto.phoneNumber,
        amount: paybillDto.amount,
        accountReference: paybillDto.accountNumber,
        transactionDesc: paybillDto.description,
        transactionId: paybillDto.transactionId,
      });
    });
  });

  describe('buyGoods', () => {
    it('should buy goods successfully', async () => {
      const goodsDto = {
        phoneNumber: '+254712345678',
        amount: 1000,
        tillNumber: '123456',
        description: 'Test buy goods',
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const mockResponse = {
        merchantRequestId: 'mock-request-id',
        checkoutRequestId: 'mock-checkout-id',
        responseCode: '0',
        responseDescription: 'Success',
        customerMessage: 'Success. Request accepted for processing',
      };

      mockStkPushService.initiateStkPush.mockResolvedValue(mockResponse);

      const result = await service.buyGoods(goodsDto);

      expect(result).toEqual(mockResponse);
      expect(mockStkPushService.initiateStkPush).toHaveBeenCalledWith({
        phoneNumber: goodsDto.phoneNumber,
        amount: goodsDto.amount,
        accountReference: goodsDto.tillNumber,
        transactionDesc: goodsDto.description,
        transactionId: goodsDto.transactionId,
      });
    });
  });
});
