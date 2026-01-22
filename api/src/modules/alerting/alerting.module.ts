// Nebula DNS - Alerting Module
// External alerting integrations (Slack, PagerDuty)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AlertConfig } from './entities/alert-config.entity';
import { AlertingService } from './alerting.service';
import { AlertDispatcherService } from './alert-dispatcher.service';
import { AlertingController } from './alerting.controller';
import { SlackProvider } from './providers/slack.provider';
import { PagerDutyProvider } from './providers/pagerduty.provider';

/**
 * AlertingModule
 *
 * Provides external alerting integrations for system notifications.
 * Supports:
 * - Slack webhook delivery
 * - PagerDuty Events API v2 delivery
 *
 * Features:
 * - AES-256-GCM encryption for credentials at rest
 * - Severity-based routing (critical/error/warning/info)
 * - Event type filtering (system_health/billing/security)
 * - Auto-disable after 10 consecutive failures
 * - Test endpoints for configuration validation
 *
 * Exports:
 * - AlertingService: For CRUD operations on alert configs
 * - AlertDispatcherService: For dispatching alerts from other services
 */
@Module({
  imports: [TypeOrmModule.forFeature([AlertConfig])],
  controllers: [AlertingController],
  providers: [
    AlertingService,
    AlertDispatcherService,
    SlackProvider,
    PagerDutyProvider,
  ],
  exports: [AlertingService, AlertDispatcherService],
})
export class AlertingModule {}
