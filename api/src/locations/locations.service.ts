import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationsRepository: Repository<Location>,
  ) {}

  async findAll(tenantId: string): Promise<Location[]> {
    return this.locationsRepository.find({
      where: { tenant_id: tenantId },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Location> {
    const location = await this.locationsRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async create(tenantId: string, createLocationDto: CreateLocationDto): Promise<any> {
    // Generate DoH token
    const dohToken = 'safedns_' + crypto.randomBytes(32).toString('hex');
    const dohTokenHash = await bcrypt.hash(dohToken, 10);

    // Generate DoT certificate (simplified - in production use proper CA)
    const { cert, key } = this.generateDoTCertificate();

    const location = this.locationsRepository.create({
      tenant_id: tenantId,
      name: createLocationDto.name,
      description: createLocationDto.description,
      dohTokenHash,
      dohTokenIssuedAt: new Date(),
      dotCertSerialNumber: this.extractCertSerial(cert),
      dotCertIssuedAt: new Date(),
      dotCertExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'active',
    });

    const saved = await this.locationsRepository.save(location);

    return {
      ...saved,
      dohToken, // Only returned on creation
      dotCertPem: cert,
      dotCertKeyPem: key,
    };
  }

  async rotateDoHToken(id: string, tenantId: string): Promise<any> {
    const location = await this.findOne(id, tenantId);
    const newToken = 'safedns_' + crypto.randomBytes(32).toString('hex');
    const newTokenHash = await bcrypt.hash(newToken, 10);

    location.dohTokenHash = newTokenHash;
    location.dohTokenIssuedAt = new Date();
    await this.locationsRepository.save(location);

    return {
      dohToken: newToken,
      dohTokenIssuedAt: location.dohTokenIssuedAt,
    };
  }

  private generateDoTCertificate(): { cert: string; key: string } {
    // Simplified - in production use proper CA and certificate generation
    // This is a placeholder
    return {
      cert: '-----BEGIN CERTIFICATE-----\nPLACEHOLDER\n-----END CERTIFICATE-----',
      key: '-----BEGIN PRIVATE KEY-----\nPLACEHOLDER\n-----END PRIVATE KEY-----',
    };
  }

  private extractCertSerial(cert: string): string {
    // Simplified - extract serial from certificate
    return crypto.randomBytes(16).toString('hex');
  }
}
