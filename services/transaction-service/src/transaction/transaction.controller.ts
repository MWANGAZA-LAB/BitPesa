import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { 
  SendMoneyDto, 
  BuyAirtimeDto, 
  PaybillDto, 
  BuyGoodsDto, 
  ScanPayDto 
} from './dto';
import { Transaction, PaginatedResponse } from '@bitpesa/shared-types';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('transactions')
@UseGuards(ThrottlerGuard) // Rate limiting
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('send-money')
  @HttpCode(HttpStatus.CREATED)
  async sendMoney(
    @Body() dto: SendMoneyDto,
    @Req() req: any
  ): Promise<ApiResponse<Transaction>> {
    // Add IP and user agent from request
    dto.ipAddress = req.ip;
    dto.userAgent = req.get('User-Agent');
    
    const transaction = await this.transactionService.createTransaction(dto);
    return { success: true, data: transaction };
  }

  @Post('buy-airtime')
  @HttpCode(HttpStatus.CREATED)
  async buyAirtime(
    @Body() dto: BuyAirtimeDto,
    @Req() req: any
  ): Promise<ApiResponse<Transaction>> {
    dto.ipAddress = req.ip;
    dto.userAgent = req.get('User-Agent');
    
    const transaction = await this.transactionService.createTransaction(dto);
    return { success: true, data: transaction };
  }

  @Post('paybill')
  @HttpCode(HttpStatus.CREATED)
  async paybill(
    @Body() dto: PaybillDto,
    @Req() req: any
  ): Promise<ApiResponse<Transaction>> {
    dto.ipAddress = req.ip;
    dto.userAgent = req.get('User-Agent');
    
    const transaction = await this.transactionService.createTransaction(dto);
    return { success: true, data: transaction };
  }

  @Post('buy-goods')
  @HttpCode(HttpStatus.CREATED)
  async buyGoods(
    @Body() dto: BuyGoodsDto,
    @Req() req: any
  ): Promise<ApiResponse<Transaction>> {
    dto.ipAddress = req.ip;
    dto.userAgent = req.get('User-Agent');
    
    const transaction = await this.transactionService.createTransaction(dto);
    return { success: true, data: transaction };
  }

  @Post('scan-pay')
  @HttpCode(HttpStatus.CREATED)
  async scanPay(
    @Body() dto: ScanPayDto,
    @Req() req: any
  ): Promise<ApiResponse<Transaction>> {
    dto.ipAddress = req.ip;
    dto.userAgent = req.get('User-Agent');
    
    const transaction = await this.transactionService.createTransaction(dto);
    return { success: true, data: transaction };
  }

  @Get(':paymentHash')
  async getTransaction(
    @Param('paymentHash') paymentHash: string
  ): Promise<ApiResponse<Transaction>> {
    const transaction = await this.transactionService.getTransactionByPaymentHash(paymentHash);
    return { success: true, data: transaction };
  }

  @Get(':paymentHash/status')
  async getTransactionStatus(
    @Param('paymentHash') paymentHash: string
  ): Promise<ApiResponse<{ status: string; progress: number }>> {
    const status = await this.transactionService.getTransactionStatus(paymentHash);
    return { success: true, data: status };
  }

  @Get(':paymentHash/receipt')
  async getReceipt(
    @Param('paymentHash') paymentHash: string
  ): Promise<ApiResponse<any>> {
    const receipt = await this.transactionService.generateReceipt(paymentHash);
    return { success: true, data: receipt };
  }

  @Get()
  async getTransactions(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('phone') phone?: string
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const transactions = await this.transactionService.getTransactions({
      status,
      type,
      phone,
      page,
      limit
    });
    return { success: true, data: transactions };
  }
}
