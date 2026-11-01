import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockPagesService } from './block-pages.service';
import { UpdatePlatformBlockPageDto } from './dto/block-page.dto';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin/guards/admin-roles.guard';
import { AdminRoles } from '../admin/decorators/admin-roles.decorator';
import { AdminRole } from '../admin/enums/admin-role.enum';

@ApiTags('admin')
@Controller('admin/platform/block-page')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@ApiBearerAuth()
export class AdminPlatformBlockPageController {
  constructor(private readonly blockPagesService: BlockPagesService) {}

  @Get()
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Get Flux Shield platform default block page' })
  async getPlatformDefault() {
    const page = await this.blockPagesService.getPlatformDefault();
    return { data: page };
  }

  @Patch()
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @ApiOperation({ summary: 'Update platform default block page branding' })
  async updatePlatformDefault(@Body() dto: UpdatePlatformBlockPageDto) {
    const page = await this.blockPagesService.updatePlatformDefault(dto);
    return { data: page };
  }
}
