/**
 * Onboarding Controller
 */

import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import {
  UpdateOnboardingDto,
  CompleteOnboardingDto,
} from './dto/onboarding.dto';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('progress')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get onboarding progress' })
  @ApiResponse({ status: 200, description: 'Onboarding progress retrieved' })
  async getProgress(@CurrentTenant() tenantId: string) {
    const progress = await this.onboardingService.getProgress(tenantId);
    return { data: progress };
  }

  @Patch('progress')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update onboarding progress' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  async updateProgress(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateOnboardingDto,
  ) {
    const progress = await this.onboardingService.updateProgress(
      tenantId,
      dto.currentStep,
      dto.completeStep,
    );
    return { data: progress };
  }

  @Post('complete')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Complete or skip onboarding' })
  @ApiResponse({ status: 200, description: 'Onboarding completed' })
  async completeOnboarding(
    @CurrentTenant() tenantId: string,
    @Body() dto: CompleteOnboardingDto,
  ) {
    const progress = await this.onboardingService.completeOnboarding(
      tenantId,
      dto.skipped,
    );
    return { data: progress };
  }

  @Post('reset')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Reset onboarding progress' })
  @ApiResponse({ status: 200, description: 'Onboarding reset' })
  async resetProgress(@CurrentTenant() tenantId: string) {
    const progress = await this.onboardingService.resetProgress(tenantId);
    return { data: progress };
  }
}
