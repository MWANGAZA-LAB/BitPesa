import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetricsModule } from './metrics/metrics.module';
import { SharedInfrastructureModule } from '@bitpesa/shared-infrastructure';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SharedInfrastructureModule,
    MetricsModule,
  ],
})
export class AppModule {}
