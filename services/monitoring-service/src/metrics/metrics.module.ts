import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { SharedInfrastructureModule } from '@bitpesa/shared-infrastructure';

@Module({
  imports: [SharedInfrastructureModule],
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
