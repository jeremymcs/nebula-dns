# E. Policy Evaluation Algorithm + Data Structures

## Overview

Policy evaluation must be **O(1) average time** to handle high query volumes. This is achieved through:
1. Pre-compiled policy snapshots cached in Redis
2. In-memory data structures optimized for fast lookups
3. Early exit on first match (allowlist > blocklist > category > threat)

## Policy Snapshot Structure

A policy snapshot is a compiled, immutable JSON structure loaded from Redis:

```json
{
  "policy_id": "uuid",
  "version": 2,
  "compiled_at": "2024-01-15T10:00:00Z",
  "config": {
    "block_categories": ["malware", "phishing", "adult"],
    "block_threats": true,
    "safe_search_enabled": true,
    "schedule": { ... }
  },
  "allowlist": {
    "exact": ["example.com", "trusted.org"],
    "wildcards": ["*.internal.example.com", "*.trusted.org"]
  },
  "blocklist": {
    "exact": ["bad-site.com"],
    "wildcards": ["*.malicious.com"]
  },
  "category_map": {
    "malware.com": ["malware"],
    "phishing.net": ["phishing"],
    "adult-site.com": ["adult"]
  },
  "threat_map": {
    "c2-server.com": {
      "type": "c2",
      "feed": "threat-intel-v1"
    }
  },
  "safe_search_rewrites": {
    "google.com": "forcesafesearch.google.com",
    "bing.com": "strict.bing.com"
  }
}
```

## In-Memory Data Structures

### Trie for Wildcard Matching

For efficient wildcard domain matching (e.g., `*.example.com`), use a reverse-domain trie:

```
Root
  └── com
      ├── example
      │   └── * (wildcard match)
      └── malicious
          └── * (wildcard match)
```

**Go implementation**:
```go
type WildcardTrie struct {
    children map[string]*WildcardTrie
    isWildcard bool
    value interface{} // policy action or category
}

func (t *WildcardTrie) Insert(domain string, value interface{}) {
    parts := reverseDomainParts(domain) // ["com", "example", "*"]
    node := t
    for _, part := range parts {
        if node.children == nil {
            node.children = make(map[string]*WildcardTrie)
        }
        if node.children[part] == nil {
            node.children[part] = &WildcardTrie{}
        }
        node = node.children[part]
    }
    node.isWildcard = true
    node.value = value
}

func (t *WildcardTrie) Match(domain string) (interface{}, bool) {
    parts := reverseDomainParts(domain) // ["com", "example", "sub"]
    node := t
    for i, part := range parts {
        if node.isWildcard {
            return node.value, true
        }
        if node.children == nil {
            return nil, false
        }
        if child, ok := node.children[part]; ok {
            node = child
        } else if child, ok := node.children["*"]; ok {
            return child.value, true
        } else {
            return nil, false
        }
    }
    return node.value, node.isWildcard
}
```

### Hash Maps for Exact Matches

- `allowlistExact`: `map[string]bool` - O(1) lookup
- `blocklistExact`: `map[string]bool` - O(1) lookup
- `categoryMap`: `map[string][]string` - O(1) lookup, returns categories
- `threatMap`: `map[string]ThreatInfo` - O(1) lookup

### Bloom Filter (Optional Optimization)

Use Bloom filter to quickly check if domain is NOT in any list (reduce Redis lookups):

```go
type PolicyCache struct {
    bloomFilter *bloom.BloomFilter // Fast negative check
    allowlistExact map[string]bool
    blocklistExact map[string]bool
    allowlistWildcard *WildcardTrie
    blocklistWildcard *WildcardTrie
    categoryMap map[string][]string
    threatMap map[string]ThreatInfo
    safeSearchRewrites map[string]string
    blockCategoriesSet map[string]bool
    blockThreats bool
}
```

## Policy Evaluation Algorithm

### Pseudocode

```
FUNCTION evaluatePolicy(query):
    INPUT:
        qname: string (domain name, e.g., "example.com")
        qtype: int (DNS record type)
        location_id: uuid
        timestamp: datetime
    
    OUTPUT:
        decision: {action: ALLOW|BLOCK|REWRITE, reason: string, ...}
    
    // Step 1: Load policy snapshot (cached in memory, refresh from Redis if stale)
    policy := getPolicySnapshot(location_id)
    IF policy == nil:
        RETURN {action: ALLOW, reason: "no_policy", rcode: NOERROR}
    
    // Step 2: Normalize domain (lowercase, remove trailing dot)
    normalized_qname := normalizeDomain(qname)
    
    // Step 3: Check schedule (if policy has time-based windows)
    IF policy.config.schedule != nil:
        IF NOT isInScheduleWindow(policy.config.schedule, timestamp):
            // Use default policy or continue with current
            // (implementation-specific)
    
    // Step 4: Check allowlist (highest priority - bypasses everything)
    IF policy.allowlistExact[normalized_qname]:
        RETURN {action: ALLOW, reason: "allowlist_exact"}
    
    IF policy.allowlistWildcard.Match(normalized_qname):
        RETURN {action: ALLOW, reason: "allowlist_wildcard"}
    
    // Step 5: Check blocklist (second priority)
    IF policy.blocklistExact[normalized_qname]:
        RETURN {action: BLOCK, reason: "blocklist_exact", rcode: NXDOMAIN}
    
    IF policy.blocklistWildcard.Match(normalized_qname):
        RETURN {action: BLOCK, reason: "blocklist_wildcard", rcode: NXDOMAIN}
    
    // Step 6: Check threat feeds (if enabled)
    IF policy.config.block_threats:
        threatInfo := policy.threatMap[normalized_qname]
        IF threatInfo != nil:
            RETURN {
                action: BLOCK,
                reason: "threat:" + threatInfo.type,
                category: threatInfo.type,
                rcode: NXDOMAIN
            }
    
    // Step 7: Check category filtering (if enabled)
    categories := policy.categoryMap[normalized_qname]
    IF categories != nil:
        FOR EACH category IN categories:
            IF policy.config.block_categories CONTAINS category:
                RETURN {
                    action: BLOCK,
                    reason: "category:" + category,
                    category: category,
                    rcode: NXDOMAIN
                }
    
    // Step 8: Check SafeSearch rewrites (if enabled and query type is A/AAAA)
    IF policy.config.safe_search_enabled AND (qtype == A OR qtype == AAAA):
        rewriteTarget := policy.safeSearchRewrites[normalized_qname]
        IF rewriteTarget != nil:
            RETURN {
                action: REWRITE,
                reason: "safesearch",
                rewrite_target: rewriteTarget,
                rcode: NOERROR
            }
    
    // Step 9: Default to ALLOW (forward to Unbound)
    RETURN {action: ALLOW, reason: "default", rcode: NOERROR}

END FUNCTION
```

### Go Implementation Structure

```go
package policy

import (
    "context"
    "time"
)

type Decision struct {
    Action      Action   `json:"action"` // ALLOW, BLOCK, REWRITE
    Reason      string   `json:"reason"`
    Category    string   `json:"category,omitempty"`
    RCode       uint8    `json:"rcode"` // DNS response code
    RewriteTarget string `json:"rewrite_target,omitempty"`
}

type Action string

const (
    ActionAllow   Action = "ALLOW"
    ActionBlock   Action = "BLOCK"
    ActionRewrite Action = "REWRITE"
)

type Evaluator struct {
    cache      *PolicyCache
    redis      redis.Client
    cacheTTL   time.Duration
    lastRefresh map[string]time.Time
}

func (e *Evaluator) Evaluate(ctx context.Context, req *QueryRequest) (*Decision, error) {
    // Refresh cache if stale
    if e.isCacheStale(req.LocationID) {
        if err := e.refreshCache(ctx, req.LocationID); err != nil {
            // Log error but continue with stale cache
            log.Error("Failed to refresh cache", "error", err)
        }
    }
    
    policy := e.cache.Get(req.LocationID)
    if policy == nil {
        return &Decision{
            Action: ActionAllow,
            Reason: "no_policy",
            RCode:  0, // NOERROR
        }, nil
    }
    
    normalized := normalizeDomain(req.QName)
    
    // Check allowlist
    if policy.AllowlistExact[normalized] {
        return &Decision{Action: ActionAllow, Reason: "allowlist_exact", RCode: 0}, nil
    }
    if match, ok := policy.AllowlistWildcard.Match(normalized); ok {
        return &Decision{Action: ActionAllow, Reason: "allowlist_wildcard", RCode: 0}, nil
    }
    
    // Check blocklist
    if policy.BlocklistExact[normalized] {
        return &Decision{Action: ActionBlock, Reason: "blocklist_exact", RCode: 3}, nil // NXDOMAIN
    }
    if match, ok := policy.BlocklistWildcard.Match(normalized); ok {
        return &Decision{Action: ActionBlock, Reason: "blocklist_wildcard", RCode: 3}, nil
    }
    
    // Check threats
    if policy.Config.BlockThreats {
        if threat, ok := policy.ThreatMap[normalized]; ok {
            return &Decision{
                Action:   ActionBlock,
                Reason:   "threat:" + threat.Type,
                Category: threat.Type,
                RCode:    3,
            }, nil
        }
    }
    
    // Check categories
    if categories, ok := policy.CategoryMap[normalized]; ok {
        for _, cat := range categories {
            if policy.Config.BlockCategoriesSet[cat] {
                return &Decision{
                    Action:   ActionBlock,
                    Reason:   "category:" + cat,
                    Category: cat,
                    RCode:    3,
                }, nil
            }
        }
    }
    
    // Check SafeSearch
    if policy.Config.SafeSearchEnabled && (req.QType == 1 || req.QType == 28) {
        if rewrite, ok := policy.SafeSearchRewrites[normalized]; ok {
            return &Decision{
                Action:        ActionRewrite,
                Reason:        "safesearch",
                RewriteTarget: rewrite,
                RCode:         0,
            }, nil
        }
    }
    
    // Default: ALLOW
    return &Decision{Action: ActionAllow, Reason: "default", RCode: 0}, nil
}

func normalizeDomain(domain string) string {
    // Lowercase, remove trailing dot, trim spaces
    domain = strings.ToLower(strings.TrimSpace(domain))
    domain = strings.TrimSuffix(domain, ".")
    return domain
}
```

## Cache Refresh Strategy

1. **Lazy refresh**: Check cache age on each evaluation
2. **TTL-based**: Refresh if cache is older than 5 minutes
3. **Event-driven**: Invalidate cache on policy update (Redis pub/sub or polling)
4. **Fallback**: Use stale cache if Redis is unavailable (fail open to ALLOW with audit)

```go
func (e *Evaluator) refreshCache(ctx context.Context, locationID string) error {
    key := fmt.Sprintf("policy:snapshot:%s", locationID)
    data, err := e.redis.Get(ctx, key).Result()
    if err != nil {
        return err
    }
    
    var snapshot PolicySnapshot
    if err := json.Unmarshal([]byte(data), &snapshot); err != nil {
        return err
    }
    
    // Compile into in-memory structures
    compiled := compileSnapshot(&snapshot)
    e.cache.Set(locationID, compiled)
    e.lastRefresh[locationID] = time.Now()
    
    return nil
}

func compileSnapshot(snapshot *PolicySnapshot) *PolicyCache {
    cache := &PolicyCache{
        AllowlistExact:      make(map[string]bool),
        BlocklistExact:      make(map[string]bool),
        AllowlistWildcard:   NewWildcardTrie(),
        BlocklistWildcard:   NewWildcardTrie(),
        CategoryMap:         make(map[string][]string),
        ThreatMap:           make(map[string]ThreatInfo),
        SafeSearchRewrites:  make(map[string]string),
        BlockCategoriesSet:  make(map[string]bool),
    }
    
    // Populate exact matches
    for _, domain := range snapshot.Allowlist.Exact {
        cache.AllowlistExact[domain] = true
    }
    for _, domain := range snapshot.Blocklist.Exact {
        cache.BlocklistExact[domain] = true
    }
    
    // Populate wildcards
    for _, domain := range snapshot.Allowlist.Wildcards {
        cache.AllowlistWildcard.Insert(domain, true)
    }
    for _, domain := range snapshot.Blocklist.Wildcards {
        cache.BlocklistWildcard.Insert(domain, true)
    }
    
    // Populate category and threat maps
    for domain, categories := range snapshot.CategoryMap {
        cache.CategoryMap[domain] = categories
    }
    for domain, threat := range snapshot.ThreatMap {
        cache.ThreatMap[domain] = threat
    }
    
    // Populate SafeSearch rewrites
    for domain, target := range snapshot.SafeSearchRewrites {
        cache.SafeSearchRewrites[domain] = target
    }
    
    // Build block categories set for fast lookup
    for _, cat := range snapshot.Config.BlockCategories {
        cache.BlockCategoriesSet[cat] = true
    }
    
    return cache
}
```

## Performance Characteristics

- **Time Complexity**: O(1) average case (hash map lookups)
- **Worst Case**: O(log n) for wildcard matching (trie depth)
- **Space Complexity**: O(n) where n is number of domains in lists
- **Cache Hit Rate**: Expected >99% (5-minute TTL, infrequent policy updates)

## Edge Cases

1. **Subdomain matching**: `sub.example.com` matches `*.example.com` wildcard
2. **Case sensitivity**: All domains normalized to lowercase
3. **Trailing dots**: Removed during normalization
4. **Invalid domains**: Reject malformed domains before evaluation
5. **Cache miss**: Fallback to ALLOW with audit log
6. **Redis failure**: Use stale cache or fail open to ALLOW
