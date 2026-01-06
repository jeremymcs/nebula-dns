import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiKey } from './api-key.entity';

@Entity('api_key_usage')
export class ApiKeyUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'api_key_id', type: 'uuid' })
  apiKeyId: string;

  @ManyToOne(() => ApiKey)
  @JoinColumn({ name: 'api_key_id' })
  apiKey: ApiKey;

  @Column({ type: 'varchar', length: 255 })
  endpoint: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number;

  @Column({ name: 'response_time_ms', type: 'int', nullable: true })
  responseTimeMs: number;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
