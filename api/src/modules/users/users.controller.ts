// Nebula DNS - Users Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import {
  CurrentTenant,
  CurrentUser,
} from '@/common/decorators/tenant.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({
    summary: 'List all users in tenant',
    description:
      'Returns a paginated list of all users belonging to the current tenant. Results can be filtered and paginated using query parameters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              email: { type: 'string', example: 'user@example.com' },
              name: { type: 'string', example: 'John Doe' },
              role: {
                type: 'string',
                enum: ['owner', 'admin', 'analyst', 'readonly'],
              },
              status: {
                type: 'string',
                enum: ['active', 'suspended', 'pending'],
              },
              mfaEnabled: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            cursor: { type: 'string', nullable: true },
            hasMore: { type: 'boolean' },
            total: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.usersService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Returns detailed information about a specific user.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        email: { type: 'string', example: 'user@example.com' },
        name: { type: 'string', example: 'John Doe' },
        role: {
          type: 'string',
          enum: ['owner', 'admin', 'analyst', 'readonly'],
        },
        status: { type: 'string', enum: ['active', 'suspended', 'pending'] },
        mfaEnabled: { type: 'boolean' },
        lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.usersService.findOne(tenantId, id);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Creates a new user in the current tenant. The user will receive an email with login credentials. Admins can only create users with analyst or readonly roles; owners can create users with any role.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid user data or email already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires admin or owner role)',
  })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: any,
    @Body() createDto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, createDto, currentUser);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Update user',
    description:
      'Updates an existing user. Only provided fields will be updated. Role changes may be restricted based on your own role.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid user data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires admin or owner role)',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user',
    description:
      'Permanently deletes a user from the tenant. This action cannot be undone. Users cannot delete themselves.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: 'string' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Cannot delete yourself',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only owners can delete users',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.usersService.remove(tenantId, id, currentUser);
  }

  @Post(':id/suspend')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Suspend user',
    description:
      'Suspends a user account. Suspended users cannot log in but their data is preserved. Use reactivate to restore access.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: 'string' })
  @ApiResponse({ status: 204, description: 'User suspended successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires admin or owner role)',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspend(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.usersService.suspend(tenantId, id);
  }

  @Post(':id/reactivate')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reactivate user',
    description:
      'Reactivates a previously suspended user account. The user will be able to log in again.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: 'string' })
  @ApiResponse({ status: 204, description: 'User reactivated successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Insufficient permissions (requires admin or owner role)',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async reactivate(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.usersService.reactivate(tenantId, id);
  }
}
