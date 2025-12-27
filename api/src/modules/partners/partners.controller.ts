import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PartnersService } from './partners.service';
import { 
  CreatePartnerDto, 
  UpdatePartnerDto, 
  CreatePartnerUserDto, 
  UpdatePartnerUserDto,
  ImpersonateOrganizationDto,
} from './dto/partner.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

// Partner management (superadmin only)
@Controller('partners')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @Roles('superadmin')
  async findAll() {
    const partners = await this.partnersService.findAll();
    return { data: partners };
  }

  @Post()
  @Roles('superadmin')
  async create(@Body() dto: CreatePartnerDto) {
    const partner = await this.partnersService.create(dto);
    return { data: partner };
  }

  @Get(':id')
  @Roles('superadmin')
  async findOne(@Param('id') id: string) {
    const partner = await this.partnersService.findOne(id);
    return { data: partner };
  }

  @Patch(':id')
  @Roles('superadmin')
  async update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    const partner = await this.partnersService.update(id, dto);
    return { data: partner };
  }

  @Delete(':id')
  @Roles('superadmin')
  async delete(@Param('id') id: string) {
    await this.partnersService.delete(id);
    return { success: true };
  }

  @Get(':id/stats')
  @Roles('superadmin')
  async getStats(@Param('id') id: string) {
    const stats = await this.partnersService.getPartnerStats(id);
    return { data: stats };
  }

  @Get(':id/organizations')
  @Roles('superadmin')
  async getOrganizations(@Param('id') id: string) {
    const orgs = await this.partnersService.getOrganizations(id);
    return { data: orgs };
  }

  @Get(':id/users')
  @Roles('superadmin')
  async getUsers(@Param('id') id: string) {
    const users = await this.partnersService.findAllUsers(id);
    return { data: users };
  }

  @Post(':id/users')
  @Roles('superadmin')
  async createUser(@Param('id') id: string, @Body() dto: CreatePartnerUserDto) {
    const user = await this.partnersService.createUser(id, dto);
    return { data: user };
  }

  @Patch(':partnerId/users/:userId')
  @Roles('superadmin')
  async updateUser(
    @Param('partnerId') partnerId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePartnerUserDto,
  ) {
    const user = await this.partnersService.updateUser(partnerId, userId, dto);
    return { data: user };
  }

  @Delete(':partnerId/users/:userId')
  @Roles('superadmin')
  async deleteUser(
    @Param('partnerId') partnerId: string,
    @Param('userId') userId: string,
  ) {
    await this.partnersService.deleteUser(partnerId, userId);
    return { success: true };
  }
}

