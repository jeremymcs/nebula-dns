// Nebula DNS - Secrets Manager Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Enterprise secrets management with AWS Secrets Manager and HashiCorp Vault support

import {
  Injectable,
  OnModuleInit,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

/**
 * Supported secrets providers
 */
export enum SecretsProvider {
  ENV = 'env',
  AWS = 'aws',
  VAULT = 'vault',
}

/**
 * Configuration for secrets providers
 */
export interface SecretsProviderConfig {
  provider: SecretsProvider;
  aws?: {
    region: string;
    secretName: string;
    versionStage?: string;
  };
  vault?: {
    address: string;
    token?: string;
    roleId?: string;
    secretId?: string;
    namespace?: string;
    secretPath: string;
    mountPath?: string;
  };
}

/**
 * Cached secret entry with TTL tracking
 */
interface CachedSecret {
  value: string;
  expiresAt: number;
  fetchedAt: number;
}

/**
 * Health check status for secrets provider
 */
export interface SecretsHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  provider: SecretsProvider;
  connected: boolean;
  lastRefreshTime: Date | null;
  lastRefreshStatus: 'success' | 'failure' | 'pending';
  cacheStats: {
    totalSecrets: number;
    expiredSecrets: number;
  };
  latencyMs?: number;
  error?: string;
}

/**
 * Result of a secret refresh operation
 */
export interface SecretRefreshResult {
  success: boolean;
  secretsRefreshed: string[];
  errors: Array<{ secret: string; error: string }>;
  refreshedAt: Date;
}

/**
 * Required secrets that must be validated at startup
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

export type RequiredSecretName = (typeof REQUIRED_SECRETS)[number];

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private readonly cache: Map<string, CachedSecret> = new Map();
  private readonly cacheTtlMs: number;
  private readonly refreshBufferMs: number;
  private config: SecretsProviderConfig;
  private lastRefreshTime: Date | null = null;
  private lastRefreshStatus: 'success' | 'failure' | 'pending' = 'pending';
  private refreshTimer: NodeJS.Timeout | null = null;
  private awsClient: any = null;
  private vaultClient: any = null;
  private allSecretsData: Record<string, string> = {};
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Default 5 minute TTL, configurable via env
    this.cacheTtlMs =
      parseInt(
        this.configService.get<string>('SECRETS_CACHE_TTL_MS', '300000'),
        10,
      ) || 300000;
    // Refresh 1 minute before expiration
    this.refreshBufferMs =
      parseInt(
        this.configService.get<string>('SECRETS_REFRESH_BUFFER_MS', '60000'),
        10,
      ) || 60000;

    this.initializeConfig();
  }

  /**
   * Initialize configuration from environment
   */
  private initializeConfig(): void {
    const providerStr = this.configService.get<string>(
      'SECRETS_PROVIDER',
      'env',
    );
    const provider = this.parseProvider(providerStr);

    this.config = {
      provider,
      aws: {
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
        secretName: this.configService.get<string>(
          'AWS_SECRET_NAME',
          'nebuladns/production',
        ),
        versionStage: this.configService.get<string>(
          'AWS_SECRET_VERSION_STAGE',
        ),
      },
      vault: {
        address: this.configService.get<string>(
          'VAULT_ADDR',
          'http://localhost:8200',
        ),
        token: this.configService.get<string>('VAULT_TOKEN'),
        roleId: this.configService.get<string>('VAULT_ROLE_ID'),
        secretId: this.configService.get<string>('VAULT_SECRET_ID'),
        namespace: this.configService.get<string>('VAULT_NAMESPACE'),
        secretPath: this.configService.get<string>(
          'VAULT_SECRET_PATH',
          'secret/data/nebuladns',
        ),
        mountPath: this.configService.get<string>('VAULT_MOUNT_PATH', 'secret'),
      },
    };

    this.logger.log(`Secrets provider configured: ${provider}`);
  }

  /**
   * Parse provider string to enum
   */
  private parseProvider(provider: string): SecretsProvider {
    switch (provider.toLowerCase()) {
      case 'aws':
        return SecretsProvider.AWS;
      case 'vault':
        return SecretsProvider.VAULT;
      case 'env':
      default:
        return SecretsProvider.ENV;
    }
  }

  /**
   * Module initialization - validate secrets connectivity
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing secrets manager...');

    try {
      // Initialize provider client
      await this.initializeProviderClient();

      // Load all secrets initially
      if (this.config.provider !== SecretsProvider.ENV) {
        await this.loadAllSecrets();
      }

      // Validate required secrets
      await this.validateRequiredSecrets();

      // Start automatic refresh timer
      this.startAutoRefresh();

      this.isInitialized = true;
      this.lastRefreshStatus = 'success';
      this.lastRefreshTime = new Date();

      this.logger.log('Secrets manager initialized successfully');
    } catch (error) {
      this.lastRefreshStatus = 'failure';
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Secrets manager initialization failed: ${message}`);

      // In production, fail fast
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new Error(`Secrets initialization failed: ${message}`);
      }

      // In development, log warning and continue with env fallback
      this.logger.warn(
        'Continuing with environment variable fallback in development mode',
      );
      this.isInitialized = true;
    }
  }

  /**
   * Initialize the appropriate provider client
   */
  private async initializeProviderClient(): Promise<void> {
    switch (this.config.provider) {
      case SecretsProvider.AWS:
        await this.initializeAwsClient();
        break;
      case SecretsProvider.VAULT:
        await this.initializeVaultClient();
        break;
      case SecretsProvider.ENV:
        // No initialization needed for env
        this.logger.log('Using environment variables for secrets');
        break;
    }
  }

  /**
   * Initialize AWS Secrets Manager client
   */
  private async initializeAwsClient(): Promise<void> {
    try {
      const {
        SecretsManagerClient,
        GetSecretValueCommand,
      } = require('@aws-sdk/client-secrets-manager');

      this.awsClient = new SecretsManagerClient({
        region: this.config.aws!.region,
      });

      // Test connectivity
      this.logger.log(
        `AWS Secrets Manager client initialized for region: ${this.config.aws!.region}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize AWS Secrets Manager: ${message}`);
    }
  }

  /**
   * Initialize HashiCorp Vault client
   */
  private async initializeVaultClient(): Promise<void> {
    try {
      const vault = require('node-vault');

      const vaultOptions: any = {
        endpoint: this.config.vault!.address,
        apiVersion: 'v1',
      };

      // Add namespace if specified
      if (this.config.vault!.namespace) {
        vaultOptions.namespace = this.config.vault!.namespace;
      }

      // Authentication
      if (this.config.vault!.token) {
        vaultOptions.token = this.config.vault!.token;
      }

      this.vaultClient = vault(vaultOptions);

      // If using AppRole authentication
      if (this.config.vault!.roleId && this.config.vault!.secretId) {
        const authResult = await this.vaultClient.approleLogin({
          role_id: this.config.vault!.roleId,
          secret_id: this.config.vault!.secretId,
        });
        this.vaultClient.token = authResult.auth.client_token;
        this.logger.log('Vault AppRole authentication successful');
      }

      // Test connectivity
      await this.vaultClient.health();
      this.logger.log(
        `Vault client initialized for: ${this.config.vault!.address}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize Vault client: ${message}`);
    }
  }

  /**
   * Load all secrets from the provider
   */
  private async loadAllSecrets(): Promise<void> {
    switch (this.config.provider) {
      case SecretsProvider.AWS:
        await this.loadAllSecretsFromAws();
        break;
      case SecretsProvider.VAULT:
        await this.loadAllSecretsFromVault();
        break;
    }
  }

  /**
   * Load all secrets from AWS Secrets Manager
   */
  private async loadAllSecretsFromAws(): Promise<void> {
    try {
      const {
        GetSecretValueCommand,
      } = require('@aws-sdk/client-secrets-manager');

      const command = new GetSecretValueCommand({
        SecretId: this.config.aws!.secretName,
        VersionStage: this.config.aws!.versionStage || 'AWSCURRENT',
      });

      const response = await this.awsClient.send(command);

      if (response.SecretString) {
        this.allSecretsData = JSON.parse(response.SecretString);
        this.logger.log(
          `Loaded ${Object.keys(this.allSecretsData).length} secrets from AWS`,
        );

        // Cache all loaded secrets
        const now = Date.now();
        for (const [key, value] of Object.entries(this.allSecretsData)) {
          this.cache.set(key, {
            value: value as string,
            expiresAt: now + this.cacheTtlMs,
            fetchedAt: now,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load secrets from AWS: ${message}`);
    }
  }

  /**
   * Load all secrets from HashiCorp Vault
   */
  private async loadAllSecretsFromVault(): Promise<void> {
    try {
      const result = await this.vaultClient.read(this.config.vault!.secretPath);

      if (result.data && result.data.data) {
        this.allSecretsData = result.data.data;
      } else if (result.data) {
        this.allSecretsData = result.data;
      }

      this.logger.log(
        `Loaded ${Object.keys(this.allSecretsData).length} secrets from Vault`,
      );

      // Cache all loaded secrets
      const now = Date.now();
      for (const [key, value] of Object.entries(this.allSecretsData)) {
        this.cache.set(key, {
          value: value as string,
          expiresAt: now + this.cacheTtlMs,
          fetchedAt: now,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load secrets from Vault: ${message}`);
    }
  }

  /**
   * Validate that all required secrets are accessible
   */
  private async validateRequiredSecrets(): Promise<void> {
    const missingSecrets: string[] = [];
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    for (const secretName of REQUIRED_SECRETS) {
      const value = await this.getSecret(secretName);
      if (!value || value.trim() === '') {
        missingSecrets.push(secretName);
      }
    }

    if (missingSecrets.length > 0) {
      const message = `Missing required secrets: ${missingSecrets.join(', ')}`;

      if (isProduction) {
        throw new Error(message);
      } else {
        this.logger.warn(
          `[DEV MODE] ${message} - using fallback values where possible`,
        );
      }
    } else {
      this.logger.log('All required secrets validated successfully');
    }
  }

  /**
   * Start automatic refresh timer
   */
  private startAutoRefresh(): void {
    if (this.config.provider === SecretsProvider.ENV) {
      return; // No refresh needed for env
    }

    // Calculate refresh interval (TTL - buffer)
    const refreshInterval = Math.max(
      this.cacheTtlMs - this.refreshBufferMs,
      60000,
    ); // Minimum 1 minute

    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshAllSecrets();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Auto-refresh failed: ${message}`);
      }
    }, refreshInterval);

    this.logger.log(
      `Auto-refresh scheduled every ${Math.floor(refreshInterval / 1000)}s`,
    );
  }

  /**
   * Get a secret value with caching
   */
  async getSecret(key: string): Promise<string | undefined> {
    // Check cache first (regardless of provider)
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Get from appropriate provider
    let value: string | undefined;

    switch (this.config.provider) {
      case SecretsProvider.ENV:
        value = this.getFromEnv(key);
        break;
      case SecretsProvider.AWS:
        value = await this.getFromAws(key);
        break;
      case SecretsProvider.VAULT:
        value = await this.getFromVault(key);
        break;
    }

    // Cache the value if found
    if (value !== undefined) {
      const now = Date.now();
      this.cache.set(key, {
        value,
        expiresAt: now + this.cacheTtlMs,
        fetchedAt: now,
      });
    }

    return value;
  }

  /**
   * Get secret from environment variables
   */
  private getFromEnv(key: string): string | undefined {
    return process.env[key];
  }

  /**
   * Get secret from AWS Secrets Manager
   */
  private async getFromAws(key: string): Promise<string | undefined> {
    // First check if we have it in the loaded secrets
    if (this.allSecretsData[key]) {
      return this.allSecretsData[key];
    }

    // Fall back to env if not in AWS
    return this.getFromEnv(key);
  }

  /**
   * Get secret from HashiCorp Vault
   */
  private async getFromVault(key: string): Promise<string | undefined> {
    // First check if we have it in the loaded secrets
    if (this.allSecretsData[key]) {
      return this.allSecretsData[key];
    }

    // Fall back to env if not in Vault
    return this.getFromEnv(key);
  }

  /**
   * Get a required secret - throws if not found in production
   */
  async getRequiredSecret(key: RequiredSecretName): Promise<string> {
    const value = await this.getSecret(key);
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    if (!value || value.trim() === '') {
      if (isProduction) {
        throw new ServiceUnavailableException(
          `Required secret ${key} is not available`,
        );
      }

      // Return a development placeholder
      this.logger.warn(
        `[DEV MODE] Using placeholder for missing secret: ${key}`,
      );
      return `dev-placeholder-${key}-${crypto.randomBytes(8).toString('hex')}`;
    }

    return value;
  }

  /**
   * Refresh all secrets from the provider
   */
  async refreshAllSecrets(): Promise<SecretRefreshResult> {
    this.logger.log('Starting secrets refresh...');
    const result: SecretRefreshResult = {
      success: true,
      secretsRefreshed: [],
      errors: [],
      refreshedAt: new Date(),
    };

    try {
      if (this.config.provider === SecretsProvider.ENV) {
        // For env provider, just clear cache to force re-read
        this.clearCache();
        result.secretsRefreshed = [...REQUIRED_SECRETS];
      } else {
        // Reload all secrets from provider
        await this.loadAllSecrets();
        result.secretsRefreshed = Object.keys(this.allSecretsData);
      }

      this.lastRefreshTime = new Date();
      this.lastRefreshStatus = 'success';

      // Emit refresh event
      this.eventEmitter.emit('secrets.refreshed', {
        provider: this.config.provider,
        secretsCount: result.secretsRefreshed.length,
        timestamp: result.refreshedAt,
      });

      this.logger.log(
        `Secrets refresh completed: ${result.secretsRefreshed.length} secrets`,
      );
    } catch (error) {
      result.success = false;
      this.lastRefreshStatus = 'failure';
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({ secret: '*', error: message });
      this.logger.error(`Secrets refresh failed: ${message}`);
    }

    return result;
  }

  /**
   * Refresh a specific secret
   */
  async refreshSecret(key: string): Promise<SecretRefreshResult> {
    const result: SecretRefreshResult = {
      success: true,
      secretsRefreshed: [],
      errors: [],
      refreshedAt: new Date(),
    };

    try {
      // Remove from cache
      this.cache.delete(key);

      // Reload if using external provider
      if (this.config.provider !== SecretsProvider.ENV) {
        await this.loadAllSecrets();
      }

      // Get the refreshed value
      const value = await this.getSecret(key);
      if (value) {
        result.secretsRefreshed.push(key);
      } else {
        result.errors.push({ secret: key, error: 'Secret not found' });
        result.success = false;
      }
    } catch (error) {
      result.success = false;
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({ secret: key, error: message });
    }

    return result;
  }

  /**
   * Clear the entire secrets cache
   */
  clearCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    this.logger.log(`Secrets cache cleared (${cacheSize} entries)`);
  }

  /**
   * Get health status of the secrets provider
   */
  async getHealthStatus(): Promise<SecretsHealthStatus> {
    const startTime = Date.now();
    const status: SecretsHealthStatus = {
      status: 'healthy',
      provider: this.config.provider,
      connected: false,
      lastRefreshTime: this.lastRefreshTime,
      lastRefreshStatus: this.lastRefreshStatus,
      cacheStats: {
        totalSecrets: this.cache.size,
        expiredSecrets: this.countExpiredSecrets(),
      },
    };

    try {
      // Test connectivity
      switch (this.config.provider) {
        case SecretsProvider.ENV:
          status.connected = true;
          break;
        case SecretsProvider.AWS:
          status.connected = await this.testAwsConnectivity();
          break;
        case SecretsProvider.VAULT:
          status.connected = await this.testVaultConnectivity();
          break;
      }

      status.latencyMs = Date.now() - startTime;

      if (!status.connected) {
        status.status = 'unhealthy';
        status.error = 'Provider connectivity check failed';
      } else if (this.lastRefreshStatus === 'failure') {
        status.status = 'degraded';
        status.error = 'Last refresh operation failed';
      }
    } catch (error) {
      status.status = 'unhealthy';
      status.connected = false;
      status.error = error instanceof Error ? error.message : 'Unknown error';
      status.latencyMs = Date.now() - startTime;
    }

    return status;
  }

  /**
   * Test AWS Secrets Manager connectivity
   */
  private async testAwsConnectivity(): Promise<boolean> {
    if (!this.awsClient) {
      return false;
    }

    try {
      const {
        DescribeSecretCommand,
      } = require('@aws-sdk/client-secrets-manager');

      const command = new DescribeSecretCommand({
        SecretId: this.config.aws!.secretName,
      });

      await this.awsClient.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test HashiCorp Vault connectivity
   */
  private async testVaultConnectivity(): Promise<boolean> {
    if (!this.vaultClient) {
      return false;
    }

    try {
      await this.vaultClient.health();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Count expired secrets in cache
   */
  private countExpiredSecrets(): number {
    const now = Date.now();
    let count = 0;
    for (const entry of this.cache.values()) {
      if (entry.expiresAt <= now) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get the current provider
   */
  getProvider(): SecretsProvider {
    return this.config.provider;
  }

  /**
   * Check if the service is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get cache TTL configuration
   */
  getCacheTtl(): number {
    return this.cacheTtlMs;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.clearCache();
  }
}
