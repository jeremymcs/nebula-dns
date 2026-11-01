import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AdminRefreshTokenService } from './admin-refresh-token.service';
import { AdminRefreshToken } from './entities/admin-refresh-token.entity';
import { AdminSessionService } from '../admin/admin-session.service';

describe('AdminRefreshTokenService', () => {
  let service: AdminRefreshTokenService;
  let repository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'new-id', ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRefreshTokenService,
        {
          provide: getRepositoryToken(AdminRefreshToken),
          useValue: repository,
        },
        {
          provide: AdminSessionService,
          useValue: {
            blacklistToken: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(30),
          },
        },
      ],
    }).compile();

    service = module.get(AdminRefreshTokenService);
  });

  it('issues hashed refresh tokens', async () => {
    const issued = await service.issueToken({
      adminId: 'admin-1',
      sessionJti: 'jti-1',
      mfaVerified: true,
    });

    expect(issued.token).toBeDefined();
    expect(repository.save).toHaveBeenCalled();
    const saved = repository.save.mock.calls[0][0];
    expect(saved.tokenHash).toBe(service.hashToken(issued.token));
  });

  it('detects refresh token reuse and revokes family', async () => {
    const existing = {
      id: 'token-1',
      adminId: 'admin-1',
      tokenHash: service.hashToken('raw'),
      familyId: 'family-1',
      sessionJti: 'jti-old',
      mfaVerified: true,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
      replacedById: 'token-2',
    };

    repository.findOne.mockResolvedValue(existing);
    repository.find.mockResolvedValue([existing]);

    await expect(service.rotateRefreshToken('raw')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(repository.find).toHaveBeenCalled();
  });
});
