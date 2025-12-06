import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type SsoProviderType = 'saml' | 'oidc';
export type UserRole = 'owner' | 'admin' | 'analyst' | 'readonly';

@Entity('sso_configurations')
export class SsoConfiguration extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @OneToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'provider_type', type: 'varchar', length: 20 })
  providerType: SsoProviderType;

  @Column({ name: 'is_enabled', default: false })
  isEnabled: boolean;

  // SAML Settings
  @Column({ name: 'saml_entity_id', length: 500, nullable: true })
  samlEntityId: string;

  @Column({ name: 'saml_sso_url', length: 500, nullable: true })
  samlSsoUrl: string;

  @Column({ name: 'saml_slo_url', length: 500, nullable: true })
  samlSloUrl: string;

  @Column({ name: 'saml_certificate', type: 'text', nullable: true })
  samlCertificate: string;

  @Column({ name: 'saml_signing_cert', type: 'text', nullable: true })
  samlSigningCert: string;

  @Column({ name: 'saml_signing_key_encrypted', type: 'text', nullable: true })
  samlSigningKeyEncrypted: string;

  // OIDC Settings
  @Column({ name: 'oidc_issuer', length: 500, nullable: true })
  oidcIssuer: string;

  @Column({ name: 'oidc_client_id', length: 255, nullable: true })
  oidcClientId: string;

  @Column({ name: 'oidc_client_secret_encrypted', length: 500, nullable: true })
  oidcClientSecretEncrypted: string;

  @Column({ name: 'oidc_authorization_url', length: 500, nullable: true })
  oidcAuthorizationUrl: string;

  @Column({ name: 'oidc_token_url', length: 500, nullable: true })
  oidcTokenUrl: string;

  @Column({ name: 'oidc_userinfo_url', length: 500, nullable: true })
  oidcUserinfoUrl: string;

  @Column({ name: 'oidc_scopes', length: 255, default: 'openid profile email' })
  oidcScopes: string;

  // Common Settings
  @Column({ name: 'auto_provision_users', default: true })
  autoProvisionUsers: boolean;

  @Column({ name: 'default_role', type: 'varchar', length: 20, default: 'readonly' })
  defaultRole: UserRole;

  @Column({ name: 'domain_restriction', length: 255, nullable: true })
  domainRestriction: string;

  @Column({ name: 'attribute_mapping', type: 'jsonb', default: {} })
  attributeMapping: {
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
}
