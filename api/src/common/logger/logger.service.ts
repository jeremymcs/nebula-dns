/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Production Logger Service with JSON formatting
 */

import { LoggerService as NestLoggerService, Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: string;
  trace?: string;
  metadata?: Record<string, any>;
  correlationId?: string;
}

@Injectable({ scope: Scope.TRANSIENT })
export class ProductionLoggerService implements NestLoggerService {
  private context: string = 'Application';
  private isProduction: boolean;
  private correlationId?: string;

  constructor(private configService: ConfigService) {
    this.isProduction = configService.get('NODE_ENV') === 'production';
  }

  setContext(context: string) {
    this.context = context;
  }

  setCorrelationId(id: string) {
    this.correlationId = id;
  }

  log(message: any, context?: string) {
    this.printMessage('info', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.printMessage('error', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.printMessage('warn', message, context);
  }

  debug(message: any, context?: string) {
    if (!this.isProduction) {
      this.printMessage('debug', message, context);
    }
  }

  verbose(message: any, context?: string) {
    if (!this.isProduction) {
      this.printMessage('verbose', message, context);
    }
  }

  private printMessage(level: string, message: any, context?: string, trace?: string) {
    const entry: LogEntry = {
      level,
      message: typeof message === 'object' ? JSON.stringify(message) : message,
      timestamp: new Date().toISOString(),
      context: context || this.context,
    };

    if (trace) {
      entry.trace = trace;
    }

    if (this.correlationId) {
      entry.correlationId = this.correlationId;
    }

    if (this.isProduction) {
      // JSON format for production (easy to parse with log aggregators)
      console.log(JSON.stringify(entry));
    } else {
      // Human-readable format for development
      const color = this.getColor(level);
      const reset = '\x1b[0m';
      const timestamp = new Date().toLocaleTimeString();
      console.log(
        `${color}[${level.toUpperCase()}]${reset} ${timestamp} [${entry.context}] ${entry.message}`,
      );
      if (trace) {
        console.log(trace);
      }
    }
  }

  private getColor(level: string): string {
    switch (level) {
      case 'error':
        return '\x1b[31m'; // Red
      case 'warn':
        return '\x1b[33m'; // Yellow
      case 'info':
        return '\x1b[32m'; // Green
      case 'debug':
        return '\x1b[36m'; // Cyan
      case 'verbose':
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[0m'; // Reset
    }
  }
}

@Injectable()
export class LoggerFactory {
  constructor(private configService: ConfigService) {}

  createLogger(context: string): ProductionLoggerService {
    const logger = new ProductionLoggerService(this.configService);
    logger.setContext(context);
    return logger;
  }
}
