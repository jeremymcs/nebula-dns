// Nebula DNS - MSP Tier Guard
// Guard that checks if the current tenant has MSP tier (US-006)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Guard that ensures the current user's tenant has MSP tier.
 * Returns 403 Forbidden for non-MSP tier tenants.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, MspTierGuard)
 * @Controller('msp/clients')
 * export class MspClientsController { ... }
 */
@Injectable()
export class MspTierGuard implements CanActivate {
  private readonly logger = new Logger(MspTierGuard.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.tenantId) {
      this.logger.warn('MspTierGuard: No tenant ID found in request');
      throw new ForbiddenException('No tenant context found');
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: user.tenantId },
      select: ['id', 'tier', 'name'],
    });

    if (!tenant) {
      this.logger.warn(`MspTierGuard: Tenant ${user.tenantId} not found`);
      throw new ForbiddenException('Tenant not found');
    }

    if (tenant.tier !== 'msp') {
      this.logger.debug(
        `MspTierGuard: Tenant ${tenant.name} (${tenant.id}) has tier '${tenant.tier}', MSP required`,
      );
      throw new ForbiddenException(
        'This feature requires an MSP tier subscription. Please upgrade your plan to access MSP features.',
      );
    }

    // Attach tenant to request for use in controllers/services
    request.tenant = tenant;

    return true;
  }
}
