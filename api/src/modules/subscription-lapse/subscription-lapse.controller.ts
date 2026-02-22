// Nebula DNS - Subscription Lapse Controller
// API endpoints for subscription lapse and MSP managed info (US-027, US-028)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { SubscriptionLapseService } from './subscription-lapse.service';

@ApiTags('Subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionLapseController {
  constructor(
    private readonly subscriptionLapseService: SubscriptionLapseService,
  ) {}

  /**
   * US-027: Get MSP managed info for the current tenant
   * Returns info about the MSP managing this tenant for display in UI badge
   */
  @Get('msp-info')
  @ApiOperation({
    summary: 'Get MSP managed info',
    description: 'Returns information about the MSP managing this tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'MSP info retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isMspManaged: { type: 'boolean' },
        mspName: { type: 'string' },
        mspDisplayName: { type: 'string' },
        mspContactEmail: { type: 'string' },
        mspSupportUrl: { type: 'string' },
      },
    },
  })
  async getMspInfo(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.subscriptionLapseService.getMspManagedInfo(tenantId);
  }

  /**
   * US-028: Get grace period info for the current tenant
   * Returns subscription status and grace period details
   */
  @Get('grace-period')
  @ApiOperation({
    summary: 'Get grace period info',
    description: 'Returns subscription status and grace period details',
  })
  @ApiResponse({
    status: 200,
    description: 'Grace period info retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        tenantName: { type: 'string' },
        subscriptionStatus: {
          type: 'string',
          enum: ['active', 'grace', 'suspended'],
        },
        graceStartDate: { type: 'string', format: 'date-time' },
        daysRemaining: { type: 'number' },
        mspName: { type: 'string' },
        mspContactEmail: { type: 'string' },
        mspSupportUrl: { type: 'string' },
      },
    },
  })
  async getGracePeriodInfo(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.subscriptionLapseService.getGracePeriodInfo(tenantId);
  }

  /**
   * US-029: Get subscription status for policy service
   * Returns whether the tenant can resolve DNS queries
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get subscription status',
    description: 'Returns subscription status and DNS resolution eligibility',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'grace', 'suspended'],
        },
        canResolve: { type: 'boolean' },
      },
    },
  })
  async getSubscriptionStatus(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.subscriptionLapseService.getSubscriptionStatus(tenantId);
  }

  /**
   * US-028: Admin endpoint to extend grace period
   * Only accessible by system admins
   */
  @Post('extend-grace-period')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extend grace period',
    description: 'Admin function to extend grace period for an MSP tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Grace period extended successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to extend grace period',
  })
  async extendGracePeriod(
    @Request() req: any,
    @Body() body: { mspTenantId: string; additionalDays: number },
  ) {
    // This is a privileged operation - ensure user is admin of the MSP tenant
    const { mspTenantId, additionalDays } = body;

    // Only the MSP's own admins can extend their grace period
    if (req.user.tenantId !== mspTenantId && req.user.tier !== 'msp') {
      throw new ForbiddenException(
        'Only MSP admins can extend their own grace period',
      );
    }

    await this.subscriptionLapseService.extendGracePeriod(
      mspTenantId,
      additionalDays,
      req.user.id,
    );

    return { message: `Grace period extended by ${additionalDays} days` };
  }
}
