import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_preferences')
@Index('IDX_notification_preferences_admin_channel', ['adminId', 'channel'], {
  unique: true,
  where: '"admin_id" IS NOT NULL',
})
@Index('IDX_notification_preferences_user_channel', ['userId', 'channel'], {
  unique: true,
  where: '"user_id" IS NOT NULL',
})
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ length: 64 })
  channel: string;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
