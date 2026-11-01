import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PolicyCompilerService } from '../policies/policy-compiler.service';
import { InternalApiGuard } from './guards/internal-api.guard';

@ApiExcludeController()
@Controller('internal/v1/policy')
@UseGuards(InternalApiGuard)
export class InternalPolicyController {
  constructor(
    private readonly policyCompilerService: PolicyCompilerService,
  ) {}

  @Post('locations/:locationId/compile')
  @HttpCode(200)
  async compileForLocation(@Param('locationId') locationId: string) {
    const compiled =
      await this.policyCompilerService.compileForLocation(locationId);
    return {
      ok: !!compiled,
      locationId,
      policyVersion: compiled?.policyVersion ?? null,
    };
  }
}
