import { Module, Global } from '@nestjs/common';
import { ConversionService } from './conversion.service';

@Global()
@Module({
  providers: [ConversionService],
  exports: [ConversionService],
})
export class ConversionModule {}
