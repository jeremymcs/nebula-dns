import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  PaginationQueryDto,
  PaginatedResponse,
} from '@/common/dto/pagination.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(
    tenantId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<User>> {
    const { limit = 20, cursor } = pagination;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.tenant_id = :tenantId', { tenantId })
      .orderBy('user.created_at', 'DESC')
      .take(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('user.created_at < :cursor', {
        cursor: new Date(Buffer.from(cursor, 'base64').toString()),
      });
    }

    const users = await queryBuilder.getMany();
    const hasMore = users.length > limit;

    if (hasMore) {
      users.pop();
    }

    const nextCursor =
      hasMore && users.length > 0
        ? Buffer.from(users[users.length - 1].createdAt.toISOString()).toString(
            'base64',
          )
        : null;

    return {
      data: users,
      pagination: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async findOne(tenantId: string, id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async create(
    tenantId: string,
    createDto: CreateUserDto,
    currentUser: any,
  ): Promise<User> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException('Unable to create user with this email');
    }

    // Prevent non-owners from creating owner accounts
    if (createDto.role === 'owner' && currentUser.role !== 'owner') {
      throw new ForbiddenException('Only owners can create owner accounts');
    }

    const hashedPassword = await bcrypt.hash(createDto.password, 12);

    const user = this.userRepository.create({
      ...createDto,
      email: createDto.email.toLowerCase(),
      passwordHash: hashedPassword,
      tenantId,
      status: 'active',
    });

    await this.userRepository.save(user);
    this.logger.log(`User ${user.id} created in tenant ${tenantId}`);

    return user;
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findOne(tenantId, id);

    if (updateDto.password) {
      user.passwordHash = await bcrypt.hash(updateDto.password, 12);
      delete updateDto.password;
    }

    Object.assign(user, updateDto);
    await this.userRepository.save(user);

    this.logger.log(`User ${id} updated in tenant ${tenantId}`);
    return user;
  }

  async remove(tenantId: string, id: string, currentUser: any): Promise<void> {
    const user = await this.findOne(tenantId, id);

    // Prevent self-deletion
    if (user.id === currentUser.id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // Prevent deleting the last owner
    if (user.role === 'owner') {
      const ownerCount = await this.userRepository.count({
        where: { tenantId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot delete the last owner');
      }
    }

    await this.userRepository.remove(user);
    this.logger.log(`User ${id} deleted from tenant ${tenantId}`);
  }

  async suspend(tenantId: string, id: string): Promise<void> {
    const user = await this.findOne(tenantId, id);
    user.status = 'suspended';
    await this.userRepository.save(user);
    this.logger.log(`User ${id} suspended in tenant ${tenantId}`);
  }

  async reactivate(tenantId: string, id: string): Promise<void> {
    const user = await this.findOne(tenantId, id);
    user.status = 'active';
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);
    this.logger.log(`User ${id} reactivated in tenant ${tenantId}`);
  }
}
