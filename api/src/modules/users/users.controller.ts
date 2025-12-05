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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant, CurrentUser } from '@/common/decorators/tenant.decorator';
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
  @ApiOperation({ summary: 'List all users in tenant' })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.usersService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(tenantId, id);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() currentUser: any,
    @Body() createDto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, createDto, currentUser);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
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
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
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
  @ApiOperation({ summary: 'Suspend user' })
  @ApiResponse({ status: 204, description: 'User suspended' })
  async suspend(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.usersService.suspend(tenantId, id);
  }

  @Post(':id/reactivate')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reactivate user' })
  @ApiResponse({ status: 204, description: 'User reactivated' })
  async reactivate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.usersService.reactivate(tenantId, id);
  }
}
