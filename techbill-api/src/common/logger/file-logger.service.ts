import { ConsoleLogger } from '@nestjs/common';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Persists every log line to disk, in addition to the normal console output
 * `ConsoleLogger` already gives us. Nothing here changes what a developer
 * sees in the terminal while the process is running — it exists for the
 * moment *after*: a server that crashed, or was restarted by PM2 hours ago,
 * leaves nothing behind to inspect otherwise (PM2's own logs live on the
 * VM, not on a developer's machine, and this project has no other
 * file-backed logger — see the investigation this was added alongside).
 *
 * One file per calendar day (`logs/api-YYYY-MM-DD.log`), so a developer can
 * find "what happened on the day it broke" without a log rotation library —
 * simple growing files, cleaned up manually when no longer needed.
 */
export class FileLogger extends ConsoleLogger {
  private readonly logDir = join(process.cwd(), 'logs');

  constructor() {
    super();
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private writeToFile(level: string, message: unknown, context?: string): void {
    const line = `[${new Date().toISOString()}] [${level}]${context ? ` [${context}]` : ''} ${
      typeof message === 'string' ? message : JSON.stringify(message)
    }\n`;
    const file = join(
      this.logDir,
      `api-${new Date().toISOString().slice(0, 10)}.log`,
    );
    try {
      appendFileSync(file, line);
    } catch {
      // A failed log write must never crash the request it was logging —
      // the console output from ConsoleLogger's own methods still happened.
    }
  }

  log(message: unknown, context?: string): void {
    super.log(message, context);
    this.writeToFile('LOG', message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    super.error(message, stack, context);
    this.writeToFile(
      'ERROR',
      stack ? `${String(message)}\n${stack}` : message,
      context,
    );
  }

  warn(message: unknown, context?: string): void {
    super.warn(message, context);
    this.writeToFile('WARN', message, context);
  }

  debug(message: unknown, context?: string): void {
    super.debug(message, context);
    this.writeToFile('DEBUG', message, context);
  }

  verbose(message: unknown, context?: string): void {
    super.verbose(message, context);
    this.writeToFile('VERBOSE', message, context);
  }
}

/** Absolute path to today's log file, for a startup banner or error message
 *  telling a developer exactly where to look. */
export function todaysLogFilePath(): string {
  return join(
    process.cwd(),
    'logs',
    `api-${new Date().toISOString().slice(0, 10)}.log`,
  );
}
