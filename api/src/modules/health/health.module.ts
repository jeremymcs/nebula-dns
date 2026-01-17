// Nebula DNS - Health Check Module
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { SecretsModule } from '../secrets/secrets.module';

@Module({
  imports: [SecretsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
