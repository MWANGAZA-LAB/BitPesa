import { Injectable, Logger } from '@nestjs/common';

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  finalRate: number;
  timestamp: Date;
}

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  async getCurrentRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    this.logger.log(`Getting exchange rate from ${fromCurrency} to ${toCurrency}`);
    
    // Mock implementation - replace with actual exchange rate service
    if (fromCurrency === 'BTC' && toCurrency === 'KES') {
      return {
        fromCurrency: 'BTC',
        toCurrency: 'KES',
        rate: 5000000, // Mock rate
        finalRate: 5000000,
        timestamp: new Date(),
      };
    }
    
    return null;
  }

  async convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getCurrentRate(fromCurrency, toCurrency);
    if (!rate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
    }
    
    return amount * rate.finalRate;
  }
}
