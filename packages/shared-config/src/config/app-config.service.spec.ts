import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '../config/app-config.service';
import { 
  TRANSACTION_CONSTANTS, 
  SERVICE_PORTS, 
  ERROR_CODES,
  HTTP_STATUS 
} from '../constants/app.constants';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDatabaseConfig', () => {
    it('should return database configuration with defaults', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_URL') return 'postgresql://test:test@localhost:5432/test';
        return undefined;
      });

      const config = service.getDatabaseConfig();

      expect(config).toEqual({
        url: 'postgresql://test:test@localhost:5432/test',
        maxConnections: 20,
        minConnections: 5,
        connectionTimeoutMs: 30000,
        queryTimeoutMs: 10000,
        transactionTimeoutMs: 60000,
      });
    });

    it('should use default DATABASE_URL when not provided', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const config = service.getDatabaseConfig();

      expect(config.url).toBe('postgresql://postgres:password@localhost:5432/bitpesa');
    });
  });

  describe('getApiConfig', () => {
    it('should return API configuration', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'API_BASE_URL': return 'https://api.test.com';
          case 'WEB_BASE_URL': return 'https://app.test.com';
          default: return undefined;
        }
      });

      const config = service.getApiConfig();

      expect(config).toEqual({
        baseUrl: 'https://api.test.com',
        webBaseUrl: 'https://app.test.com',
        rateLimitWindowMs: 900000,
        rateLimitMaxRequests: 100,
        requestTimeoutMs: 30000,
        webhookTimeoutMs: 10000,
        defaultPageSize: 20,
        maxPageSize: 100,
      });
    });

    it('should throw error for missing required environment variables', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() => service.getApiConfig()).toThrow('Required environment variable API_BASE_URL is not set');
    });
  });

  describe('getServicePort', () => {
    it('should return correct port for service', () => {
      const port = service.getServicePort('TRANSACTION_SERVICE');
      expect(port).toBe(SERVICE_PORTS.TRANSACTION_SERVICE);
    });

    it('should return correct port for all services', () => {
      expect(service.getServicePort('WEB_APP')).toBe(3000);
      expect(service.getServicePort('TRANSACTION_SERVICE')).toBe(3001);
      expect(service.getServicePort('MPESA_SERVICE')).toBe(3002);
      expect(service.getServicePort('MINMO_SERVICE')).toBe(3003);
    });
  });

  describe('environment checks', () => {
    it('should correctly identify production environment', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      expect(service.isProduction()).toBe(true);
      expect(service.isDevelopment()).toBe(false);
      expect(service.isTest()).toBe(false);
    });

    it('should correctly identify development environment', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      expect(service.isDevelopment()).toBe(true);
      expect(service.isProduction()).toBe(false);
      expect(service.isTest()).toBe(false);
    });

    it('should correctly identify test environment', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      expect(service.isTest()).toBe(true);
      expect(service.isProduction()).toBe(false);
      expect(service.isDevelopment()).toBe(false);
    });
  });

  describe('getAllConfig', () => {
    it('should return all configuration', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'NODE_ENV': return 'test';
          case 'DATABASE_URL': return 'postgresql://test:test@localhost:5432/test';
          case 'API_BASE_URL': return 'https://api.test.com';
          case 'WEB_BASE_URL': return 'https://app.test.com';
          default: return undefined;
        }
      });

      const config = service.getAllConfig();

      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('api');
      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('ports');
      expect(config.environment).toBe('test');
    });
  });
});
