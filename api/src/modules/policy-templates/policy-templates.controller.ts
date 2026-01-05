import { Controller, Get, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'compliance', required: false, description: 'Filter by compliance standard (HIPAA, CIPA, PCI-DSS, GDPR)' })
  @ApiQuery({ name: 'tag', required: false, description: 'Filter by tag' })
  @ApiResponse({ status: 200, description: 'Templates retrieved' })
  findAll(
    @Query('category') category?: string,
    @Query('compliance') compliance?: string,
    @Query('tag') tag?: string,
  ) {
    let templates = this.templatesService.findAll();

    if (category) {
      templates = this.templatesService.findByCategory(category);
    } else if (compliance) {
      templates = this.templatesService.findByCompliance(compliance);
    } else if (tag) {
      templates = this.templatesService.findByTag(tag);
    }

    return {
      data: templates,
      meta: {
        total: templates.length,
        categories: this.templatesService.getCategories(),
        complianceStandards: this.templatesService.getComplianceStandards(),
      },
    };
  }

  @Get('categories')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get all template categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  getCategories() {
    return { data: this.templatesService.getCategories() };
  }

  @Get('compliance-standards')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get all compliance standards' })
  @ApiResponse({ status: 200, description: 'Compliance standards retrieved' })
  getComplianceStandards() {
    return { data: this.templatesService.getComplianceStandards() };
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

