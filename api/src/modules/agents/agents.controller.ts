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
import { AgentsService } from './agents.service';
import { CreateDownloadLinkDto, RegisterAgentDto, AgentHeartbeatDto, UpdateAgentDto } from './dto/agent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('versions')
  async getVersions() {
    const versions = await this.agentsService.getAgentVersions();
    return { data: versions };
  }

  @Get('versions/:platform')
  async getLatestVersion(@Param('platform') platform: any) {
    const version = await this.agentsService.getLatestVersion(platform);
    return { data: version };
  }

  @Post('register')
  async registerAgent(@Body() dto: RegisterAgentDto) {
    const agent = await this.agentsService.registerAgent(dto);
    return { 
      success: true,
      message: 'Agent registered successfully',
      data: {
        id: agent.id,
        deviceName: agent.deviceName,
        locationId: agent.locationId,
      },
    };
  }

  @Post('heartbeat')
  async heartbeat(
    @Body() dto: AgentHeartbeatDto,
  ) {
    // Note: In production, authenticate via API key or token
    // For now, we'll require a tenant context
    // This would be called by the agent with its credentials
    return { 
      success: true,
      configUpdated: false,
      updateAvailable: false,
    };
  }

  // ==================== AUTHENTICATED ENDPOINTS ====================

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAgents(@CurrentTenant() tenantId: string) {
    const agents = await this.agentsService.getAgents(tenantId);
    return { data: agents };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@CurrentTenant() tenantId: string) {
    const stats = await this.agentsService.getAgentStats(tenantId);
    return { data: stats };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getAgent(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const agent = await this.agentsService.getAgent(tenantId, id);
    return { data: agent };
  }

  @Post('download-link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
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
  async deleteAgent(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.agentsService.deleteAgent(tenantId, id);
    return { success: true };
  }
}
