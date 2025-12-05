# F. dnsdist Routing Approach

## Overview

dnsdist serves as the edge entry point for all DNS queries. It handles:
1. **Protocol termination**: DoH (port 443) and DoT (port 853)
2. **Tenant identification**: Extract tenant/location from token or certificate
3. **Rate limiting**: Per-location and per-tenant limits
4. **Routing**: Forward queries to Policy Decision Service, then to Unbound if ALLOWed

## dnsdist Configuration Structure

### Main Configuration File (`dnsdist.conf`)

```lua
-- Global settings
setLocal("0.0.0.0:53", { doTCP = true, reusePort = true })
setLocal("0.0.0.0:443", { doTCP = true, reusePort = true }) -- DoH
setLocal("0.0.0.0:853", { doTCP = true, reusePort = true }) -- DoT

-- Backend pools
newServer({address = "127.0.0.1:8053", name = "policy-service", pool = "policy"})
newServer({address = "127.0.0.1:5300", name = "unbound-1", pool = "recursion"})
newServer({address = "127.0.0.1:5301", name = "unbound-2", pool = "recursion"})

-- Lua script for tenant resolution and policy evaluation
loadFile("/etc/dnsdist/tenant-resolver.lua")

-- Action rules (executed in order)
addAction(AllRule(), LuaAction(tenantIdentifyAndRoute))
```

### Tenant Resolution Lua Script (`tenant-resolver.lua`)

```lua
-- Cache for tenant/location lookups (in-memory, TTL 5min)
local tenant_cache = {}
local cache_ttl = 300

-- Redis connection (for token/cert lookups)
local redis = require "redis"
local redis_client = redis.connect("127.0.0.1", 6379)

-- Policy Decision Service endpoint
local policy_service = "127.0.0.1:8053"

-- Rate limit counters (sliding window in Redis)
local function checkRateLimit(location_id, remote_addr)
    local key = "ratelimit:" .. location_id .. ":" .. math.floor(os.time() / 60)
    local count = redis_client:incr(key)
    redis_client:expire(key, 60)
    
    -- Per-location limit: 1000 QPS
    if count > 1000 then
        return false, "rate_limit_exceeded"
    end
    
    -- Per-tenant aggregate limit (check separately)
    -- Implementation depends on tenant_id lookup
    
    return true, nil
end

-- Extract tenant/location from DoH token
local function identifyFromDoHToken(header_token)
    if not header_token then
        return nil, nil, "no_token"
    end
    
    -- Hash token for lookup
    local token_hash = sha256(header_token)
    
    -- Check cache first
    if tenant_cache[token_hash] and 
       (os.time() - tenant_cache[token_hash].cached_at) < cache_ttl then
        return tenant_cache[token_hash].tenant_id, 
               tenant_cache[token_hash].location_id, nil
    end
    
    -- Lookup in Redis
    local key = "location:token:" .. token_hash
    local data = redis_client:get(key)
    
    if not data then
        return nil, nil, "invalid_token"
    end
    
    local info = json.decode(data)
    
    -- Cache result
    tenant_cache[token_hash] = {
        tenant_id = info.tenant_id,
        location_id = info.location_id,
        cached_at = os.time()
    }
    
    return info.tenant_id, info.location_id, nil
end

-- Extract tenant/location from DoT certificate
local function identifyFromDoTCert(cert_serial)
    if not cert_serial then
        return nil, nil, "no_cert"
    end
    
    -- Check cache
    if tenant_cache[cert_serial] and 
       (os.time() - tenant_cache[cert_serial].cached_at) < cache_ttl then
        return tenant_cache[cert_serial].tenant_id,
               tenant_cache[cert_serial].location_id, nil
    end
    
    -- Lookup in Redis
    local key = "location:cert:" .. cert_serial
    local data = redis_client:get(key)
    
    if not data then
        return nil, nil, "invalid_cert"
    end
    
    local info = json.decode(data)
    
    -- Cache result
    tenant_cache[cert_serial] = {
        tenant_id = info.tenant_id,
        location_id = info.location_id,
        cached_at = os.time()
    }
    
    return info.tenant_id, info.location_id, nil
end

-- Call Policy Decision Service
local function evaluatePolicy(tenant_id, location_id, qname, qtype)
    local http = require "http"
    
    local url = "http://" .. policy_service .. "/v1/evaluate"
    local body = json.encode({
        tenant_id = tenant_id,
        location_id = location_id,
        qname = qname,
        qtype = qtype,
        timestamp = os.time()
    })
    
    local response = http.post(url, {
        headers = {["Content-Type"] = "application/json"},
        body = body,
        timeout = 0.05 -- 50ms timeout
    })
    
    if not response or response.status_code ~= 200 then
        -- Fail open to ALLOW (with audit)
        logWarning("Policy service unavailable, allowing query")
        return "ALLOW", "policy_service_error"
    end
    
    local decision = json.decode(response.body)
    return decision.action, decision.reason
end

-- Main action function
function tenantIdentifyAndRoute(dq)
    local tenant_id, location_id, err
    
    -- Identify tenant based on protocol
    if dq.protocol == "DoH" then
        -- Extract Bearer token from HTTP headers
        local auth_header = dq:getHTTPHeader("Authorization")
        if auth_header then
            local token = string.match(auth_header, "Bearer%s+(.+)")
            tenant_id, location_id, err = identifyFromDoHToken(token)
        else
            tenant_id, location_id, err = nil, nil, "no_auth_header"
        end
    elseif dq.protocol == "DoT" then
        -- Extract certificate serial from TLS context
        local cert_serial = dq:getTLSCertSerial()
        tenant_id, location_id, err = identifyFromDoTCert(cert_serial)
    else
        -- UDP/TCP 53 (optional, behind customer forwarders)
        -- Use SNI or IP-based mapping (not recommended for production)
        tenant_id, location_id, err = identifyFromSNI(dq)
    end
    
    -- Reject if no tenant identified
    if not tenant_id or not location_id then
        logWarning("Query rejected: " .. (err or "unknown"))
        dq:setRCode(pdns.NXDOMAIN)
        return DNSAction.Nxdomain, ""
    end
    
    -- Rate limiting
    local allowed, rate_err = checkRateLimit(location_id, dq.remoteaddr:toString())
    if not allowed then
        logWarning("Rate limit exceeded for location: " .. location_id)
        dq:setRCode(pdns.SERVFAIL)
        return DNSAction.ServFail, ""
    end
    
    -- Evaluate policy
    local action, reason = evaluatePolicy(
        tenant_id,
        location_id,
        dq.qname:toString(),
        dq.qtype
    )
    
    -- Handle decision
    if action == "BLOCK" then
        -- Return NXDOMAIN or 0.0.0.0/:: based on policy
        dq:setRCode(pdns.NXDOMAIN)
        
        -- Optional: return null route (0.0.0.0 for A, :: for AAAA)
        if dq.qtype == pdns.A then
            dq:addAnswer(pdns.A, "0.0.0.0", 300)
            return DNSAction.Allow, ""
        elseif dq.qtype == pdns.AAAA then
            dq:addAnswer(pdns.AAAA, "::", 300)
            return DNSAction.Allow, ""
        end
        
        return DNSAction.Nxdomain, ""
        
    elseif action == "REWRITE" then
        -- SafeSearch rewrite: return CNAME or A/AAAA
        -- Policy service returns rewrite_target
        -- Implementation depends on rewrite_target format
        
        -- For now, forward to Unbound with modified qname
        -- (Policy service should return full rewrite details)
        dq:setTag("rewrite", "true")
        dq:setTag("tenant_id", tenant_id)
        dq:setTag("location_id", location_id)
        dq:setTag("reason", reason)
        return DNSAction.Allow, "recursion"
        
    else -- ALLOW
        -- Forward to Unbound pool for recursion
        dq:setTag("tenant_id", tenant_id)
        dq:setTag("location_id", location_id)
        dq:setTag("reason", reason)
        return DNSAction.Allow, "recursion"
    end
end

-- Logging function (called after response)
function postResolve(dq)
    -- Extract tags set during evaluation
    local tenant_id = dq:getTag("tenant_id")
    local location_id = dq:getTag("location_id")
    local reason = dq:getTag("reason") or "unknown"
    local action = dq:getTag("action") or "ALLOW"
    
    -- Log to ClickHouse (async, non-blocking)
    -- Implementation: HTTP POST to ClickHouse HTTP interface
    -- Or use dnsdist's built-in logging
    
    logInfo(string.format(
        "DNS query: tenant=%s location=%s qname=%s qtype=%d action=%s reason=%s rcode=%d latency=%dms",
        tenant_id or "unknown",
        location_id or "unknown",
        dq.qname:toString(),
        dq.qtype,
        action,
        reason,
        dq:getRCode(),
        dq.latency / 1000 -- microseconds to milliseconds
    ))
end
```

## Rate Limiting Strategy

### Per-Location Limits
- **Limit**: 1000 queries per second per location
- **Window**: 60-second sliding window
- **Storage**: Redis counters with key `ratelimit:{location_id}:{window_start}`
- **Action**: Return SERVFAIL if exceeded

### Per-Tenant Aggregate Limits
- **Limit**: 10000 queries per second per tenant (across all locations)
- **Window**: 60-second sliding window
- **Storage**: Redis counters with key `ratelimit:tenant:{tenant_id}:{window_start}`
- **Action**: Return SERVFAIL if exceeded

### Implementation

```lua
local function checkRateLimit(location_id, tenant_id, remote_addr)
    local now = os.time()
    local window_start = math.floor(now / 60)
    
    -- Per-location limit
    local location_key = "ratelimit:location:" .. location_id .. ":" .. window_start
    local location_count = redis_client:incr(location_key)
    redis_client:expire(location_key, 60)
    
    if location_count > 1000 then
        return false, "location_rate_limit_exceeded"
    end
    
    -- Per-tenant aggregate limit
    local tenant_key = "ratelimit:tenant:" .. tenant_id .. ":" .. window_start
    local tenant_count = redis_client:incr(tenant_key)
    redis_client:expire(tenant_key, 60)
    
    if tenant_count > 10000 then
        return false, "tenant_rate_limit_exceeded"
    end
    
    return true, nil
end
```

## Tenant Resolution Flow

### DoH (DNS-over-HTTPS)

```
Client → dnsdist (port 443)
    │
    ├─ Extract Authorization header
    ├─ Parse Bearer token
    ├─ Hash token (SHA-256)
    ├─ Lookup in Redis: location:token:{hash}
    │
    ├─ Cache hit → Use cached tenant/location
    └─ Cache miss → Query Redis → Cache result
```

### DoT (DNS-over-TLS)

```
Client → dnsdist (port 853)
    │
    ├─ Extract client certificate from TLS context
    ├─ Get certificate serial number
    ├─ Lookup in Redis: location:cert:{serial}
    │
    ├─ Cache hit → Use cached tenant/location
    └─ Cache miss → Query Redis → Cache result
```

### SNI Fallback (Optional, for UDP/TCP 53)

```
Client → dnsdist (port 53)
    │
    ├─ Extract SNI from TLS handshake (if TLS)
    ├─ Parse tenant domain: tenant-{id}.safedns.io
    ├─ Extract tenant_id from domain
    ├─ Lookup location by IP or default location
    │
    └─ Use tenant/location
```

## Policy Decision Service Integration

dnsdist calls Policy Decision Service via HTTP:

**Request**:
```http
POST http://127.0.0.1:8053/v1/evaluate
Content-Type: application/json

{
  "tenant_id": "uuid",
  "location_id": "uuid",
  "qname": "example.com",
  "qtype": 1,
  "timestamp": 1642248000
}
```

**Response**:
```json
{
  "action": "ALLOW",
  "reason": "default",
  "category": null,
  "rcode": 0,
  "rewrite_target": null
}
```

**Timeout**: 50ms (fail open to ALLOW if timeout)

## Routing to Unbound

After policy evaluation, if action is ALLOW or REWRITE:

1. dnsdist forwards query to Unbound pool
2. Unbound performs recursive resolution
3. Unbound validates DNSSEC
4. Unbound returns answer to dnsdist
5. dnsdist returns answer to client

**Pool Configuration**:
```lua
-- Unbound pool with health checks
newServer({address = "127.0.0.1:5300", name = "unbound-1", pool = "recursion", checkInterval = 1000})
newServer({address = "127.0.0.1:5301", name = "unbound-2", pool = "recursion", checkInterval = 1000})

-- Round-robin load balancing
setServerPolicy(roundrobin)
```

## Logging Integration

dnsdist logs every query with:
- Tenant ID
- Location ID
- Query name and type
- Action (ALLOW/BLOCK/REWRITE)
- Reason code
- Response code
- Latency

**Log Format**:
```
timestamp=2024-01-15T10:30:00Z tenant_id=... location_id=... qname=example.com qtype=1 action=ALLOW reason=default rcode=0 latency_ms=5
```

**Destination**: ClickHouse HTTP interface (async, non-blocking)

## Error Handling

1. **Policy service unavailable**: Fail open to ALLOW (with audit log)
2. **Redis unavailable**: Use cached tenant mappings (stale OK for short periods)
3. **Unbound unavailable**: Return SERVFAIL
4. **Invalid token/cert**: Return NXDOMAIN
5. **Rate limit exceeded**: Return SERVFAIL

## Security Considerations

1. **Token validation**: Always hash tokens before Redis lookup
2. **Certificate validation**: Verify certificate chain and expiration
3. **Rate limit bypass prevention**: Rate limits enforced at dnsdist, not client-side
4. **Tenant isolation**: No default tenant fallback; reject if tenant unknown
5. **TLS security**: TLS 1.3 only, no downgrade allowed
