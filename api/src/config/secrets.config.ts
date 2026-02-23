// Nebula DNS - Secrets Manager Configuration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Legacy secrets configuration - maintained for backward compatibility
// New code should use SecretsService from @/modules/secrets

/**
 * @deprecated Use SecretsService from @/modules/secrets instead.
 * This file is maintained for backward compatibility only.
 *
 * Migration guide:
 * ```typescript
 * // Old way (deprecated):
 * import { SecretsManager, REQUIRED_SECRETS } from '@/config/secrets.config';
 * const manager = await SecretsManager.initialize();
 * const secret = await manager.getSecret('JWT_SECRET');
 *
 * // New way (recommended):
 * import { SecretsService, REQUIRED_SECRETS } from '@/modules/secrets';
 * @Injectable()
 * class MyService {
 *   constructor(private secretsService: SecretsService) {}
 *   async init() {
 *     const secret = await this.secretsService.getSecret('JWT_SECRET');
 *   }
 * }
 * ```
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('SecretsConfig');

/**
 * Supported secrets providers
 * @deprecated Use SecretsProvider from @/modules/secrets
 */
export enum SecretsProvider {
  ENV = 'env',
  VAULT = 'vault',
  AWS = 'aws',
}

/**
 * Configuration interface for secrets providers
 * @deprecated Use SecretsProviderConfig from @/modules/secrets
 */
export interface SecretsConfig {
  provider: SecretsProvider;
  vault?: {
    address: string;
    token?: string;
    roleId?: string;
    secretId?: string;
    namespace?: string;
    secretPath: string;
  };
  aws?: {
    region: string;
    secretName: string;
    versionStage?: string;
  };
}

/**
 * AWS Secrets Manager client wrapper
 */
async function getSecretFromAWS(
  secretName: string,
  region: string,
  versionStage?: string,
): Promise<Record<string, string> | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      SecretsManagerClient,
      GetSecretValueCommand,
    } = require('@aws-sdk/client-secrets-manager');

    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({
      SecretId: secretName,
      VersionStage: versionStage || 'AWSCURRENT',
    });

    const response = await client.send(command);

    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    }

    // Handle binary secrets
    if (response.SecretBinary) {
      const buff = Buffer.from(response.SecretBinary);
      return JSON.parse(buff.toString('utf-8'));
    }

    return undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`AWS Secrets Manager error: ${message}`);
    return undefined;
  }
}

/**
 * HashiCorp Vault client wrapper
 */
async function getSecretFromVault(
  path: string,
  address: string,
  token?: string,
  namespace?: string,
  roleId?: string,
  secretId?: string,
): Promise<Record<string, string> | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vault = require('node-vault');

    const vaultOptions: any = {
      endpoint: address,
      apiVersion: 'v1',
    };

    if (namespace) {
      vaultOptions.namespace = namespace;
    }

    const vaultClient = vault(vaultOptions);

    // Authenticate
    if (token) {
      vaultClient.token = token;
    } else if (roleId && secretId) {
      const authResult = await vaultClient.approleLogin({
        role_id: roleId,
        secret_id: secretId,
      });
      vaultClient.token = authResult.auth.client_token;
    }

    const result = await vaultClient.read(path);

    // Handle KV v2 format
    if (result.data && result.data.data) {
      return result.data.data;
    }

    // Handle KV v1 format
    if (result.data) {
      return result.data;
    }

    return undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Vault error: ${message}`);
    return undefined;
  }
}

/**
 * Legacy Secrets Manager class
 * @deprecated Use SecretsService from @/modules/secrets instead
 *
 * This class is maintained for backward compatibility with code that hasn't
 * migrated to the new SecretsService yet. New code should use the NestJS
 * injectable SecretsService for better testability and lifecycle management.
 */
export class SecretsManager {
  private static instance: SecretsManager;
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private allSecrets: Record<string, string> = {};
  private readonly cacheTtlMs: number;
  private isInitialized = false;

  private constructor(private config: SecretsConfig) {
    // Default 5 minute TTL, configurable via env
    this.cacheTtlMs = parseInt(
      process.env.SECRETS_CACHE_TTL_MS || '300000',
      10,
    );
  }

  /**
   * Initialize the SecretsManager singleton
   */
  static async initialize(config?: SecretsConfig): Promise<SecretsManager> {
    if (!SecretsManager.instance) {
      const defaultConfig: SecretsConfig = {
        provider:
          (process.env.SECRETS_PROVIDER as SecretsProvider) ||
          SecretsProvider.ENV,
        vault: {
          address: process.env.VAULT_ADDR || 'http://localhost:8200',
          token: process.env.VAULT_TOKEN,
          roleId: process.env.VAULT_ROLE_ID,
          secretId: process.env.VAULT_SECRET_ID,
          namespace: process.env.VAULT_NAMESPACE,
          secretPath: process.env.VAULT_SECRET_PATH || 'secret/data/nebuladns',
        },
        aws: {
          region: process.env.AWS_REGION || 'us-east-1',
          secretName: process.env.AWS_SECRET_NAME || 'nebuladns/production',
          versionStage: process.env.AWS_SECRET_VERSION_STAGE,
        },
      };

      SecretsManager.instance = new SecretsManager(config || defaultConfig);
      await SecretsManager.instance.loadSecrets();

      logger.log(
        `Secrets provider: ${SecretsManager.instance.config.provider}`,
      );
    }
    return SecretsManager.instance;
  }

  /**
   * Get the singleton instance (must call initialize first)
   */
  static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      throw new Error(
        'SecretsManager not initialized. Call initialize() first.',
      );
    }
    return SecretsManager.instance;
  }

  /**
   * Reset the singleton (for testing)
   */
  static reset(): void {
    SecretsManager.instance = undefined as any;
  }

  /**
   * Load all secrets from the configured provider
   */
  private async loadSecrets(): Promise<void> {
    switch (this.config.provider) {
      case SecretsProvider.AWS:
        const awsSecrets = await getSecretFromAWS(
          this.config.aws!.secretName,
          this.config.aws!.region,
          this.config.aws!.versionStage,
        );
        if (awsSecrets) {
          this.allSecrets = awsSecrets;
          logger.log(
            `Loaded ${Object.keys(awsSecrets).length} secrets from AWS`,
          );
        }
        break;

      case SecretsProvider.VAULT:
        const vaultConfig = this.config.vault!;
        const vaultSecrets = await getSecretFromVault(
          vaultConfig.secretPath,
          vaultConfig.address,
          vaultConfig.token,
          vaultConfig.namespace,
          vaultConfig.roleId,
          vaultConfig.secretId,
        );
        if (vaultSecrets) {
          this.allSecrets = vaultSecrets;
          logger.log(
            `Loaded ${Object.keys(vaultSecrets).length} secrets from Vault`,
          );
        }
        break;

      case SecretsProvider.ENV:
        // No pre-loading needed for env
        break;
    }

    this.isInitialized = true;
  }

  /**
   * Get a secret value
   */
  async getSecret(key: string): Promise<string | undefined> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    let value: string | undefined;

    switch (this.config.provider) {
      case SecretsProvider.ENV:
        value = process.env[key];
        break;

      case SecretsProvider.AWS:
      case SecretsProvider.VAULT:
        // First check loaded secrets, then fall back to env
        value = this.allSecrets[key] ?? process.env[key];
        break;
    }

    if (value) {
      this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
    }

    return value;
  }

  /**
   * Refresh all secrets from the provider
   */
  async refresh(): Promise<void> {
    this.clearCache();
    await this.loadSecrets();
    logger.log('Secrets refreshed');
  }

  /**
   * Clear the secrets cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if the manager is initialized
   */
  ready(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the current provider
   */
  getProvider(): SecretsProvider {
    return this.config.provider;
  }
}

/**
 * Required secrets for Nebula DNS
 * These secrets must be available at startup
 */
export const REQUIRED_SECRETS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MFA_ENCRYPTION_KEY',
  'SSO_ENCRYPTION_KEY',
  'SIEM_ENCRYPTION_KEY',
  'INTERNAL_SERVICE_KEY',
] as const;

/**
 * Type for required secret names
 */
export type RequiredSecretName = (typeof REQUIRED_SECRETS)[number];

/**
 * Validate that all required secrets are available
 * @throws Error in production if any required secret is missing
 */
export async function validateRequiredSecrets(): Promise<{
  valid: boolean;
  missing: string[];
}> {
  const manager = await SecretsManager.initialize();
  const missing: string[] = [];

  for (const secretName of REQUIRED_SECRETS) {
    const value = await manager.getSecret(secretName);
    if (!value || value.trim() === '') {
      missing.push(secretName);
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (missing.length > 0 && isProduction) {
    throw new Error(
      `Missing required secrets in production: ${missing.join(', ')}`,
    );
  }

  if (missing.length > 0) {
    logger.warn(`[DEV MODE] Missing secrets: ${missing.join(', ')}`);
  }

  return { valid: missing.length === 0, missing };
}
