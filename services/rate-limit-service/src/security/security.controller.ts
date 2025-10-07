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
import { SecurityService } from './security.service';
import { SecurityCheckDto } from './dto/security-check.dto';
import { SecurityReportDto } from './dto/security-report.dto';

@ApiTags('security')
@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Post('check')
  @ApiOperation({ summary: 'Perform security check on request' })
  @ApiResponse({ status: 200, description: 'Security check completed' })
  @ApiResponse({ status: 403, description: 'Security violation detected' })
  async checkSecurity(
    @Body() securityCheckDto: SecurityCheckDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.securityService.checkSecurity(securityCheckDto);
      
      if (result.allowed) {
        return res.status(HttpStatus.OK).json({
          success: true,
          data: result,
        });
      } else {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          error: { 
            message: 'Security violation detected',
            reason: result.reason,
            riskScore: result.riskScore,
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

  @Get('report/:ipAddress')
  @ApiOperation({ summary: 'Get security report for IP address' })
  @ApiResponse({ status: 200, description: 'Security report retrieved successfully' })
  async getSecurityReport(
    @Param('ipAddress') ipAddress: string,
    @Res() res: Response,
  ) {
    try {
      const report = await this.securityService.getSecurityReport(ipAddress);
      
      return res.status(HttpStatus.OK).json({
        success: true,
        data: report,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  @Post('block/:ipAddress')
  @ApiOperation({ summary: 'Block IP address' })
  @ApiResponse({ status: 200, description: 'IP address blocked successfully' })
  async blockIP(
    @Param('ipAddress') ipAddress: string,
    @Body() blockDto: { reason: string; duration?: number },
    @Res() res: Response,
  ) {
    try {
      await this.securityService.blockIP(ipAddress, blockDto.reason, blockDto.duration);
      
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'IP address blocked successfully',
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  @Post('unblock/:ipAddress')
  @ApiOperation({ summary: 'Unblock IP address' })
  @ApiResponse({ status: 200, description: 'IP address unblocked successfully' })
  async unblockIP(
    @Param('ipAddress') ipAddress: string,
    @Res() res: Response,
  ) {
    try {
      await this.securityService.unblockIP(ipAddress);
      
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'IP address unblocked successfully',
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }

  @Get('threats')
  @ApiOperation({ summary: 'Get recent security threats' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Threats retrieved successfully' })
  async getThreats(
    @Query('limit') limit: number = 50,
    @Res() res: Response,
  ) {
    try {
      const threats = await this.securityService.getThreats(limit);
      
      return res.status(HttpStatus.OK).json({
        success: true,
        data: threats,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  }
}
