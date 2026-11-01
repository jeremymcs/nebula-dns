import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShieldCaIntermediate } from './entities/shield-ca-intermediate.entity';
import { ShieldCaService } from './shield-ca.service';
import { ShieldCaController } from './shield-ca.controller';
import { ShieldCaInternalController } from './shield-ca-internal.controller';
import { ShieldCaRotationAlertsJob } from './shield-ca-rotation-alerts.job';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { RedisModule } from '../redis/redis.module';
import { EmailModule } from '../email/email.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShieldCaIntermediate, Tenant, User]),
    RedisModule,
    EmailModule,
    TenantsModule,
  ],
  controllers: [ShieldCaController, ShieldCaInternalController],
  providers: [ShieldCaService, ShieldCaRotationAlertsJob],
  exports: [ShieldCaService],
})
export class ShieldCaModule {}
