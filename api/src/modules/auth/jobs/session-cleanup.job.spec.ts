// Nebula DNS - Session Cleanup Job Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionCleanupJob } from './session-cleanup.job';
import { SessionService } from '../session.service';
import { User } from '../../users/entities/user.entity';

describe('SessionCleanupJob', () => {
  let job: SessionCleanupJob;
  let sessionService: jest.Mocked<SessionService>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUsers = [
    { id: 'user-1', lastLoginAt: new Date() },
    { id: 'user-2', lastLoginAt: new Date() },
    { id: 'user-3', lastLoginAt: new Date() },
  ];

  beforeEach(async () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockUsers),
    };

    const mockUserRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockSessionService = {
      cleanupExpiredSessions: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionCleanupJob,
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    job = module.get<SessionCleanupJob>(SessionCleanupJob);
    sessionService = module.get(SessionService);
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('cleanupAllExpiredSessions', () => {
    it('should process all recently active users', async () => {
      const result = await job.cleanupAllExpiredSessions();

      expect(result.usersProcessed).toBe(3);
      expect(sessionService.cleanupExpiredSessions).toHaveBeenCalledTimes(3);
      expect(sessionService.cleanupExpiredSessions).toHaveBeenCalledWith(
        'user-1',
      );
      expect(sessionService.cleanupExpiredSessions).toHaveBeenCalledWith(
        'user-2',
      );
      expect(sessionService.cleanupExpiredSessions).toHaveBeenCalledWith(
        'user-3',
      );
    });

    it('should count total cleaned sessions', async () => {
      sessionService.cleanupExpiredSessions
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3);

      const result = await job.cleanupAllExpiredSessions();

      expect(result.sessionsRemoved).toBe(5);
    });

    it('should continue processing even if one user fails', async () => {
      sessionService.cleanupExpiredSessions
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockResolvedValueOnce(2);

      const result = await job.cleanupAllExpiredSessions();

      expect(result.usersProcessed).toBe(3);
      expect(result.sessionsRemoved).toBe(3); // 1 + 2, ignoring failed
      expect(sessionService.cleanupExpiredSessions).toHaveBeenCalledTimes(3);
    });

    it('should return zero counts when no users found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      userRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await job.cleanupAllExpiredSessions();

      expect(result.usersProcessed).toBe(0);
      expect(result.sessionsRemoved).toBe(0);
      expect(sessionService.cleanupExpiredSessions).not.toHaveBeenCalled();
    });
  });

  describe('handleCron', () => {
    it('should call cleanupAllExpiredSessions', async () => {
      const cleanupSpy = jest
        .spyOn(job, 'cleanupAllExpiredSessions')
        .mockResolvedValue({
          usersProcessed: 5,
          sessionsRemoved: 10,
        });

      await job.handleCron();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should not throw on error', async () => {
      jest
        .spyOn(job, 'cleanupAllExpiredSessions')
        .mockRejectedValue(new Error('Test error'));

      await expect(job.handleCron()).resolves.toBeUndefined();
    });
  });

  describe('runManually', () => {
    it('should return cleanup results', async () => {
      sessionService.cleanupExpiredSessions
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);

      const result = await job.runManually();

      expect(result.usersProcessed).toBe(3);
      expect(result.sessionsRemoved).toBe(3);
    });
  });
});
