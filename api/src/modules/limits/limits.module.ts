// Nebula DNS - Limits Module
// Provides plan limit checking services for tenant resources
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LimitsService } from './limits.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { FamilyMember } from '../family/entities/family-member.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Location,
      FamilyMember,
      SubscriptionPlan,
      Subscription,
    ]),
  ],
  providers: [LimitsService],
  exports: [LimitsService],
})
export class LimitsModule {}
