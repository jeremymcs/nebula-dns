# D. API Specification

## Base URL
```
https://api.safedns.io/v1
```

## Authentication
All endpoints require authentication via Bearer token (JWT) obtained from `/auth/login`.

## Common Response Format

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Policy not found",
    "details": { ... }
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Authentication Endpoints

### POST /auth/login
Authenticate user and receive JWT token.

**Request**:
```json
{
  "email": "admin@example.com",
  "password": "secure-password"
}
```

**Response** (200):
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@example.com",
      "role": "owner",
      "tenant_id": "660e8400-e29b-41d4-a716-446655440000"
    },
    "expires_at": "2024-01-15T11:30:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid credentials
- `423 LOCKED`: Account locked due to failed attempts

---

### POST /auth/logout
Invalidate current session token.

**Response** (200):
```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## Tenant Endpoints

### GET /tenants/me
Get current tenant information.

**Response** (200):
```json
{
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "domain": "acme-corp",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Required Role**: Any authenticated user

---

## User Management Endpoints

### GET /users
List users in current tenant.

**Query Parameters**:
- `role` (optional): Filter by role
- `status` (optional): Filter by status
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50): Results per page

**Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@example.com",
      "role": "owner",
      "status": "active",
      "last_login_at": "2024-01-15T09:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "pages": 1
    }
  }
}
```

**Required Role**: `admin`, `owner`

---

### POST /users
Create a new user.

**Request**:
```json
{
  "email": "analyst@example.com",
  "password": "secure-password",
  "role": "analyst"
}
```

**Response** (201):
```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "email": "analyst@example.com",
    "role": "analyst",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Required Role**: `admin`, `owner`

---

### PATCH /users/{userId}
Update user (role, status).

**Request**:
```json
{
  "role": "admin",
  "status": "suspended"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "email": "analyst@example.com",
    "role": "admin",
    "status": "suspended",
    "updated_at": "2024-01-15T10:35:00Z"
  }
}
```

**Required Role**: `admin`, `owner`

---

### DELETE /users/{userId}
Delete user (soft delete).

**Response** (204): No content

**Required Role**: `admin`, `owner`

---

## Policy Endpoints

### GET /policies
List policies for current tenant.

**Query Parameters**:
- `is_active` (optional): Filter by active status
- `page`, `limit`: Pagination

**Response** (200):
```json
{
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "name": "Default Policy",
      "version": 1,
      "is_active": true,
      "config": {
        "block_categories": ["malware", "phishing"],
        "block_threats": true,
        "safe_search_enabled": true
      },
      "created_at": "2024-01-01T00:00:00Z",
      "created_by": "550e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "meta": {
    "pagination": { ... }
  }
}
```

**Required Role**: `analyst`, `admin`, `owner`, `read_only`

---

### GET /policies/{policyId}
Get specific policy version.

**Response** (200):
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "name": "Default Policy",
    "version": 1,
    "is_active": true,
    "config": {
      "block_categories": ["malware", "phishing", "adult"],
      "block_threats": true,
      "safe_search_enabled": true,
      "schedule": {
        "timezone": "America/New_York",
        "windows": [
          {
            "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "start": "09:00",
            "end": "17:00"
          }
        ]
      }
    },
    "created_at": "2024-01-01T00:00:00Z",
    "created_by": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Required Role**: `analyst`, `admin`, `owner`, `read_only`

---

### POST /policies
Create a new policy version.

**Request**:
```json
{
  "name": "Strict Policy",
  "description": "Block all threats and adult content",
  "config": {
    "block_categories": ["malware", "phishing", "adult", "gambling"],
    "block_threats": true,
    "safe_search_enabled": true,
    "allowlist_enabled": true,
    "blocklist_enabled": true
  }
}
```

**Response** (201):
```json
{
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "name": "Strict Policy",
    "version": 1,
    "is_active": false,
    "config": { ... },
    "created_at": "2024-01-15T10:40:00Z",
    "created_by": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Required Role**: `admin`, `owner`

**Note**: Creates new version. Does not automatically activate.

---

### POST /policies/{policyId}/versions
Create a new version from existing policy.

**Request**:
```json
{
  "config": {
    "block_categories": ["malware", "phishing", "adult", "gambling", "social_media"],
    "block_threats": true,
    "safe_search_enabled": true
  }
}
```

**Response** (201):
```json
{
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440000",
    "name": "Strict Policy",
    "version": 2,
    "is_active": false,
    "config": { ... },
    "created_at": "2024-01-15T10:45:00Z"
  }
}
```

**Required Role**: `admin`, `owner`

---

### POST /policies/{policyId}/activate
Activate a policy version (deactivates previous active version).

**Response** (200):
```json
{
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440000",
    "is_active": true,
    "activated_at": "2024-01-15T10:50:00Z"
  }
}
```

**Required Role**: `admin`, `owner`

---

## Location Endpoints

### GET /locations
List locations for current tenant.

**Response** (200):
```json
{
  "data": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
      "name": "Headquarters",
      "description": "Main office network",
      "status": "active",
      "doh_token_issued_at": "2024-01-01T00:00:00Z",
      "dot_cert_issued_at": "2024-01-01T00:00:00Z",
      "dot_cert_expires_at": "2025-01-01T00:00:00Z",
      "policy_id": "880e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Required Role**: `analyst`, `admin`, `owner`, `read_only`

---

### POST /locations
Create a new location.

**Request**:
```json
{
  "name": "Branch Office",
  "description": "Remote office network"
}
```

**Response** (201):
```json
{
  "data": {
    "id": "cc0e8400-e29b-41d4-a716-446655440000",
    "name": "Branch Office",
    "description": "Remote office network",
    "status": "active",
    "doh_token": "safedns_abc123def456...", // Only shown once
    "doh_token_issued_at": "2024-01-15T11:00:00Z",
    "dot_cert_pem": "-----BEGIN CERTIFICATE-----\n...", // Only shown once
    "dot_cert_key_pem": "-----BEGIN PRIVATE KEY-----\n...", // Only shown once
    "dot_cert_issued_at": "2024-01-15T11:00:00Z",
    "dot_cert_expires_at": "2025-01-15T11:00:00Z",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

**Required Role**: `admin`, `owner`

**Note**: Token and cert are only returned on creation. Use rotate endpoints to regenerate.

---

### POST /locations/{locationId}/rotate-doh-token
Rotate DoH token (invalidates old token).

**Response** (200):
```json
{
  "data": {
    "doh_token": "safedns_newxyz789...",
    "doh_token_issued_at": "2024-01-15T11:05:00Z"
  }
}
```

**Required Role**: `admin`, `owner`

---

### POST /locations/{locationId}/rotate-dot-cert
Rotate DoT certificate (invalidates old cert).

**Response** (200):
```json
{
  "data": {
    "dot_cert_pem": "-----BEGIN CERTIFICATE-----\n...",
    "dot_cert_key_pem": "-----BEGIN PRIVATE KEY-----\n...",
    "dot_cert_issued_at": "2024-01-15T11:05:00Z",
    "dot_cert_expires_at": "2025-01-15T11:05:00Z"
  }
}
```

**Required Role**: `admin`, `owner`

---

### PATCH /locations/{locationId}/policy
Assign policy to location.

**Request**:
```json
{
  "policy_id": "aa0e8400-e29b-41d4-a716-446655440000"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440000",
    "policy_id": "aa0e8400-e29b-41d4-a716-446655440000",
    "activated_at": "2024-01-15T11:10:00Z"
  }
}
```

**Required Role**: `admin`, `owner`

---

## List Management Endpoints

### GET /allowlists
Get allowlist for current tenant.

**Response** (200):
```json
{
  "data": [
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440000",
      "domain": "*.internal.example.com",
      "description": "Internal domains",
      "created_at": "2024-01-01T00:00:00Z",
      "created_by": "550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

**Required Role**: `analyst`, `admin`, `owner`, `read_only`

---

### POST /allowlists
Add domain to allowlist.

**Request**:
```json
{
  "domain": "example.com",
  "description": "Allowed domain"
}
```

**Response** (201):
```json
{
  "data": {
    "id": "ee0e8400-e29b-41d4-a716-446655440000",
    "domain": "example.com",
    "description": "Allowed domain",
    "created_at": "2024-01-15T11:15:00Z"
  }
}
```

**Required Role**: `admin`, `owner`

---

### DELETE /allowlists/{allowlistId}
Remove domain from allowlist.

**Response** (204): No content

**Required Role**: `admin`, `owner`

---

### GET /blocklists
Get blocklist for current tenant.

**Response** (200): Same format as allowlists

**Required Role**: `analyst`, `admin`, `owner`, `read_only`

---

### POST /blocklists
Add domain to blocklist.

**Request**:
```json
{
  "domain": "malicious-site.com",
  "description": "Known malicious domain"
}
```

**Response** (201): Same format as allowlists

**Required Role**: `admin`, `owner`

---

### DELETE /blocklists/{blocklistId}
Remove domain from blocklist.

**Response** (204): No content

**Required Role**: `admin`, `owner`

---

## Report Endpoints

### GET /reports/blocked-domains
Get top blocked domains.

**Query Parameters**:
- `location_id` (optional): Filter by location
- `start_time` (required): ISO 8601 timestamp
- `end_time` (required): ISO 8601 timestamp
- `limit` (optional, default: 100): Number of results

**Response** (200):
```json
{
  "data": [
    {
      "domain": "malicious-site.com",
      "block_count": 1523,
      "first_blocked": "2024-01-15T08:00:00Z",
      "last_blocked": "2024-01-15T12:00:00Z",
      "reason": "threat:malware"
    }
  ],
  "meta": {
    "start_time": "2024-01-15T00:00:00Z",
    "end_time": "2024-01-15T23:59:59Z",
    "total_blocks": 1523
  }
}
```

**Required Role**: `analyst`, `admin`, `owner`, `read_only`

---

### GET /reports/blocks-by-category
Get blocks grouped by category.

**Query Parameters**:
- `location_id` (optional)
- `start_time` (required)
- `end_time` (required)

**Response** (200):
```json
{
  "data": [
    {
      "category": "malware",
      "block_count": 5234,
      "percentage": 45.2
    },
    {
      "category": "phishing",
      "block_count": 3121,
      "percentage": 27.0
    }
  ],
  "meta": {
    "start_time": "2024-01-15T00:00:00Z",
    "end_time": "2024-01-15T23:59:59Z",
    "total_blocks": 11567
  }
}
```

**Required Role**: `analyst`, `admin`, `owner`, `read_only`

---

### GET /reports/threat-trends
Get threat blocking trends over time.

**Query Parameters**:
- `location_id` (optional)
- `start_time` (required)
- `end_time` (required)
- `interval` (optional, default: "1h"): Aggregation interval (1h, 1d)

**Response** (200):
```json
{
  "data": [
    {
      "timestamp": "2024-01-15T00:00:00Z",
      "malware_blocks": 234,
      "phishing_blocks": 156,
      "c2_blocks": 12,
      "total_blocks": 402
    },
    {
      "timestamp": "2024-01-15T01:00:00Z",
      "malware_blocks": 198,
      "phishing_blocks": 142,
      "c2_blocks": 8,
      "total_blocks": 348
    }
  ],
  "meta": {
    "start_time": "2024-01-15T00:00:00Z",
    "end_time": "2024-01-15T23:59:59Z",
    "interval": "1h"
  }
}
```

**Required Role**: `analyst`, `admin`, `owner`, `read_only`

---

## Audit Log Endpoints

### GET /audit-logs
Get audit logs for current tenant.

**Query Parameters**:
- `user_id` (optional): Filter by user
- `action` (optional): Filter by action
- `resource_type` (optional): Filter by resource type
- `start_time` (optional)
- `end_time` (optional)
- `page`, `limit`: Pagination

**Response** (200):
```json
{
  "data": [
    {
      "id": "ff0e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "action": "policy.created",
      "resource_type": "policy",
      "resource_id": "aa0e8400-e29b-41d4-a716-446655440000",
      "details": {
        "policy_name": "Strict Policy",
        "version": 2
      },
      "ip_address": "192.168.1.100",
      "created_at": "2024-01-15T10:45:00Z"
    }
  ],
  "meta": {
    "pagination": { ... }
  }
}
```

**Required Role**: `admin`, `owner`

---

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute per IP
- **Read endpoints**: 100 requests per minute per user
- **Write endpoints**: 20 requests per minute per user
- **Report endpoints**: 10 requests per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```
