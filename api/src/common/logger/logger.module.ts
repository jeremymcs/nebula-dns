/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Logger Module
 */

import { Global, Module } from '@nestjs/common';
import { ProductionLoggerService, LoggerFactory } from './logger.service';

@Global()
@Module({
  providers: [ProductionLoggerService, LoggerFactory],
  exports: [ProductionLoggerService, LoggerFactory],
})
export class LoggerModule {}
