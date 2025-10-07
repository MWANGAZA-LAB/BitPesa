import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { LoggerModule } from '../../logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [ProxyService],
  exports: [ProxyService],
})
export class ProxyModule {}
