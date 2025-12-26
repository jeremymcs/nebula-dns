import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { CustomList } from './custom-list.entity';

export type EntryType = 'exact' | 'wildcard';

@Entity('custom_list_entries')
export class CustomListEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'list_id', type: 'uuid' })
  listId: string;

  @Column({ type: 'varchar', length: 255 })
  domain: string;

  @Column({ type: 'varchar', length: 20, default: 'exact' })
  type: EntryType;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CustomList, (list) => list.entries)
  @JoinColumn({ name: 'list_id' })
  list: CustomList;
}
