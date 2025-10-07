import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { ExchangeRate } from '@bitpesa/shared-types';
import { toPrismaDecimal } from '@bitpesa/shared-utils';
import axios from 'axios';

interface PriceFeed {
  name: string;
  url: string;
  parser: (data: any) => number;
}

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);
  private readonly priceFeeds: PriceFeed[] = [
    {
      name: 'binance',
      url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
      parser: (data) => parseFloat(data.price),
    },
    {
      name: 'coinbase',
      url: 'https://api.exchange.coinbase.com/products/BTC-USD/ticker',
      parser: (data) => parseFloat(data.price),
    },
    {
      name: 'kraken',
      url: 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD',
      parser: (data) => parseFloat(data.result.XXBTZUSD.c[0]),
    },
  ];

  private readonly usdKesRate = 150; // This should be fetched from a forex API
  private readonly spread = 0.005; // 0.5% spread

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('ConversionService');
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateExchangeRates() {
    try {
      this.logger.log('Updating exchange rates...');
      
      const btcUsdRates = await this.fetchBtcUsdRates();
      if (btcUsdRates.length === 0) {
        this.logger.warn('No BTC/USD rates fetched');
        return;
      }

      // Calculate average rate
      const avgBtcUsd = btcUsdRates.reduce((sum, rate) => sum + rate, 0) / btcUsdRates.length;
      const btcKes = avgBtcUsd * this.usdKesRate;
      
      // Apply spread
      const spreadAmount = btcKes * this.spread;
      const finalRate = btcKes + spreadAmount;

      // Store in database
      const exchangeRate = await this.prisma.exchangeRate.create({
        data: {
          fromCurrency: 'BTC',
          toCurrency: 'KES',
          rate: toPrismaDecimal(btcKes),
          source: 'aggregated',
          spread: toPrismaDecimal(spreadAmount),
          finalRate: toPrismaDecimal(finalRate),
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 60 * 1000), // Valid for 1 minute
        },
      });

      // Cache in Redis
      await this.redis.set('btc-kes-rate', {
        rate: finalRate,
        spread: spreadAmount,
        source: 'aggregated',
        timestamp: new Date().toISOString(),
      }, 60); // Cache for 1 minute

      this.logger.log(`Updated BTC/KES rate: ${finalRate} KES per BTC`);
      
    } catch (error) {
      this.logger.error('Failed to update exchange rates', error.stack);
    }
  }

  async getCurrentRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    // Try Redis cache first
    const cached = await this.redis.get('btc-kes-rate');
    if (cached) {
      return {
        id: 'cached',
        fromCurrency,
        toCurrency,
        rate: cached.rate.toString(),
        source: cached.source,
        spread: cached.spread.toString(),
        finalRate: cached.rate.toString(),
        validFrom: new Date(cached.timestamp),
        validUntil: new Date(Date.now() + 60 * 1000),
        createdAt: new Date(cached.timestamp),
      };
    }

    // Fallback to database
    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!rate) {
      throw new Error('No current exchange rate available');
    }

    return rate;
  }

  async convert(fromCurrency: string, toCurrency: string, amount: number): Promise<{
    fromAmount: number;
    toAmount: number;
    rate: number;
    fee: number;
  }> {
    const exchangeRate = await this.getCurrentRate(fromCurrency, toCurrency);
    const rate = parseFloat(exchangeRate.finalRate);
    
    let toAmount: number;
    if (fromCurrency === 'BTC' && toCurrency === 'KES') {
      toAmount = amount * rate;
    } else if (fromCurrency === 'KES' && toCurrency === 'BTC') {
      toAmount = amount / rate;
    } else {
      throw new Error('Unsupported currency pair');
    }

    const fee = this.calculateConversionFee(toAmount, toCurrency);

    return {
      fromAmount: amount,
      toAmount: toAmount - fee,
      rate,
      fee,
    };
  }

  async getRateHistory(period: string, limit: number): Promise<ExchangeRate[]> {
    const hours = this.parsePeriod(period);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.prisma.exchangeRate.findMany({
      where: {
        fromCurrency: 'BTC',
        toCurrency: 'KES',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async fetchBtcUsdRates(): Promise<number[]> {
    const rates: number[] = [];

    for (const feed of this.priceFeeds) {
      try {
        const response = await axios.get(feed.url, { timeout: 5000 });
        const rate = feed.parser(response.data);
        if (rate > 0) {
          rates.push(rate);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch rate from ${feed.name}: ${error.message}`);
      }
    }

    return rates;
  }

  private calculateConversionFee(amount: number, currency: string): number {
    // 1% fee with minimum amounts
    const feePercentage = 0.01;
    const minFee = currency === 'KES' ? 5 : 0.00001; // 5 KES or 0.00001 BTC
    return Math.max(amount * feePercentage, minFee);
  }

  private parsePeriod(period: string): number {
    const periodMap: { [key: string]: number } = {
      '1h': 1,
      '24h': 24,
      '7d': 168,
      '30d': 720,
    };
    return periodMap[period] || 24;
  }
}
