import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { StatusService } from './status.service';

@ApiTags('status')
@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get('transaction/:paymentHash')
  @ApiOperation({ summary: 'Get transaction status by payment hash' })
  @ApiResponse({ status: 200, description: 'Transaction status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionStatus(
    @Param('paymentHash') paymentHash: string,
    @Res() res: Response,
  ) {
    try {
      const status = await this.statusService.getTransactionStatus(paymentHash);
      
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

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(@Res() res: Response) {
    const health = await this.statusService.getHealthStatus();
    
    return res.status(HttpStatus.OK).json({
      success: true,
      data: health,
    });
  }
}
