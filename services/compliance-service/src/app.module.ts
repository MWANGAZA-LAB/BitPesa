import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AMLModule } from './aml/aml.module';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    LoggerModule,
    AMLModule,
  ],
})
export class AppModule {}
