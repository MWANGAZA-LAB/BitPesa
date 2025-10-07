import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AppConfig, getAppConfig } from '@bitpesa/shared-config';
import { WinstonLogger } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until logger is ready
  });

  const appConfig: AppConfig = getAppConfig();

  // Use Winston for logging
  app.useLogger(app.get(WinstonLogger));

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip away properties that are not defined in the DTO
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are sent
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  // Set global API prefix
  app.setGlobalPrefix(appConfig.globalPrefix);

  // Enable CORS for public access
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false, // No authentication needed
  });

  await app.listen(appConfig.port);
  app.get(WinstonLogger).log(`Transaction Service running on port ${appConfig.port} with prefix ${appConfig.globalPrefix}`);
}
bootstrap();
