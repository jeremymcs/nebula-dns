/**
 * Nebula DNS - MSP Module
 * Provides MSP user functionality for managing client organizations and templates
 * Including versioning (US-034), rollback (US-035), and client application (US-036)
 * Updated to use the unified tier system (US-022, US-023)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MspController } from './msp.controller';
import { MspService } from './msp.service';
import { MspTemplatesService } from './msp-templates.service';
import {
  MspTemplate,
  MspTemplateDeployment,
} from './entities/msp-template.entity';
import { MspTemplateVersion } from './entities/msp-template-version.entity';
import { ClientTemplateApplication } from './entities/client-template-application.entity';
import { TemplateApplyJob } from './entities/template-apply-job.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Policy } from '../policies/entities/policy.entity';
import { PolicyVersion } from '../policies/entities/policy-version.entity';
import { Location } from '../locations/entities/location.entity';
import { PoliciesModule } from '../policies/policies.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      // PartnerUser removed - using unified tier system (US-022, US-023)
      Policy,
      PolicyVersion,
      Location,
      MspTemplate,
      MspTemplateDeployment,
      MspTemplateVersion,
      ClientTemplateApplication,
      TemplateApplyJob,
    ]),
    ConfigModule,
    PoliciesModule,
    AuditLogsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MspController],
  providers: [MspService, MspTemplatesService],
  exports: [MspService, MspTemplatesService],
})
export class MspModule {}
