// Nebula DNS - Partner Dashboard Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import {
  UpdatePartnerDto,
  UpdatePartnerUserDto,
  ImpersonateOrganizationDto,
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/partner.dto';
import { PartnerAuthGuard } from './guards/partner-auth.guard';
import { CurrentPartner } from './decorators/partner.decorator';
import { CurrentPartnerUser } from './decorators/partner-user.decorator';
import { PartnerUser } from './entities/partner-user.entity';

@ApiTags('partner-dashboard')
@ApiBearerAuth()
@Controller('partner-dashboard')
@UseGuards(PartnerAuthGuard)
export class PartnerDashboardController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get('partner')
  @ApiOperation({
    summary: 'Get current partner info',
    description:
      'Returns the current partner account information and branding.',
  })
  @ApiResponse({
    status: 200,
    description: 'Partner info retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  async getCurrentPartner(@CurrentPartner() partnerId: string) {
    const partner = await this.partnersService.findOne(partnerId);
    return { data: partner };
  }

  @Patch('partner')
  @ApiOperation({
    summary: 'Update partner settings',
    description:
      'Updates partner account settings and branding. Requires owner or admin role.',
  })
  @ApiResponse({ status: 200, description: 'Partner updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid partner data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires owner or admin role',
  })
  async updatePartner(
    @CurrentPartner() partnerId: string,
    @Body() dto: UpdatePartnerDto,
  ) {
    const partner = await this.partnersService.update(partnerId, dto);
    return { data: partner };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get partner dashboard statistics',
    description:
      'Returns aggregate statistics including organization count, total users, and usage metrics.',
  })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  async getStats(@CurrentPartner() partnerId: string) {
    const stats = await this.partnersService.getPartnerStats(partnerId);
    return { data: stats };
  }

  @Get('organizations/summary')
  @ApiOperation({
    summary: 'Get organizations summary with stats',
    description:
      'Returns a summary of all organizations with key metrics for dashboard display.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations summary retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  async getOrganizationsSummary(@CurrentPartner() partnerId: string) {
    const summary =
      await this.partnersService.getPartnerOrganizationsSummary(partnerId);
    return { data: summary };
  }

  @Get('organizations')
  @ApiOperation({
    summary: 'List all organizations',
    description: 'Returns all customer organizations managed by this partner.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  async getOrganizations(@CurrentPartner() partnerId: string) {
    const orgs = await this.partnersService.getOrganizations(partnerId);
    return { data: orgs };
  }

  @Get('organizations/:orgId')
  @ApiOperation({
    summary: 'Get specific organization',
    description:
      'Returns detailed information about a specific customer organization.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganization(
    @CurrentPartner() partnerId: string,
    @Param('orgId') orgId: string,
  ) {
    const org = await this.partnersService.getOrganization(partnerId, orgId);
    return { data: org };
  }

  @Get('organizations/:orgId/locations')
  @ApiOperation({
    summary: 'Get organization locations',
    description:
      'Returns all locations (networks) configured for an organization.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Locations retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationLocations(
    @CurrentPartner() partnerId: string,
    @Param('orgId') orgId: string,
  ) {
    const locations = await this.partnersService.getOrganizationLocations(
      partnerId,
      orgId,
    );
    return { data: locations };
  }

  @Post('organizations')
  @ApiOperation({
    summary: 'Create a new organization',
    description:
      'Creates a new customer organization under this partner. The organization will be provisioned with default settings.',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid organization data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  async createOrganization(
    @CurrentPartner() partnerId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    const org = await this.partnersService.createOrganization(partnerId, dto);
    return { data: org };
  }

  @Patch('organizations/:orgId')
  @ApiOperation({
    summary: 'Update an organization',
    description: 'Updates organization settings, name, or configuration.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid organization data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganization(
    @CurrentPartner() partnerId: string,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const org = await this.partnersService.updateOrganization(
      partnerId,
      orgId,
      dto,
    );
    return { data: org };
  }

  @Delete('organizations/:orgId')
  @ApiOperation({
    summary: 'Delete an organization',
    description:
      'Permanently deletes an organization and all associated data. This action cannot be undone.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async deleteOrganization(
    @CurrentPartner() partnerId: string,
    @Param('orgId') orgId: string,
  ) {
    await this.partnersService.deleteOrganization(partnerId, orgId);
    return { success: true };
  }

  @Get('users')
  @ApiOperation({
    summary: 'List partner users',
    description: 'Returns all users belonging to this partner account.',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  async getUsers(@CurrentPartner() partnerId: string) {
    const users = await this.partnersService.findAllUsers(partnerId);
    return { data: users };
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Updates the current partner user profile (name, password, etc.).',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid profile data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  async updateProfile(
    @CurrentPartner() partnerId: string,
    @CurrentPartnerUser() user: PartnerUser,
    @Body() dto: UpdatePartnerUserDto,
  ) {
    const updated = await this.partnersService.updateUser(
      partnerId,
      user.id,
      dto,
    );
    return { data: updated };
  }

  @Post('impersonate')
  @ApiOperation({
    summary: 'Start organization impersonation',
    description:
      'Starts impersonating a customer organization to view and manage their dashboard as if you were their admin.',
  })
  @ApiResponse({ status: 200, description: 'Impersonation started' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async startImpersonation(
    @CurrentPartner() partnerId: string,
    @CurrentPartnerUser() user: PartnerUser,
    @Body() dto: ImpersonateOrganizationDto,
  ) {
    const org = await this.partnersService.startImpersonation(
      partnerId,
      user.id,
      dto.organizationId,
    );
    return {
      message: `Now viewing as ${org.name}`,
      data: org,
    };
  }

  @Post('impersonate/stop')
  @ApiOperation({
    summary: 'Stop organization impersonation',
    description: 'Stops impersonating and returns to the partner dashboard.',
  })
  @ApiResponse({ status: 200, description: 'Impersonation stopped' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  async stopImpersonation(@CurrentPartnerUser() user: PartnerUser) {
    await this.partnersService.stopImpersonation(user.id);
    return { message: 'Returned to partner dashboard' };
  }

  @Get('impersonate/current')
  @ApiOperation({
    summary: 'Get current impersonation status',
    description:
      'Returns the organization currently being impersonated, if any.',
  })
  @ApiResponse({ status: 200, description: 'Current impersonation status' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing partner token',
  })
  async getCurrentImpersonation(@CurrentPartnerUser() user: PartnerUser) {
    const org = await this.partnersService.getCurrentImpersonation(user.id);
    return { data: org };
  }
}
