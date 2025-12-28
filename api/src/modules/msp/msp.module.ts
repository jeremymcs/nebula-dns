/**
 * Nebula DNS - MSP Module
 * Provides MSP user functionality for managing client organizations
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MspController } from './msp.controller';
import { MspService } from './msp.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { PartnerUser } from '../partners/entities/partner-user.entity';
import { Policy } from '../policies/entities/policy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, PartnerUser, Policy]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') || '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MspController],
  providers: [MspService],
  exports: [MspService],
})
export class MspModule {}

