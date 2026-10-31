# DNS Management — Request flow

## Connect Cloudflare token

```mermaid
sequenceDiagram
  participant User
  participant UI as Next.js UI
  participant API as dns-management API
  participant DB as PostgreSQL
  participant CF as Cloudflare API

  User->>UI: Paste API token
  UI->>API: POST /dns-management/connections
  API->>CF: GET /user/tokens/verify
  CF-->>API: active + zone resources
  API->>API: encrypt(token) GCM
  API->>DB: insert connection + upsert zone cache
  API->>Audit: dns_connection_create
  API-->>UI: zones list (no secret)
  UI-->>User: Show connected zones
```

## List records (live read)

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant DB
  participant CF

  UI->>API: GET /zones/:zoneId/records
  API->>DB: assert zone in cache + tenant
  API->>CF: GET /zones/:id/dns_records
  CF-->>API: records JSON
  API-->>UI: paginated records
```

## Update record + audit + undo

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant CF
  participant DB
  participant Audit

  UI->>API: PATCH /zones/:z/records/:id
  API->>CF: GET record (before snapshot)
  API->>CF: PATCH record
  CF-->>API: after snapshot
  API->>DB: insert dns_change_log
  API->>Audit: dns_record_update
  API-->>UI: updated record

  Note over UI,Audit: Later — undo
  UI->>API: POST /changes/:changeId/undo
  API->>DB: lock change row, check not superseded
  API->>CF: inverse API call
  API->>DB: new change_log (action=undo)
  API->>Audit: dns_change_undo
  API-->>UI: success
```

## ASCII overview (single page)

```
User → UI (/backend/dns-management/*) → Nest Controller
         → RolesGuard + tenant_id scope
         → DnsManagementService
              ├─ decrypt token (memory-only, short-lived)
              ├─ CloudflareDnsProvider → api.cloudflare.com (fixed host)
              ├─ dns_zone_cache / dns_change_logs (Postgres)
              ├─ AuditLogsService (hash-chained audit_logs)
              └─ Redis rate limit (per tenant / connection)
```
