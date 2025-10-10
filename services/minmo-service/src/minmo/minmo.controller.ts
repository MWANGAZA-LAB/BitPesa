import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { MinmoService } from './minmo.service';
import { WebhookHandler } from './webhook.handler';
import { CreateSwapDto } from './dto/create-swap.dto';
import { SwapWebhookDto } from './dto/swap-webhook.dto';

@ApiTags('minmo')
@Controller('minmo')
@UseGuards(ThrottlerGuard)
export class MinmoController {
  constructor(
    private readonly minmoService: MinmoService,
    private readonly webhookHandler: WebhookHandler,
  ) {}

  @Post('swaps')
  @ApiOperation({ summary: 'Create a new Bitcoin to KES swap' })
  @ApiResponse({
    status: 201,
    description: 'Swap created successfully',
    schema: {
      type: 'object',
      properties: {
        swapId: { type: 'string', example: 'swap_123456789' },
        btcAddress: { type: 'string', example: 'bc1qtest123...' },
        btcAmount: { type: 'number', example: 0.001 },
        kesAmount: { type: 'number', example: 5000 },
        exchangeRate: { type: 'number', example: 5000000 },
        minmoFee: { type: 'number', example: 125 },
        expiresAt: { type: 'string', format: 'date-time' },
        status: { type: 'string', example: 'pending' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async createSwap(@Body() createSwapDto: CreateSwapDto) {
    return this.minmoService.createSwap(createSwapDto);
  }

  @Get('rates/btc-kes')
  @ApiOperation({ summary: 'Get current BTC/KES exchange rate' })
  @ApiResponse({
    status: 200,
    description: 'Exchange rate retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        rate: { type: 'number', example: 5000000 },
        timestamp: { type: 'string', format: 'date-time' },
        spread: { type: 'number', example: 0.5 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getExchangeRate() {
    return this.minmoService.getExchangeRate();
  }

  @Get('swaps/:swapId')
  @ApiOperation({ summary: 'Get swap status' })
  @ApiParam({ name: 'swapId', description: 'Swap ID', example: 'swap_123456789' })
  @ApiResponse({
    status: 200,
    description: 'Swap status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'confirmed' },
        btcReceived: { type: 'boolean', example: true },
        btcAmount: { type: 'number', example: 0.001 },
        kesAmount: { type: 'number', example: 5000 },
        completedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Swap not found' })
  async getSwapStatus(@Param('swapId') swapId: string) {
    return this.minmoService.getSwapStatus(swapId);
  }

  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Minmo webhook events' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        swapId: { type: 'string', example: 'swap_123456789' },
        event: { type: 'string', example: 'swap.confirmed' },
        status: { type: 'string', example: 'confirmed' },
        btcReceived: { type: 'boolean', example: true },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request or invalid signature' })
  async handleWebhook(@Body() webhookDto: SwapWebhookDto) {
    // Process the webhook
    await this.webhookHandler.processWebhook(webhookDto);
    
    // Return the processed webhook data
    return this.minmoService.handleWebhook(webhookDto);
  }
}
