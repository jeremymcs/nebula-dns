import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Partner } from './entities/partner.entity';
import { PartnerUser } from './entities/partner-user.entity';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { PartnerDashboardController } from './partner-dashboard.controller';
import { PartnerAuthController } from './partner-auth.controller';
import { PartnerAuthGuard } from './guards/partner-auth.guard';
import { TenantsModule } from '../tenants/tenants.module';
import { Tenant } from '../tenants/entities/tenant.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Partner, PartnerUser, Tenant]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    EmailModule,
    forwardRef(() => TenantsModule),
  ],
  controllers: [
    PartnersController,
    PartnerDashboardController,
    PartnerAuthController,
  ],
  providers: [PartnersService, PartnerAuthGuard],
  exports: [PartnersService, PartnerAuthGuard],
})
export class PartnersModule {}
