import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { MinmoTransactionOrchestratorService } from '../orchestration/minmo-transaction-orchestrator.service';
import { MinmoTransactionService } from '../transaction/minmo-transaction.service';
import { CreateBtcToMpesaTransactionDto } from '../dto/create-btc-to-mpesa-transaction.dto';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(ThrottlerGuard)
export class MinmoTransactionController {
  constructor(
    private readonly orchestrator: MinmoTransactionOrchestratorService,
    private readonly transactionService: MinmoTransactionService,
  ) {}

  @Post('send-money')
  @ApiOperation({ summary: 'Send Bitcoin to M-Pesa number' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    schema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', example: 'tx_123456789' },
        btcAddress: { type: 'string', example: 'bc1qtest123...' },
        btcAmount: { type: 'number', example: 0.001 },
        kesAmount: { type: 'number', example: 5000 },
        exchangeRate: { type: 'number', example: 5000000 },
        totalFees: { type: 'number', example: 125 },
        expiresAt: { type: 'string', format: 'date-time' },
        qrCode: { type: 'string', example: 'bitcoin:bc1qtest123...?amount=0.001' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendMoney(@Body() dto: CreateBtcToMpesaTransactionDto) {
    const transaction = await this.orchestrator.createBtcToMpesaTransaction({
      ...dto,
      transactionType: MpesaTransactionType.SEND_MONEY,
    });

    return {
      transactionId: transaction.id,
      btcAddress: transaction.btcAddress,
      btcAmount: transaction.btcAmount,
      kesAmount: transaction.kesAmount,
      exchangeRate: transaction.exchangeRate,
      totalFees: transaction.totalFees,
      expiresAt: transaction.invoiceExpiresAt,
      qrCode: `bitcoin:${transaction.btcAddress}?amount=${transaction.btcAmount}`,
    };
  }

  @Post('buy-airtime')
  @ApiOperation({ summary: 'Buy airtime with Bitcoin' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async buyAirtime(@Body() dto: CreateBtcToMpesaTransactionDto) {
    const transaction = await this.orchestrator.createBtcToMpesaTransaction({
      ...dto,
      transactionType: MpesaTransactionType.BUY_AIRTIME,
    });

    return {
      transactionId: transaction.id,
      btcAddress: transaction.btcAddress,
      btcAmount: transaction.btcAmount,
      kesAmount: transaction.kesAmount,
      exchangeRate: transaction.exchangeRate,
      totalFees: transaction.totalFees,
      expiresAt: transaction.invoiceExpiresAt,
      qrCode: `bitcoin:${transaction.btcAddress}?amount=${transaction.btcAmount}`,
    };
  }

  @Post('paybill')
  @ApiOperation({ summary: 'Pay bill with Bitcoin' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async paybill(@Body() dto: CreateBtcToMpesaTransactionDto) {
    const transaction = await this.orchestrator.createBtcToMpesaTransaction({
      ...dto,
      transactionType: MpesaTransactionType.PAYBILL,
    });

    return {
      transactionId: transaction.id,
      btcAddress: transaction.btcAddress,
      btcAmount: transaction.btcAmount,
      kesAmount: transaction.kesAmount,
      exchangeRate: transaction.exchangeRate,
      totalFees: transaction.totalFees,
      expiresAt: transaction.invoiceExpiresAt,
      qrCode: `bitcoin:${transaction.btcAddress}?amount=${transaction.btcAmount}`,
    };
  }

  @Post('buy-goods')
  @ApiOperation({ summary: 'Buy goods with Bitcoin' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async buyGoods(@Body() dto: CreateBtcToMpesaTransactionDto) {
    const transaction = await this.orchestrator.createBtcToMpesaTransaction({
      ...dto,
      transactionType: MpesaTransactionType.BUY_GOODS,
    });

    return {
      transactionId: transaction.id,
      btcAddress: transaction.btcAddress,
      btcAmount: transaction.btcAmount,
      kesAmount: transaction.kesAmount,
      exchangeRate: transaction.exchangeRate,
      totalFees: transaction.totalFees,
      expiresAt: transaction.invoiceExpiresAt,
      qrCode: `bitcoin:${transaction.btcAddress}?amount=${transaction.btcAmount}`,
    };
  }

  @Post('scan-pay')
  @ApiOperation({ summary: 'Pay by scanning QR code' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async scanPay(@Body() dto: CreateBtcToMpesaTransactionDto) {
    const transaction = await this.orchestrator.createBtcToMpesaTransaction({
      ...dto,
      transactionType: MpesaTransactionType.SCAN_QR,
    });

    return {
      transactionId: transaction.id,
      btcAddress: transaction.btcAddress,
      btcAmount: transaction.btcAmount,
      kesAmount: transaction.kesAmount,
      exchangeRate: transaction.exchangeRate,
      totalFees: transaction.totalFees,
      expiresAt: transaction.invoiceExpiresAt,
      qrCode: `bitcoin:${transaction.btcAddress}?amount=${transaction.btcAmount}`,
    };
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get transaction status' })
  @ApiParam({ name: 'id', description: 'Transaction ID', example: 'tx_123456789' })
  @ApiResponse({
    status: 200,
    description: 'Transaction status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'BTC_RECEIVED' },
        btcReceived: { type: 'boolean', example: true },
        mpesaStatus: { type: 'string', example: 'pending' },
        receipt: { type: 'string', example: 'ABC123456', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionStatus(@Param('id') id: string) {
    return this.orchestrator.getTransactionStatus(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details' })
  @ApiParam({ name: 'id', description: 'Transaction ID', example: 'tx_123456789' })
  @ApiResponse({
    status: 200,
    description: 'Transaction details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('id') id: string) {
    const transaction = await this.transactionService.findById(id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  @Get('phone/:phoneNumber')
  @ApiOperation({ summary: 'Get transactions by phone number' })
  @ApiParam({ name: 'phoneNumber', description: 'Phone number', example: '254700000000' })
  @ApiQuery({ name: 'limit', description: 'Number of transactions to return', example: 10, required: false })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  async getTransactionsByPhone(
    @Param('phoneNumber') phoneNumber: string,
    @Query('limit') limit?: number,
  ) {
    return this.transactionService.findByPhoneNumber(phoneNumber, limit || 10);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalTransactions: { type: 'number', example: 1250 },
        completedTransactions: { type: 'number', example: 1200 },
        pendingTransactions: { type: 'number', example: 30 },
        failedTransactions: { type: 'number', example: 20 },
        totalVolumeKes: { type: 'number', example: 6250000 },
        totalVolumeBtc: { type: 'number', example: 1.25 },
      },
    },
  })
  async getStatistics() {
    return this.transactionService.getStatistics();
  }

  @Post('webhooks/minmo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle MinMo webhook events' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async handleMinmoWebhook(@Body() webhookData: any) {
    const { swapId, event } = webhookData;
    
    if (event === 'swap.confirmed') {
      await this.orchestrator.handleMinmoConfirmation(swapId);
    }
    
    return { success: true, message: 'Webhook processed' };
  }

  @Post('webhooks/mpesa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle M-Pesa callback events' })
  @ApiResponse({
    status: 200,
    description: 'Callback processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async handleMpesaCallback(@Body() callbackData: any) {
    const { transactionId, mpesaReceipt, resultCode, resultDesc } = callbackData;
    
    await this.orchestrator.handleMpesaCallback({
      transactionId,
      mpesaReceipt,
      resultCode,
      resultDesc,
    });
    
    return { success: true, message: 'Callback processed' };
  }
}
