import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ThreatFeedsService } from './threat-feeds.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('threat-feeds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'owner')
export class ThreatFeedsController {
  constructor(private readonly threatFeedsService: ThreatFeedsService) {}

  @Get()
  async getFeeds() {
    const feeds = await this.threatFeedsService.getFeeds();
    return { data: feeds };
  }

  @Get('stats')
  async getStats() {
    const stats = this.threatFeedsService.getStats();
    return { data: stats };
  }

  @Post(':feedId/update')
  async updateFeed(@Param('feedId') feedId: string) {
    const result = await this.threatFeedsService.updateFeed(feedId);
    return { data: result };
  }

  @Post('update-all')
  async updateAllFeeds() {
    await this.threatFeedsService.updateAllFeeds();
    return { message: 'Feed update initiated' };
  }
}

