# P2 Features Implementation

This document details the P2 (Medium Priority) features implemented for SafeDNS.

## Overview

P2 features add advanced customization, developer tooling, and enterprise integrations:

1. **Custom Block Pages** - Branded blocking pages with access request workflow
2. **API Keys** - Per-user API key management with scopes and rate limiting
3. **Team Invitations** - Invite team members via email with role assignment
4. **SIEM Integration** - Splunk, Elasticsearch, Microsoft Sentinel, Syslog
5. **Webhooks** - Real-time event notifications

---

## 1. Custom Block Pages

### Features
- Create multiple branded block pages per tenant
- Customize colors, logo, messaging, and footer
- Show/hide blocked domain, category, timestamp
- Enable access request form on block pages
- Review and approve/deny access requests
- Assign block pages to specific locations

### Database Tables
- `block_pages` - Block page configurations
- `access_requests` - User requests for blocked domain access

### API Endpoints

```
# Block Pages
GET    /block-pages                      List block pages
POST   /block-pages                      Create block page
GET    /block-pages/:id                  Get block page details
PATCH  /block-pages/:id                  Update block page
DELETE /block-pages/:id                  Delete block page
POST   /block-pages/:id/set-default      Set as default block page
GET    /block-pages/:id/preview          Preview block page HTML
GET    /block-pages/render/:tenantSlug   Public: Render block page

# Access Requests
GET    /block-pages/access-requests      List access requests
POST   /block-pages/access-requests/public  Submit access request
POST   /block-pages/access-requests/:id/review  Approve/deny request
```

### UI Pages
- `/dashboard/block-pages` - Manage block pages and access requests

---

## 2. API Keys

### Features
- Generate API keys with custom names
- Configurable scopes: read, write, admin
- Rate limiting per key (requests/minute)
- Optional expiration dates
- Track usage statistics
- Revoke keys instantly

### Database Tables
- `api_keys` - API key configurations
- `api_key_usage` - Request logging for analytics

### API Endpoints

```
GET    /api-keys              List API keys
POST   /api-keys              Create API key (returns full key once)
GET    /api-keys/:id          Get API key details
PATCH  /api-keys/:id          Update API key
DELETE /api-keys/:id          Delete API key
POST   /api-keys/:id/revoke   Revoke API key
GET    /api-keys/:id/usage    Get usage statistics
```

### Authentication
```bash
# Include API key in Authorization header
curl -H "Authorization: Bearer sk_live_xxx" \
  https://api.safedns.io/v1/policies
```

### UI Pages
- `/dashboard/settings/api-keys` - Manage API keys

---

## 3. Team Invitations

### Features
- Invite users by email
- Assign role on invitation (admin, analyst, readonly)
- Include personal message in invitation
- Bulk invite multiple users
- Resend pending invitations
- Revoke invitations
- 7-day expiration with auto-cleanup

### Database Tables
- `team_invitations` - Invitation records with status tracking

### API Endpoints

```
# Admin endpoints
GET    /invitations           List all invitations
GET    /invitations/pending   List pending invitations
POST   /invitations           Send invitation
POST   /invitations/bulk      Bulk invite
POST   /invitations/:id/resend  Resend invitation
DELETE /invitations/:id       Revoke invitation

# Public endpoints
GET    /invitations/info?token=xxx  Get invitation details
POST   /invitations/accept          Accept invitation (create account)
```

### Email Flow
1. Admin invites user → invitation email sent
2. User clicks link → sees invitation details
3. User creates password → account created
4. User redirected to login

### UI Pages
- `/dashboard/settings/team` - Manage team and invitations
- `/invite/accept?token=xxx` - Accept invitation page

---

## 4. SIEM Integration

### Supported Platforms
- **Splunk** - HTTP Event Collector (HEC)
- **Elasticsearch** - REST API
- **Microsoft Sentinel** - Log Analytics API
- **Syslog** - TCP/UDP/TLS with CEF/LEEF/JSON formats

### Features
- Multiple integrations per tenant
- Filter logs by type (blocked, allowed, threats)
- Minimum severity threshold
- Connection testing
- Error tracking with auto-disable after failures
- Encrypted credential storage

### Database Tables
- `siem_integrations` - Integration configurations

### API Endpoints

```
# Create integrations
POST   /siem/splunk           Add Splunk integration
POST   /siem/elastic          Add Elasticsearch integration
POST   /siem/sentinel         Add Microsoft Sentinel integration
POST   /siem/syslog           Add Syslog integration

# Manage integrations
GET    /siem                  List all integrations
GET    /siem/:id              Get integration details
PATCH  /siem/:id              Update integration
DELETE /siem/:id              Delete integration
POST   /siem/:id/enable       Enable integration
POST   /siem/:id/disable      Disable integration
POST   /siem/:id/test         Test connection
```

### Log Format (JSON)
```json
{
  "timestamp": "2024-03-15T10:30:00Z",
  "tenant_id": "xxx",
  "location_id": "xxx",
  "query": {
    "domain": "malware.example.com",
    "type": "A",
    "client_ip": "192.168.1.100"
  },
  "action": "blocked",
  "category": "malware",
  "policy_id": "xxx",
  "response_time_ms": 5
}
```

### UI Pages
- `/dashboard/settings/integrations` - Configure SIEM integrations

---

## 5. Webhooks

### Features
- Subscribe to specific event types
- HMAC signature verification (optional)
- Custom headers support
- Delivery history with retry tracking
- Auto-disable after failures
- Test webhook delivery

### Supported Events
| Event | Description |
|-------|-------------|
| `policy.created` | New policy created |
| `policy.updated` | Policy modified |
| `policy.deleted` | Policy deleted |
| `location.created` | New location added |
| `location.updated` | Location modified |
| `location.deleted` | Location removed |
| `user.created` | New user account |
| `user.invited` | User invited |
| `user.deleted` | User removed |
| `threat.detected` | Security threat blocked |
| `report.generated` | Scheduled report ready |
| `subscription.created` | New subscription |
| `subscription.updated` | Subscription changed |
| `subscription.cancelled` | Subscription cancelled |

### Database Tables
- `webhooks` - Webhook configurations
- `webhook_deliveries` - Delivery history and logs

### API Endpoints

```
GET    /webhooks/events       List available events
GET    /webhooks              List webhooks
POST   /webhooks              Create webhook
GET    /webhooks/:id          Get webhook details
PATCH  /webhooks/:id          Update webhook
DELETE /webhooks/:id          Delete webhook
POST   /webhooks/:id/enable   Enable webhook
POST   /webhooks/:id/disable  Disable webhook
POST   /webhooks/:id/test     Send test event
GET    /webhooks/:id/deliveries  Get delivery history
```

### Webhook Payload
```json
{
  "event": "threat.detected",
  "timestamp": "2024-03-15T10:30:00Z",
  "data": {
    "domain": "malware.example.com",
    "category": "malware",
    "client_ip": "192.168.1.100",
    "location_id": "xxx",
    "policy_id": "xxx"
  }
}
```

### Signature Verification
```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return `sha256=${expected}` === signature;
}

// In your webhook handler
const signature = req.headers['x-webhook-signature'];
if (!verifySignature(req.body, signature, webhookSecret)) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### UI Pages
- `/dashboard/settings/integrations` - Configure webhooks

---

## Environment Variables

```bash
# SIEM encryption
SIEM_ENCRYPTION_KEY=your-32-byte-hex-key

# App URL for invitation links
APP_URL=https://app.safedns.io
```

---

## Testing Checklist

### Block Pages
- [ ] Create block page with custom branding
- [ ] Preview block page
- [ ] Set default block page
- [ ] Submit access request from block page
- [ ] Approve/deny access request
- [ ] Delete non-default block page

### API Keys
- [ ] Create API key with different scopes
- [ ] Copy key on creation (only shown once)
- [ ] Test API authentication with key
- [ ] View usage statistics
- [ ] Revoke API key
- [ ] Verify revoked key is rejected

### Team Invitations
- [ ] Send single invitation
- [ ] Send bulk invitations
- [ ] Accept invitation and create account
- [ ] Resend pending invitation
- [ ] Revoke invitation
- [ ] Handle expired invitation

### SIEM Integration
- [ ] Configure Splunk HEC
- [ ] Configure Elasticsearch
- [ ] Configure Syslog
- [ ] Test connection
- [ ] Verify logs are forwarded
- [ ] Handle connection errors

### Webhooks
- [ ] Create webhook with events
- [ ] Test webhook delivery
- [ ] Verify signature
- [ ] View delivery history
- [ ] Handle failed deliveries
