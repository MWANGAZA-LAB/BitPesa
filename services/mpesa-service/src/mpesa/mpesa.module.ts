import { Module } from '@nestjs/common';
import { MpesaController } from './mpesa.controller';
import { MpesaService } from './mpesa.service';
import { DarajaClient } from './daraja/daraja.client';
import { StkPushService } from './stk-push/stk-push.service';
import { B2CService } from './b2c/b2c.service';
import { C2BService } from './c2b/c2b.service';
import { CallbackService } from './callback/callback.service';

@Module({
  controllers: [MpesaController],
  providers: [
    MpesaService,
    DarajaClient,
    StkPushService,
    B2CService,
    C2BService,
    CallbackService,
  ],
  exports: [
    MpesaService,
    StkPushService,
    B2CService,
    C2BService,
    CallbackService,
  ],
})
export class MpesaModule {}
