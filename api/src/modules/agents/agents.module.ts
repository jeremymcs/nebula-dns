import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { AgentInstallation } from './entities/agent-installation.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { ShieldCaModule } from '../shield-ca/shield-ca.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentInstallation, Tenant]),
    ShieldCaModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
