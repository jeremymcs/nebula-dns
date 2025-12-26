import { Entity, Column, OneToMany } from 'typeorm';
import { TenantScopedEntity } from '@/common/entities/base.entity';
import { CustomListEntry } from './custom-list-entry.entity';

export type ListType = 'allowlist' | 'blocklist';

@Entity('custom_lists')
export class CustomList extends TenantScopedEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20 })
  type: ListType;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ name: 'entry_count', type: 'int', default: 0 })
  entryCount: number;

  @OneToMany(() => CustomListEntry, (entry) => entry.list)
  entries: CustomListEntry[];
}
