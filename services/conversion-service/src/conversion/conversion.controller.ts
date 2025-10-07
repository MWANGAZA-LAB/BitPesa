import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ConversionService } from './conversion.service';
import { ApiResponse, ExchangeRate } from '@bitpesa/shared-types';
import { IsValidCurrency } from '@bitpesa/shared-utils';

@Controller('rates')
export class ConversionController {
  constructor(private readonly conversionService: ConversionService) {}

  @Get('current')
  @HttpCode(HttpStatus.OK)
  async getCurrentRate(): Promise<ApiResponse<ExchangeRate>> {
    const rate = await this.conversionService.getCurrentRate('BTC', 'KES');
    return { success: true, data: rate };
  }

  @Get('btc-kes')
  @HttpCode(HttpStatus.OK)
  async getBtcKesRate(): Promise<ApiResponse<ExchangeRate>> {
    const rate = await this.conversionService.getCurrentRate('BTC', 'KES');
    return { success: true, data: rate };
  }

  @Get('convert')
  @HttpCode(HttpStatus.OK)
  async convert(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('amount') amount: number
  ): Promise<ApiResponse<{ fromAmount: number; toAmount: number; rate: number; fee: number }>> {
    const conversion = await this.conversionService.convert(from, to, amount);
    return { success: true, data: conversion };
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  async getRateHistory(
    @Query('period') period: string = '24h',
    @Query('limit') limit: number = 100
  ): Promise<ApiResponse<ExchangeRate[]>> {
    const rates = await this.conversionService.getRateHistory(period, limit);
    return { success: true, data: rates };
  }
}
