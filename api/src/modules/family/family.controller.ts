/**
 * Family Controller
 */

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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CreateFamilyMemberDto, UpdateFamilyMemberDto, AssignDeviceDto } from './dto/family.dto';

@ApiTags('family')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get('members')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get all family members' })
  @ApiResponse({ status: 200, description: 'Family members retrieved' })
  async findAll(@CurrentTenant() tenantId: string) {
    const members = await this.familyService.findAll(tenantId);
    return { data: members };
  }

  @Get('members/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get a family member by ID' })
  @ApiResponse({ status: 200, description: 'Family member retrieved' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const member = await this.familyService.findOne(tenantId, id);
    return { data: member };
  }

  @Post('members')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new family member' })
  @ApiResponse({ status: 201, description: 'Family member created' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateFamilyMemberDto) {
    const member = await this.familyService.create(tenantId, dto);
    return { data: member };
  }

  @Patch('members/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a family member' })
  @ApiResponse({ status: 200, description: 'Family member updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyMemberDto,
  ) {
    const member = await this.familyService.update(tenantId, id, dto);
    return { data: member };
  }

  @Delete('members/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a family member' })
  @ApiResponse({ status: 200, description: 'Family member deleted' })
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.familyService.remove(tenantId, id);
    return { message: 'Family member deleted' };
  }

  @Post('members/:id/devices')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Assign a device to a family member' })
  @ApiResponse({ status: 200, description: 'Device assigned' })
  async assignDevice(
    @CurrentTenant() tenantId: string,
    @Param('id') memberId: string,
    @Body() dto: AssignDeviceDto,
  ) {
    const member = await this.familyService.assignDevice(tenantId, memberId, dto);
    return { data: member };
  }

  @Delete('members/:id/devices/:deviceId')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Remove a device from a family member' })
  @ApiResponse({ status: 200, description: 'Device removed' })
  async removeDevice(
    @CurrentTenant() tenantId: string,
    @Param('id') memberId: string,
    @Param('deviceId') deviceId: string,
  ) {
    const member = await this.familyService.removeDevice(tenantId, memberId, deviceId);
    return { data: member };
  }
}

