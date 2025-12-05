# D. API Specification

## Overview

The SafeDNS Control Plane API is a RESTful JSON API built with NestJS. All endpoints require authentication except `/auth/login` and `/auth/register`.

### Base URL
```
https://api.safedns.example.com/v1
```

### Authentication
All authenticated endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

### Common Response Codes
| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request - validation error |
| 401  | Unauthorized - missing/invalid token |
| 403  | Forbidden - insufficient permissions |
| 404  | Not Found |
| 409  | Conflict - resource already exists |
| 422  | Unprocessable Entity |
| 429  | Too Many Requests |
| 500  | Internal Server Error |

### Pagination
List endpoints support cursor-based pagination:
```
?cursor=<base64_cursor>&limit=50
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6IjEyMyJ9",
    "has_more": true
  }
}
```

---

## 1. Authentication

### POST /auth/login
Authenticate user and obtain JWT token.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "SecureP@ssw0rd!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "user": {
    "id": "usr_01H8EXAMPLE",
    "email": "admin@example.com",
    "tenant_id": "tnt_01H8EXAMPLE",
    "roles": ["admin"]
  }
}
```

**Response (401):**
```json
{
  "error": "invalid_credentials",
  "message": "Invalid email or password"
}
```

### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### POST /auth/logout
Invalidate refresh token.

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response (204):** No content

### POST /auth/password/change
Change current user's password.

**Request:**
```json
{
  "current_password": "OldP@ssw0rd!",
  "new_password": "NewSecureP@ss!"
}
```

**Response (204):** No content

---

## 2. Tenants

### GET /tenants/current
Get current tenant details (scoped by JWT).

**Response (200):**
```json
{
  "id": "tnt_01H8EXAMPLE",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "plan": "professional",
  "settings": {
    "default_block_page_enabled": true,
    "block_page_url": "https://block.acme.com",
    "timezone": "America/New_York"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-06-01T14:22:00Z"
}
```

### PATCH /tenants/current
Update current tenant settings.

**Request:**
```json
{
  "name": "Acme Corporation Inc.",
  "settings": {
    "timezone": "America/Los_Angeles",
    "block_page_url": "https://blocked.acme.com"
  }
}
```

**Response (200):** Updated tenant object

---

## 3. Users

### GET /users
List users in current tenant.

**Required Role:** admin, owner

**Query Parameters:**
- `role` (optional): Filter by role
- `status` (optional): `active`, `suspended`, `pending`
- `cursor`, `limit`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "usr_01H8EXAMPLE",
      "email": "admin@example.com",
      "name": "John Admin",
      "roles": ["admin"],
      "status": "active",
      "last_login_at": "2024-06-15T09:00:00Z",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "next_cursor": null,
    "has_more": false
  }
}
```

### POST /users
Create a new user (sends invite email).

**Required Role:** admin, owner

**Request:**
```json
{
  "email": "analyst@example.com",
  "name": "Jane Analyst",
  "roles": ["analyst"]
}
```

**Response (201):**
```json
{
  "id": "usr_01H8NEWUSER",
  "email": "analyst@example.com",
  "name": "Jane Analyst",
  "roles": ["analyst"],
  "status": "pending",
  "invite_expires_at": "2024-06-22T10:30:00Z",
  "created_at": "2024-06-15T10:30:00Z"
}
```

### GET /users/:id
Get user by ID.

**Response (200):** User object

### PATCH /users/:id
Update user.

**Required Role:** admin, owner

**Request:**
```json
{
  "name": "Jane Senior Analyst",
  "roles": ["analyst", "admin"]
}
```

**Response (200):** Updated user object

### DELETE /users/:id
Deactivate user (soft delete).

**Required Role:** owner (for admins), admin (for others)

**Response (204):** No content

### POST /users/:id/suspend
Suspend user account.

**Required Role:** admin, owner

**Response (204):** No content

### POST /users/:id/reactivate
Reactivate suspended user.

**Required Role:** admin, owner

**Response (204):** No content

---

## 4. Roles

### GET /roles
List available roles.

**Response (200):**
```json
{
  "data": [
    {
      "name": "owner",
      "description": "Full access, can manage billing and delete tenant",
      "permissions": ["*"]
    },
    {
      "name": "admin",
      "description": "Manage users, policies, locations",
      "permissions": [
        "users:read", "users:write",
        "policies:read", "policies:write",
        "locations:read", "locations:write",
        "lists:read", "lists:write",
        "reports:read",
        "audit:read"
      ]
    },
    {
      "name": "analyst",
      "description": "View reports and logs",
      "permissions": [
        "policies:read",
        "locations:read",
        "lists:read",
        "reports:read",
        "logs:read"
      ]
    },
    {
      "name": "readonly",
      "description": "View-only access",
      "permissions": [
        "policies:read",
        "locations:read",
        "reports:read"
      ]
    }
  ]
}
```

---

## 5. Policies

### GET /policies
List policies.

**Query Parameters:**
- `status` (optional): `active`, `archived`
- `cursor`, `limit`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "pol_01H8EXAMPLE",
      "name": "Default Security Policy",
      "description": "Standard protection for all locations",
      "current_version": 3,
      "status": "active",
      "locations_count": 5,
      "created_at": "2024-01-20T10:00:00Z",
      "updated_at": "2024-06-10T15:00:00Z"
    }
  ],
  "pagination": {
    "next_cursor": null,
    "has_more": false
  }
}
```

### POST /policies
Create a new policy.

**Required Role:** admin, owner

**Request:**
```json
{
  "name": "Strict Security Policy",
  "description": "Enhanced protection for sensitive networks",
  "config": {
    "block_categories": [
      "malware",
      "phishing",
      "adult",
      "gambling",
      "social_media"
    ],
    "threat_blocking": {
      "enabled": true,
      "feeds": ["malware", "phishing", "c2"]
    },
    "safesearch": {
      "enabled": true,
      "services": ["google", "bing", "youtube"]
    },
    "schedules": [
      {
        "name": "Block Social Media During Work",
        "days": ["mon", "tue", "wed", "thu", "fri"],
        "start_time": "09:00",
        "end_time": "17:00",
        "timezone": "America/New_York",
        "additional_categories": ["social_media", "streaming"]
      }
    ]
  }
}
```

**Response (201):**
```json
{
  "id": "pol_01H8NEWPOL",
  "name": "Strict Security Policy",
  "description": "Enhanced protection for sensitive networks",
  "current_version": 1,
  "version_id": "pv_01H8VER001",
  "status": "active",
  "config": { ... },
  "created_at": "2024-06-15T10:30:00Z",
  "updated_at": "2024-06-15T10:30:00Z"
}
```

### GET /policies/:id
Get policy by ID.

**Response (200):** Full policy object with current config

### PATCH /policies/:id
Update policy (creates new version).

**Required Role:** admin, owner

**Request:**
```json
{
  "name": "Strict Security Policy v2",
  "config": {
    "block_categories": [
      "malware",
      "phishing",
      "adult",
      "gambling"
    ],
    "threat_blocking": {
      "enabled": true,
      "feeds": ["malware", "phishing", "c2", "cryptomining"]
    }
  }
}
```

**Response (200):**
```json
{
  "id": "pol_01H8NEWPOL",
  "name": "Strict Security Policy v2",
  "current_version": 2,
  "version_id": "pv_01H8VER002",
  "previous_version_id": "pv_01H8VER001",
  "config": { ... },
  "updated_at": "2024-06-15T11:00:00Z"
}
```

### GET /policies/:id/versions
List policy versions.

**Response (200):**
```json
{
  "data": [
    {
      "version_id": "pv_01H8VER002",
      "version_number": 2,
      "config": { ... },
      "created_by": "usr_01H8EXAMPLE",
      "created_at": "2024-06-15T11:00:00Z"
    },
    {
      "version_id": "pv_01H8VER001",
      "version_number": 1,
      "config": { ... },
      "created_by": "usr_01H8EXAMPLE",
      "created_at": "2024-06-15T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

### GET /policies/:id/versions/:version_id
Get specific policy version.

**Response (200):** Full policy version object

### POST /policies/:id/rollback
Rollback to a previous version.

**Required Role:** admin, owner

**Request:**
```json
{
  "target_version_id": "pv_01H8VER001"
}
```

**Response (200):** New policy object (creates new version with old config)

### DELETE /policies/:id
Archive policy (soft delete).

**Required Role:** admin, owner

**Response (204):** No content

---

## 6. Locations

### GET /locations
List locations.

**Query Parameters:**
- `policy_id` (optional): Filter by policy
- `status` (optional): `active`, `inactive`
- `cursor`, `limit`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "loc_01H8EXAMPLE",
      "name": "Main Office",
      "description": "Headquarters network",
      "policy_id": "pol_01H8EXAMPLE",
      "policy_name": "Default Security Policy",
      "status": "active",
      "auth_method": "doh_token",
      "doh_endpoint": "https://dns.safedns.example.com/dns-query/loc_01H8EXAMPLE",
      "dot_hostname": "loc_01H8EXAMPLE.dns.safedns.example.com",
      "stats": {
        "queries_today": 15420,
        "blocks_today": 342
      },
      "created_at": "2024-02-01T09:00:00Z",
      "updated_at": "2024-06-10T14:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### POST /locations
Create a new location.

**Required Role:** admin, owner

**Request:**
```json
{
  "name": "Branch Office NYC",
  "description": "New York branch network",
  "policy_id": "pol_01H8EXAMPLE",
  "auth_method": "doh_token",
  "settings": {
    "block_response": "nxdomain",
    "edns_client_subnet": false
  }
}
```

**Response (201):**
```json
{
  "id": "loc_01H8NEWLOC",
  "name": "Branch Office NYC",
  "description": "New York branch network",
  "policy_id": "pol_01H8EXAMPLE",
  "status": "active",
  "auth_method": "doh_token",
  "doh_endpoint": "https://dns.safedns.example.com/dns-query/loc_01H8NEWLOC",
  "dot_hostname": "loc_01H8NEWLOC.dns.safedns.example.com",
  "token": {
    "id": "tok_01H8NEWTOK",
    "token": "safedns_loc_a1b2c3d4e5f6...",
    "created_at": "2024-06-15T10:30:00Z",
    "expires_at": null
  },
  "settings": {
    "block_response": "nxdomain",
    "edns_client_subnet": false
  },
  "created_at": "2024-06-15T10:30:00Z"
}
```

> **Note:** The `token` field is only returned on creation. Store it securely.

### GET /locations/:id
Get location by ID.

**Response (200):** Location object (without token)

### PATCH /locations/:id
Update location.

**Required Role:** admin, owner

**Request:**
```json
{
  "name": "Branch Office - NYC",
  "policy_id": "pol_01H8OTHERPOL",
  "settings": {
    "block_response": "null_route"
  }
}
```

**Response (200):** Updated location object

### DELETE /locations/:id
Deactivate location.

**Required Role:** admin, owner

**Response (204):** No content

### POST /locations/:id/tokens
Generate new DoH token (rotates existing).

**Required Role:** admin, owner

**Request:**
```json
{
  "expires_in_days": 365,
  "revoke_existing": true
}
```

**Response (201):**
```json
{
  "id": "tok_01H8ROTTOK",
  "token": "safedns_loc_x9y8z7w6v5u4...",
  "created_at": "2024-06-15T12:00:00Z",
  "expires_at": "2025-06-15T12:00:00Z",
  "previous_token_revoked": true
}
```

### GET /locations/:id/tokens
List location tokens.

**Response (200):**
```json
{
  "data": [
    {
      "id": "tok_01H8ROTTOK",
      "prefix": "safedns_loc_x9y8...",
      "status": "active",
      "created_at": "2024-06-15T12:00:00Z",
      "expires_at": "2025-06-15T12:00:00Z",
      "last_used_at": "2024-06-15T14:30:00Z"
    }
  ]
}
```

### DELETE /locations/:id/tokens/:token_id
Revoke specific token.

**Required Role:** admin, owner

**Response (204):** No content

### POST /locations/:id/certificates
Generate mTLS client certificate for DoT.

**Required Role:** admin, owner

**Request:**
```json
{
  "common_name": "branch-nyc-router",
  "expires_in_days": 730,
  "key_type": "ecdsa-p256"
}
```

**Response (201):**
```json
{
  "id": "cert_01H8NEWCRT",
  "common_name": "branch-nyc-router",
  "fingerprint_sha256": "AB:CD:EF:12:34:...",
  "not_before": "2024-06-15T12:00:00Z",
  "not_after": "2026-06-15T12:00:00Z",
  "certificate_pem": "-----BEGIN CERTIFICATE-----\n...",
  "private_key_pem": "-----BEGIN EC PRIVATE KEY-----\n...",
  "ca_certificate_pem": "-----BEGIN CERTIFICATE-----\n..."
}
```

> **Warning:** The `private_key_pem` is only returned once. Store it securely.

### GET /locations/:id/certificates
List location certificates.

**Response (200):**
```json
{
  "data": [
    {
      "id": "cert_01H8NEWCRT",
      "common_name": "branch-nyc-router",
      "fingerprint_sha256": "AB:CD:EF:12:34:...",
      "status": "active",
      "not_before": "2024-06-15T12:00:00Z",
      "not_after": "2026-06-15T12:00:00Z",
      "last_used_at": "2024-06-15T18:00:00Z"
    }
  ]
}
```

### DELETE /locations/:id/certificates/:cert_id
Revoke certificate.

**Required Role:** admin, owner

**Response (204):** No content

---

## 7. Custom Lists (Allowlist/Blocklist)

### GET /lists
List custom lists.

**Query Parameters:**
- `type` (optional): `allowlist`, `blocklist`
- `cursor`, `limit`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "lst_01H8EXAMPLE",
      "name": "Company Approved Sites",
      "type": "allowlist",
      "description": "Manually approved domains",
      "entries_count": 42,
      "policies": [
        { "id": "pol_01H8EXAMPLE", "name": "Default Security Policy" }
      ],
      "created_at": "2024-02-01T09:00:00Z",
      "updated_at": "2024-06-14T16:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### POST /lists
Create a new list.

**Required Role:** admin, owner

**Request:**
```json
{
  "name": "Blocked Competitors",
  "type": "blocklist",
  "description": "Block access to competitor domains"
}
```

**Response (201):**
```json
{
  "id": "lst_01H8NEWLST",
  "name": "Blocked Competitors",
  "type": "blocklist",
  "description": "Block access to competitor domains",
  "entries_count": 0,
  "created_at": "2024-06-15T10:30:00Z"
}
```

### GET /lists/:id
Get list by ID.

**Response (200):** List object

### PATCH /lists/:id
Update list metadata.

**Required Role:** admin, owner

**Request:**
```json
{
  "name": "Blocked Competitor Sites",
  "description": "Updated description"
}
```

**Response (200):** Updated list object

### DELETE /lists/:id
Delete list.

**Required Role:** admin, owner

**Response (204):** No content

### GET /lists/:id/entries
List entries in a list.

**Query Parameters:**
- `search` (optional): Search domain pattern
- `cursor`, `limit`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "ent_01H8ENT001",
      "domain": "example.com",
      "type": "exact",
      "comment": "Main competitor site",
      "created_at": "2024-06-15T10:35:00Z",
      "created_by": "usr_01H8EXAMPLE"
    },
    {
      "id": "ent_01H8ENT002",
      "domain": "*.competitor.com",
      "type": "wildcard",
      "comment": "All competitor subdomains",
      "created_at": "2024-06-15T10:36:00Z",
      "created_by": "usr_01H8EXAMPLE"
    }
  ],
  "pagination": { ... }
}
```

### POST /lists/:id/entries
Add entries to list.

**Required Role:** admin, owner

**Request:**
```json
{
  "entries": [
    {
      "domain": "newcompetitor.com",
      "comment": "New competitor"
    },
    {
      "domain": "*.newcompetitor.com",
      "comment": "New competitor subdomains"
    }
  ]
}
```

**Response (201):**
```json
{
  "added": 2,
  "duplicates": 0,
  "entries": [
    {
      "id": "ent_01H8ENT003",
      "domain": "newcompetitor.com",
      "type": "exact"
    },
    {
      "id": "ent_01H8ENT004",
      "domain": "*.newcompetitor.com",
      "type": "wildcard"
    }
  ]
}
```

### DELETE /lists/:id/entries/:entry_id
Remove entry from list.

**Required Role:** admin, owner

**Response (204):** No content

### POST /lists/:id/entries/bulk-delete
Remove multiple entries.

**Required Role:** admin, owner

**Request:**
```json
{
  "entry_ids": ["ent_01H8ENT001", "ent_01H8ENT002"]
}
```

**Response (200):**
```json
{
  "deleted": 2
}
```

### POST /lists/:id/import
Import entries from file/text.

**Required Role:** admin, owner

**Request (multipart/form-data or JSON):**
```json
{
  "format": "domains",
  "content": "domain1.com\ndomain2.com\n*.domain3.com",
  "replace_existing": false
}
```

**Response (200):**
```json
{
  "imported": 3,
  "duplicates": 0,
  "invalid": 0,
  "errors": []
}
```

---

## 8. Categories

### GET /categories
List available domain categories.

**Response (200):**
```json
{
  "data": [
    {
      "id": "cat_malware",
      "name": "Malware",
      "description": "Sites hosting or distributing malware",
      "group": "security",
      "is_threat": true
    },
    {
      "id": "cat_phishing",
      "name": "Phishing",
      "description": "Phishing and credential theft sites",
      "group": "security",
      "is_threat": true
    },
    {
      "id": "cat_adult",
      "name": "Adult Content",
      "description": "Pornography and explicit content",
      "group": "content",
      "is_threat": false
    },
    {
      "id": "cat_social_media",
      "name": "Social Media",
      "description": "Social networking sites",
      "group": "productivity",
      "is_threat": false
    },
    {
      "id": "cat_gambling",
      "name": "Gambling",
      "description": "Online gambling and betting sites",
      "group": "content",
      "is_threat": false
    },
    {
      "id": "cat_streaming",
      "name": "Streaming Media",
      "description": "Video and audio streaming services",
      "group": "productivity",
      "is_threat": false
    }
  ]
}
```

### GET /categories/:id/domains
Lookup domains in a category (for debugging).

**Required Role:** admin, owner

**Query Parameters:**
- `search`: Domain search pattern
- `limit`: Max results (default 100)

**Response (200):**
```json
{
  "category": "adult",
  "domains": [
    { "domain": "example-adult.com", "source": "feed" },
    { "domain": "*.adult-site.com", "source": "feed" }
  ],
  "total_count": 1542000,
  "showing": 100
}
```

---

## 9. Reports & Analytics

### GET /reports/summary
Get high-level statistics.

**Query Parameters:**
- `start_date` (required): ISO date (e.g., `2024-06-01`)
- `end_date` (required): ISO date (e.g., `2024-06-15`)
- `location_id` (optional): Filter by location
- `granularity` (optional): `hour`, `day`, `week` (default: `day`)

**Response (200):**
```json
{
  "period": {
    "start": "2024-06-01T00:00:00Z",
    "end": "2024-06-15T23:59:59Z"
  },
  "totals": {
    "total_queries": 1542890,
    "allowed_queries": 1498234,
    "blocked_queries": 44656,
    "rewritten_queries": 2341,
    "block_rate_percent": 2.89
  },
  "by_action": [
    { "action": "allow", "count": 1498234 },
    { "action": "block", "count": 44656 },
    { "action": "rewrite", "count": 2341 }
  ],
  "timeline": [
    {
      "timestamp": "2024-06-01T00:00:00Z",
      "total": 98234,
      "blocked": 2841
    },
    {
      "timestamp": "2024-06-02T00:00:00Z",
      "total": 102456,
      "blocked": 3102
    }
  ]
}
```

### GET /reports/top-blocked
Get top blocked domains.

**Query Parameters:**
- `start_date`, `end_date` (required)
- `location_id` (optional)
- `limit` (optional, default 25, max 100)

**Response (200):**
```json
{
  "period": {
    "start": "2024-06-01T00:00:00Z",
    "end": "2024-06-15T23:59:59Z"
  },
  "domains": [
    {
      "domain": "malware-domain.com",
      "count": 1542,
      "category": "malware",
      "reason": "threat_feed",
      "first_seen": "2024-06-01T08:23:00Z",
      "last_seen": "2024-06-15T22:41:00Z"
    },
    {
      "domain": "facebook.com",
      "count": 892,
      "category": "social_media",
      "reason": "category_block",
      "first_seen": "2024-06-01T09:00:00Z",
      "last_seen": "2024-06-15T17:00:00Z"
    }
  ]
}
```

### GET /reports/blocks-by-category
Get block counts grouped by category.

**Query Parameters:**
- `start_date`, `end_date` (required)
- `location_id` (optional)

**Response (200):**
```json
{
  "period": {
    "start": "2024-06-01T00:00:00Z",
    "end": "2024-06-15T23:59:59Z"
  },
  "categories": [
    { "category": "malware", "count": 12456, "percent": 27.9 },
    { "category": "phishing", "count": 8923, "percent": 20.0 },
    { "category": "adult", "count": 7234, "percent": 16.2 },
    { "category": "social_media", "count": 6543, "percent": 14.6 },
    { "category": "gambling", "count": 4521, "percent": 10.1 },
    { "category": "other", "count": 4979, "percent": 11.2 }
  ]
}
```

### GET /reports/threats
Get threat detection summary.

**Query Parameters:**
- `start_date`, `end_date` (required)
- `location_id` (optional)
- `threat_type` (optional): `malware`, `phishing`, `c2`, `cryptomining`

**Response (200):**
```json
{
  "period": {
    "start": "2024-06-01T00:00:00Z",
    "end": "2024-06-15T23:59:59Z"
  },
  "summary": {
    "total_threats_blocked": 21379,
    "unique_threat_domains": 423,
    "locations_affected": 8
  },
  "by_type": [
    { "type": "malware", "count": 12456, "unique_domains": 234 },
    { "type": "phishing", "count": 8923, "unique_domains": 189 }
  ],
  "trend": [
    { "date": "2024-06-01", "malware": 823, "phishing": 612 },
    { "date": "2024-06-02", "malware": 756, "phishing": 589 }
  ],
  "top_threats": [
    {
      "domain": "malicious-download.xyz",
      "type": "malware",
      "count": 342,
      "feed_source": "malwarebazaar"
    }
  ]
}
```

### GET /reports/locations
Get per-location statistics.

**Query Parameters:**
- `start_date`, `end_date` (required)

**Response (200):**
```json
{
  "period": {
    "start": "2024-06-01T00:00:00Z",
    "end": "2024-06-15T23:59:59Z"
  },
  "locations": [
    {
      "location_id": "loc_01H8EXAMPLE",
      "location_name": "Main Office",
      "total_queries": 892456,
      "blocked_queries": 24532,
      "block_rate_percent": 2.75,
      "top_blocked_category": "social_media"
    }
  ]
}
```

---

## 10. Query Logs

### GET /logs/queries
Query DNS logs (with filters).

**Required Role:** analyst, admin, owner

**Query Parameters:**
- `start_time`, `end_time` (required): ISO timestamps
- `location_id` (optional)
- `action` (optional): `allow`, `block`, `rewrite`
- `domain` (optional): Search pattern (supports `*` wildcard)
- `category` (optional)
- `cursor`, `limit`: Pagination (max 1000)

**Response (200):**
```json
{
  "data": [
    {
      "id": "log_01H8LOG001",
      "timestamp": "2024-06-15T14:32:01.234Z",
      "location_id": "loc_01H8EXAMPLE",
      "location_name": "Main Office",
      "qname": "malware-site.com",
      "qtype": "A",
      "action": "block",
      "reason": "threat_feed:malware",
      "category": "malware",
      "policy_version": "pv_01H8VER001",
      "response_code": "NXDOMAIN",
      "latency_ms": 2.3
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0cyI6IjIwMjQtMDYtMTVUMTQ6MzI6MDAuMDAwWiJ9",
    "has_more": true
  }
}
```

### GET /logs/queries/export
Export query logs (async).

**Required Role:** admin, owner

**Query Parameters:**
- Same filters as `/logs/queries`
- `format`: `csv`, `json`

**Response (202):**
```json
{
  "export_id": "exp_01H8EXPORT",
  "status": "processing",
  "estimated_rows": 150000,
  "expires_at": "2024-06-16T14:32:00Z"
}
```

### GET /logs/queries/export/:export_id
Check export status / download.

**Response (200) - Processing:**
```json
{
  "export_id": "exp_01H8EXPORT",
  "status": "processing",
  "progress_percent": 45
}
```

**Response (200) - Complete:**
```json
{
  "export_id": "exp_01H8EXPORT",
  "status": "complete",
  "download_url": "https://exports.safedns.example.com/exp_01H8EXPORT.csv?token=...",
  "expires_at": "2024-06-16T14:32:00Z",
  "file_size_bytes": 15234567,
  "row_count": 150234
}
```

---

## 11. Audit Logs

### GET /audit-logs
List admin action audit logs.

**Required Role:** admin, owner

**Query Parameters:**
- `start_time`, `end_time` (optional)
- `user_id` (optional)
- `resource_type` (optional): `user`, `policy`, `location`, `list`
- `action` (optional): `create`, `update`, `delete`
- `cursor`, `limit`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "aud_01H8AUDIT01",
      "timestamp": "2024-06-15T10:30:00Z",
      "user_id": "usr_01H8EXAMPLE",
      "user_email": "admin@example.com",
      "action": "update",
      "resource_type": "policy",
      "resource_id": "pol_01H8EXAMPLE",
      "resource_name": "Default Security Policy",
      "changes": {
        "config.block_categories": {
          "added": ["gambling"],
          "removed": []
        }
      },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0..."
    }
  ],
  "pagination": { ... }
}
```

---

## 12. System / Health

### GET /health
Health check (unauthenticated).

**Response (200):**
```json
{
  "status": "healthy",
  "version": "1.2.3",
  "timestamp": "2024-06-15T14:32:00Z"
}
```

### GET /health/detailed
Detailed health check.

**Required Role:** admin, owner

**Response (200):**
```json
{
  "status": "healthy",
  "version": "1.2.3",
  "components": {
    "database": { "status": "healthy", "latency_ms": 2 },
    "redis": { "status": "healthy", "latency_ms": 1 },
    "clickhouse": { "status": "healthy", "latency_ms": 5 }
  },
  "timestamp": "2024-06-15T14:32:00Z"
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context if applicable"
  },
  "request_id": "req_01H8REQID"
}
```

### Common Error Codes
| Code | Description |
|------|-------------|
| `validation_error` | Request body validation failed |
| `invalid_credentials` | Authentication failed |
| `token_expired` | JWT has expired |
| `forbidden` | Insufficient permissions |
| `not_found` | Resource not found |
| `conflict` | Resource already exists |
| `rate_limited` | Too many requests |
| `internal_error` | Server error |

---

## Rate Limits

Control Plane API rate limits:

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 10 req/min per IP |
| Read operations | 100 req/min per user |
| Write operations | 30 req/min per user |
| Report queries | 20 req/min per user |
| Log exports | 5 req/hour per tenant |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1718458320
```

---

## Webhooks (Future)

Webhook support for events:
- `policy.updated`
- `location.created`
- `location.token.rotated`
- `threat.detected` (batch)

Configuration via `/webhooks` endpoints (to be documented).
