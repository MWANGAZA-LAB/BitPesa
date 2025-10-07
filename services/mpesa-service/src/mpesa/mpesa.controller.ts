import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MpesaService } from './mpesa.service';
import { StkPushDto, B2CDto, C2BDto } from './dto';
import { MpesaTransaction, STKPushResponse, B2CResponse, C2BResponse } from '@bitpesa/shared-types';

@ApiTags('mpesa')
@Controller('mpesa')
export class MpesaController {
  private readonly logger = new Logger(MpesaController.name);

  constructor(private readonly mpesaService: MpesaService) {}

  @Post('stk-push')
  @ApiOperation({ summary: 'Initiate STK Push payment' })
  @ApiResponse({ status: 201, description: 'STK Push initiated successfully', type: STKPushResponse })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async initiateStkPush(@Body() stkPushDto: StkPushDto): Promise<STKPushResponse> {
    this.logger.log(`Initiating STK Push for phone: ${stkPushDto.phoneNumber}, amount: ${stkPushDto.amount}`);
    return this.mpesaService.initiateStkPush(stkPushDto);
  }

  @Post('b2c')
  @ApiOperation({ summary: 'Send B2C payment' })
  @ApiResponse({ status: 201, description: 'B2C payment sent successfully', type: B2CResponse })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendB2C(@Body() b2cDto: B2CDto): Promise<B2CResponse> {
    this.logger.log(`Sending B2C payment to phone: ${b2cDto.phoneNumber}, amount: ${b2cDto.amount}`);
    return this.mpesaService.sendB2C(b2cDto);
  }

  @Post('c2b')
  @ApiOperation({ summary: 'Register C2B URL' })
  @ApiResponse({ status: 201, description: 'C2B URL registered successfully', type: C2BResponse })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async registerC2B(@Body() c2bDto: C2BDto): Promise<C2BResponse> {
    this.logger.log(`Registering C2B URL: ${c2bDto.shortCode}`);
    return this.mpesaService.registerC2B(c2bDto);
  }

  @Get('transaction/:id')
  @ApiOperation({ summary: 'Get M-Pesa transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction found', type: MpesaTransaction })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('id') id: string): Promise<MpesaTransaction> {
    this.logger.log(`Getting M-Pesa transaction: ${id}`);
    return this.mpesaService.getTransaction(id);
  }

  @Post('callback/stk-push')
  @ApiOperation({ summary: 'Handle STK Push callback' })
  @ApiResponse({ status: 200, description: 'Callback processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid callback data' })
  async handleStkPushCallback(@Body() callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    this.logger.log('Handling STK Push callback');
    return this.mpesaService.handleStkPushCallback(callbackData);
  }

  @Post('callback/b2c')
  @ApiOperation({ summary: 'Handle B2C callback' })
  @ApiResponse({ status: 200, description: 'Callback processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid callback data' })
  async handleB2CCallback(@Body() callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    this.logger.log('Handling B2C callback');
    return this.mpesaService.handleB2CCallback(callbackData);
  }

  @Post('callback/c2b')
  @ApiOperation({ summary: 'Handle C2B callback' })
  @ApiResponse({ status: 200, description: 'Callback processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid callback data' })
  async handleC2BCallback(@Body() callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    this.logger.log('Handling C2B callback');
    return this.mpesaService.handleC2BCallback(callbackData);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get M-Pesa account balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAccountBalance(): Promise<{
    accountType: string;
    balance: number;
    availableBalance: number;
    reservedBalance: number;
    unclearedBalance: number;
  }> {
    this.logger.log('Getting M-Pesa account balance');
    return this.mpesaService.getAccountBalance();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get M-Pesa service status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  async getServiceStatus(): Promise<{
    status: string;
    environment: string;
    timestamp: string;
  }> {
    this.logger.log('Getting M-Pesa service status');
    return this.mpesaService.getServiceStatus();
  }

  // New BitPesa Bridge endpoints
  @Post('airtime')
  @ApiOperation({ summary: 'Buy airtime' })
  @ApiResponse({ status: 201, description: 'Airtime purchase initiated successfully', type: B2CResponse })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async buyAirtime(
    @Body() dto: { phoneNumber: string; amount: number; accountReference: string }
  ): Promise<B2CResponse> {
    this.logger.log(`Buying airtime for ${dto.phoneNumber}, amount: ${dto.amount}`);
    return this.mpesaService.buyAirtime(dto.phoneNumber, dto.amount, dto.accountReference);
  }

  @Post('paybill')
  @ApiOperation({ summary: 'Process paybill payment' })
  @ApiResponse({ status: 201, description: 'Paybill payment initiated successfully', type: STKPushResponse })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async paybill(
    @Body() dto: { 
      phoneNumber: string; 
      businessNumber: string; 
      amount: number; 
      accountNumber: string; 
      reference: string; 
    }
  ): Promise<STKPushResponse> {
    this.logger.log(`Processing paybill payment to ${dto.businessNumber}, amount: ${dto.amount}`);
    return this.mpesaService.paybill(
      dto.phoneNumber, 
      dto.businessNumber, 
      dto.amount, 
      dto.accountNumber, 
      dto.reference
    );
  }

  @Post('till')
  @ApiOperation({ summary: 'Process till payment (buy goods)' })
  @ApiResponse({ status: 201, description: 'Till payment initiated successfully', type: STKPushResponse })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async buyGoods(
    @Body() dto: { 
      phoneNumber: string; 
      tillNumber: string; 
      amount: number; 
      accountReference: string; 
    }
  ): Promise<STKPushResponse> {
    this.logger.log(`Processing till payment to ${dto.tillNumber}, amount: ${dto.amount}`);
    return this.mpesaService.buyGoods(
      dto.phoneNumber, 
      dto.tillNumber, 
      dto.amount, 
      dto.accountReference
    );
  }

  @Post('callback/airtime')
  @ApiOperation({ summary: 'Handle airtime callback' })
  @ApiResponse({ status: 200, description: 'Airtime callback processed successfully' })
  async handleAirtimeCallback(@Body() callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    this.logger.log('Handling airtime callback');
    return this.mpesaService.handleAirtimeCallback(callbackData);
  }

  @Post('callback/paybill')
  @ApiOperation({ summary: 'Handle paybill callback' })
  @ApiResponse({ status: 200, description: 'Paybill callback processed successfully' })
  async handlePaybillCallback(@Body() callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    this.logger.log('Handling paybill callback');
    return this.mpesaService.handlePaybillCallback(callbackData);
  }

  @Post('callback/till')
  @ApiOperation({ summary: 'Handle till callback' })
  @ApiResponse({ status: 200, description: 'Till callback processed successfully' })
  async handleTillCallback(@Body() callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    this.logger.log('Handling till callback');
    return this.mpesaService.handleTillCallback(callbackData);
  }
}
