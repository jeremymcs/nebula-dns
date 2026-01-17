// Nebula DNS - SSO Configuration Entity
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type SsoProviderType = 'saml' | 'oidc';
export type UserRole = 'owner' | 'admin' | 'analyst' | 'readonly';

@Entity('sso_configurations')
export class SsoConfiguration extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @OneToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'provider_type', type: 'varchar', length: 20 })
  providerType: SsoProviderType;

  @Column({ name: 'is_enabled', type: 'boolean', default: false })
  isEnabled: boolean;

  // SAML Settings
  @Column({
    name: 'saml_entity_id',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  samlEntityId: string | null;

  @Column({
    name: 'saml_sso_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  samlSsoUrl: string | null;

  @Column({
    name: 'saml_slo_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  samlSloUrl: string | null;

  @Column({ name: 'saml_certificate', type: 'text', nullable: true })
  samlCertificate: string | null;

  @Column({ name: 'saml_signing_cert', type: 'text', nullable: true })
  samlSigningCert: string | null;

  @Column({ name: 'saml_signing_key_encrypted', type: 'text', nullable: true })
  samlSigningKeyEncrypted: string | null;

  @Column({ name: 'saml_sign_requests', type: 'boolean', default: true })
  samlSignRequests: boolean;

  // Previous signing certificate for graceful key rotation (24-hour grace period)
  @Column({ name: 'saml_previous_signing_cert', type: 'text', nullable: true })
  samlPreviousSigningCert: string | null;

  @Column({
    name: 'saml_previous_cert_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  samlPreviousCertExpiresAt: Date | null;

  // OIDC Settings
  @Column({ name: 'oidc_issuer', type: 'varchar', length: 500, nullable: true })
  oidcIssuer: string | null;

  @Column({
    name: 'oidc_client_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  oidcClientId: string | null;

  @Column({
    name: 'oidc_client_secret_encrypted',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  oidcClientSecretEncrypted: string | null;

  @Column({
    name: 'oidc_authorization_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  oidcAuthorizationUrl: string | null;

  @Column({
    name: 'oidc_token_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  oidcTokenUrl: string | null;

  @Column({
    name: 'oidc_userinfo_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  oidcUserinfoUrl: string | null;

  @Column({
    name: 'oidc_scopes',
    type: 'varchar',
    length: 255,
    default: 'openid profile email',
  })
  oidcScopes: string;

  @Column({
    name: 'pkce_required',
    type: 'boolean',
    default: true,
  })
  pkceRequired: boolean;

  // Common Settings
  @Column({ name: 'auto_provision_users', type: 'boolean', default: true })
  autoProvisionUsers: boolean;

  @Column({
    name: 'default_role',
    type: 'varchar',
    length: 20,
    default: 'readonly',
  })
  defaultRole: UserRole;

  @Column({
    name: 'domain_restriction',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  domainRestriction: string | null;

  @Column({ name: 'attribute_mapping', type: 'jsonb', default: '{}' })
  attributeMapping: Record<string, string>;
}
