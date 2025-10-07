import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { createLoggerConfig } from '@bitpesa/shared-config';

const loggerConfig = createLoggerConfig();

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
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
        ...(loggerConfig.enableFile && loggerConfig.logFile ? [
          new (require('winston').transports.File)({
            filename: loggerConfig.logFile,
            maxsize: loggerConfig.maxFileSize,
            maxFiles: loggerConfig.maxFiles,
          })
        ] : []),
      ],
    }),
  ],
})
export class LoggerModule {}
