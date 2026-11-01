import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryFeedsService } from './category-feeds.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, Role, RolesGuard } from '@/common/guards/roles.guard';

@ApiTags('category-feeds')
@ApiBearerAuth()
@Controller('category-feeds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryFeedsController {
  constructor(private readonly categoryFeedsService: CategoryFeedsService) {}

  @Get('stats')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'UT1 category feed load status' })
  getStats() {
    return { data: this.categoryFeedsService.getStats() };
  }

  @Post('reload')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Reload UT1 category blacklists into Redis' })
  async reload() {
    const stats = await this.categoryFeedsService.loadUt1Categories();
    return { message: 'Category reload completed', data: stats };
  }
}
