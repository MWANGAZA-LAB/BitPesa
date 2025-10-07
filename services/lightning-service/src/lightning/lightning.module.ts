import { Module } from '@nestjs/common';
import { LightningController } from './lightning.controller';
import { LightningService } from './lightning.service';
import { LndClient } from './lnd/lnd.client';
import { InvoiceService } from './invoice/invoice.service';
import { PaymentService } from './payment/payment.service';
import { ChannelService } from './channel/channel.service';
import { NodeService } from './node/node.service';

@Module({
  controllers: [LightningController],
  providers: [
    LightningService,
    LndClient,
    InvoiceService,
    PaymentService,
    ChannelService,
    NodeService,
  ],
  exports: [
    LightningService,
    InvoiceService,
    PaymentService,
    ChannelService,
    NodeService,
  ],
})
export class LightningModule {}
