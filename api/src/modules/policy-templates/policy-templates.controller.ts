import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PolicyTemplatesService } from './policy-templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';

@ApiTags('policy-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('policy-templates')
export class PolicyTemplatesController {
  constructor(private readonly templatesService: PolicyTemplatesService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get all policy templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved' })
  findAll() {
    const templates = this.templatesService.findAll();
    return { data: templates };
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get a policy template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved' })
  findOne(@Param('id') id: string) {
    const template = this.templatesService.findOne(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return { data: template };
  }
}

