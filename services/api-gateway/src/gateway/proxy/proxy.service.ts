import { Injectable, BadGatewayException } from '@nestjs/common';
import { LoggerService } from '../../logger/logger.service';
import { GatewayService } from '../gateway.service';

@Injectable()
export class ProxyService {
  constructor(
    private readonly logger: LoggerService,
    private readonly gatewayService: GatewayService,
  ) {}

  async forwardRequest(
    serviceName: string,
    endpoint: string,
    method: string,
    body: any,
    headers: Record<string, string>,
    res: any,
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check if service is healthy
      if (!this.gatewayService.isServiceHealthy(serviceName)) {
        throw new BadGatewayException(`Service ${serviceName} is not available`);
      }

      const serviceConfig = this.gatewayService.getServiceConfig(serviceName);
      if (!serviceConfig) {
        throw new BadGatewayException(`Service ${serviceName} not found`);
      }

      // Prepare request
      const url = `${serviceConfig.url}${endpoint}`;
      const requestHeaders = this.prepareHeaders(headers);
      
      this.logger.log(`Forwarding ${method} request to ${serviceName}: ${endpoint}`);

      // Make the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      
      // Record metrics
      this.gatewayService.recordRequest(response.ok, responseTime);

      // Handle response
      if (response.ok) {
        const responseData = await response.json();
        res.status(response.status).json(responseData);
      } else {
        const errorData = await response.text();
        this.logger.error(`Service ${serviceName} returned error: ${response.status} - ${errorData}`);
        res.status(response.status).json({
          success: false,
          error: {
            message: `Service ${serviceName} error`,
            status: response.status,
            details: errorData,
          },
        });
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.gatewayService.recordRequest(false, responseTime);
      
      this.logger.error(`Proxy error for ${serviceName}: ${error.message}`);
      
      if (error.name === 'AbortError') {
        res.status(504).json({
          success: false,
          error: {
            message: 'Service timeout',
            service: serviceName,
          },
        });
      } else {
        res.status(502).json({
          success: false,
          error: {
            message: 'Bad Gateway',
            service: serviceName,
            details: error.message,
          },
        });
      }
    }
  }

  private prepareHeaders(originalHeaders: Record<string, string>): Record<string, string> {
    // Filter out headers that shouldn't be forwarded
    const filteredHeaders = { ...originalHeaders };
    
    // Remove host header to avoid conflicts
    delete filteredHeaders.host;
    delete filteredHeaders['content-length'];
    
    // Ensure content-type is set for POST requests
    if (!filteredHeaders['content-type']) {
      filteredHeaders['content-type'] = 'application/json';
    }
    
    // Add gateway identification
    filteredHeaders['x-gateway'] = 'bitpesa-bridge';
    filteredHeaders['x-forwarded-for'] = originalHeaders['x-forwarded-for'] || 'unknown';
    
    return filteredHeaders;
  }
}
