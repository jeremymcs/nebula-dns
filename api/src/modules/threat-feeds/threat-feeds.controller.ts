import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ThreatFeedsService } from './threat-feeds.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';

@ApiTags('threat-feeds')
@ApiBearerAuth()
@Controller('threat-feeds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThreatFeedsController {
  constructor(private readonly threatFeedsService: ThreatFeedsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Get all threat feeds' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by threat category',
  })
  @ApiResponse({ status: 200, description: 'Feeds retrieved' })
  async getFeeds(@Query('category') category?: string) {
    const feeds = category
      ? await this.threatFeedsService.getFeedsByCategory(category)
      : await this.threatFeedsService.getFeeds();
    return { data: feeds };
  }

  @Get('stats')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get threat feed statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getStats() {
    const stats = await this.threatFeedsService.getStats();
    return { data: stats };
  }

  @Get('check/:domain')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Check if a domain is in threat feeds' })
  @ApiResponse({ status: 200, description: 'Domain check result' })
  async checkDomain(@Param('domain') domain: string) {
    const result = await this.threatFeedsService.checkDomain(
      domain.toLowerCase(),
    );
    return {
      data: {
        domain,
        isThreat: !!result,
        indicator: result,
      },
    };
  }

  @Post('check-batch')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Check multiple domains against threat feeds' })
  @ApiResponse({ status: 200, description: 'Batch check results' })
  async checkDomainBatch(@Body() body: { domains: string[] }) {
    const results = await this.threatFeedsService.checkDomainBatch(
      body.domains,
    );
    return {
      data: {
        checked: body.domains.length,
        threats: results.size,
        results: Object.fromEntries(results),
      },
    };
  }

  @Post(':feedId/update')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a specific threat feed' })
  @ApiResponse({ status: 200, description: 'Feed updated' })
  async updateFeed(@Param('feedId') feedId: string) {
    const result = await this.threatFeedsService.updateFeed(feedId);
    return { data: result };
  }

  @Patch(':feedId/toggle')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Enable or disable a threat feed' })
  @ApiResponse({ status: 200, description: 'Feed toggled' })
  async toggleFeed(
    @Param('feedId') feedId: string,
    @Body() body: { enabled: boolean },
  ) {
    const result = await this.threatFeedsService.toggleFeed(
      feedId,
      body.enabled,
    );
    return { data: result };
  }

  @Post('update-all')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update all enabled threat feeds' })
  @ApiResponse({ status: 200, description: 'All feeds update initiated' })
  async updateAllFeeds() {
    const result = await this.threatFeedsService.updateAllFeeds();
    return {
      message: 'Feed update completed',
      data: result,
    };
  }
}
