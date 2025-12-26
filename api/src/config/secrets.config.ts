/**
 * SafeDNS - Enterprise DNS Security Platform
 * Secrets Management Configuration
 * 
 * Supports: Environment variables, HashiCorp Vault, AWS Secrets Manager
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('SecretsManager');

export enum SecretsProvider {
  ENV = 'env',
  VAULT = 'vault',
  AWS = 'aws',
}

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
 * Secrets Manager - Abstract interface for secret retrieval
 */
export class SecretsManager {
  private static instance: SecretsManager;
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  private constructor(private config: SecretsConfig) {}

  static async initialize(config?: SecretsConfig): Promise<SecretsManager> {
    if (!SecretsManager.instance) {
      const defaultConfig: SecretsConfig = {
        provider: (process.env.SECRETS_PROVIDER as SecretsProvider) || SecretsProvider.ENV,
        vault: {
          address: process.env.VAULT_ADDR || 'http://localhost:8200',
          token: process.env.VAULT_TOKEN,
          roleId: process.env.VAULT_ROLE_ID,
          secretId: process.env.VAULT_SECRET_ID,
          namespace: process.env.VAULT_NAMESPACE,
          secretPath: process.env.VAULT_SECRET_PATH || 'secret/data/safedns',
        },
        aws: {
          region: process.env.AWS_REGION || 'us-east-1',
          secretName: process.env.AWS_SECRET_NAME || 'safedns/production',
        },
      };

      SecretsManager.instance = new SecretsManager(config || defaultConfig);
      logger.log(`Secrets provider: ${SecretsManager.instance.config.provider}`);
    }
    return SecretsManager.instance;
  }

  static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      throw new Error('SecretsManager not initialized. Call initialize() first.');
    }
    return SecretsManager.instance;
  }

  async getSecret(key: string): Promise<string | undefined> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    let value: string | undefined;

    switch (this.config.provider) {
      case SecretsProvider.ENV:
        value = this.getFromEnv(key);
        break;
      case SecretsProvider.VAULT:
        value = await this.getFromVault(key);
        break;
      case SecretsProvider.AWS:
        value = await this.getFromAws(key);
        break;
    }

    if (value) {
      this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
    }

    return value;
  }

  private getFromEnv(key: string): string | undefined {
    return process.env[key];
  }

  private async getFromVault(key: string): Promise<string | undefined> {
    try {
      const vault = this.config.vault!;
      const url = `${vault.address}/v1/${vault.secretPath}`;
      
      const response = await fetch(url, {
        headers: {
          'X-Vault-Token': vault.token || '',
          ...(vault.namespace && { 'X-Vault-Namespace': vault.namespace }),
        },
      });

      if (!response.ok) {
        logger.error(`Vault request failed: ${response.status}`);
        return undefined;
      }

      const data = await response.json();
      return data.data?.data?.[key];
    } catch (error) {
      logger.error(`Vault error: ${error}`);
      return undefined;
    }
  }

  private async getFromAws(key: string): Promise<string | undefined> {
    try {
      // AWS SDK v3 would be used here
      logger.warn('AWS Secrets Manager requires aws-sdk installation');
      return process.env[key]; // Fallback to env
    } catch (error) {
      logger.error(`AWS Secrets Manager error: ${error}`);
      return undefined;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Required secrets for SafeDNS
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

