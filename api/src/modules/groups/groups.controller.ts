import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { GroupsService, CreateGroupDto, UpdateGroupDto } from './groups.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'owner')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  async findAll(@CurrentTenant() tenantId: string) {
    const groups = await this.groupsService.findAll(tenantId);
    return { data: groups };
  }

  @Get(':id')
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const group = await this.groupsService.findOne(tenantId, id);
    return { data: group };
  }

  @Post()
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateGroupDto) {
    const group = await this.groupsService.create(tenantId, dto);
    return { data: group, message: 'Group created successfully' };
  }

  @Patch(':id')
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    const group = await this.groupsService.update(tenantId, id, dto);
    return { data: group };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.groupsService.remove(tenantId, id);
  }

  @Post(':id/members/:userId')
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
  async removeMember(
    @CurrentTenant() tenantId: string,
    @Param('id') groupId: string,
    @Param('userId') userId: string,
  ) {
    await this.groupsService.removeMember(tenantId, groupId, userId);
  }
}

