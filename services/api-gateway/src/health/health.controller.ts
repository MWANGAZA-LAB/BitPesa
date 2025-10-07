import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(@Res() res: Response) {
    const health = await this.healthService.getHealthStatus();
    
    const statusCode = health.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    
    return res.status(statusCode).json(health);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async readinessCheck(@Res() res: Response) {
    const readiness = await this.healthService.getReadinessStatus();
    
    const statusCode = readiness.ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    
    return res.status(statusCode).json(readiness);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async livenessCheck(@Res() res: Response) {
    const liveness = await this.healthService.getLivenessStatus();
    
    return res.status(HttpStatus.OK).json(liveness);
  }
}
