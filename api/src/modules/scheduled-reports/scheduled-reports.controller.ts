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
import { ScheduledReportsService } from './scheduled-reports.service';
import {
  CreateScheduledReportDto,
  UpdateScheduledReportDto,
} from './dto/scheduled-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';

@Controller('scheduled-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduledReportsController {
  constructor(private readonly reportsService: ScheduledReportsService) {}

  @Post()
  @Roles('admin', 'owner')
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateScheduledReportDto,
  ) {
    const report = await this.reportsService.create(tenantId, user.id, dto);
    return { data: report };
  }

  @Get()
  async findAll(@CurrentTenant() tenantId: string) {
    const reports = await this.reportsService.findAll(tenantId);
    return { data: reports };
  }

  @Get(':id')
  async findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const report = await this.reportsService.findOne(tenantId, id);
    return { data: report };
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledReportDto,
  ) {
    const report = await this.reportsService.update(tenantId, id, dto);
    return { data: report };
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.reportsService.delete(tenantId, id);
    return { success: true };
  }

  @Get(':id/history')
  async getHistory(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const history = await this.reportsService.getHistory(tenantId, id);
    return { data: history };
  }

  @Post(':id/run')
  @Roles('admin', 'owner')
  async runNow(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    const result = await this.reportsService.runReportNow(tenantId, id);
    return {
      message: 'Report generation started',
      data: result,
    };
  }
}
