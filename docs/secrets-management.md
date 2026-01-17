# Secrets Management

This document describes the secrets management system for Nebula DNS (US-030).

## Overview

Nebula DNS supports multiple secrets providers for managing sensitive configuration:

1. **Environment Variables** (default) - Secrets stored in environment variables
2. **AWS Secrets Manager** - Secrets stored in AWS Secrets Manager
3. **HashiCorp Vault** - Secrets stored in HashiCorp Vault

## Configuration

### Provider Selection

Set the `SECRETS_PROVIDER` environment variable to select the provider:

```bash
# Use environment variables (default)
SECRETS_PROVIDER=env

# Use AWS Secrets Manager
SECRETS_PROVIDER=aws

# Use HashiCorp Vault
SECRETS_PROVIDER=vault
```

### Cache Settings

```bash
# Cache TTL in milliseconds (default: 5 minutes)
SECRETS_CACHE_TTL_MS=300000

# Time before expiry to start refresh (default: 1 minute)
SECRETS_REFRESH_BUFFER_MS=60000
```

## AWS Secrets Manager Setup

### Configuration

```bash
SECRETS_PROVIDER=aws
AWS_REGION=us-east-1
AWS_SECRET_NAME=nebuladns/production
AWS_SECRET_VERSION_STAGE=AWSCURRENT  # Optional, defaults to AWSCURRENT
```

### IAM Policy

The application requires the following IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:nebuladns/*"
    }
  ]
}
```

### Secret Format

Store secrets as a JSON object in AWS Secrets Manager:

```json
{
  "DATABASE_URL": "postgresql://user:pass@host:5432/db",
  "REDIS_URL": "redis://host:6379",
  "JWT_SECRET": "your-jwt-secret-at-least-32-chars",
  "JWT_REFRESH_SECRET": "your-refresh-secret-at-least-32-chars",
  "MFA_ENCRYPTION_KEY": "your-mfa-key-at-least-32-chars",
  "SSO_ENCRYPTION_KEY": "your-sso-key-at-least-32-chars",
  "SIEM_ENCRYPTION_KEY": "your-siem-key-at-least-32-chars",
  "INTERNAL_SERVICE_KEY": "your-internal-key-at-least-32-chars"
}
```

### Creating the Secret (AWS CLI)

```bash
aws secretsmanager create-secret \
  --name nebuladns/production \
  --secret-string '{"DATABASE_URL":"...", "JWT_SECRET":"..."}'
```

## HashiCorp Vault Setup

### Token Authentication

```bash
SECRETS_PROVIDER=vault
VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=your-vault-token
VAULT_SECRET_PATH=secret/data/nebuladns
VAULT_NAMESPACE=your-namespace  # Optional, for enterprise
```

### AppRole Authentication (Recommended for Production)

```bash
SECRETS_PROVIDER=vault
VAULT_ADDR=https://vault.example.com:8200
VAULT_ROLE_ID=your-role-id
VAULT_SECRET_ID=your-secret-id
VAULT_SECRET_PATH=secret/data/nebuladns
VAULT_NAMESPACE=your-namespace  # Optional
```

### Vault Setup Commands

```bash
# Enable KV v2 secrets engine
vault secrets enable -path=secret kv-v2

# Write secrets
vault kv put secret/nebuladns \
  DATABASE_URL="postgresql://..." \
  JWT_SECRET="..." \
  JWT_REFRESH_SECRET="..." \
  MFA_ENCRYPTION_KEY="..." \
  SSO_ENCRYPTION_KEY="..." \
  SIEM_ENCRYPTION_KEY="..." \
  INTERNAL_SERVICE_KEY="..."

# Enable AppRole auth
vault auth enable approle

# Create policy
vault policy write nebuladns - <<EOF
path "secret/data/nebuladns" {
  capabilities = ["read"]
}
EOF

# Create role
vault write auth/approle/role/nebuladns \
  policies=nebuladns \
  secret_id_ttl=24h \
  token_ttl=1h \
  token_max_ttl=4h

# Get role_id
vault read auth/approle/role/nebuladns/role-id

# Generate secret_id
vault write -f auth/approle/role/nebuladns/secret-id
```

## Required Secrets

The following secrets must be configured for production:

| Secret | Description | Minimum Length |
|--------|-------------|----------------|
| `DATABASE_URL` | PostgreSQL connection string | N/A |
| `REDIS_URL` | Redis connection string | N/A |
| `JWT_SECRET` | JWT signing secret | 32 chars |
| `JWT_REFRESH_SECRET` | Refresh token secret | 32 chars |
| `MFA_ENCRYPTION_KEY` | MFA TOTP secret encryption | 32 bytes |
| `SSO_ENCRYPTION_KEY` | SSO credential encryption | 32 bytes |
| `SIEM_ENCRYPTION_KEY` | SIEM credential encryption | 32 bytes |
| `INTERNAL_SERVICE_KEY` | Internal service auth | 32 chars |

### Generating Encryption Keys

```bash
# Generate a 32-byte base64 encoded key
openssl rand -base64 32

# Generate a 64-char hex key (32 bytes)
openssl rand -hex 32
```

## API Endpoints

### Health Check

```
GET /health/secrets
```

Returns secrets provider health status.

**Response:**
```json
{
  "status": "healthy",
  "provider": "aws",
  "connected": true,
  "lastRefreshTime": "2026-01-16T12:00:00Z",
  "lastRefreshStatus": "success",
  "cacheStats": {
    "totalSecrets": 8,
    "expiredSecrets": 0
  },
  "latencyMs": 45
}
```

### Readiness Check

```
GET /health/secrets/ready
```

Returns simple readiness status.

**Response:**
```json
{
  "ready": true,
  "provider": "aws"
}
```

### Refresh Secrets (Owner Only)

```
POST /admin/secrets/refresh
Authorization: Bearer <owner-token>
Content-Type: application/json

{
  "secret": "all"
}
```

**Response:**
```json
{
  "success": true,
  "secretsRefreshed": ["DATABASE_URL", "JWT_SECRET", ...],
  "errors": [],
  "refreshedAt": "2026-01-16T12:00:00Z"
}
```

### Clear Cache (Owner Only)

```
POST /admin/secrets/cache/clear
Authorization: Bearer <owner-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Secrets cache cleared successfully",
  "clearedAt": "2026-01-16T12:00:00Z"
}
```

## Development Setup

### Using Environment Variables

For local development, create a `.env.local` file:

```bash
SECRETS_PROVIDER=env
DATABASE_URL=postgresql://postgres:postgres@localhost:4432/nebuladns
REDIS_URL=redis://localhost:4379
JWT_SECRET=dev-jwt-secret-at-least-32-characters
JWT_REFRESH_SECRET=dev-refresh-secret-at-least-32-chars
MFA_ENCRYPTION_KEY=$(openssl rand -base64 32)
SSO_ENCRYPTION_KEY=$(openssl rand -base64 32)
SIEM_ENCRYPTION_KEY=$(openssl rand -base64 32)
INTERNAL_SERVICE_KEY=dev-internal-key-at-least-32-chars
```

### Local AWS Testing (Localstack)

```bash
# Start localstack
docker run -d -p 4566:4566 --name localstack localstack/localstack

# Configure AWS CLI
aws configure set aws_access_key_id test
aws configure set aws_secret_access_key test
aws configure set region us-east-1

# Create secret in localstack
aws --endpoint-url=http://localhost:4566 secretsmanager create-secret \
  --name test/nebuladns \
  --secret-string '{"DATABASE_URL":"postgresql://test@localhost/test"}'

# Test
SECRETS_PROVIDER=aws \
AWS_REGION=us-east-1 \
AWS_SECRET_NAME=test/nebuladns \
AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
AWS_ENDPOINT_URL=http://localhost:4566 \
npm run start:dev
```

### Local Vault Testing

```bash
# Start Vault in dev mode
docker run -d -p 8200:8200 \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=dev-token' \
  --name vault vault

# Write secrets
VAULT_ADDR=http://localhost:8200 \
VAULT_TOKEN=dev-token \
vault kv put secret/test/nebuladns \
  DATABASE_URL="postgresql://test@localhost/test" \
  JWT_SECRET="test-jwt-secret-32-characters-long"

# Test
SECRETS_PROVIDER=vault \
VAULT_ADDR=http://localhost:8200 \
VAULT_TOKEN=dev-token \
VAULT_SECRET_PATH=secret/data/test/nebuladns \
npm run start:dev
```

## Migration from Environment Variables

When migrating from environment variables to AWS or Vault:

1. Set up the new provider with all required secrets
2. Update `SECRETS_PROVIDER` to the new provider
3. Keep environment variables as fallback (the system checks both)
4. Verify health with `/health/secrets` endpoint
5. Remove environment variable fallbacks when confident

## Troubleshooting

### Common Issues

**Secret not found:**
- Verify the secret exists in the provider
- Check the secret path/name matches configuration
- Ensure proper IAM/Vault permissions

**Authentication failed (AWS):**
- Verify IAM role or credentials are configured
- Check the IAM policy allows the required actions
- Verify AWS region is correct

**Authentication failed (Vault):**
- Verify token is valid and not expired
- Check AppRole credentials if using AppRole auth
- Verify namespace if using Vault Enterprise

**Cache not refreshing:**
- Check `SECRETS_CACHE_TTL_MS` setting
- Use `/admin/secrets/refresh` to force refresh
- Check logs for refresh errors

### Logs

Enable debug logging for secrets:

```bash
LOG_LEVEL=debug npm run start:dev
```

Look for logs prefixed with `[SecretsService]` or `[SecretsConfig]`.
