// Nebula DNS - Authentication Module
// Updated to use the unified tier system (US-022, US-023)
// Session management with Redis (US-001)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { SessionCleanupJob } from './jobs/session-cleanup.job';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
// PartnerUser removed - using unified tier system (US-022, US-023)
import { MfaModule } from '../mfa/mfa.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15m',
        },
      }),
    }),
    TypeOrmModule.forFeature([User, Tenant]),
    ScheduleModule.forRoot(),
    forwardRef(() => MfaModule),
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, SessionCleanupJob, JwtStrategy],
  exports: [AuthService, SessionService, JwtModule],
})
export class AuthModule {}
