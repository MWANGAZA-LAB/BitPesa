import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './database/prisma.service';
import { RedisService } from './cache/redis.service';
import { CircuitBreakerService, RetryService, RateLimitService } from './resilience/resilience.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    RedisService,
    CircuitBreakerService,
    RetryService,
    RateLimitService,
  ],
  exports: [
    PrismaService,
    RedisService,
    CircuitBreakerService,
    RetryService,
    RateLimitService,
  ],
})
export class SharedInfrastructureModule {}