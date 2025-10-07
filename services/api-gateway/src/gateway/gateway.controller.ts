import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Res,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';
import { GatewayService } from './gateway.service';
import { ProxyService } from './proxy/proxy.service';
import { RateLimitService } from './rate-limit/rate-limit.service';

@ApiTags('gateway')
@Controller('api/v1')
@UseGuards(ThrottlerGuard)
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly proxyService: ProxyService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  @ApiResponse({ status: 200, description: 'Gateway is healthy' })
  async healthCheck(@Res() res: Response) {
    const health = await this.gatewayService.getHealthStatus();
    return res.status(HttpStatus.OK).json(health);
  }

  @Get('services')
  @ApiOperation({ summary: 'List available services' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async getServices(@Res() res: Response) {
    const services = await this.gatewayService.getAvailableServices();
    return res.status(HttpStatus.OK).json(services);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get gateway metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics(@Res() res: Response) {
    const metrics = await this.gatewayService.getMetrics();
    return res.status(HttpStatus.OK).json(metrics);
  }

  // Lightning Service Proxying
  @Post('lightning/invoice')
  @ApiOperation({ summary: 'Create Lightning invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async createLightningInvoice(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('lightning-service', '/lightning/invoice', 'POST', body, headers, res);
  }

  @Get('lightning/invoice/:paymentHash')
  @ApiOperation({ summary: 'Get Lightning invoice' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  async getLightningInvoice(
    @Param('paymentHash') paymentHash: string,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('lightning-service', `/lightning/invoice/${paymentHash}`, 'GET', null, headers, res);
  }

  // M-Pesa Service Proxying
  @Post('mpesa/send')
  @ApiOperation({ summary: 'Send money via M-Pesa' })
  @ApiResponse({ status: 201, description: 'M-Pesa transaction initiated' })
  async sendMpesa(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('mpesa-service', '/mpesa/send', 'POST', body, headers, res);
  }

  @Post('mpesa/airtime')
  @ApiOperation({ summary: 'Buy airtime via M-Pesa' })
  @ApiResponse({ status: 201, description: 'Airtime purchase initiated' })
  async buyAirtime(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('mpesa-service', '/mpesa/airtime', 'POST', body, headers, res);
  }

  @Post('mpesa/paybill')
  @ApiOperation({ summary: 'Pay bill via M-Pesa' })
  @ApiResponse({ status: 201, description: 'Paybill payment initiated' })
  async payBill(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('mpesa-service', '/mpesa/paybill', 'POST', body, headers, res);
  }

  @Post('mpesa/till')
  @ApiOperation({ summary: 'Buy goods via M-Pesa' })
  @ApiResponse({ status: 201, description: 'Till payment initiated' })
  async buyGoods(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('mpesa-service', '/mpesa/till', 'POST', body, headers, res);
  }

  // Transaction Service Proxying
  @Post('transactions/btc-to-mpesa')
  @ApiOperation({ summary: 'Create BTC to M-Pesa transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  async createBtcToMpesaTransaction(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('transaction-service', '/transactions/btc-to-mpesa', 'POST', body, headers, res);
  }

  @Get('transactions/:paymentHash')
  @ApiOperation({ summary: 'Get transaction by payment hash' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  async getTransaction(
    @Param('paymentHash') paymentHash: string,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('transaction-service', `/transactions/${paymentHash}`, 'GET', null, headers, res);
  }

  // Conversion Service Proxying
  @Get('conversion/rates')
  @ApiOperation({ summary: 'Get current exchange rates' })
  @ApiResponse({ status: 200, description: 'Rates retrieved successfully' })
  async getExchangeRates(
    @Query() query: any,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('conversion-service', '/conversion/rates', 'GET', null, headers, res);
  }

  @Post('conversion/quote')
  @ApiOperation({ summary: 'Get conversion quote' })
  @ApiResponse({ status: 200, description: 'Quote generated successfully' })
  async getConversionQuote(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('conversion-service', '/conversion/quote', 'POST', body, headers, res);
  }

  // Receipt Service Proxying
  @Get('receipts/:paymentHash')
  @ApiOperation({ summary: 'Get receipt by payment hash' })
  @ApiResponse({ status: 200, description: 'Receipt retrieved successfully' })
  async getReceipt(
    @Param('paymentHash') paymentHash: string,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('receipt-service', `/receipts/${paymentHash}`, 'GET', null, headers, res);
  }

  @Get('receipts/:paymentHash/download')
  @ApiOperation({ summary: 'Download receipt' })
  @ApiResponse({ status: 200, description: 'Receipt downloaded successfully' })
  async downloadReceipt(
    @Param('paymentHash') paymentHash: string,
    @Query() query: any,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.proxyService.forwardRequest('receipt-service', `/receipts/${paymentHash}/download`, 'GET', null, headers, res);
  }
}
