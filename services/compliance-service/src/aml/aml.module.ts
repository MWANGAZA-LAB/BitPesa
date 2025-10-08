import { Module } from '@nestjs/common';
import { AMLService } from './aml.service';
import { AMLController } from './aml.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [AMLService],
  controllers: [AMLController],
  exports: [AMLService],
})
export class AMLModule {}
