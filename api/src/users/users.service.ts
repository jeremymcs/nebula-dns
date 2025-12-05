import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<User[]> {
    const query = this.usersRepository.createQueryBuilder('user')
      .where('user.tenant_id = :tenantId', { tenantId });

    if (filters?.role) {
      query.andWhere('user.role = :role', { role: filters.role });
    }
    if (filters?.status) {
      query.andWhere('user.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(tenantId: string, createUserDto: CreateUserDto): Promise<User> {
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      tenant_id: tenantId,
      email: createUserDto.email,
      passwordHash,
      role: createUserDto.role,
      status: 'active',
    });

    return this.usersRepository.save(user);
  }

  async update(id: string, tenantId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id, tenantId);

    if (updateUserDto.role) {
      user.role = updateUserDto.role as any;
    }
    if (updateUserDto.status) {
      user.status = updateUserDto.status as any;
    }

    return this.usersRepository.save(user);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const user = await this.findOne(id, tenantId);
    await this.usersRepository.remove(user);
  }
}
