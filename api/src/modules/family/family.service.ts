/**
 * Family Service
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilyMember } from './entities/family-member.entity';
import { CreateFamilyMemberDto, UpdateFamilyMemberDto, AssignDeviceDto } from './dto/family.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(
    @InjectRepository(FamilyMember)
    private readonly familyMemberRepository: Repository<FamilyMember>,
  ) {}

  async findAll(tenantId: string): Promise<FamilyMember[]> {
    return this.familyMemberRepository.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<FamilyMember> {
    const member = await this.familyMemberRepository.findOne({
      where: { id, tenantId },
    });
    if (!member) {
      throw new NotFoundException(`Family member ${id} not found`);
    }
    return member;
  }

  async create(tenantId: string, dto: CreateFamilyMemberDto): Promise<FamilyMember> {
    const member = this.familyMemberRepository.create({
      tenantId,
      name: dto.name,
      avatar: dto.avatar,
      role: dto.role,
      restrictions: dto.restrictions || {
        blockedCategories: dto.role === 'child' ? ['adult', 'gambling', 'social-media'] : ['adult', 'gambling'],
        allowedApps: [],
        safeSearch: dto.role !== 'parent',
        dailyLimit: dto.role === 'child' ? 120 : dto.role === 'teen' ? 180 : undefined,
        bedtime: dto.role === 'child' ? { start: '20:00', end: '07:00' } : dto.role === 'teen' ? { start: '22:00', end: '07:00' } : undefined,
      },
      devices: [],
      screenTime: { today: 0, weekAverage: 0, byCategory: [] },
      isOnline: false,
    });
    return this.familyMemberRepository.save(member);
  }

  async update(tenantId: string, id: string, dto: UpdateFamilyMemberDto): Promise<FamilyMember> {
    const member = await this.findOne(tenantId, id);
    
    if (dto.name !== undefined) member.name = dto.name;
    if (dto.avatar !== undefined) member.avatar = dto.avatar;
    if (dto.role !== undefined) member.role = dto.role;
    if (dto.restrictions !== undefined) member.restrictions = dto.restrictions as any;
    
    return this.familyMemberRepository.save(member);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const member = await this.findOne(tenantId, id);
    await this.familyMemberRepository.remove(member);
  }

  async assignDevice(tenantId: string, memberId: string, dto: AssignDeviceDto): Promise<FamilyMember> {
    const member = await this.findOne(tenantId, memberId);
    
    // Check if device already assigned
    const existingIndex = member.devices.findIndex(d => d.id === dto.deviceId);
    if (existingIndex >= 0) {
      member.devices[existingIndex] = {
        ...member.devices[existingIndex],
        name: dto.name,
        type: dto.type,
      };
    } else {
      member.devices.push({
        id: dto.deviceId || uuidv4(),
        name: dto.name,
        type: dto.type,
        isOnline: false,
      });
    }
    
    return this.familyMemberRepository.save(member);
  }

  async removeDevice(tenantId: string, memberId: string, deviceId: string): Promise<FamilyMember> {
    const member = await this.findOne(tenantId, memberId);
    member.devices = member.devices.filter(d => d.id !== deviceId);
    return this.familyMemberRepository.save(member);
  }

  async updateScreenTime(tenantId: string, memberId: string, screenTimeData: any): Promise<FamilyMember> {
    const member = await this.findOne(tenantId, memberId);
    member.screenTime = { ...member.screenTime, ...screenTimeData };
    return this.familyMemberRepository.save(member);
  }

  async setOnlineStatus(tenantId: string, memberId: string, isOnline: boolean): Promise<void> {
    await this.familyMemberRepository.update(
      { id: memberId, tenantId },
      { isOnline }
    );
  }
}

