// Nebula DNS - Family Module
// Provides family member management and invitation features for Home tier
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { FamilyMembersController } from './family-members.controller';
import { FamilyMembersService } from './family-members.service';
import { FamilyMember } from './entities/family-member.entity';
import { FamilyInvitation } from './entities/family-invitation.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { ClickHouseModule } from '../clickhouse/clickhouse.module';
import { EmailModule } from '../email/email.module';
import { LimitsModule } from '../limits/limits.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FamilyMember, FamilyInvitation, User, Tenant]),
    ClickHouseModule,
    EmailModule,
    LimitsModule,
  ],
  controllers: [FamilyController, FamilyMembersController],
  providers: [FamilyService, FamilyMembersService],
  exports: [FamilyService, FamilyMembersService],
})
export class FamilyModule {}
