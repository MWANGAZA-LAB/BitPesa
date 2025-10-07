import { Module } from '@nestjs/common';
import { RateLimitController } from './rate-limit.controller';
import { RateLimitService } from './rate-limit.service';
import { RedisModule } from '../redis/redis.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [RedisModule, LoggerModule],
  controllers: [RateLimitController],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
