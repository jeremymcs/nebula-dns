import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGroup } from './entities/group.entity';

export interface CreateGroupDto {
  name: string;
  description?: string;
  policyId?: string;
  priority?: number;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  policyId?: string | null;
  priority?: number;
}

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    @InjectRepository(UserGroup)
    private groupRepository: Repository<UserGroup>,
  ) {}

  async findAll(tenantId: string): Promise<UserGroup[]> {
    return this.groupRepository.find({
      where: { tenantId },
      relations: ['policy', 'members'],
      order: { priority: 'DESC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<UserGroup> {
    const group = await this.groupRepository.findOne({
      where: { id, tenantId },
      relations: ['policy', 'members'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async create(tenantId: string, dto: CreateGroupDto): Promise<UserGroup> {
    const group = this.groupRepository.create({
      tenantId,
      name: dto.name,
      description: dto.description,
      policyId: dto.policyId || null,
      priority: dto.priority || 0,
    });

    const saved = await this.groupRepository.save(group);
    this.logger.log(`Created group ${saved.id} in tenant ${tenantId}`);
    return saved;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateGroupDto,
  ): Promise<UserGroup> {
    const group = await this.findOne(tenantId, id);

    if (dto.name) group.name = dto.name;
    if (dto.description !== undefined) group.description = dto.description;
    if (dto.policyId !== undefined) group.policyId = dto.policyId;
    if (dto.priority !== undefined) group.priority = dto.priority;

    return this.groupRepository.save(group);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const group = await this.findOne(tenantId, id);
    await this.groupRepository.remove(group);
    this.logger.log(`Deleted group ${id} from tenant ${tenantId}`);
  }

  async addMember(
    tenantId: string,
    groupId: string,
    userId: string,
  ): Promise<UserGroup> {
    const group = await this.findOne(tenantId, groupId);

    // Check if user is already a member
    const isMember = group.members.some((m) => m.id === userId);
    if (isMember) {
      throw new BadRequestException('User is already a member of this group');
    }

    // Add member using query builder
    await this.groupRepository
      .createQueryBuilder()
      .relation(UserGroup, 'members')
      .of(groupId)
      .add(userId);

    return this.findOne(tenantId, groupId);
  }

  async removeMember(
    tenantId: string,
    groupId: string,
    userId: string,
  ): Promise<UserGroup> {
    await this.findOne(tenantId, groupId);

    await this.groupRepository
      .createQueryBuilder()
      .relation(UserGroup, 'members')
      .of(groupId)
      .remove(userId);

    return this.findOne(tenantId, groupId);
  }

  async getUserGroups(tenantId: string, userId: string): Promise<UserGroup[]> {
    return this.groupRepository
      .createQueryBuilder('group')
      .innerJoin('group.members', 'member')
      .leftJoinAndSelect('group.policy', 'policy')
      .where('group.tenantId = :tenantId', { tenantId })
      .andWhere('member.id = :userId', { userId })
      .orderBy('group.priority', 'DESC')
      .getMany();
  }

  async getUserPolicy(
    tenantId: string,
    userId: string,
  ): Promise<string | null> {
    // Get user's groups ordered by priority
    const groups = await this.getUserGroups(tenantId, userId);

    // Return policy from highest priority group with a policy assigned
    for (const group of groups) {
      if (group.policyId) {
        return group.policyId;
      }
    }

    return null;
  }
}
