import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
import { appendFileSync } from 'fs';
import { AppModule } from './app.module';
import {
  FileLogger,
  todaysLogFilePath,
} from './common/logger/file-logger.service';

/**
 * Last line of defense: an exception that escapes every try/catch and every
 * Nest exception filter still needs one line on disk, because by the time
 * this fires, Nest's own DI/logger may be in whatever state caused the crash
 * in the first place — this writes directly, with no dependency on anything
 * else in the app still working.
 */
function logFatal(kind: string, error: unknown): void {
  const line = `[${new Date().toISOString()}] [FATAL] [${kind}] ${
    error instanceof Error ? `${error.message}\n${error.stack}` : String(error)
  }\n`;
  try {
    appendFileSync(todaysLogFilePath(), line);
  } catch {
    // Nothing left to fall back to — the console output below is the floor.
  }
  console.error(`[FATAL] [${kind}]`, error);
}

process.on('uncaughtException', (err) => logFatal('uncaughtException', err));
process.on('unhandledRejection', (reason) =>
  logFatal('unhandledRejection', reason),
);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: new FileLogger() });

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
    'http://localhost:5173',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }
      const isAllowed =
        allowedOrigins.some((allowed) => {
          if (allowed === origin) return true;
          try {
            const allowedUrl = new URL(allowed);
            const originUrl = new URL(origin);
            const allowedHost = allowedUrl.hostname;
            const originHost = originUrl.hostname;
            return (
              originHost === allowedHost ||
              originHost.endsWith('.' + allowedHost)
            );
          } catch {
            return false;
          }
        }) ||
        origin.endsWith('.techbill.app') ||
        origin === 'https://techbill.app';
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
  console.log('API is running...');
  console.log(`Logs are being written to ${todaysLogFilePath()}`);
}
void bootstrap();
