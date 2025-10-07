import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { RateLimitService } from './rate-limit.service';
import { CheckRateLimitDto } from './dto/check-rate-limit.dto';
import { RateLimitInfoDto } from './dto/rate-limit-info.dto';

@ApiTags('rate-limits')
@Controller('rate-limits')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Post('check')
  @ApiOperation({ summary: 'Check rate limit for IP address' })
  @ApiResponse({ status: 200, description: 'Rate limit check completed' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async checkRateLimit(
    @Body() checkRateLimitDto: CheckRateLimitDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.rateLimitService.checkRateLimit(checkRateLimitDto);
      
      if (result.allowed) {
        return res.status(HttpStatus.OK).json({
          success: true,
          data: result,
        });
      } else {
        return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          success: false,
          error: { 
            message: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
            limit: result.limit,
            remaining: result.remaining,
          },
        });
      }
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  @Get('info/:ipAddress')
  @ApiOperation({ summary: 'Get rate limit info for IP address' })
  @ApiResponse({ status: 200, description: 'Rate limit info retrieved successfully' })
  async getRateLimitInfo(
    @Param('ipAddress') ipAddress: string,
    @Res() res: Response,
  ) {
    try {
      const info = await this.rateLimitService.getRateLimitInfo(ipAddress);
      
      return res.status(HttpStatus.OK).json({
        success: true,
        data: info,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  @Post('reset/:ipAddress')
  @ApiOperation({ summary: 'Reset rate limit for IP address' })
  @ApiResponse({ status: 200, description: 'Rate limit reset successfully' })
  async resetRateLimit(
    @Param('ipAddress') ipAddress: string,
    @Res() res: Response,
  ) {
    try {
      await this.rateLimitService.resetRateLimit(ipAddress);
      
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Rate limit reset successfully',
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get rate limiting statistics' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['hour', 'day', 'week'] })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(
    @Query('timeframe') timeframe: string = 'hour',
    @Res() res: Response,
  ) {
    try {
      const stats = await this.rateLimitService.getStats(timeframe);
      
      return res.status(HttpStatus.OK).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }
}
