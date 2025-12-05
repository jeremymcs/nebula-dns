import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CreatePolicyDto } from './dto/create-policy.dto';

@Controller('policies')
@UseGuards(JwtAuthGuard)
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  async findAll(@Tenant() tenantId: string, @Query() filters: any) {
    const policies = await this.policiesService.findAll(tenantId, filters);
    return { data: policies };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Tenant() tenantId: string) {
    const policy = await this.policiesService.findOne(id, tenantId);
    return { data: policy };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async create(
    @Tenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() createPolicyDto: CreatePolicyDto,
  ) {
    const policy = await this.policiesService.create(tenantId, user.id, createPolicyDto);
    return { data: policy };
  }

  @Post(':id/activate')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async activate(@Param('id') id: string, @Tenant() tenantId: string) {
    const policy = await this.policiesService.activate(id, tenantId);
    return { data: policy };
  }
}
