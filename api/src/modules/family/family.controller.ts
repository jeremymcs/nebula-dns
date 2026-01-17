// Nebula DNS - Family Module Controller
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
} from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import {
  CreateFamilyMemberDto,
  UpdateFamilyMemberDto,
  AssignDeviceDto,
  SetScheduleDto,
  VerifyPinDto,
  ActivityQueryDto,
  FamilyMemberActivityDto,
} from './dto/family.dto';
import { FamilyMember } from './entities/family-member.entity';

@ApiTags('family')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get('members')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get all family members' })
  @ApiResponse({
    status: 200,
    description: 'Family members retrieved successfully',
  })
  async findAll(@CurrentTenant() tenantId: string): Promise<{
    data: FamilyMember[];
    total: number;
  }> {
    const members = await this.familyService.findAll(tenantId);
    return {
      data: members,
      total: members.length,
    };
  }

  @Get('members/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get a family member by ID' })
  @ApiParam({ name: 'id', description: 'Family member ID' })
  @ApiResponse({
    status: 200,
    description: 'Family member retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ data: FamilyMember }> {
    const member = await this.familyService.findOne(tenantId, id);
    return { data: member };
  }

  @Post('members')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new family member' })
  @ApiResponse({
    status: 201,
    description: 'Family member created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateFamilyMemberDto,
  ): Promise<{ data: FamilyMember }> {
    const member = await this.familyService.create(tenantId, dto);
    return { data: member };
  }

  @Patch('members/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a family member' })
  @ApiParam({ name: 'id', description: 'Family member ID' })
  @ApiResponse({
    status: 200,
    description: 'Family member updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyMemberDto,
  ): Promise<{ data: FamilyMember }> {
    const member = await this.familyService.update(tenantId, id, dto);
    return { data: member };
  }

  @Delete('members/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a family member' })
  @ApiParam({ name: 'id', description: 'Family member ID' })
  @ApiResponse({
    status: 200,
    description: 'Family member deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.familyService.remove(tenantId, id);
    return { message: 'Family member deleted successfully' };
  }

  @Post('members/:id/devices')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Assign a device to a family member' })
  @ApiParam({ name: 'id', description: 'Family member ID' })
  @ApiResponse({ status: 200, description: 'Device assigned successfully' })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  async assignDevice(
    @CurrentTenant() tenantId: string,
    @Param('id') memberId: string,
    @Body() dto: AssignDeviceDto,
  ): Promise<{ data: FamilyMember }> {
    const member = await this.familyService.assignDevice(
      tenantId,
      memberId,
      dto,
    );
    return { data: member };
  }

  @Delete('members/:id/devices/:deviceId')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a device from a family member' })
  @ApiParam({ name: 'id', description: 'Family member ID' })
  @ApiParam({ name: 'deviceId', description: 'Device ID to remove' })
  @ApiResponse({ status: 200, description: 'Device removed successfully' })
  @ApiResponse({
    status: 404,
    description: 'Family member or device not found',
  })
  async removeDevice(
    @CurrentTenant() tenantId: string,
    @Param('id') memberId: string,
    @Param('deviceId') deviceId: string,
  ): Promise<{ data: FamilyMember }> {
    const member = await this.familyService.removeDevice(
      tenantId,
      memberId,
      deviceId,
    );
    return { data: member };
  }

  @Get('members/:id/activity')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get activity summary for a family member' })
  @ApiParam({ name: 'id', description: 'Family member ID' })
  @ApiResponse({
    status: 200,
    description: 'Activity summary retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  async getActivity(
    @CurrentTenant() tenantId: string,
    @Param('id') memberId: string,
    @Query() query: ActivityQueryDto,
  ): Promise<{ data: FamilyMemberActivityDto }> {
    const activity = await this.familyService.getActivity(
      tenantId,
      memberId,
      query.period || '24h',
    );
    return { data: activity };
  }

  @Post('members/:id/schedule')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Set a schedule for a family member' })
  @ApiParam({ name: 'id', description: 'Family member ID' })
  @ApiResponse({ status: 200, description: 'Schedule set successfully' })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  @ApiResponse({ status: 400, description: 'Invalid schedule configuration' })
  async setSchedule(
    @CurrentTenant() tenantId: string,
    @Param('id') memberId: string,
    @Body() dto: SetScheduleDto,
  ): Promise<{ data: FamilyMember }> {
    const member = await this.familyService.setSchedule(
      tenantId,
      memberId,
      dto,
    );
    return { data: member };
  }

  @Post('verify-pin')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify parental PIN for a family member' })
  @ApiResponse({ status: 200, description: 'PIN verified successfully' })
  @ApiResponse({ status: 400, description: 'No PIN set for this member' })
  @ApiResponse({ status: 401, description: 'Invalid PIN' })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  async verifyPin(
    @CurrentTenant() tenantId: string,
    @Body() dto: VerifyPinDto,
  ): Promise<{ valid: boolean; message: string }> {
    const isValid = await this.familyService.verifyPin(tenantId, dto);
    return {
      valid: isValid,
      message: 'PIN verified successfully',
    };
  }
}
