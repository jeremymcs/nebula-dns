// Nebula DNS - Family Module
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { FamilyMember } from './entities/family-member.entity';
import { ClickHouseModule } from '../clickhouse/clickhouse.module';

@Module({
  imports: [TypeOrmModule.forFeature([FamilyMember]), ClickHouseModule],
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
