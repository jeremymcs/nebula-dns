import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ListsService } from './lists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@/common/guards/roles.guard';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { AddEntriesDto } from './dto/add-entries.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

@ApiTags('lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'List all custom lists' })
  @ApiResponse({ status: 200, description: 'Lists retrieved' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListQueryDto,
  ) {
    const { type, ...pagination } = query;
    return this.listsService.findAll(tenantId, pagination, type);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'Get list by ID' })
  @ApiResponse({ status: 200, description: 'List retrieved' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.listsService.findOne(tenantId, id);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new custom list' })
  @ApiResponse({ status: 201, description: 'List created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() createDto: CreateListDto,
  ) {
    return this.listsService.create(tenantId, createDto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update list' })
  @ApiResponse({ status: 200, description: 'List updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateListDto,
  ) {
    return this.listsService.update(tenantId, id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete list' })
  @ApiResponse({ status: 204, description: 'List deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.listsService.remove(tenantId, id);
  }

  // Entry management

  @Get(':id/entries')
  @Roles(Role.OWNER, Role.ADMIN, Role.ANALYST, Role.READONLY)
  @ApiOperation({ summary: 'List entries in a custom list' })
  @ApiResponse({ status: 200, description: 'Entries retrieved' })
  async getEntries(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.listsService.getEntries(tenantId, id, pagination);
  }

  @Post(':id/entries')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Add entries to list' })
  @ApiResponse({ status: 201, description: 'Entries added' })
  async addEntries(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() addEntriesDto: AddEntriesDto,
  ) {
    return this.listsService.addEntries(tenantId, id, addEntriesDto);
  }

  @Delete(':id/entries/:entryId')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove entry from list' })
  @ApiResponse({ status: 204, description: 'Entry removed' })
  async removeEntry(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    await this.listsService.removeEntry(tenantId, id, entryId);
  }
}
