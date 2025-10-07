import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { LoggerModule } from './logger/logger.module';
import { ConversionModule } from './conversion/conversion.module';
import { appConfigSchema, getAppConfig } from '@bitpesa/shared-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: appConfigSchema,
      load: [getAppConfig],
    }),
    ScheduleModule.forRoot(),
    TerminusModule,
    PrismaModule,
    RedisModule,
    LoggerModule,
    ConversionModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
