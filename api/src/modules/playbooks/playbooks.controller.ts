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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlaybooksService } from './playbooks.service';
import { CreatePlaybookDto, UpdatePlaybookDto } from './dto/playbook.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@ApiTags('playbooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('playbooks')
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get all playbooks' })
  @ApiResponse({ status: 200, description: 'Playbooks retrieved' })
  async findAll(@CurrentTenant() tenantId: string) {
    const playbooks = await this.playbooksService.findAll(tenantId);
    return { data: playbooks };
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get a playbook by ID' })
  @ApiResponse({ status: 200, description: 'Playbook retrieved' })
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const playbook = await this.playbooksService.findOne(tenantId, id);
    return { data: playbook };
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new playbook' })
  @ApiResponse({ status: 201, description: 'Playbook created' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreatePlaybookDto) {
    const playbook = await this.playbooksService.create(tenantId, dto);
    return { data: playbook, message: 'Playbook created successfully' };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a playbook' })
  @ApiResponse({ status: 200, description: 'Playbook updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlaybookDto,
  ) {
    const playbook = await this.playbooksService.update(tenantId, id, dto);
    return { data: playbook, message: 'Playbook updated successfully' };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a playbook' })
  @ApiResponse({ status: 204, description: 'Playbook deleted' })
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.playbooksService.remove(tenantId, id);
  }

  @Post(':id/run')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Run a playbook manually' })
  @ApiResponse({ status: 200, description: 'Playbook executed' })
  async run(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const result = await this.playbooksService.run(tenantId, id);
    return result;
  }
}

