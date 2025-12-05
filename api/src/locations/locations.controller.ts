import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { CreateLocationDto } from './dto/create-location.dto';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async findAll(@Tenant() tenantId: string) {
    const locations = await this.locationsService.findAll(tenantId);
    return { data: locations };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async create(@Tenant() tenantId: string, @Body() createLocationDto: CreateLocationDto) {
    const location = await this.locationsService.create(tenantId, createLocationDto);
    return { data: location };
  }

  @Post(':id/rotate-doh-token')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async rotateDoHToken(@Param('id') id: string, @Tenant() tenantId: string) {
    const result = await this.locationsService.rotateDoHToken(id, tenantId);
    return { data: result };
  }
}
