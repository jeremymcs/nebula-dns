import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('mobile_devices')
@Index('IDX_mobile_devices_admin_external', ['adminId', 'externalDeviceId'], {
  unique: true,
  where: '"admin_id" IS NOT NULL AND "revoked_at" IS NULL',
})
@Index('IDX_mobile_devices_user_external', ['userId', 'externalDeviceId'], {
  unique: true,
  where: '"user_id" IS NOT NULL AND "revoked_at" IS NULL',
})
export class MobileDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_device_id', type: 'varchar', length: 128 })
  externalDeviceId: string;

  @Column({ type: 'varchar', length: 32 })
  platform: string;

  @Column({ name: 'app_version', type: 'varchar', length: 64, nullable: true })
  appVersion: string | null;

  @Column({ name: 'device_name', type: 'varchar', length: 255, nullable: true })
  deviceName: string | null;

  @Column({
    name: 'expo_push_token',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  expoPushToken: string | null;

  @Column({ name: 'is_jailbroken', default: false })
  isJailbroken: boolean;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'last_refresh_jti', type: 'varchar', length: 64, nullable: true })
  lastRefreshJti: string | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
