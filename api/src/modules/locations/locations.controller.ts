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
} from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateTokenDto } from './dto/create-token.dto';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * Public endpoint for dnsdist to look up location by source IP
   * No authentication required - restricted to internal network in production
   */
  @Get('by-ip/:ip')
  @ApiOperation({ summary: 'Look up location by source IP (internal use)' })
  @ApiResponse({ status: 200, description: 'Location lookup result' })
  async findByIP(@Param('ip') ip: string) {
    return this.locationsService.findByIP(ip);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'List all locations' })
  @ApiResponse({ status: 200, description: 'Locations retrieved' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.locationsService.findAll(tenantId, pagination);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiResponse({ status: 200, description: 'Location retrieved' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.locationsService.findOne(tenantId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new location' })
  @ApiResponse({ status: 201, description: 'Location created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() createDto: CreateLocationDto,
  ) {
    return this.locationsService.create(tenantId, createDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateLocationDto,
  ) {
    return this.locationsService.update(tenantId, id, updateDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete location' })
  @ApiResponse({ status: 204, description: 'Location deleted' })
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.locationsService.remove(tenantId, id);
  }

  // Token management endpoints

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id/tokens')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'List location tokens' })
  @ApiResponse({ status: 200, description: 'Tokens retrieved' })
  async getTokens(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.locationsService.getTokens(tenantId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/tokens')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create new location token' })
  @ApiResponse({
    status: 201,
    description: 'Token created. The token value is only shown once.',
  })
  async createToken(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() createTokenDto: CreateTokenDto,
  ) {
    return this.locationsService.createToken(tenantId, id, createTokenDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id/tokens/:tokenId')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke location token' })
  @ApiResponse({ status: 204, description: 'Token revoked' })
  async revokeToken(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('tokenId') tokenId: string,
  ) {
    await this.locationsService.revokeToken(tenantId, id, tokenId);
  }
}
