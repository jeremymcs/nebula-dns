import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * QueryBundle - Available DNS query bundles that MSPs can purchase
 * These are predefined packages of DNS queries that MSPs buy
 */
@Entity('query_bundles')
export class QueryBundle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ name: 'query_count', type: 'bigint' })
  queryCount: number; // Number of queries included

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Price in USD

  @Column({
    name: 'price_per_million',
    type: 'decimal',
    precision: 10,
    scale: 4,
  })
  pricePerMillion: number; // Effective price per million queries

  @Column({ name: 'validity_days', type: 'int', default: 30 })
  validityDays: number; // How long the bundle is valid after purchase

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({
    name: 'stripe_price_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripePriceId: string;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
