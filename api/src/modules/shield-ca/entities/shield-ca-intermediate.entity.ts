import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type ShieldCaScope = 'msp' | 'tenant';
export type ShieldCaStatus = 'active' | 'rotating' | 'revoked';

@Entity('shield_ca_intermediates')
export class ShieldCaIntermediate extends BaseEntity {
  /** MSP tenant id or client tenant id depending on scope */
  @Column({ name: 'owner_tenant_id', type: 'uuid' })
  ownerTenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'owner_tenant_id' })
  ownerTenant: Tenant;

  @Column({ type: 'varchar', length: 10 })
  scope: ShieldCaScope;

  @Column({ name: 'certificate_pem', type: 'text' })
  certificatePem: string;

  @Column({ name: 'private_key_encrypted', type: 'text' })
  privateKeyEncrypted: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 64 })
  serialNumber: string;

  @Column({ name: 'not_before', type: 'timestamptz' })
  notBefore: Date;

  @Column({ name: 'not_after', type: 'timestamptz' })
  notAfter: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: ShieldCaStatus;

  @Column({ name: 'subject_cn', type: 'varchar', length: 255 })
  subjectCn: string;
}
