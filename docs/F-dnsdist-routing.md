# F. dnsdist Routing Approach

## Overview

dnsdist serves as the edge entry point for all DNS queries in SafeDNS. It handles:
- DoH (DNS-over-HTTPS) and DoT (DNS-over-TLS) termination
- Tenant/location identification from credentials
- Rate limiting at multiple levels
- Routing to the Policy Decision Service
- Response handling based on policy decisions

## Architecture Position

```
                                    ┌─────────────────────────────────────────────┐
                                    │               dnsdist Edge                   │
                                    │                                              │
  Client ──DoH/DoT──►  ┌────────────┴──────────────────────────────────────────┐  │
                       │  TLS Termination (DoT 853 / DoH 443)                  │  │
                       └────────────┬──────────────────────────────────────────┘  │
                                    │                                              │
                       ┌────────────▼──────────────────────────────────────────┐  │
                       │  Credential Extraction & Tenant Resolution            │  │
                       │  - DoH: Bearer token from Authorization header        │  │
                       │  - DoT: Client cert CN/SAN or SNI fallback            │  │
                       └────────────┬──────────────────────────────────────────┘  │
                                    │                                              │
                       ┌────────────▼──────────────────────────────────────────┐  │
                       │  Rate Limiting (per-location, per-IP, global)         │  │
                       └────────────┬──────────────────────────────────────────┘  │
                                    │                                              │
                       ┌────────────▼──────────────────────────────────────────┐  │
                       │  Lua Action: Call Policy Decision Service             │  │
                       └────────────┬──────────────────────────────────────────┘  │
                                    │                                              │
                                    │ ┌─────────────────────────────────────────┐ │
                                    │ │ Decision: BLOCK → Return NXDOMAIN/null  │ │
                                    │ │ Decision: REWRITE → Return CNAME/A/AAAA │ │
                                    │ │ Decision: ALLOW → Forward to Unbound    │ │
                                    │ └─────────────────────────────────────────┘ │
                                    └─────────────────────────────────────────────┘
                                                          │
                                                          ▼ (ALLOW only)
                                                    ┌───────────┐
                                                    │  Unbound  │
                                                    │   Pool    │
                                                    └───────────┘
```

## Tenant Resolution Methods

### Method 1: DoH Token Authentication

DoH clients include a Bearer token in the Authorization header or as a URL path segment.

**URL Formats Supported:**
```
https://dns.safedns.example/dns-query                    # Token in header
https://dns.safedns.example/dns-query/{location_token}   # Token in path
```

**Token Format:**
```
{location_id_base64}.{timestamp}.{hmac_signature}
```

**Extraction Logic (Lua):**
```lua
-- dnsdist.conf: DoH token extraction

function extractDoHToken(dq)
    -- Try Authorization header first
    local auth_header = dq:getHTTPHeader("Authorization")
    if auth_header then
        local token = string.match(auth_header, "^Bearer%s+(.+)$")
        if token then
            return token
        end
    end
    
    -- Try URL path segment
    local path = dq:getHTTPPath()
    local token = string.match(path, "^/dns%-query/([A-Za-z0-9_%-%.]+)$")
    if token then
        return token
    end
    
    return nil
end

function validateDoHToken(token)
    -- Call Redis via LuaSocket or use dnsdist's built-in HTTP client
    -- Returns: { valid: bool, tenant_id: string, location_id: string }
    local result = httpQuery("http://policy-svc:8080/auth/validate-token", {
        method = "POST",
        body = '{"token": "' .. token .. '"}',
        headers = { ["Content-Type"] = "application/json" }
    })
    return result
end
```

### Method 2: DoT mTLS Client Certificate

DoT clients present a client certificate during TLS handshake. The certificate CN or SAN contains the location identifier.

**Certificate Subject Format:**
```
CN=loc_{location_id}.{tenant_id}.safedns.local
SAN: DNS:loc_{location_id}.{tenant_id}.safedns.local
```

**Extraction Logic (Lua):**
```lua
-- dnsdist.conf: DoT client cert extraction

function extractDoTClientCert(dq)
    -- Get client certificate from TLS session
    local cert_cn = dq:getClientCertificateCN()
    if cert_cn then
        -- Parse: loc_{location_id}.{tenant_id}.safedns.local
        local location_id, tenant_id = string.match(
            cert_cn, 
            "^loc_([a-f0-9%-]+)%.([a-f0-9%-]+)%.safedns%.local$"
        )
        if location_id and tenant_id then
            return {
                valid = true,
                tenant_id = tenant_id,
                location_id = location_id
            }
        end
    end
    return nil
end
```

### Method 3: SNI Fallback (DoT)

When mTLS is not available, use SNI-based tenant identification (less secure, for legacy clients).

**SNI Format:**
```
{location_token}.dot.safedns.example
```

**Extraction Logic (Lua):**
```lua
-- dnsdist.conf: DoT SNI extraction (fallback)

function extractDoTSNI(dq)
    local sni = dq:getSNI()
    if sni then
        local token = string.match(sni, "^([A-Za-z0-9_%-]+)%.dot%.safedns%.example$")
        if token then
            -- Validate token same as DoH
            return validateDoHToken(token)
        end
    end
    return nil
end
```

## Rate Limiting Architecture

Rate limiting is applied at three levels, all using Redis for state.

### Level 1: Global Rate Limit

Protects the entire service from DDoS.

```lua
-- Global: 100,000 QPS across all tenants
local globalRateLimit = 100000  -- queries per second

function checkGlobalRateLimit()
    local key = "ratelimit:global:" .. os.date("%Y%m%d%H%M%S")
    local current = redis:incr(key)
    if current == 1 then
        redis:expire(key, 2)  -- 2 second window
    end
    return current <= globalRateLimit
end
```

### Level 2: Per-Location Rate Limit

Prevents any single location from consuming excessive resources.

```lua
-- Per-location: based on tenant plan
-- Free: 1,000 QPS
-- Pro: 10,000 QPS
-- Enterprise: 50,000 QPS

function checkLocationRateLimit(location_id, limit)
    local key = "ratelimit:location:" .. location_id .. ":" .. os.date("%Y%m%d%H%M%S")
    local current = redis:incr(key)
    if current == 1 then
        redis:expire(key, 2)
    end
    return current <= limit
end
```

### Level 3: Per-Client-IP Rate Limit (within location)

Prevents a single client from abuse.

```lua
-- Per-IP within location: 100 QPS default
function checkClientRateLimit(location_id, client_ip)
    local key = "ratelimit:client:" .. location_id .. ":" .. client_ip .. ":" .. os.date("%Y%m%d%H%M%S")
    local current = redis:incr(key)
    if current == 1 then
        redis:expire(key, 2)
    end
    return current <= 100
end
```

### Rate Limit Response

When rate limited, return REFUSED rcode:

```lua
function handleRateLimit(dq, level)
    -- Log the rate limit event
    logRateLimitEvent(dq, level)
    
    -- Return REFUSED
    dq:setRcode(DNSRcode.REFUSED)
    return DNSAction.Spoof
end
```

## Policy Decision Service Integration

### HTTP API Call from dnsdist

```lua
-- Main policy decision function

function queryPolicyService(dq, tenant_id, location_id)
    local qname = dq:getQName():toString()
    local qtype = dq:getQType()
    local client_ip = dq:getRemote():toString()
    
    -- Build request
    local request_body = string.format([[{
        "tenant_id": "%s",
        "location_id": "%s", 
        "qname": "%s",
        "qtype": %d,
        "client_ip": "%s",
        "timestamp": "%s"
    }]], tenant_id, location_id, qname, qtype, client_ip, os.date("!%Y-%m-%dT%H:%M:%SZ"))
    
    -- Call Policy Decision Service
    local response = httpQuery("http://policy-svc:8080/evaluate", {
        method = "POST",
        body = request_body,
        headers = {
            ["Content-Type"] = "application/json",
            ["X-Request-ID"] = generateRequestID()
        },
        timeout = 50  -- 50ms timeout
    })
    
    return response
end
```

### Response Handling

```lua
-- Handle policy decision response

function handlePolicyResponse(dq, response)
    if response.decision == "ALLOW" then
        -- Forward to Unbound pool
        return DNSAction.Pool, "unbound"
        
    elseif response.decision == "BLOCK" then
        if response.block_type == "NXDOMAIN" then
            dq:setRcode(DNSRcode.NXDOMAIN)
            return DNSAction.Spoof
        else
            -- Null-route: return 0.0.0.0 for A, :: for AAAA
            local qtype = dq:getQType()
            if qtype == DNSQType.A then
                return DNSAction.Spoof, newCA("0.0.0.0")
            elseif qtype == DNSQType.AAAA then
                return DNSAction.Spoof, newCA("::")
            else
                dq:setRcode(DNSRcode.NXDOMAIN)
                return DNSAction.Spoof
            end
        end
        
    elseif response.decision == "REWRITE" then
        -- SafeSearch rewrite
        if response.rewrite_type == "CNAME" then
            dq:setContent(response.rewrite_target)
            return DNSAction.HeaderModify
        elseif response.rewrite_type == "A" then
            return DNSAction.Spoof, newCA(response.rewrite_target)
        elseif response.rewrite_type == "AAAA" then
            return DNSAction.Spoof, newCA(response.rewrite_target)
        end
    end
    
    -- Fallback: allow (fail-open)
    return DNSAction.Pool, "unbound"
end
```

## Complete dnsdist Configuration

```lua
-- /etc/dnsdist/dnsdist.conf

-- ============================================
-- BACKEND POOLS
-- ============================================

-- Unbound recursive resolver pool
newServer({
    address = "unbound:53",
    pool = "unbound",
    checkName = "health.safedns.local",
    checkInterval = 5,
    maxCheckFailures = 3,
    retries = 2
})

-- Add multiple Unbound instances for HA
newServer({address = "unbound-1:53", pool = "unbound"})
newServer({address = "unbound-2:53", pool = "unbound"})

-- Set load balancing for Unbound pool
setPoolServerPolicy(roundrobin, "unbound")

-- ============================================
-- TLS CONFIGURATION
-- ============================================

-- DoT listener (port 853)
addTLSLocal("0.0.0.0:853", 
    "/etc/dnsdist/certs/server.crt",
    "/etc/dnsdist/certs/server.key",
    {
        minTLSVersion = "tls1.2",
        ciphers = "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384",
        -- Client cert verification (optional, for mTLS)
        requestClientCertificate = true,
        requireClientCertificate = false,  -- Allow SNI fallback
        clientCAFile = "/etc/dnsdist/certs/client-ca.crt"
    }
)

-- DoH listener (port 443)
addDOHLocal("0.0.0.0:443",
    "/etc/dnsdist/certs/server.crt", 
    "/etc/dnsdist/certs/server.key",
    {"/dns-query", "/dns-query/"},
    {
        minTLSVersion = "tls1.2",
        library = "openssl"
    }
)

-- ============================================
-- LUA FUNCTIONS FOR TENANT RESOLUTION
-- ============================================

local http = require("socket.http")
local ltn12 = require("ltn12")
local json = require("cjson")

-- Cache for validated tokens (5 minute TTL)
local tokenCache = {}
local tokenCacheTTL = 300

function validateToken(token)
    -- Check cache first
    local cached = tokenCache[token]
    if cached and cached.expires > os.time() then
        return cached.result
    end
    
    -- Call Policy Service for validation
    local response_body = {}
    local res, code = http.request{
        url = "http://policy-svc:8080/auth/validate",
        method = "POST",
        headers = {
            ["Content-Type"] = "application/json",
            ["Content-Length"] = #('{"token":"' .. token .. '"}')
        },
        source = ltn12.source.string('{"token":"' .. token .. '"}'),
        sink = ltn12.sink.table(response_body)
    }
    
    if code == 200 then
        local result = json.decode(table.concat(response_body))
        tokenCache[token] = {
            result = result,
            expires = os.time() + tokenCacheTTL
        }
        return result
    end
    
    return nil
end

function resolveTenant(dq)
    local tenant_info = nil
    
    -- Try DoT client cert first
    local cert_cn = dq:getClientCertificateCN()
    if cert_cn then
        local loc_id, ten_id = string.match(cert_cn, "^loc_([a-f0-9%-]+)%.([a-f0-9%-]+)%.safedns%.local$")
        if loc_id and ten_id then
            return { tenant_id = ten_id, location_id = loc_id, auth_method = "mtls" }
        end
    end
    
    -- Try DoH Authorization header
    local auth = dq:getHTTPHeader("Authorization")
    if auth then
        local token = string.match(auth, "^Bearer%s+(.+)$")
        if token then
            local result = validateToken(token)
            if result and result.valid then
                result.auth_method = "bearer"
                return result
            end
        end
    end
    
    -- Try DoH path token
    local path = dq:getHTTPPath()
    if path then
        local token = string.match(path, "^/dns%-query/([A-Za-z0-9_%-%.]+)$")
        if token then
            local result = validateToken(token)
            if result and result.valid then
                result.auth_method = "path"
                return result
            end
        end
    end
    
    -- Try SNI fallback (DoT)
    local sni = dq:getSNI()
    if sni then
        local token = string.match(sni, "^([A-Za-z0-9_%-]+)%.dot%.safedns%.example$")
        if token then
            local result = validateToken(token)
            if result and result.valid then
                result.auth_method = "sni"
                return result
            end
        end
    end
    
    return nil
end

-- ============================================
-- RATE LIMITING FUNCTIONS
-- ============================================

local redis = require("redis")
local redisClient = redis.connect("redis", 6379)

function checkRateLimits(tenant_info, client_ip)
    local now = os.time()
    local window = math.floor(now / 1)  -- 1-second windows
    
    -- Global rate limit
    local global_key = "rl:global:" .. window
    local global_count = redisClient:incr(global_key)
    if global_count == 1 then
        redisClient:expire(global_key, 2)
    end
    if global_count > 100000 then
        return false, "global"
    end
    
    -- Location rate limit
    local loc_key = "rl:loc:" .. tenant_info.location_id .. ":" .. window
    local loc_count = redisClient:incr(loc_key)
    if loc_count == 1 then
        redisClient:expire(loc_key, 2)
    end
    local loc_limit = tenant_info.rate_limit or 1000
    if loc_count > loc_limit then
        return false, "location"
    end
    
    -- Per-IP rate limit
    local ip_key = "rl:ip:" .. tenant_info.location_id .. ":" .. client_ip .. ":" .. window
    local ip_count = redisClient:incr(ip_key)
    if ip_count == 1 then
        redisClient:expire(ip_key, 2)
    end
    if ip_count > 100 then
        return false, "client"
    end
    
    return true, nil
end

-- ============================================
-- POLICY EVALUATION
-- ============================================

function evaluatePolicy(dq, tenant_info)
    local qname = dq:getQName():toString()
    local qtype = dq:getQType()
    local client_ip = dq:getRemote():toString()
    
    local request = json.encode({
        tenant_id = tenant_info.tenant_id,
        location_id = tenant_info.location_id,
        qname = qname,
        qtype = qtype,
        client_ip = client_ip
    })
    
    local response_body = {}
    local res, code = http.request{
        url = "http://policy-svc:8080/evaluate",
        method = "POST",
        headers = {
            ["Content-Type"] = "application/json",
            ["Content-Length"] = #request
        },
        source = ltn12.source.string(request),
        sink = ltn12.sink.table(response_body),
        timeout = 0.05  -- 50ms timeout
    }
    
    if code == 200 then
        return json.decode(table.concat(response_body))
    end
    
    -- Fail-open on error
    return { decision = "ALLOW", reason = "policy_error" }
end

-- ============================================
-- MAIN QUERY HANDLING
-- ============================================

addAction(AllRule(), LuaAction(function(dq)
    local start_time = os.clock()
    
    -- Step 1: Resolve tenant
    local tenant_info = resolveTenant(dq)
    if not tenant_info then
        -- Unknown tenant - reject
        dq:setRcode(DNSRcode.REFUSED)
        return DNSAction.Spoof
    end
    
    -- Step 2: Check rate limits
    local client_ip = dq:getRemote():toString()
    local allowed, limit_type = checkRateLimits(tenant_info, client_ip)
    if not allowed then
        -- Rate limited
        dq:setTag("rate_limited", limit_type)
        dq:setRcode(DNSRcode.REFUSED)
        return DNSAction.Spoof
    end
    
    -- Step 3: Evaluate policy
    local decision = evaluatePolicy(dq, tenant_info)
    
    -- Step 4: Handle decision
    if decision.decision == "ALLOW" then
        dq:setTag("decision", "allow")
        dq:setTag("reason", decision.reason or "default")
        return DNSAction.Pool, "unbound"
        
    elseif decision.decision == "BLOCK" then
        dq:setTag("decision", "block")
        dq:setTag("reason", decision.reason or "policy")
        dq:setTag("category", decision.category or "")
        
        if decision.block_type == "null" then
            local qtype = dq:getQType()
            if qtype == DNSQType.A then
                return DNSAction.Spoof, newCA("0.0.0.0")
            elseif qtype == DNSQType.AAAA then
                return DNSAction.Spoof, newCA("::")
            end
        end
        dq:setRcode(DNSRcode.NXDOMAIN)
        return DNSAction.Spoof
        
    elseif decision.decision == "REWRITE" then
        dq:setTag("decision", "rewrite")
        dq:setTag("reason", decision.reason or "safesearch")
        
        if decision.rewrite_type == "A" then
            return DNSAction.Spoof, newCA(decision.target)
        elseif decision.rewrite_type == "AAAA" then
            return DNSAction.Spoof, newCA(decision.target)
        elseif decision.rewrite_type == "CNAME" then
            -- For CNAME, we need to return a CNAME record
            return DNSAction.Spoof, newCNAME(decision.target)
        end
    end
    
    -- Default: allow
    return DNSAction.Pool, "unbound"
end))

-- ============================================
-- LOGGING
-- ============================================

-- Response logging (for ClickHouse)
addResponseAction(AllRule(), LuaResponseAction(function(dr)
    local qname = dr:getQName():toString()
    local qtype = dr:getQType()
    local rcode = dr:getRcode()
    local latency = dr:getQueryTime()
    
    local decision = dr:getTag("decision") or "allow"
    local reason = dr:getTag("reason") or "default"
    local category = dr:getTag("category") or ""
    local tenant_id = dr:getTag("tenant_id") or ""
    local location_id = dr:getTag("location_id") or ""
    
    -- Send to logging endpoint asynchronously
    local log_entry = json.encode({
        timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        tenant_id = tenant_id,
        location_id = location_id,
        qname = qname,
        qtype = qtype,
        action = decision,
        reason = reason,
        category = category,
        rcode = rcode,
        latency_ms = latency * 1000
    })
    
    -- Fire-and-forget to logging service
    http.request{
        url = "http://policy-svc:8080/log",
        method = "POST",
        headers = {
            ["Content-Type"] = "application/json",
            ["Content-Length"] = #log_entry
        },
        source = ltn12.source.string(log_entry)
    }
    
    return DNSResponseAction.None
end))

-- ============================================
-- HEALTH CHECK
-- ============================================

-- Internal health check listener (not exposed externally)
addLocal("0.0.0.0:5300")

-- Health check rule
addAction(QNameRule("health.internal"), LuaAction(function(dq)
    dq:setRcode(DNSRcode.NOERROR)
    return DNSAction.Spoof, newCA("127.0.0.1")
end))

-- ============================================
-- CACHE CONFIGURATION
-- ============================================

-- Response cache (helps with repeated queries)
pc = newPacketCache(100000, {
    maxTTL = 300,
    minTTL = 60,
    temporaryFailureTTL = 10,
    staleTTL = 60,
    dontAge = false
})
getPool("unbound"):setCache(pc)

-- ============================================
-- METRICS
-- ============================================

-- Enable web server for metrics (internal only)
webserver("0.0.0.0:8083", "safedns", "change-this-password")
setWebserverConfig({
    acl = "127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16"
})

-- Carbon/Graphite metrics export (optional)
-- carbonServer("graphite:2003", "safedns.dnsdist")

-- ============================================
-- SECURITY SETTINGS
-- ============================================

-- Limit query size
setMaxTCPClientThreads(1000)
setMaxTCPQueuedConnections(1000)
setMaxTCPConnectionsPerClient(10)
setMaxTCPConnectionDuration(30)

-- Security limits
setSecurityPollSuffix("")
setSecurityPollInterval(0)  -- Disable security polling
```

## Request Flow Diagrams

### DoH Request Flow

```
1. Client sends HTTPS request to dns.safedns.example/dns-query
   Headers: Authorization: Bearer {token}
   Body: DNS wire format query

2. dnsdist receives on port 443

3. TLS termination (TLS 1.2+)

4. Extract token from Authorization header or URL path

5. Validate token against Redis cache or Policy Service
   → Cache hit: retrieve tenant_id, location_id
   → Cache miss: call Policy Service /auth/validate

6. Check rate limits (global → location → client IP)
   → Exceeded: return REFUSED

7. Call Policy Service /evaluate with:
   {tenant_id, location_id, qname, qtype, client_ip}

8. Receive decision:
   → ALLOW: forward to Unbound pool
   → BLOCK: return NXDOMAIN or null-route
   → REWRITE: return CNAME/A/AAAA for SafeSearch

9. For ALLOW: receive response from Unbound

10. Log query to ClickHouse via Policy Service

11. Return DNS response to client
```

### DoT Request Flow

```
1. Client initiates TLS connection to dns.safedns.example:853
   - Presents client certificate (mTLS) OR
   - Uses SNI: {token}.dot.safedns.example

2. dnsdist receives on port 853

3. TLS handshake with optional client cert verification

4. Extract credentials:
   → mTLS: parse CN/SAN for location_id.tenant_id
   → SNI: extract token and validate

5-11. Same as DoH flow steps 5-11
```

## Performance Considerations

### Latency Budget (target: <10ms overhead)

| Component | Target | Notes |
|-----------|--------|-------|
| TLS termination | 1-2ms | Hardware acceleration, session resumption |
| Token validation | 0.5ms | Local cache hit |
| Token validation | 2-3ms | Redis lookup |
| Rate limit check | 0.5ms | Redis pipeline |
| Policy evaluation | 2-3ms | Policy Service call |
| Logging | 0ms | Async, fire-and-forget |
| **Total overhead** | **4-6ms** | Plus network RTT to Unbound |

### Scaling Recommendations

1. **Horizontal scaling**: Run multiple dnsdist instances behind a TCP load balancer
2. **Token cache**: Use local LRU cache with short TTL to reduce Redis calls
3. **Connection pooling**: Reuse HTTP connections to Policy Service
4. **Unbound pool**: Multiple Unbound instances with round-robin
5. **Response cache**: Cache allowed responses to reduce Unbound load

### Cache Invalidation

Token and policy caches are invalidated via:
1. TTL expiration (token cache: 5 min, policy cache: 1 min)
2. Redis Pub/Sub notifications for immediate invalidation
3. Policy Service version checks on each request

```lua
-- Subscribe to invalidation channel
local redis_sub = redis.connect("redis", 6379)
redis_sub:subscribe("safedns:invalidate")

function handleInvalidation(channel, message)
    local data = json.decode(message)
    if data.type == "token" then
        tokenCache[data.token] = nil
    elseif data.type == "location" then
        -- Clear all tokens for this location
        for token, info in pairs(tokenCache) do
            if info.result.location_id == data.location_id then
                tokenCache[token] = nil
            end
        end
    end
end
```

## Error Handling

### Fail-Open vs Fail-Closed

SafeDNS defaults to **fail-open** for availability:

```lua
-- Error handling strategy
local FAIL_MODE = "open"  -- or "closed"

function handlePolicyError(dq, error)
    log("Policy evaluation error: " .. error)
    
    if FAIL_MODE == "open" then
        -- Allow query, log as policy_error
        dq:setTag("decision", "allow")
        dq:setTag("reason", "policy_error")
        return DNSAction.Pool, "unbound"
    else
        -- Block query, return SERVFAIL
        dq:setRcode(DNSRcode.SERVFAIL)
        return DNSAction.Spoof
    end
end
```

### Circuit Breaker

Implement circuit breaker for Policy Service:

```lua
local circuitBreaker = {
    failures = 0,
    lastFailure = 0,
    threshold = 5,
    resetTimeout = 30,
    state = "closed"  -- closed, open, half-open
}

function checkCircuitBreaker()
    if circuitBreaker.state == "closed" then
        return true
    elseif circuitBreaker.state == "open" then
        if os.time() - circuitBreaker.lastFailure > circuitBreaker.resetTimeout then
            circuitBreaker.state = "half-open"
            return true
        end
        return false
    else  -- half-open
        return true
    end
end

function recordSuccess()
    circuitBreaker.failures = 0
    circuitBreaker.state = "closed"
end

function recordFailure()
    circuitBreaker.failures = circuitBreaker.failures + 1
    circuitBreaker.lastFailure = os.time()
    if circuitBreaker.failures >= circuitBreaker.threshold then
        circuitBreaker.state = "open"
    end
end
```

## Monitoring & Alerting

### Key Metrics to Track

1. **Query volume**: queries/sec by tenant, location, decision
2. **Latency**: p50, p95, p99 for total processing time
3. **Rate limiting**: rate limit events by level
4. **Errors**: Policy Service errors, timeout rate
5. **Cache**: hit rate for token and response caches
6. **TLS**: handshake errors, certificate issues

### Prometheus Metrics

dnsdist exposes metrics at `/metrics` endpoint:

```
# HELP dnsdist_queries Total queries
# TYPE dnsdist_queries counter
dnsdist_queries{pool="unbound",decision="allow"} 1234567

# HELP dnsdist_latency_seconds Query processing latency
# TYPE dnsdist_latency_seconds histogram
dnsdist_latency_seconds_bucket{le="0.001"} 100000

# HELP dnsdist_ratelimit_events Rate limit events
# TYPE dnsdist_ratelimit_events counter  
dnsdist_ratelimit_events{level="global"} 0
dnsdist_ratelimit_events{level="location"} 42
dnsdist_ratelimit_events{level="client"} 156
```

## Security Hardening

1. **TLS Configuration**
   - TLS 1.2+ only
   - Strong cipher suites (ECDHE, AES-GCM)
   - HSTS headers for DoH

2. **Client Certificate Validation**
   - Verify against internal CA only
   - Check certificate revocation (CRL/OCSP)
   - Validate CN/SAN format

3. **Token Security**
   - HMAC-SHA256 signed tokens
   - Short expiration (rotatable)
   - No sensitive data in token

4. **Network Isolation**
   - Policy Service on internal network only
   - Unbound on internal network only
   - Redis on internal network only

5. **Resource Limits**
   - Max connections per client
   - Query size limits
   - TCP timeout limits
