/**
 * Nebula DNS - MSP Module
 * Provides MSP user functionality for managing client organizations and templates
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
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { PartnerUser } from '../partners/entities/partner-user.entity';
import { Policy } from '../policies/entities/policy.entity';
import { PolicyVersion } from '../policies/entities/policy-version.entity';
import { Location } from '../locations/entities/location.entity';
import { PoliciesModule } from '../policies/policies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      PartnerUser,
      Policy,
      PolicyVersion,
      Location,
      MspTemplate,
      MspTemplateDeployment,
    ]),
    ConfigModule,
    PoliciesModule,
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
