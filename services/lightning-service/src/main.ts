import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { createLoggerConfig } from '@bitpesa/shared-config';

async function bootstrap() {
  const loggerConfig = createLoggerConfig();
  
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      level: loggerConfig.level,
      format: loggerConfig.format === 'json' ? 
        require('winston').format.json() : 
        require('winston').format.simple(),
      transports: [
        new (require('winston').transports.Console)({
          format: loggerConfig.enablePrettyPrint ? 
            require('winston').format.combine(
              require('winston').format.colorize(),
              require('winston').format.simple()
            ) : undefined,
        }),
      ],
    }),
  });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3001);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: configService.get('CORS_CREDENTIALS', true),
  });

  // Swagger documentation
  if (configService.get('ENABLE_SWAGGER', true)) {
    const config = new DocumentBuilder()
      .setTitle('BitPesa Lightning Service API')
      .setDescription('Lightning Network service for BitPesa Bridge')
      .setVersion('1.0')
      .addTag('lightning')
      .addTag('invoices')
      .addTag('payments')
      .addTag('channels')
      .addTag('node')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Health check
  if (configService.get('ENABLE_HEALTH_CHECK', true)) {
    app.enableShutdownHooks();
  }

  await app.listen(port);
  
  const logger = new Logger('Bootstrap');
  logger.log(`Lightning Service is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`Health check: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Lightning Service:', error);
  process.exit(1);
});
