import { Module } from '@nestjs/common';
import { PolicyTemplatesController } from './policy-templates.controller';
import { PolicyTemplatesService } from './policy-templates.service';

@Module({
  controllers: [PolicyTemplatesController],
  providers: [PolicyTemplatesService],
  exports: [PolicyTemplatesService],
})
export class PolicyTemplatesModule {}

