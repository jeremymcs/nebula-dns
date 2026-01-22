# Phase 21: Alerting Integrations (Backend) - Research

**Researched:** 2026-01-21
**Domain:** External alerting integrations (Slack, PagerDuty)
**Confidence:** HIGH

## Summary

This phase implements backend alerting integrations for Slack and PagerDuty, enabling the system to notify administrators of critical events. The research examined existing codebase patterns (webhooks, SIEM, encryption), official Slack/PagerDuty API documentation, and best practices for external service integrations.

The codebase already has excellent patterns to follow:
1. **SIEM integration** (`api/src/modules/siem/`) - Template for external service integrations with encrypted credentials
2. **Webhooks module** (`api/src/modules/webhooks/`) - HTTP delivery patterns with retry logic and idempotency
3. **Encryption utilities** (`api/src/common/utils/encryption.util.ts`) - AES-256-GCM encryption for secrets at rest
4. **Admin health service** - Source of health/system events that will trigger alerts

**Primary recommendation:** Create a new `alerting` module following the SIEM integration pattern, with separate entity for alert configurations and a central `AlertDispatcherService` that routes alerts to configured channels based on severity.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/common` | 10.x | NestJS framework | Already in codebase |
| `@nestjs/config` | 3.x | Environment configuration | Already in codebase |
| `typeorm` | 0.3.x | Database ORM | Already in codebase |
| Native `https` | Node.js | HTTP client for webhooks | Used by existing webhooks/SIEM |
| Native `crypto` | Node.js | AES-256-GCM encryption | Used by existing encryption utils |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `class-validator` | 0.14.x | DTO validation | Already in codebase |
| `class-transformer` | 0.5.x | DTO transformation | Already in codebase |
| `uuid` | 9.x | Unique ID generation for dedup_key | Already in codebase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `https` | `@slack/webhook` npm package | Adds dependency; native HTTP is simpler for webhook POST |
| Native `https` | `@pagerduty/pdjs` npm package | Adds dependency; Events API v2 is simple enough for native |
| Custom encryption | AWS KMS | Higher security but adds AWS dependency; current AES-256-GCM is sufficient |

**Installation:**
```bash
# No new dependencies required - all patterns already exist in codebase
```

## Architecture Patterns

### Recommended Project Structure
```
api/src/modules/alerting/
├── alerting.module.ts              # Module definition
├── alerting.controller.ts          # Admin-only REST endpoints
├── alerting.service.ts             # Configuration CRUD operations
├── alert-dispatcher.service.ts     # Central alert routing/delivery
├── dto/
│   ├── alert-config.dto.ts         # Create/update DTOs for Slack/PagerDuty
│   ├── alert-event.dto.ts          # Internal alert event structure
│   └── test-alert.dto.ts           # Test alert request/response
├── entities/
│   └── alert-config.entity.ts      # Encrypted config storage
├── interfaces/
│   └── alert-provider.interface.ts # Common interface for providers
└── providers/
    ├── slack.provider.ts           # Slack webhook delivery
    └── pagerduty.provider.ts       # PagerDuty Events API v2 delivery
```

### Pattern 1: Provider Interface Pattern
**What:** Abstract interface for alert providers enabling multiple integrations
**When to use:** When supporting multiple alerting destinations with different APIs
**Example:**
```typescript
// Source: Based on SIEM integration pattern in codebase
export interface AlertProvider {
  readonly type: AlertProviderType;

  send(alert: AlertEvent): Promise<AlertDeliveryResult>;
  test(config: AlertConfig): Promise<TestAlertResult>;
  validateConfig(config: Record<string, unknown>): boolean;
}

export interface AlertEvent {
  id: string;
  type: AlertEventType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  dedupKey?: string;
}

export type AlertSeverity = 'critical' | 'error' | 'warning' | 'info';
export type AlertProviderType = 'slack' | 'pagerduty';
```

### Pattern 2: Encrypted Configuration Entity
**What:** Store sensitive credentials (webhook URLs, routing keys) encrypted at rest
**When to use:** For all external service configurations
**Example:**
```typescript
// Source: Based on SIEM entity pattern (api/src/modules/siem/entities/siem-integration.entity.ts)
@Entity('alert_configs')
export class AlertConfig extends BaseEntity {
  @Column({ type: 'varchar', length: 20 })
  providerType: AlertProviderType; // 'slack' | 'pagerduty'

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  // Encrypted JSON with provider-specific config
  // Slack: { webhookUrl: encrypted }
  // PagerDuty: { routingKey: encrypted }
  @Column({ name: 'config_encrypted', type: 'jsonb' })
  configEncrypted: Record<string, string>;

  // Which severity levels to send to this channel
  @Column({ type: 'varchar', array: true, default: ['critical', 'error'] })
  severityFilter: AlertSeverity[];

  // Which event types to send (system_health, billing, security)
  @Column({ name: 'event_types', type: 'varchar', array: true, default: [] })
  eventTypes: AlertEventType[];

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount: number;
}
```

### Pattern 3: Severity-Based Routing
**What:** Route alerts to appropriate channels based on severity
**When to use:** ALERT-07 requires critical -> PagerDuty, warnings -> Slack only
**Example:**
```typescript
// Alert dispatcher determines which providers receive each alert
async dispatch(alert: AlertEvent): Promise<void> {
  const configs = await this.getEnabledConfigs();

  for (const config of configs) {
    // Check severity filter
    if (!config.severityFilter.includes(alert.severity)) {
      continue;
    }

    // Check event type filter
    if (config.eventTypes.length > 0 &&
        !config.eventTypes.includes(alert.type)) {
      continue;
    }

    // ALERT-07: Critical severity always goes to PagerDuty if configured
    // Warnings go to Slack only (PagerDuty skipped for warnings)
    if (config.providerType === 'pagerduty' &&
        alert.severity === 'warning') {
      continue; // Skip PagerDuty for warnings
    }

    await this.sendToProvider(config, alert);
  }
}
```

### Pattern 4: PagerDuty Dedup Key Format
**What:** Consistent dedup_key format to prevent incident explosion (ALERT-10)
**When to use:** Every PagerDuty trigger event
**Example:**
```typescript
// Source: PagerDuty best practices documentation
// Format: {service}:{source}:{alert_type}:{unique_identifier}
function generateDedupKey(alert: AlertEvent): string {
  // Use deterministic key based on alert identity
  // Same alert = same key = deduplicated incident
  return `nebuladns:${alert.source}:${alert.type}:${alert.metadata?.identifier || alert.id}`;
}

// Example keys:
// nebuladns:policy-svc:system_health:service_down
// nebuladns:stripe:billing:payment_failed_cus_123
// nebuladns:auth:security:suspicious_impersonation_admin_456
```

### Anti-Patterns to Avoid
- **Random dedup keys:** Using UUIDs or timestamps creates incident explosion in PagerDuty
- **Storing webhook URLs in plaintext:** Always encrypt at rest per ALERT-03
- **Synchronous alert sending in request path:** Use async dispatch to avoid blocking
- **No retry logic:** External services fail; implement exponential backoff

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AES encryption | Custom crypto functions | `api/src/common/utils/encryption.util.ts` | Battle-tested, GCM authenticated |
| HTTP POST with retry | Custom fetch wrapper | Pattern from `webhooks.service.ts` | Has exponential backoff, timeout handling |
| Severity levels | String literals | Enum with hierarchy like `admin-role.enum.ts` | Type safety, comparison operations |
| Config validation | Manual checks | class-validator decorators | Consistent with codebase DTOs |
| Secret key derivation | Direct buffer usage | `deriveKey()` from encryption.util | Proper scrypt derivation |

**Key insight:** The codebase already has excellent patterns for everything needed. SIEM integration is nearly identical architecture - just different external APIs.

## Common Pitfalls

### Pitfall 1: PagerDuty Incident Explosion
**What goes wrong:** Each alert creates a new incident instead of grouping related alerts
**Why it happens:** Using random/unique dedup_key values or omitting dedup_key entirely
**How to avoid:** Use deterministic dedup_key format: `{service}:{source}:{type}:{identifier}`
**Warning signs:** Many open incidents for the same underlying issue

### Pitfall 2: Webhook URL/Key Exposure
**What goes wrong:** Credentials logged, stored in plaintext, or committed to version control
**Why it happens:** Treating webhook URLs as non-sensitive configuration
**How to avoid:** Encrypt at rest, never log, use separate env variable for encryption key
**Warning signs:** Webhook URLs appearing in error logs or database dumps

### Pitfall 3: Alert Storms
**What goes wrong:** Rapid-fire identical alerts overwhelming recipients
**Why it happens:** No deduplication or rate limiting on alert generation
**How to avoid:** Track last alert time per type, implement cooldown period, use PagerDuty's native dedup
**Warning signs:** Slack channel flooded with identical messages

### Pitfall 4: Blocking Request Handling
**What goes wrong:** API responses slow when external service (Slack/PagerDuty) is slow/down
**Why it happens:** Synchronous alert dispatch in request handler
**How to avoid:** Async dispatch via queue/event emitter, or fire-and-forget with separate error tracking
**Warning signs:** Slow API responses correlated with alerting issues

### Pitfall 5: Silent Failures
**What goes wrong:** Alerts fail to send but no one knows
**Why it happens:** No error tracking or health monitoring for alert delivery
**How to avoid:** Track error_count, last_error; auto-disable after N failures; expose health endpoint
**Warning signs:** Incidents occur without alerts being received

## Code Examples

Verified patterns from codebase:

### AES-256-GCM Encryption (from existing utils)
```typescript
// Source: api/src/common/utils/encryption.util.ts
import { encrypt, decrypt, deriveKey } from '../../common/utils/encryption.util';
import { getEncryptionKey } from '../../config/encryption.config';

// In constructor
const key = getEncryptionKey('ALERTING_ENCRYPTION_KEY'); // Add to ENCRYPTION_KEYS array
this.encryptionKey = deriveKey(key, 'alerting-gcm-salt');

// Encrypt webhook URL before storage
const encrypted = encrypt(dto.webhookUrl, this.encryptionKey);

// Decrypt for use
const webhookUrl = decrypt(config.configEncrypted.webhookUrl, this.encryptionKey);
```

### HTTP POST with Timeout (from existing webhooks)
```typescript
// Source: Based on api/src/modules/webhooks/webhooks.service.ts httpPost method
private async httpPost(
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000, // 30 second timeout
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 0, body: responseBody });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(body);
    req.end();
  });
}
```

### Slack Webhook Payload
```typescript
// Source: Official Slack API documentation
interface SlackPayload {
  text: string;              // Fallback text
  blocks?: SlackBlock[];     // Rich formatting
  attachments?: SlackAttachment[];  // Legacy, max 100
}

// Alert to Slack payload conversion
function toSlackPayload(alert: AlertEvent): SlackPayload {
  const severityEmoji = {
    critical: ':rotating_light:',
    error: ':x:',
    warning: ':warning:',
    info: ':information_source:'
  };

  return {
    text: `${alert.severity.toUpperCase()}: ${alert.title}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${severityEmoji[alert.severity]} ${alert.title}` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: alert.message }
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `*Source:* ${alert.source}` },
          { type: 'mrkdwn', text: `*Time:* ${alert.timestamp.toISOString()}` }
        ]
      }
    ]
  };
}
```

### PagerDuty Events API v2 Payload
```typescript
// Source: PagerDuty Events API v2 documentation
interface PagerDutyTriggerEvent {
  routing_key: string;       // Integration key
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  dedup_key: string;         // Required for proper grouping
  payload: {
    summary: string;         // Alert title (max 1024 chars)
    source: string;          // Origin of alert
    severity: 'critical' | 'error' | 'warning' | 'info';
    timestamp?: string;      // ISO8601 format
    component?: string;      // Affected component
    group?: string;          // Logical grouping
    class?: string;          // Event class/type
    custom_details?: Record<string, unknown>;
  };
  client?: string;           // Service name
  client_url?: string;       // Link to Nebula DNS
  links?: Array<{ href: string; text: string }>;
  images?: Array<{ src: string; href?: string; alt?: string }>;
}

// Alert to PagerDuty payload conversion
function toPagerDutyPayload(
  alert: AlertEvent,
  routingKey: string,
): PagerDutyTriggerEvent {
  return {
    routing_key: routingKey,
    event_action: 'trigger',
    dedup_key: `nebuladns:${alert.source}:${alert.type}:${alert.metadata?.identifier || alert.id}`,
    payload: {
      summary: alert.title.substring(0, 1024),
      source: alert.source,
      severity: alert.severity,
      timestamp: alert.timestamp.toISOString(),
      component: 'Nebula DNS',
      class: alert.type,
      custom_details: {
        message: alert.message,
        ...alert.metadata
      }
    },
    client: 'Nebula DNS',
    client_url: process.env.APP_URL || 'https://app.nebuladns.com'
  };
}
```

### Alert Event Types and Sources
```typescript
// Alert event types per requirements
export type AlertEventType =
  | 'system_health'    // ALERT-04: service down, high error rate
  | 'billing'          // ALERT-05: payment failures
  | 'security';        // ALERT-06: failed logins, suspicious impersonation

// Sources that generate alerts
export const ALERT_SOURCES = {
  POLICY_SVC: 'policy-svc',
  DNSDIST: 'dnsdist',
  UNBOUND: 'unbound',
  REDIS: 'redis',
  CLICKHOUSE: 'clickhouse',
  STRIPE: 'stripe',
  AUTH: 'auth',
  ADMIN: 'admin'
} as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Slack legacy webhooks | Slack App webhooks | 2023 | Same API, but configured via Slack App |
| PagerDuty Events API v1 | Events API v2 | 2017 | Better dedup, custom fields, richer payloads |
| AES-256-CBC | AES-256-GCM | Already migrated in codebase | Authenticated encryption prevents tampering |

**Deprecated/outdated:**
- Slack legacy custom integrations (incoming webhooks): Still functional but Slack recommends Slack Apps
- PagerDuty Events API v1: Still works but v2 is recommended for all new integrations

## Open Questions

Things that couldn't be fully resolved:

1. **Rate limits for Slack webhooks**
   - What we know: Documentation mentions 1 message/second with bursts allowed
   - What's unclear: Exact burst limits and rate limit response codes
   - Recommendation: Implement client-side rate limiting of 1/second, queue overflow

2. **Admin UI for alert configuration**
   - What we know: This phase is backend-only
   - What's unclear: Whether Phase 22 exists for admin UI
   - Recommendation: Design API to be self-documenting for future UI integration

3. **Alert event generation triggers**
   - What we know: Events come from AdminHealthService, payment webhooks, audit logs
   - What's unclear: Exact threshold for "high error rate" (ALERT-04)
   - Recommendation: Make thresholds configurable in alert rules

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - `api/src/modules/webhooks/webhooks.service.ts` - HTTP delivery patterns
  - `api/src/modules/siem/siem.service.ts` - External integration template
  - `api/src/common/utils/encryption.util.ts` - Encryption patterns
  - `api/src/modules/admin/admin-health.service.ts` - Health event source
  - `api/src/config/encryption.config.ts` - Key management

### Secondary (MEDIUM confidence)
- [Slack Incoming Webhooks Documentation](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/) - Message format, response codes
- [PagerDuty Events API v2](https://developer.pagerduty.com/docs/events-api-v2/trigger-events/) - Trigger event structure, dedup_key
- [IncidentHub PagerDuty Integration Guide](https://blog.incidenthub.cloud/Integrate-Your-Monitoring-System-With-PagerDutys-Events-API-V2) - dedup_key best practices

### Tertiary (LOW confidence)
- [nestjs-slack-webhook npm](https://www.npmjs.com/package/nestjs-slack-webhook) - Considered but not recommended (native HTTP sufficient)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase
- Architecture: HIGH - Following established SIEM/webhook patterns
- Pitfalls: HIGH - Well-documented in official API docs and codebase comments
- Integration specifics: MEDIUM - Slack rate limits not fully documented

**Research date:** 2026-01-21
**Valid until:** 60 days (APIs are stable, Slack/PagerDuty rarely change)
