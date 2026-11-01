// Nebula DNS - Admin Activity Module
// Shared admin activity logging without pulling in AdminModule
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminActivityLog } from './entities/admin-activity-log.entity';
import { Admin } from './entities/admin.entity';
import { AdminActivityService } from './admin-activity.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminActivityLog, Admin])],
  providers: [AdminActivityService],
  exports: [AdminActivityService],
})
export class AdminActivityModule {}
