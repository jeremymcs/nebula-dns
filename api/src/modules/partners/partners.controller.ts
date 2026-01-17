// Nebula DNS - Partners Controller
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
  Request,
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
  CreatePartnerDto,
  UpdatePartnerDto,
  CreatePartnerUserDto,
  UpdatePartnerUserDto,
  ImpersonateOrganizationDto,
} from './dto/partner.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('partners')
@ApiBearerAuth()
@Controller('partners')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @Roles('superadmin')
  @ApiOperation({
    summary: 'List all partners',
    description:
      'Returns all MSP/reseller partners in the system. Superadmin only.',
  })
  @ApiResponse({ status: 200, description: 'Partners retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  async findAll() {
    const partners = await this.partnersService.findAll();
    return { data: partners };
  }

  @Post()
  @Roles('superadmin')
  @ApiOperation({
    summary: 'Create a new partner',
    description:
      'Creates a new MSP/reseller partner account. Partners can manage multiple customer organizations.',
  })
  @ApiResponse({ status: 201, description: 'Partner created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid partner data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  async create(@Body() dto: CreatePartnerDto) {
    const partner = await this.partnersService.create(dto);
    return { data: partner };
  }

  @Get(':id')
  @Roles('superadmin')
  @ApiOperation({
    summary: 'Get partner by ID',
    description: 'Returns detailed information about a specific partner.',
  })
  @ApiParam({ name: 'id', description: 'Partner UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Partner retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findOne(@Param('id') id: string) {
    const partner = await this.partnersService.findOne(id);
    return { data: partner };
  }

  @Patch(':id')
  @Roles('superadmin')
  @ApiOperation({
    summary: 'Update partner',
    description: 'Updates partner settings, branding, or plan information.',
  })
  @ApiParam({ name: 'id', description: 'Partner UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Partner updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid partner data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    const partner = await this.partnersService.update(id, dto);
    return { data: partner };
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({
    summary: 'Delete partner',
    description:
      'Permanently deletes a partner and all associated data. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Partner UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Partner deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async delete(@Param('id') id: string) {
    await this.partnersService.delete(id);
    return { success: true };
  }

  @Get(':id/stats')
  @Roles('superadmin')
  @ApiOperation({
    summary: 'Get partner statistics',
    description:
      'Returns aggregate statistics for a partner including organization count, user count, and usage metrics.',
  })
  @ApiParam({ name: 'id', description: 'Partner UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Partner stats retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getStats(@Param('id') id: string) {
    const stats = await this.partnersService.getPartnerStats(id);
    return { data: stats };
  }

  @Get(':id/organizations')
  @Roles('superadmin')
  @ApiOperation({
    summary: 'List partner organizations',
    description: 'Returns all customer organizations managed by this partner.',
  })
  @ApiParam({ name: 'id', description: 'Partner UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getOrganizations(@Param('id') id: string) {
    const orgs = await this.partnersService.getOrganizations(id);
    return { data: orgs };
  }

  @Get(':id/users')
  @Roles('superadmin')
  @ApiOperation({
    summary: 'List partner users',
    description: 'Returns all users belonging to this partner account.',
  })
  @ApiParam({ name: 'id', description: 'Partner UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getUsers(@Param('id') id: string) {
    const users = await this.partnersService.findAllUsers(id);
    return { data: users };
  }

  @Post(':id/users')
  @Roles('superadmin')
  @ApiOperation({
    summary: 'Create partner user',
    description:
      'Creates a new user account for a partner with specified role and permissions.',
  })
  @ApiParam({ name: 'id', description: 'Partner UUID', type: 'string' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async createUser(@Param('id') id: string, @Body() dto: CreatePartnerUserDto) {
    const user = await this.partnersService.createUser(id, dto);
    return { data: user };
  }

  @Patch(':partnerId/users/:userId')
  @Roles('superadmin')
  @ApiOperation({
    summary: 'Update partner user',
    description: 'Updates a partner user account settings or role.',
  })
  @ApiParam({ name: 'partnerId', description: 'Partner UUID', type: 'string' })
  @ApiParam({ name: 'userId', description: 'User UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  @ApiResponse({ status: 404, description: 'Partner or user not found' })
  async updateUser(
    @Param('partnerId') partnerId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePartnerUserDto,
  ) {
    const user = await this.partnersService.updateUser(partnerId, userId, dto);
    return { data: user };
  }

  @Delete(':partnerId/users/:userId')
  @Roles('superadmin')
  @ApiOperation({
    summary: 'Delete partner user',
    description: 'Permanently removes a user from the partner account.',
  })
  @ApiParam({ name: 'partnerId', description: 'Partner UUID', type: 'string' })
  @ApiParam({ name: 'userId', description: 'User UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires superadmin role',
  })
  @ApiResponse({ status: 404, description: 'Partner or user not found' })
  async deleteUser(
    @Param('partnerId') partnerId: string,
    @Param('userId') userId: string,
  ) {
    await this.partnersService.deleteUser(partnerId, userId);
    return { success: true };
  }
}
