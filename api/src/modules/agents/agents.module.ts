import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { AgentInstallation } from './entities/agent-installation.entity';
import { AgentInstallToken } from './entities/agent-install-token.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RedisModule } from '../redis/redis.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { AgentAuthGuard } from './agent-auth.guard';
import { AgentBrandingConfig } from './agent-branding.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentInstallation,
      AgentInstallToken,
      Tenant,
      Location,
    ]),
    AuditLogsModule,
    RedisModule,
    RateLimitModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService, AgentAuthGuard, AgentBrandingConfig],
  exports: [AgentsService, AgentAuthGuard],
})
export class AgentsModule {}
