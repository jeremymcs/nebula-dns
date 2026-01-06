import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CustomList, ListType } from './entities/custom-list.entity';
import { CustomListEntry } from './entities/custom-list-entry.entity';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { AddEntriesDto } from './dto/add-entries.dto';
import {
  PaginationQueryDto,
  PaginatedResponse,
} from '@/common/dto/pagination.dto';

@Injectable()
export class ListsService {
  private readonly logger = new Logger(ListsService.name);

  constructor(
    @InjectRepository(CustomList)
    private readonly listRepository: Repository<CustomList>,
    @InjectRepository(CustomListEntry)
    private readonly entryRepository: Repository<CustomListEntry>,
  ) {}

  async findAll(
    tenantId: string,
    pagination: PaginationQueryDto,
    type?: ListType,
  ): Promise<PaginatedResponse<CustomList>> {
    const { limit = 20, cursor } = pagination;

    const queryBuilder = this.listRepository
      .createQueryBuilder('list')
      .where('list.tenant_id = :tenantId', { tenantId })
      .orderBy('list.created_at', 'DESC')
      .take(limit + 1);

    if (type) {
      queryBuilder.andWhere('list.type = :type', { type });
    }

    if (cursor) {
      queryBuilder.andWhere('list.created_at < :cursor', {
        cursor: new Date(Buffer.from(cursor, 'base64').toString()),
      });
    }

    const lists = await queryBuilder.getMany();
    const hasMore = lists.length > limit;

    if (hasMore) {
      lists.pop();
    }

    const nextCursor =
      hasMore && lists.length > 0
        ? Buffer.from(lists[lists.length - 1].createdAt.toISOString()).toString(
            'base64',
          )
        : null;

    return {
      data: lists,
      pagination: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async findOne(tenantId: string, id: string): Promise<CustomList> {
    const list = await this.listRepository.findOne({
      where: { id, tenantId },
    });

    if (!list) {
      throw new NotFoundException(`List ${id} not found`);
    }

    return list;
  }

  async create(
    tenantId: string,
    createDto: CreateListDto,
  ): Promise<CustomList> {
    const list = this.listRepository.create({
      ...createDto,
      tenantId,
      entryCount: 0,
    });

    await this.listRepository.save(list);
    this.logger.log(`List ${list.id} created in tenant ${tenantId}`);

    return list;
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateListDto,
  ): Promise<CustomList> {
    const list = await this.findOne(tenantId, id);

    Object.assign(list, updateDto);
    await this.listRepository.save(list);

    this.logger.log(`List ${id} updated in tenant ${tenantId}`);
    return list;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const list = await this.findOne(tenantId, id);

    // Delete all entries first
    await this.entryRepository.delete({ listId: id });
    await this.listRepository.remove(list);

    this.logger.log(`List ${id} deleted from tenant ${tenantId}`);
  }

  async getEntries(
    tenantId: string,
    listId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<CustomListEntry>> {
    // Verify list belongs to tenant
    await this.findOne(tenantId, listId);

    const { limit = 50, cursor } = pagination;

    const queryBuilder = this.entryRepository
      .createQueryBuilder('entry')
      .where('entry.list_id = :listId', { listId })
      .orderBy('entry.created_at', 'DESC')
      .take(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('entry.created_at < :cursor', {
        cursor: new Date(Buffer.from(cursor, 'base64').toString()),
      });
    }

    const entries = await queryBuilder.getMany();
    const hasMore = entries.length > limit;

    if (hasMore) {
      entries.pop();
    }

    const nextCursor =
      hasMore && entries.length > 0
        ? Buffer.from(
            entries[entries.length - 1].createdAt.toISOString(),
          ).toString('base64')
        : null;

    return {
      data: entries,
      pagination: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async addEntries(
    tenantId: string,
    listId: string,
    addEntriesDto: AddEntriesDto,
  ): Promise<{ added: number; skipped: number }> {
    const list = await this.findOne(tenantId, listId);

    // Check for duplicates
    const existingDomains = await this.entryRepository.find({
      where: { listId },
      select: ['domain'],
    });
    const existingSet = new Set(existingDomains.map((e) => e.domain));

    const entriesToAdd: Partial<CustomListEntry>[] = [];
    let skipped = 0;

    for (const entry of addEntriesDto.entries) {
      const normalizedDomain = this.normalizeDomain(entry.domain);

      if (!this.isValidDomain(normalizedDomain)) {
        skipped++;
        continue;
      }

      if (existingSet.has(normalizedDomain)) {
        skipped++;
        continue;
      }

      entriesToAdd.push({
        listId,
        domain: normalizedDomain,
        type: entry.type || 'exact',
        comment: entry.comment,
      });

      existingSet.add(normalizedDomain);
    }

    if (entriesToAdd.length > 0) {
      await this.entryRepository.insert(entriesToAdd);

      // Update entry count
      list.entryCount += entriesToAdd.length;
      await this.listRepository.save(list);
    }

    this.logger.log(
      `Added ${entriesToAdd.length} entries to list ${listId}, skipped ${skipped}`,
    );

    return {
      added: entriesToAdd.length,
      skipped,
    };
  }

  async removeEntry(
    tenantId: string,
    listId: string,
    entryId: string,
  ): Promise<void> {
    const list = await this.findOne(tenantId, listId);

    const entry = await this.entryRepository.findOne({
      where: { id: entryId, listId },
    });

    if (!entry) {
      throw new NotFoundException(`Entry ${entryId} not found`);
    }

    await this.entryRepository.remove(entry);

    // Update entry count
    list.entryCount = Math.max(0, list.entryCount - 1);
    await this.listRepository.save(list);

    this.logger.log(`Entry ${entryId} removed from list ${listId}`);
  }

  private normalizeDomain(domain: string): string {
    return domain.toLowerCase().trim().replace(/^\./, '').replace(/\.$/, '');
  }

  private isValidDomain(domain: string): boolean {
    // Basic domain validation
    const domainRegex = /^(\*\.)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }
}
