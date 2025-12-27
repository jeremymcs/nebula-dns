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

// Partner dashboard endpoints (for partner users)
@Controller('partner-dashboard')
@UseGuards(PartnerAuthGuard)
export class PartnerDashboardController {
  constructor(private readonly partnersService: PartnersService) {}

  // Get current partner info
  @Get('partner')
  async getCurrentPartner(@CurrentPartner() partnerId: string) {
    const partner = await this.partnersService.findOne(partnerId);
    return { data: partner };
  }

  // Update partner settings (owner/admin only)
  @Patch('partner')
  async updatePartner(@CurrentPartner() partnerId: string, @Body() dto: UpdatePartnerDto) {
    const partner = await this.partnersService.update(partnerId, dto);
    return { data: partner };
  }

  // Get partner stats
  @Get('stats')
  async getStats(@CurrentPartner() partnerId: string) {
    const stats = await this.partnersService.getPartnerStats(partnerId);
    return { data: stats };
  }

  // Get organizations summary with stats
  @Get('organizations/summary')
  async getOrganizationsSummary(@CurrentPartner() partnerId: string) {
    const summary = await this.partnersService.getPartnerOrganizationsSummary(partnerId);
    return { data: summary };
  }

  // Get all organizations under this partner
  @Get('organizations')
  async getOrganizations(@CurrentPartner() partnerId: string) {
    const orgs = await this.partnersService.getOrganizations(partnerId);
    return { data: orgs };
  }

  // Get specific organization
  @Get('organizations/:orgId')
  async getOrganization(@CurrentPartner() partnerId: string, @Param('orgId') orgId: string) {
    const org = await this.partnersService.getOrganization(partnerId, orgId);
    return { data: org };
  }

  // Get locations for an organization
  @Get('organizations/:orgId/locations')
  async getOrganizationLocations(
    @CurrentPartner() partnerId: string,
    @Param('orgId') orgId: string,
  ) {
    const locations = await this.partnersService.getOrganizationLocations(partnerId, orgId);
    return { data: locations };
  }

  // Create a new organization
  @Post('organizations')
  async createOrganization(@CurrentPartner() partnerId: string, @Body() dto: CreateOrganizationDto) {
    const org = await this.partnersService.createOrganization(partnerId, dto);
    return { data: org };
  }

  // Update an organization
  @Patch('organizations/:orgId')
  async updateOrganization(
    @CurrentPartner() partnerId: string,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const org = await this.partnersService.updateOrganization(partnerId, orgId, dto);
    return { data: org };
  }

  // Delete an organization
  @Delete('organizations/:orgId')
  async deleteOrganization(@CurrentPartner() partnerId: string, @Param('orgId') orgId: string) {
    await this.partnersService.deleteOrganization(partnerId, orgId);
    return { success: true };
  }

  // Get partner users
  @Get('users')
  async getUsers(@CurrentPartner() partnerId: string) {
    const users = await this.partnersService.findAllUsers(partnerId);
    return { data: users };
  }

  // Update current user profile
  @Patch('profile')
  async updateProfile(
    @CurrentPartner() partnerId: string,
    @CurrentPartnerUser() user: PartnerUser,
    @Body() dto: UpdatePartnerUserDto,
  ) {
    const updated = await this.partnersService.updateUser(partnerId, user.id, dto);
    return { data: updated };
  }

  // Start impersonating an organization
  @Post('impersonate')
  async startImpersonation(
    @CurrentPartner() partnerId: string,
    @CurrentPartnerUser() user: PartnerUser,
    @Body() dto: ImpersonateOrganizationDto,
  ) {
    const org = await this.partnersService.startImpersonation(partnerId, user.id, dto.organizationId);
    return { 
      message: `Now viewing as ${org.name}`,
      data: org,
    };
  }

  // Stop impersonating
  @Post('impersonate/stop')
  async stopImpersonation(@CurrentPartnerUser() user: PartnerUser) {
    await this.partnersService.stopImpersonation(user.id);
    return { message: 'Returned to partner dashboard' };
  }

  // Get current impersonation status
  @Get('impersonate/current')
  async getCurrentImpersonation(@CurrentPartnerUser() user: PartnerUser) {
    const org = await this.partnersService.getCurrentImpersonation(user.id);
    return { data: org };
  }
}

