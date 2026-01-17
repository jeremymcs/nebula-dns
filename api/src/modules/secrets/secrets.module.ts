// Nebula DNS - Secrets Manager Module
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Global module providing secrets management with AWS/Vault/env support

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SecretsService } from './secrets.service';
import {
  SecretsController,
  SecretsHealthController,
} from './secrets.controller';

/**
 * SecretsModule provides centralized secrets management for the application.
 *
 * Features:
 * - Multi-provider support (AWS Secrets Manager, HashiCorp Vault, env vars)
 * - Automatic secret caching with configurable TTL
 * - Automatic refresh before expiration
 * - Hot reload without restart via admin endpoints
 * - Health checks for Kubernetes probes
 * - Startup validation of required secrets
 *
 * Configuration (via environment variables):
 * - SECRETS_PROVIDER: 'env' | 'aws' | 'vault' (default: 'env')
 * - SECRETS_CACHE_TTL_MS: Cache TTL in milliseconds (default: 300000 = 5 min)
 * - SECRETS_REFRESH_BUFFER_MS: Time before expiry to refresh (default: 60000)
 *
 * AWS Configuration:
 * - AWS_REGION: AWS region (default: 'us-east-1')
 * - AWS_SECRET_NAME: Secret name in Secrets Manager
 * - AWS_SECRET_VERSION_STAGE: Version stage (default: 'AWSCURRENT')
 *
 * Vault Configuration:
 * - VAULT_ADDR: Vault server address (default: 'http://localhost:8200')
 * - VAULT_TOKEN: Authentication token
 * - VAULT_ROLE_ID: AppRole role ID (alternative to token)
 * - VAULT_SECRET_ID: AppRole secret ID (alternative to token)
 * - VAULT_NAMESPACE: Vault namespace (optional)
 * - VAULT_SECRET_PATH: Path to secrets (default: 'secret/data/nebuladns')
 * - VAULT_MOUNT_PATH: Mount path (default: 'secret')
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private secretsService: SecretsService) {}
 *
 *   async doSomething() {
 *     const secret = await this.secretsService.getSecret('MY_SECRET');
 *     // or for required secrets that must exist:
 *     const required = await this.secretsService.getRequiredSecret('JWT_SECRET');
 *   }
 * }
 * ```
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      // Use wildcards for event matching
      wildcard: true,
      // Events are emitted to all listeners
      delimiter: '.',
      // Unlimited listeners
      maxListeners: 0,
      // Don't throw on missing event handlers
      ignoreErrors: false,
    }),
  ],
  controllers: [SecretsController, SecretsHealthController],
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
