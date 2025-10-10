import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { LoggerModule } from './logger/logger.module';
import { TransactionModule } from './transaction/transaction.module';
import { ConversionModule } from './conversion/conversion.module';
import { NotificationModule } from './notification/notification.module';
import { 
  appConfigSchema, 
  getAppConfig, 
  AppConfigService, 
  ErrorHandlerService, 
  RetryService 
} from '@bitpesa/shared-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: appConfigSchema,
      load: [getAppConfig],
    }),
    TerminusModule,
    PrismaModule,
    RedisModule,
    LoggerModule,
    TransactionModule,
    ConversionModule,
    NotificationModule,
  ],
  controllers: [HealthController],
  providers: [
    AppConfigService,
    ErrorHandlerService,
    RetryService,
  ],
})
export class AppModule {}
