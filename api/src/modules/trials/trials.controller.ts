// Nebula DNS - Trials Controller
// API endpoints for tier upgrade trials (US-032, US-033)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import {
  CurrentTenant,
  CurrentUser,
} from '@/common/decorators/tenant.decorator';
import { TrialsService } from './trials.service';
import {
  StartTrialDto,
  ConvertTrialDto,
  TrialStatusResponseDto,
  TrialHistoryItemDto,
  StartTrialResponseDto,
  ConvertTrialResponseDto,
} from './dto/trial.dto';

@ApiTags('trials')
@Controller('trials')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TrialsController {
  constructor(private readonly trialsService: TrialsService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get current trial status',
    description:
      'Returns the current trial status including days remaining and available tiers for trial.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trial status retrieved successfully',
    type: TrialStatusResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getTrialStatus(
    @CurrentTenant() tenantId: string,
  ): Promise<{ data: TrialStatusResponseDto }> {
    const status = await this.trialsService.getTrialStatus(tenantId);
    return { data: status };
  }

  @Post('start')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start a tier trial',
    description:
      'Starts a 14-day trial for a higher tier. Each tier can only be trialed once per tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trial started successfully',
    type: StartTrialResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Already trialed this tier or invalid tier',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires owner or admin role',
  })
  async startTrial(
    @CurrentTenant() tenantId: string,
    @Body() dto: StartTrialDto,
  ): Promise<StartTrialResponseDto> {
    return this.trialsService.startTrial(tenantId, dto);
  }

  @Post('convert')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Convert trial to paid subscription',
    description:
      'Converts an active trial to a paid subscription. Returns a checkout URL for payment.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversion initiated - follow checkout URL for payment',
    type: ConvertTrialResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - No active trial to convert',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires owner or admin role',
  })
  async convertTrial(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string; email: string },
    @Body() dto: ConvertTrialDto,
  ): Promise<ConvertTrialResponseDto> {
    return this.trialsService.convertTrial(tenantId, user.id, user.email, dto);
  }

  @Delete('cancel')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel active trial',
    description:
      'Cancels the active trial and reverts to the original tier. Cannot start another trial for the same tier.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trial cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - No active trial to cancel',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires owner or admin role',
  })
  async cancelTrial(
    @CurrentTenant() tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.trialsService.cancelTrial(tenantId);
    return {
      success: true,
      message: 'Trial cancelled. You have been returned to your original tier.',
    };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get trial history',
    description:
      'Returns the history of all trials for this tenant, including status and outcomes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trial history retrieved successfully',
    type: [TrialHistoryItemDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getTrialHistory(
    @CurrentTenant() tenantId: string,
  ): Promise<{ data: TrialHistoryItemDto[] }> {
    const history = await this.trialsService.getTrialHistory(tenantId);
    return { data: history };
  }
}
