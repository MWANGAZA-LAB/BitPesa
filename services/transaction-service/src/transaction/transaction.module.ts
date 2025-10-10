import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversionModule } from '../conversion/conversion.module';
import { NotificationModule } from '../notification/notification.module';
import { AppConfigService, ErrorHandlerService, RetryService } from '@bitpesa/shared-config';
import { MinmoService } from '../external/minmo.service';
import { MpesaService } from '../external/mpesa.service';
import { LightningService } from '../external/lightning.service';

@Module({
  imports: [
    PrismaModule,
    ConversionModule,
    NotificationModule,
  ],
  controllers: [TransactionController],
  providers: [
    TransactionService,
    AppConfigService,
    ErrorHandlerService,
    RetryService,
    MinmoService,
    MpesaService,
    LightningService,
  ],
  exports: [TransactionService],
})
export class TransactionModule {}
