// Nebula DNS - Agents Controller
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
  Header,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import {
  CreateDownloadLinkDto,
  RegisterAgentDto,
  AgentHeartbeatDto,
  UpdateAgentDto,
  AgentSiteIpUpdateDto,
} from './dto/agent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { AgentAuthGuard, AgentAuthContext } from './agent-auth.guard';
import { RateLimitPerIP } from '../rate-limit/decorators/rate-limit.decorator';
import { Request } from 'express';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('versions')
  @ApiOperation({
    summary: 'Get all agent versions',
    description:
      'Returns available agent versions for all platforms. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent versions retrieved successfully',
  })
  async getVersions() {
    const versions = await this.agentsService.getAgentVersions();
    return { data: versions };
  }

  @Get('versions/:platform')
  @ApiOperation({
    summary: 'Get latest version for platform',
    description:
      'Returns the latest agent version for a specific platform. No authentication required.',
  })
  @ApiParam({
    name: 'platform',
    description: 'Target platform',
    enum: ['windows', 'macos', 'linux'],
  })
  @ApiResponse({
    status: 200,
    description: 'Latest version retrieved',
  })
  async getLatestVersion(@Param('platform') platform: any) {
    const version = await this.agentsService.getLatestVersion(platform);
    return { data: version };
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a new agent',
    description:
      'Registers a new endpoint agent with the platform. Called by agents during initial setup. Requires a valid location token.',
  })
  @ApiResponse({
    status: 201,
    description: 'Agent registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid registration data or token',
  })
  async registerAgent(@Body() dto: RegisterAgentDto) {
    const result = await this.agentsService.registerAgent(dto);
    return {
      success: true,
      message: 'Agent registered successfully',
      data: {
        ...result.agent,
        deviceSecret: result.deviceSecret,
        dohToken: result.dohToken,
        config: result.config,
      },
    };
  }

  @Post('site-ip')
  @UseGuards(AgentAuthGuard)
  @RateLimitPerIP(30, 3600000)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update site public IP for a location',
    description:
      'Called by site-updater agents when the site public IPv4/IPv6 address changes. Authenticated per device.',
  })
  async updateSiteIp(
    @Body() dto: AgentSiteIpUpdateDto,
    @Req() req: Request & { agentAuth: AgentAuthContext },
  ) {
    const result = await this.agentsService.updateSitePublicIp(
      req.agentAuth,
      dto,
      req.ip,
    );
    return { success: true, data: result };
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Agent heartbeat',
    description:
      'Called periodically by agents to report status and receive policy updates. Returns any pending actions or configuration changes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Heartbeat processed successfully',
  })
  async heartbeat(@Body() dto: AgentHeartbeatDto) {
    const result = await this.agentsService.handleHeartbeatPublic(dto);
    return {
      success: true,
      ...result,
    };
  }

  @Get('shield-ca/certificate.pem')
  @Header('Content-Type', 'application/x-pem-file')
  @ApiOperation({
    summary: 'Download Shield CA for registered agent (device_id query param)',
  })
  async shieldCaCertificate(@Query('device_id') deviceId: string) {
    const pem =
      await this.agentsService.getShieldCaCertificateForDevice(deviceId);
    return pem;
  }

  @Get('update/:platform')
  @ApiOperation({
    summary: 'Check for agent updates',
    description:
      'Checks if a newer agent version is available for the specified platform.',
  })
  @ApiParam({
    name: 'platform',
    description: 'Agent platform',
    enum: ['windows', 'macos', 'linux'],
  })
  @ApiResponse({
    status: 200,
    description: 'Update information retrieved',
  })
  async getUpdate(@Param('platform') platform: string) {
    const version = await this.agentsService.getLatestVersion(platform as any);
    if (!version) {
      return { success: false, message: 'Platform not found' };
    }
    return {
      success: true,
      data: {
        version: version.version,
        downloadUrl: version.downloadUrl,
        sha256: version.sha256,
        releaseNotes: version.releaseNotes,
      },
    };
  }

  // ==================== AUTHENTICATED ENDPOINTS ====================

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all agents',
    description:
      'Returns all registered agents for the current tenant with their status and metadata.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agents retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getAgents(@CurrentTenant() tenantId: string) {
    const agents = await this.agentsService.getAgents(tenantId);
    return { data: agents };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get agent statistics',
    description:
      'Returns aggregate statistics about agents including counts by status, platform, and version.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStats(@CurrentTenant() tenantId: string) {
    const stats = await this.agentsService.getAgentStats(tenantId);
    return { data: stats };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get agent by ID',
    description: 'Returns detailed information about a specific agent.',
  })
  @ApiParam({ name: 'id', description: 'Agent UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Agent retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgent(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const agent = await this.agentsService.getAgent(tenantId, id);
    return { data: agent };
  }

  @Post('download-link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create agent download link',
    description:
      'Generates a pre-configured download link for agent installation. The link includes embedded credentials for automatic registration.',
  })
  @ApiResponse({
    status: 201,
    description: 'Download link created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createDownloadLink(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDownloadLinkDto,
  ) {
    const result = await this.agentsService.createDownloadLink(tenantId, dto);
    return {
      success: true,
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update agent',
    description:
      'Updates agent configuration such as name, location assignment, or enabled status.',
  })
  @ApiParam({ name: 'id', description: 'Agent UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Agent updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async updateAgent(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    const agent = await this.agentsService.updateAgent(tenantId, id, dto);
    return { data: agent };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete agent',
    description:
      'Removes an agent from the system. The agent will need to re-register to connect again.',
  })
  @ApiParam({ name: 'id', description: 'Agent UUID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Agent deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async deleteAgent(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.agentsService.deleteAgent(tenantId, id);
    return { success: true };
  }
}
