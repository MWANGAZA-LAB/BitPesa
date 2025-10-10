import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface MinmoSwapRequest {
  fromCurrency: string;
  toCurrency: string;
  toAmount: number;
  payoutMethod: string;
  metadata: any;
  webhookUrl: string;
}

export interface MinmoSwapResponse {
  id: string;
  depositAddress: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  expiresAt: string;
  status: string;
}

export interface MinmoRateResponse {
  rate: number;
  timestamp: string;
  spread: number;
}

export interface MinmoStatusResponse {
  status: string;
  btcReceived: boolean;
  fromAmount: number;
  toAmount: number;
  completedAt?: string;
}

@Injectable()
export class MinmoClient {
  private readonly logger = new Logger(MinmoClient.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.get('MINMO_API_URL') || 'https://api.minmo.com';
    const apiKey = this.configService.get('MINMO_API_KEY');

    if (!apiKey) {
      throw new Error('MINMO_API_KEY is required');
    }

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'BitPesa-Bridge/1.0',
      },
      timeout: 30000,
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      },
    );

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`Received response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error(`API Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
        return Promise.reject(error);
      },
    );
  }

  /**
   * Create a new swap
   */
  async createSwap(data: MinmoSwapRequest): Promise<MinmoSwapResponse> {
    try {
      const response: AxiosResponse<MinmoSwapResponse> = await this.client.post('/swaps/create', data);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create swap: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Get exchange rate for currency pair
   */
  async getExchangeRate(pair: string): Promise<MinmoRateResponse> {
    try {
      const response: AxiosResponse<MinmoRateResponse> = await this.client.get(`/rates/${pair}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get exchange rate: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Get swap status
   */
  async getSwapStatus(swapId: string): Promise<MinmoStatusResponse> {
    try {
      const response: AxiosResponse<MinmoStatusResponse> = await this.client.get(`/swaps/${swapId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get swap status: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a swap
   */
  async cancelSwap(swapId: string): Promise<any> {
    try {
      const response = await this.client.post(`/swaps/${swapId}/cancel`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to cancel swap: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Get swap history
   */
  async getSwapHistory(limit: number = 50, offset: number = 0): Promise<any> {
    try {
      const response = await this.client.get('/swaps', {
        params: { limit, offset },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get swap history: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error(`API connection test failed: ${error.message}`);
      return false;
    }
  }
}
