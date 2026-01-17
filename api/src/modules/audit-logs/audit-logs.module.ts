// Nebula DNS - Audit Logs Module
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditIntegrityService } from './audit-integrity.service';
import { AuditLog } from './entities/audit-log.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, Tenant])],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditIntegrityService],
  exports: [AuditLogsService, AuditIntegrityService],
})
export class AuditLogsModule {}
