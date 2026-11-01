import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { AgentInstallation } from './entities/agent-installation.entity';

export interface AgentAuthContext {
  agent: AgentInstallation;
  tenantId: string;
}

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(AgentInstallation)
    private readonly agentRepository: Repository<AgentInstallation>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceId =
      request.headers['x-device-id'] || request.headers['x-agent-device-id'];
    const authHeader = request.headers['authorization'];

    if (!deviceId || typeof deviceId !== 'string') {
      throw new UnauthorizedException('Missing X-Device-Id header');
    }
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing device credentials');
    }

    const secret = authHeader.slice(7);
    const agent = await this.agentRepository.findOne({
      where: { deviceId },
    });

    if (!agent?.deviceSecretHash) {
      throw new UnauthorizedException('Invalid device credentials');
    }

    const providedHash = createHash('sha256').update(secret).digest('hex');
    const expected = Buffer.from(agent.deviceSecretHash, 'utf8');
    const actual = Buffer.from(providedHash, 'utf8');
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new UnauthorizedException('Invalid device credentials');
    }

    request.agentAuth = {
      agent,
      tenantId: agent.tenantId,
    } satisfies AgentAuthContext;

    return true;
  }
}
