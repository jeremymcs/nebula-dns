import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Location } from './location.entity';

@Entity('location_tokens')
export class LocationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId: string;

  @Column({ name: 'token_hash', length: 255 })
  @Exclude()
  tokenHash: string;

  @Column({ name: 'token_prefix', length: 12 })
  tokenPrefix: string;

  @Column({ length: 255, nullable: true })
  label: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Location, (location) => location.tokens)
  @JoinColumn({ name: 'location_id' })
  location: Location;
}
