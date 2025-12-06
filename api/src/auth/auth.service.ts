import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { email, status: 'active' },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      await this.usersRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
    };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }
}
