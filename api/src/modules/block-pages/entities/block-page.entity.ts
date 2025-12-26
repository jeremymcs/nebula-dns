import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('block_pages')
export class BlockPage extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  // Branding
  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ name: 'background_color', type: 'varchar', length: 7, default: '#f3f4f6' })
  backgroundColor: string;

  @Column({ name: 'primary_color', type: 'varchar', length: 7, default: '#4f46e5' })
  primaryColor: string;

  @Column({ name: 'text_color', type: 'varchar', length: 7, default: '#1f2937' })
  textColor: string;

  // Content
  @Column({ type: 'varchar', length: 255, default: 'Access Blocked' })
  title: string;

  @Column({ type: 'text', default: "This website has been blocked by your organization's security policy." })
  message: string;

  @Column({ name: 'show_category', type: 'boolean', default: true })
  showCategory: boolean;

  @Column({ name: 'show_domain', type: 'boolean', default: true })
  showDomain: boolean;

  @Column({ name: 'show_timestamp', type: 'boolean', default: true })
  showTimestamp: boolean;

  @Column({ name: 'show_request_access', type: 'boolean', default: true })
  showRequestAccess: boolean;

  @Column({ name: 'custom_css', type: 'text', nullable: true })
  customCss: string;

  @Column({ name: 'custom_html', type: 'text', nullable: true })
  customHtml: string;

  // Footer
  @Column({ name: 'footer_text', type: 'varchar', length: 255, nullable: true })
  footerText: string;

  @Column({ name: 'support_email', type: 'varchar', length: 255, nullable: true })
  supportEmail: string;

  @Column({ name: 'support_url', type: 'text', nullable: true })
  supportUrl: string;
}
