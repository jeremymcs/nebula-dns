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
import { PoliciesService } from './policies.service';
import { PolicyCompilerService } from './policy-compiler.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant, CurrentUser } from '@/common/decorators/tenant.decorator';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

@ApiTags('policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('policies')
export class PoliciesController {
  constructor(
    private readonly policiesService: PoliciesService,
    private readonly policyCompilerService: PolicyCompilerService,
  ) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'List all policies' })
  @ApiResponse({ status: 200, description: 'Policies retrieved' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.policiesService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get policy by ID' })
  @ApiResponse({ status: 200, description: 'Policy retrieved' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.policiesService.findOne(tenantId, id);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new policy' })
  @ApiResponse({ status: 201, description: 'Policy created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreatePolicyDto,
  ) {
    return this.policiesService.create(tenantId, createDto, user.id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update policy (creates new version)' })
  @ApiResponse({ status: 200, description: 'Policy updated, new version created' })
  async update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdatePolicyDto,
  ) {
    return this.policiesService.update(tenantId, id, updateDto, user.id);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete policy' })
  @ApiResponse({ status: 204, description: 'Policy deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.policiesService.remove(tenantId, id);
  }

  @Get(':id/versions')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get policy version history' })
  @ApiResponse({ status: 200, description: 'Policy versions retrieved' })
  async getVersions(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.policiesService.getVersions(tenantId, id);
  }

  @Get(':id/versions/:versionId')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get specific policy version' })
  @ApiResponse({ status: 200, description: 'Policy version retrieved' })
  async getVersion(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.policiesService.getVersion(tenantId, id, versionId);
  }

  @Post(':id/rollback')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Rollback to a previous version' })
  @ApiResponse({ status: 200, description: 'Policy rolled back' })
  async rollback(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('versionId') versionId: string,
  ) {
    return this.policiesService.rollback(tenantId, id, versionId, user.id);
  }

  @Post('compile')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Compile all policies for tenant' })
  @ApiResponse({ status: 200, description: 'Policies compiled and pushed to Redis' })
  async compileAll(@CurrentTenant() tenantId: string) {
    await this.policyCompilerService.compileAllForTenant(tenantId);
    return { message: 'Policies compiled successfully' };
  }

  @Post(':id/compile/:locationId')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Compile policy for specific location' })
  @ApiResponse({ status: 200, description: 'Policy compiled and pushed to Redis' })
  async compileForLocation(
    @CurrentTenant() tenantId: string,
    @Param('id') policyId: string,
    @Param('locationId') locationId: string,
  ) {
    const compiled = await this.policyCompilerService.compile(tenantId, policyId, locationId);
    return { message: 'Policy compiled successfully', compiled };
  }
}
