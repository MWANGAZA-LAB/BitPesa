import { Module } from '@nestjs/common';
import { MinmoController } from './minmo.controller';
import { MinmoService } from './minmo.service';
import { MinmoClient } from './minmo-client';
import { WebhookHandler } from './webhook.handler';

@Module({
  controllers: [MinmoController],
  providers: [MinmoService, MinmoClient, WebhookHandler],
  exports: [MinmoService, MinmoClient],
})
export class MinmoModule {}
