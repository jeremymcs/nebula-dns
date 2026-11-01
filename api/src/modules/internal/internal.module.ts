import { Module } from '@nestjs/common';
import { PoliciesModule } from '../policies/policies.module';
import { InternalPolicyController } from './internal-policy.controller';
import { InternalApiGuard } from './guards/internal-api.guard';

@Module({
  imports: [PoliciesModule],
  controllers: [InternalPolicyController],
  providers: [InternalApiGuard],
})
export class InternalModule {}
