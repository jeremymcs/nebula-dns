import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async findAll(@Tenant() tenantId: string, @Query() filters: any) {
    const users = await this.usersService.findAll(tenantId, filters);
    return { data: users };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async create(@Tenant() tenantId: string, @Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(tenantId, createUserDto);
    return { data: user };
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async findOne(@Param('id') id: string, @Tenant() tenantId: string) {
    const user = await this.usersService.findOne(id, tenantId);
    return { data: user };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async update(
    @Param('id') id: string,
    @Tenant() tenantId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, tenantId, updateUserDto);
    return { data: user };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async remove(@Param('id') id: string, @Tenant() tenantId: string) {
    await this.usersService.remove(id, tenantId);
    return { message: 'User deleted successfully' };
  }
}
