/**
 * Flux Shield - DoH Authentication Guard
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, timingSafeEqual } from 'crypto';
import { Location } from '../locations/entities/location.entity';
import { LocationsService } from '../locations/locations.service';
import { AgentInstallation } from '../agents/entities/agent-installation.entity';

@Injectable()
export class DoHAuthGuard implements CanActivate {
  private readonly logger = new Logger(DoHAuthGuard.name);

  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(AgentInstallation)
    private agentRepository: Repository<AgentInstallation>,
    private readonly locationsService: LocationsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const locationIdHeader = request.headers['x-location-id'];
    const deviceIdHeader = request.headers['x-agent-device-id'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.slice(7);
    const parts = token.split(':');
    if (parts.length < 2) {
      throw new UnauthorizedException('Invalid token format');
    }

    const tenantId = parts[0];
    const secret = parts.slice(1).join(':');

    if (deviceIdHeader && typeof deviceIdHeader === 'string') {
      const agent = await this.agentRepository.findOne({
        where: { tenantId, deviceId: deviceIdHeader },
      });
      if (!agent?.dohTokenHash) {
        throw new UnauthorizedException('Invalid agent credentials');
      }
      if (!this.secretMatches(agent.dohTokenHash, secret)) {
        throw new UnauthorizedException('Invalid agent credentials');
      }

      const locationId = agent.locationId || locationIdHeader;
      if (!locationId) {
        throw new UnauthorizedException('Agent is not assigned to a location');
      }

      request.dohAuth = {
        tenantId,
        locationId,
        token,
        deviceId: deviceIdHeader,
      };
      return true;
    }

    if (!locationIdHeader) {
      throw new UnauthorizedException('Missing X-Location-ID header');
    }

    const validation = await this.locationsService.validateToken(secret);
    if (
      !validation.valid ||
      validation.tenantId !== tenantId ||
      validation.locationId !== locationIdHeader
    ) {
      const location = await this.locationRepository.findOne({
        where: { id: locationIdHeader, tenantId },
      });
      if (!location) {
        throw new UnauthorizedException('Invalid location');
      }
      throw new UnauthorizedException('Invalid location token');
    }

    request.dohAuth = {
      tenantId,
      locationId: locationIdHeader,
      token,
    };

    return true;
  }

  private secretMatches(expectedHash: string, secret: string): boolean {
    const actualHash = createHash('sha256').update(secret).digest('hex');
    const expected = Buffer.from(expectedHash, 'utf8');
    const actual = Buffer.from(actualHash, 'utf8');
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
