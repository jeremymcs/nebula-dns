/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * API Key Scopes Decorator
 */

import { SetMetadata } from '@nestjs/common';
import { ApiKeyScope } from '@/modules/api-keys/entities/api-key.entity';
import { API_KEY_SCOPES_KEY } from '../guards/api-key.guard';

/**
 * Decorator to specify required API key scopes for an endpoint
 * @param scopes - Array of required scopes
 */
export const ApiKeyScopes = (...scopes: ApiKeyScope[]) =>
  SetMetadata(API_KEY_SCOPES_KEY, scopes);
