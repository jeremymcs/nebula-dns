# DNS Management — Request flow

## Platform admin: configure connection & assign zone

```mermaid
sequenceDiagram
  participant Admin as Platform admin
  participant AdminUI as admin-ui
  participant API as admin/dns-management
  participant DB as PostgreSQL
  participant CF as Cloudflare API

  Admin->>AdminUI: Paste platform API token
  AdminUI->>API: POST /admin/dns-management/connection
  API->>CF: GET /user/tokens/verify
  CF-->>API: active + scopes
  API->>API: encrypt(token) — never returned
  API->>DB: upsert dns_platform_connections
  API->>Audit: dns_platform_token_rotated / create
  AdminUI->>API: POST /zones/sync
  API->>CF: GET /zones (via fair queue)
  API->>DB: refresh zone inventory
  Admin->>AdminUI: Assign example.com → Tenant T
  AdminUI->>API: POST /zones/:cfZoneId/assign
  API->>DB: insert dns_zone_assignments (UUID zoneId)
  API->>Limits: canAssignDnsZone(T)
  API->>Audit: dns_zone_assigned
  AdminUI-->>Admin: Show nameservers if newly created
```

## Tenant: list records (assigned zone only)

```mermaid
sequenceDiagram
  participant User as Tenant user
  participant UI as ui /dns-management
  participant API as dns-management
  participant DB as PostgreSQL
  participant Q as CF fair queue
  participant CF as Cloudflare API

  User->>UI: Open zone (assignment UUID in URL)
  UI->>API: GET /dns-management/zones/:zoneId/records
  API->>DB: load assignment WHERE id AND tenant_id match JWT
  alt not found or wrong tenant
    API-->>UI: 404
  else ok
    API->>Q: enqueue GET dns_records(provider_zone_id)
    Q->>CF: request (shared account budget)
    CF-->>Q: records
    Q-->>API: records JSON
    API-->>UI: paginated records (no CF zone id required from client)
  end
```

## Tenant: mutate + audit + undo

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant DB
  participant Q as CF queue
  participant CF
  participant Audit

  UI->>API: PATCH /zones/:zoneId/records/:recordId
  API->>DB: assignment + can_edit_records + can_toggle_proxy
  API->>Q: GET before snapshot
  Q->>CF: GET record
  API->>Q: PATCH record
  Q->>CF: PATCH
  CF-->>API: after snapshot
  API->>DB: dns_change_log
  API->>Audit: dns_record_update
  API-->>UI: updated record

  UI->>API: POST /changes/:changeId/undo
  API->>DB: lock row, check permissions + stack
  API->>Q: inverse CF call
  API->>DB: undo change_log
  API->>Audit: dns_change_undo
```

## BYO token (later phase)

```mermaid
sequenceDiagram
  participant Tenant as Tenant admin
  participant UI
  participant API
  participant DB
  participant CF

  Tenant->>UI: Connect own Cloudflare token
  UI->>API: POST /dns-management/connections
  API->>CF: verify token
  API->>DB: dns_tenant_connections + assignments per zone
  Note over API,DB: Same tenant APIs use assignment UUID; connection_id points to tenant token
  Tenant->>UI: Edit records
  UI->>API: PATCH .../records (BYO uses per-tenant rate bucket)
```

## ASCII overview

```
Platform path:
  admin-ui → /admin/dns-management/* → AdminAuthGuard
         → platform token (encrypted) → CF fair queue → api.cloudflare.com
         → dns_platform_connections + dns_zone_assignments

Tenant path:
  ui → /backend/dns-management/* → JwtAuthGuard + RolesGuard + @CurrentTenant()
         → resolve zoneAssignmentId → provider_zone_id (never from client)
         → check canEditRecords / canDeleteRecords / canToggleProxy
         → CF fair queue (shared) OR BYO per-tenant bucket
         → dns_change_logs + AuditLogsService

Billing:
  assign zone → LimitsService.canAssignDnsZone(tenantId) → plan dnsZoneLimit
```
