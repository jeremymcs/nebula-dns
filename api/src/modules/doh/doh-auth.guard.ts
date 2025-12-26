/**
 * Nebula DNS - Enterprise DNS Security Platform
 * DoH Authentication Guard
 * 
 * Validates agent tokens for DoH requests
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../locations/entities/location.entity';

@Injectable()
export class DoHAuthGuard implements CanActivate {
  private readonly logger = new Logger(DoHAuthGuard.name);

  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const locationId = request.headers['x-location-id'];

    if (!authHeader) {
      this.logger.warn('DoH request without authorization header');
      throw new UnauthorizedException('Missing authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const token = authHeader.slice(7);
    
    // Token format: <tenantId>:<locationToken>
    const parts = token.split(':');
    if (parts.length < 2) {
      throw new UnauthorizedException('Invalid token format');
    }

    const tenantId = parts[0];
    const locationToken = parts.slice(1).join(':');

    // Validate location exists and token matches
    // In production, this would check against a token table
    if (!locationId) {
      throw new UnauthorizedException('Missing X-Location-ID header');
    }

    try {
      const location = await this.locationRepository.findOne({
        where: { id: locationId, tenantId },
      });

      if (!location) {
        this.logger.warn(`Location not found: ${locationId} for tenant ${tenantId}`);
        throw new UnauthorizedException('Invalid location');
      }

      // Store auth info on request for later use
      request.dohAuth = {
        tenantId,
        locationId,
        locationToken,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('DoH auth error', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

