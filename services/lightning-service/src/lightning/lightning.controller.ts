import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LightningService } from './lightning.service';
import { CreateInvoiceDto, CreatePaymentDto } from './dto';
import { LightningInvoice, LightningPayment, LightningNodeInfo, LightningChannel } from '@bitpesa/shared-types';

@ApiTags('lightning')
@Controller('lightning')
export class LightningController {
  private readonly logger = new Logger(LightningController.name);

  constructor(private readonly lightningService: LightningService) {}

  @Post('invoice')
  @ApiOperation({ summary: 'Create Lightning invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully', type: LightningInvoice })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto): Promise<LightningInvoice> {
    this.logger.log(`Creating invoice for user ${createInvoiceDto.userId}, amount: ${createInvoiceDto.amountSats} sats`);
    return this.lightningService.createInvoice(createInvoiceDto);
  }

  @Get('invoice/:paymentHash')
  @ApiOperation({ summary: 'Get Lightning invoice by payment hash' })
  @ApiParam({ name: 'paymentHash', description: 'Payment hash of the invoice' })
  @ApiResponse({ status: 200, description: 'Invoice found', type: LightningInvoice })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoice(@Param('paymentHash') paymentHash: string): Promise<LightningInvoice> {
    this.logger.log(`Getting invoice with payment hash: ${paymentHash}`);
    return this.lightningService.getInvoice(paymentHash);
  }

  @Post('pay')
  @ApiOperation({ summary: 'Send Lightning payment' })
  @ApiResponse({ status: 201, description: 'Payment sent successfully', type: LightningPayment })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendPayment(@Body() createPaymentDto: CreatePaymentDto): Promise<LightningPayment> {
    this.logger.log(`Sending payment for user ${createPaymentDto.userId}, amount: ${createPaymentDto.amountSats} sats`);
    return this.lightningService.sendPayment(createPaymentDto);
  }

  @Get('payment/:paymentHash')
  @ApiOperation({ summary: 'Get Lightning payment by payment hash' })
  @ApiParam({ name: 'paymentHash', description: 'Payment hash of the payment' })
  @ApiResponse({ status: 200, description: 'Payment found', type: LightningPayment })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('paymentHash') paymentHash: string): Promise<LightningPayment> {
    this.logger.log(`Getting payment with payment hash: ${paymentHash}`);
    return this.lightningService.getPayment(paymentHash);
  }

  @Get('node-info')
  @ApiOperation({ summary: 'Get Lightning node information' })
  @ApiResponse({ status: 200, description: 'Node info retrieved', type: LightningNodeInfo })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getNodeInfo(): Promise<LightningNodeInfo> {
    this.logger.log('Getting Lightning node information');
    return this.lightningService.getNodeInfo();
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get Lightning channels' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'Channels retrieved', type: [LightningChannel] })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getChannels(@Query('active') active?: boolean): Promise<LightningChannel[]> {
    this.logger.log(`Getting Lightning channels, active filter: ${active}`);
    return this.lightningService.getChannels(active);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get Lightning node balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getBalance(): Promise<{ total: number; confirmed: number; unconfirmed: number }> {
    this.logger.log('Getting Lightning node balance');
    return this.lightningService.getBalance();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get Lightning node statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getStats(): Promise<{
    totalChannels: number;
    activeChannels: number;
    totalCapacity: number;
    localBalance: number;
    remoteBalance: number;
    totalSent: number;
    totalReceived: number;
  }> {
    this.logger.log('Getting Lightning node statistics');
    return this.lightningService.getStats();
  }
}
