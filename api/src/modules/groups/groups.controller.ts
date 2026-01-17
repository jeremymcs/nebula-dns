// Nebula DNS - Groups Controller
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  GroupsService,
  CreateGroupDto,
  UpdateGroupDto,
} from './groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'owner')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all groups',
    description:
      'Returns all user groups for the current tenant. Groups are used to organize users and apply policies collectively.',
  })
  @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(@CurrentTenant() tenantId: string) {
    const groups = await this.groupsService.findAll(tenantId);
    return { data: groups };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get group by ID',
    description:
      'Returns detailed information about a specific group including its members.',
  })
  @ApiParam({ name: 'id', description: 'Group UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Group retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const group = await this.groupsService.findOne(tenantId, id);
    return { data: group };
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new group',
    description:
      'Creates a new user group. Groups can be used to organize users and apply DNS policies to multiple users at once.',
  })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid group data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateGroupDto) {
    const group = await this.groupsService.create(tenantId, dto);
    return { data: group, message: 'Group created successfully' };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a group',
    description:
      'Updates an existing group name, description, or other properties.',
  })
  @ApiParam({ name: 'id', description: 'Group UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid group data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    const group = await this.groupsService.update(tenantId, id, dto);
    return { data: group };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a group',
    description:
      'Permanently deletes a group. Members are not deleted but will no longer be associated with the group.',
  })
  @ApiParam({ name: 'id', description: 'Group UUID', type: 'string' })
  @ApiResponse({ status: 204, description: 'Group deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.groupsService.remove(tenantId, id);
  }

  @Post(':id/members/:userId')
  @ApiOperation({
    summary: 'Add member to group',
    description: 'Adds a user as a member of the specified group.',
  })
  @ApiParam({ name: 'id', description: 'Group UUID', type: 'string' })
  @ApiParam({ name: 'userId', description: 'User UUID to add', type: 'string' })
  @ApiResponse({ status: 200, description: 'Member added successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Group or user not found' })
  async addMember(
    @CurrentTenant() tenantId: string,
    @Param('id') groupId: string,
    @Param('userId') userId: string,
  ) {
    const group = await this.groupsService.addMember(tenantId, groupId, userId);
    return { data: group, message: 'Member added to group' };
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove member from group',
    description:
      'Removes a user from the specified group. The user account is not deleted.',
  })
  @ApiParam({ name: 'id', description: 'Group UUID', type: 'string' })
  @ApiParam({
    name: 'userId',
    description: 'User UUID to remove',
    type: 'string',
  })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Group or user not found' })
  async removeMember(
    @CurrentTenant() tenantId: string,
    @Param('id') groupId: string,
    @Param('userId') userId: string,
  ) {
    await this.groupsService.removeMember(tenantId, groupId, userId);
  }
}
