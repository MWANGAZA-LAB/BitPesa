import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReceiptService } from './receipt.service';
import { GenerateReceiptDto } from './dto/generate-receipt.dto';
import { ReceiptStatusDto } from './dto/receipt-status.dto';

@ApiTags('receipts')
@Controller('receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate receipt for transaction' })
  @ApiResponse({ status: 201, description: 'Receipt generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async generateReceipt(
    @Body() generateReceiptDto: GenerateReceiptDto,
    @Res() res: Response,
  ) {
    try {
      const receipt = await this.receiptService.generateReceipt(generateReceiptDto);
      
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: { message: error.message },
        });
      }
      
      if (error instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  @Get(':paymentHash')
  @ApiOperation({ summary: 'Get receipt by payment hash' })
  @ApiResponse({ status: 200, description: 'Receipt retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  async getReceipt(
    @Param('paymentHash') paymentHash: string,
    @Res() res: Response,
  ) {
    try {
      const receipt = await this.receiptService.getReceiptByPaymentHash(paymentHash);
      
      return res.status(HttpStatus.OK).json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  @Get(':paymentHash/download')
  @ApiOperation({ summary: 'Download receipt as PDF' })
  @ApiQuery({ name: 'format', required: false, enum: ['pdf', 'html'] })
  @ApiResponse({ status: 200, description: 'Receipt downloaded successfully' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  async downloadReceipt(
    @Param('paymentHash') paymentHash: string,
    @Query('format') format: string = 'pdf',
    @Res() res: Response,
  ) {
    try {
      if (format === 'pdf') {
        const pdfBuffer = await this.receiptService.generateReceiptPdf(paymentHash);
        
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="receipt-${paymentHash}.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
        });
        
        return res.send(pdfBuffer);
      } else if (format === 'html') {
        const html = await this.receiptService.generateReceiptHtml(paymentHash);
        
        res.set({
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="receipt-${paymentHash}.html"`,
        });
        
        return res.send(html);
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: { message: 'Invalid format. Use pdf or html' },
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  @Get(':paymentHash/status')
  @ApiOperation({ summary: 'Get receipt status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  async getReceiptStatus(
    @Param('paymentHash') paymentHash: string,
    @Res() res: Response,
  ) {
    try {
      const status = await this.receiptService.getReceiptStatus(paymentHash);
      
      return res.status(HttpStatus.OK).json({
        success: true,
        data: status,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  @Post(':paymentHash/resend')
  @ApiOperation({ summary: 'Resend receipt via email/SMS' })
  @ApiResponse({ status: 200, description: 'Receipt resent successfully' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  async resendReceipt(
    @Param('paymentHash') paymentHash: string,
    @Body() resendDto: { email?: string; phoneNumber?: string },
    @Res() res: Response,
  ) {
    try {
      await this.receiptService.resendReceipt(paymentHash, resendDto);
      
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Receipt resent successfully',
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: { message: error.message },
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }
}
