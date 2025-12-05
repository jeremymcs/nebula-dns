# E. Policy Evaluation Algorithm

## Overview

The Policy Decision Service evaluates DNS queries against tenant policies in real-time. The evaluation must be:
- **Fast**: O(1) average time complexity with cached data structures
- **Deterministic**: Same input always produces same output
- **Auditable**: Every decision includes a traceable reason code

## Decision Outcomes

```go
type Decision string

const (
    DecisionAllow   Decision = "ALLOW"   // Forward to Unbound
    DecisionBlock   Decision = "BLOCK"   // Return NXDOMAIN or null-route
    DecisionRewrite Decision = "REWRITE" // Return SafeSearch CNAME/A/AAAA
)

type EvaluationResult struct {
    Decision      Decision
    Reason        string   // e.g., "allowlist", "threat:malware", "category:adult"
    Category      string   // Domain category if applicable
    PolicyVersion string   // pv_xxx ID for audit trail
    RewriteTarget string   // Only for REWRITE decisions
    TTL           uint32   // Response TTL
}
```

## Data Structures

### Policy Cache (Per-Location)

Each location has a compiled policy snapshot stored in Redis and loaded into memory:

```go
type CompiledPolicy struct {
    Version           string    // Policy version ID
    LocationID        string
    TenantID          string
    UpdatedAt         time.Time
    
    // Evaluation data structures (all pre-computed)
    AllowlistExact    map[string]bool           // O(1) lookup
    AllowlistWildcard *SuffixTrie               // O(k) where k = domain labels
    BlocklistExact    map[string]bool           // O(1) lookup
    BlocklistWildcard *SuffixTrie               // O(k)
    
    BlockedCategories map[string]bool           // Category IDs to block
    ThreatFeedsEnabled []string                 // ["malware", "phishing", "c2"]
    
    SafeSearchEnabled bool
    SafeSearchRules   map[string]SafeSearchRule // domain -> rewrite target
    
    Schedules         []Schedule                // Time-based rules
    
    BlockResponse     BlockResponseType         // NXDOMAIN or NULL_ROUTE
    DefaultAction     Decision                  // Default: ALLOW
}

type SafeSearchRule struct {
    TargetCNAME string   // e.g., "forcesafesearch.google.com"
    TargetA     []string // Direct A records if CNAME not applicable
    TargetAAAA  []string // Direct AAAA records
}

type Schedule struct {
    Name               string
    Days               []time.Weekday
    StartTime          time.Time // Time of day only
    EndTime            time.Time
    Timezone           *time.Location
    AdditionalCategories map[string]bool
}
```

### Suffix Trie for Wildcard Matching

For efficient wildcard matching (e.g., `*.example.com` matches `sub.example.com`):

```go
type SuffixTrie struct {
    children map[string]*SuffixTrie
    isEnd    bool  // Marks end of a wildcard pattern
}

// Insert "*.example.com" as reversed labels: ["com", "example", "*"]
func (t *SuffixTrie) Insert(pattern string) {
    labels := reverseDomainLabels(pattern) // ["com", "example", "*"]
    node := t
    for _, label := range labels {
        if node.children[label] == nil {
            node.children[label] = &SuffixTrie{children: make(map[string]*SuffixTrie)}
        }
        node = node.children[label]
    }
    node.isEnd = true
}

// Match "sub.example.com" by traversing reversed: ["com", "example", "sub"]
func (t *SuffixTrie) Match(domain string) bool {
    labels := reverseDomainLabels(domain) // ["com", "example", "sub"]
    node := t
    for _, label := range labels {
        // Check for wildcard match at this level
        if wildcard, ok := node.children["*"]; ok && wildcard.isEnd {
            return true
        }
        // Continue exact match
        if node.children[label] == nil {
            return false
        }
        node = node.children[label]
    }
    return node.isEnd
}
```

### Global Threat & Category Caches

Shared across all tenants (read from Redis):

```go
type GlobalCache struct {
    // Threat domains: domain -> threat_type
    ThreatDomains map[string]string  // O(1) lookup
    
    // Domain categories: domain -> category_id
    DomainCategories map[string]string  // O(1) lookup
    
    // For large datasets, use bloom filter pre-check
    ThreatBloomFilter *bloom.BloomFilter
    
    // Version for cache invalidation
    Version string
    UpdatedAt time.Time
}
```

## Evaluation Algorithm

### Main Evaluation Function

```go
func (s *PolicyService) Evaluate(ctx context.Context, req EvaluationRequest) EvaluationResult {
    // 1. Load policy for location (from memory cache, fallback to Redis)
    policy, err := s.getPolicy(req.LocationID)
    if err != nil {
        // Fail-open or fail-closed based on configuration
        return s.failSafeResponse(err)
    }
    
    // 2. Normalize domain (lowercase, remove trailing dot)
    domain := normalizeDomain(req.QName)
    
    // 3. Evaluate in priority order
    result := s.evaluateDomain(policy, domain, req.QType, time.Now())
    result.PolicyVersion = policy.Version
    
    return result
}

func (s *PolicyService) evaluateDomain(
    policy *CompiledPolicy,
    domain string,
    qtype string,
    now time.Time,
) EvaluationResult {
    
    // ============================================
    // PRIORITY 1: Tenant Allowlist (always allow)
    // ============================================
    if policy.AllowlistExact[domain] || policy.AllowlistWildcard.Match(domain) {
        return EvaluationResult{
            Decision: DecisionAllow,
            Reason:   "allowlist",
            TTL:      300,
        }
    }
    
    // ============================================
    // PRIORITY 2: Tenant Blocklist (always block)
    // ============================================
    if policy.BlocklistExact[domain] || policy.BlocklistWildcard.Match(domain) {
        return EvaluationResult{
            Decision: DecisionBlock,
            Reason:   "blocklist",
            TTL:      60,
        }
    }
    
    // ============================================
    // PRIORITY 3: SafeSearch Rewrite
    // ============================================
    if policy.SafeSearchEnabled {
        if rule, ok := policy.SafeSearchRules[domain]; ok {
            return EvaluationResult{
                Decision:      DecisionRewrite,
                Reason:        "safesearch",
                RewriteTarget: rule.TargetCNAME,
                TTL:           300,
            }
        }
    }
    
    // ============================================
    // PRIORITY 4: Threat Feed Blocking
    // ============================================
    if threatType := s.checkThreatFeeds(policy, domain); threatType != "" {
        return EvaluationResult{
            Decision: DecisionBlock,
            Reason:   "threat:" + threatType,
            Category: threatType,
            TTL:      60,
        }
    }
    
    // ============================================
    // PRIORITY 5: Category Blocking (with schedules)
    // ============================================
    category := s.globalCache.DomainCategories[domain]
    if category == "" {
        // Try parent domain matching for subdomains
        category = s.findCategoryByParent(domain)
    }
    
    if category != "" {
        // Check if category is blocked (base policy + active schedules)
        blockedCategories := s.getActiveBlockedCategories(policy, now)
        if blockedCategories[category] {
            return EvaluationResult{
                Decision: DecisionBlock,
                Reason:   "category:" + category,
                Category: category,
                TTL:      60,
            }
        }
    }
    
    // ============================================
    // PRIORITY 6: Default Allow
    // ============================================
    return EvaluationResult{
        Decision: DecisionAllow,
        Reason:   "default",
        Category: category, // Include for logging even if allowed
        TTL:      0,        // Use upstream TTL
    }
}
```

### Threat Feed Checking

```go
func (s *PolicyService) checkThreatFeeds(policy *CompiledPolicy, domain string) string {
    // Quick bloom filter check (if domain is definitely not in any threat list)
    if !s.globalCache.ThreatBloomFilter.Test([]byte(domain)) {
        return ""
    }
    
    // Exact lookup
    if threatType, exists := s.globalCache.ThreatDomains[domain]; exists {
        // Verify this threat type is enabled in policy
        for _, enabled := range policy.ThreatFeedsEnabled {
            if enabled == threatType {
                return threatType
            }
        }
    }
    
    return ""
}
```

### Schedule Evaluation

```go
func (s *PolicyService) getActiveBlockedCategories(
    policy *CompiledPolicy,
    now time.Time,
) map[string]bool {
    // Start with base blocked categories
    result := make(map[string]bool)
    for cat := range policy.BlockedCategories {
        result[cat] = true
    }
    
    // Add categories from active schedules
    for _, sched := range policy.Schedules {
        if s.isScheduleActive(sched, now) {
            for cat := range sched.AdditionalCategories {
                result[cat] = true
            }
        }
    }
    
    return result
}

func (s *PolicyService) isScheduleActive(sched Schedule, now time.Time) bool {
    // Convert to schedule timezone
    localNow := now.In(sched.Timezone)
    
    // Check day of week
    dayMatch := false
    for _, day := range sched.Days {
        if localNow.Weekday() == day {
            dayMatch = true
            break
        }
    }
    if !dayMatch {
        return false
    }
    
    // Check time of day
    currentTime := localNow.Hour()*60 + localNow.Minute()
    startTime := sched.StartTime.Hour()*60 + sched.StartTime.Minute()
    endTime := sched.EndTime.Hour()*60 + sched.EndTime.Minute()
    
    // Handle schedules that cross midnight
    if endTime < startTime {
        return currentTime >= startTime || currentTime < endTime
    }
    
    return currentTime >= startTime && currentTime < endTime
}
```

### Parent Domain Category Lookup

```go
func (s *PolicyService) findCategoryByParent(domain string) string {
    labels := strings.Split(domain, ".")
    
    // Try progressively shorter parent domains
    // e.g., for "sub.blog.example.com", try:
    //   "blog.example.com", then "example.com"
    for i := 1; i < len(labels)-1; i++ {
        parent := strings.Join(labels[i:], ".")
        if cat, exists := s.globalCache.DomainCategories[parent]; exists {
            return cat
        }
    }
    
    return ""
}
```

## Cache Management

### Policy Cache Loading

```go
func (s *PolicyService) loadPolicy(locationID string) (*CompiledPolicy, error) {
    // Try memory cache first
    if policy, ok := s.memoryCache.Get(locationID); ok {
        return policy, nil
    }
    
    // Load from Redis
    data, err := s.redis.Get(ctx, fmt.Sprintf("policy:location:%s", locationID)).Bytes()
    if err != nil {
        return nil, fmt.Errorf("policy not found for location %s", locationID)
    }
    
    var policy CompiledPolicy
    if err := msgpack.Unmarshal(data, &policy); err != nil {
        return nil, fmt.Errorf("failed to unmarshal policy: %w", err)
    }
    
    // Rebuild trie structures (not serialized)
    policy.AllowlistWildcard = buildSuffixTrie(policy.AllowlistWildcardPatterns)
    policy.BlocklistWildcard = buildSuffixTrie(policy.BlocklistWildcardPatterns)
    
    // Cache in memory
    s.memoryCache.Set(locationID, &policy, 5*time.Minute)
    
    return &policy, nil
}
```

### Cache Invalidation

```go
// Called when policy is updated via Control Plane API
func (s *PolicyService) InvalidatePolicy(locationID string) {
    s.memoryCache.Delete(locationID)
    
    // Publish invalidation event for other instances
    s.redis.Publish(ctx, "policy:invalidate", locationID)
}

// Subscribe to invalidation events
func (s *PolicyService) subscribeInvalidations() {
    sub := s.redis.Subscribe(ctx, "policy:invalidate")
    for msg := range sub.Channel() {
        locationID := msg.Payload
        s.memoryCache.Delete(locationID)
        log.Info("invalidated policy cache", "location_id", locationID)
    }
}
```

### Global Cache Refresh

```go
func (s *PolicyService) refreshGlobalCache() {
    ticker := time.NewTicker(1 * time.Minute)
    for range ticker.C {
        // Check version
        version, _ := s.redis.Get(ctx, "global:version").Result()
        if version == s.globalCache.Version {
            continue
        }
        
        // Load updated threat domains
        threatDomains := make(map[string]string)
        cursor := uint64(0)
        for {
            keys, nextCursor, _ := s.redis.Scan(ctx, cursor, "threat:*", 10000).Result()
            for _, key := range keys {
                domain := strings.TrimPrefix(key, "threat:")
                threatType, _ := s.redis.Get(ctx, key).Result()
                threatDomains[domain] = threatType
            }
            if nextCursor == 0 {
                break
            }
            cursor = nextCursor
        }
        
        // Rebuild bloom filter
        bf := bloom.NewWithEstimates(uint(len(threatDomains)), 0.01)
        for domain := range threatDomains {
            bf.Add([]byte(domain))
        }
        
        // Atomic swap
        s.globalCache = &GlobalCache{
            ThreatDomains:     threatDomains,
            ThreatBloomFilter: bf,
            Version:           version,
            UpdatedAt:         time.Now(),
        }
        
        log.Info("refreshed global cache", "threat_domains", len(threatDomains))
    }
}
```

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Exact list lookup | O(1) | Hash map |
| Wildcard matching | O(k) | k = number of domain labels (typically 2-5) |
| Threat feed check | O(1) | Bloom filter + hash map |
| Category lookup | O(k) | Parent domain fallback |
| Schedule check | O(s) | s = number of schedules (typically <5) |
| **Total Evaluation** | **O(k)** | Dominated by trie operations |

### Memory Usage (per Policy Service instance)

| Data | Size Estimate |
|------|---------------|
| 100 location policies | ~50 MB |
| 1M threat domains | ~100 MB (with bloom filter) |
| 10M domain categories | ~500 MB |
| **Total** | ~650 MB |

### Latency Targets

| Metric | Target | P99 Target |
|--------|--------|------------|
| Policy lookup (cached) | <0.1ms | <0.5ms |
| Full evaluation | <1ms | <5ms |
| Redis fallback | <5ms | <20ms |

## Fail-Safe Behavior

```go
func (s *PolicyService) failSafeResponse(err error) EvaluationResult {
    log.Error("evaluation error", "error", err)
    
    // Fail-open: allow query but log the failure
    // This prevents DNS outage but may miss blocks
    return EvaluationResult{
        Decision: DecisionAllow,
        Reason:   "error:fail_open",
        TTL:      30, // Short TTL for retry
    }
}
```

Alternative fail-closed configuration for high-security deployments:

```go
func (s *PolicyService) failClosedResponse(err error) EvaluationResult {
    return EvaluationResult{
        Decision: DecisionBlock,
        Reason:   "error:fail_closed",
        TTL:      30,
    }
}
```

## Integration Points

### Input (from dnsdist via HTTP)

```go
type EvaluationRequest struct {
    LocationID string `json:"location_id"` // From token/cert validation
    TenantID   string `json:"tenant_id"`
    QName      string `json:"qname"`       // Query domain
    QType      string `json:"qtype"`       // A, AAAA, CNAME, etc.
    ClientIP   string `json:"client_ip"`   // For logging
    RequestID  string `json:"request_id"`  // Correlation ID
}
```

### Output (to dnsdist)

```go
type EvaluationResponse struct {
    Decision      string   `json:"decision"`       // ALLOW, BLOCK, REWRITE
    Reason        string   `json:"reason"`
    Category      string   `json:"category,omitempty"`
    PolicyVersion string   `json:"policy_version"`
    BlockType     string   `json:"block_type,omitempty"`     // NXDOMAIN, NULL_ROUTE
    RewriteRRs    []string `json:"rewrite_rrs,omitempty"`    // For REWRITE
    TTL           uint32   `json:"ttl"`
}
```

### Logging Output (to ClickHouse via async buffer)

```go
type QueryLogEntry struct {
    Timestamp     time.Time
    TenantID      string
    LocationID    string
    ClientIP      string
    QName         string
    QType         string
    Action        string   // allow, block, rewrite
    Reason        string
    Category      string
    PolicyVersion string
    ResponseCode  string   // NOERROR, NXDOMAIN, etc.
    LatencyMs     float64
    RequestID     string
}
```

## SafeSearch Rewrite Rules

Pre-configured SafeSearch targets:

```go
var SafeSearchRules = map[string]SafeSearchRule{
    // Google
    "www.google.com": {TargetCNAME: "forcesafesearch.google.com"},
    "www.google.co.uk": {TargetCNAME: "forcesafesearch.google.com"},
    // ... other Google TLDs
    
    // Bing
    "www.bing.com": {TargetCNAME: "strict.bing.com"},
    
    // YouTube
    "www.youtube.com": {TargetCNAME: "restrictmoderate.youtube.com"},
    "m.youtube.com": {TargetCNAME: "restrictmoderate.youtube.com"},
    "youtubei.googleapis.com": {TargetCNAME: "restrictmoderate.youtube.com"},
    "youtube.googleapis.com": {TargetCNAME: "restrictmoderate.youtube.com"},
    
    // DuckDuckGo (uses query parameter, needs special handling)
    "duckduckgo.com": {
        // DDG SafeSearch is enforced via cookie/setting, not DNS
        // Consider blocking or allowing with documentation
    },
}
```

## Unit Test Examples

```go
func TestEvaluation_AllowlistPriority(t *testing.T) {
    policy := &CompiledPolicy{
        AllowlistExact:    map[string]bool{"example.com": true},
        BlockedCategories: map[string]bool{"malware": true},
    }
    
    svc := NewPolicyService(policy)
    svc.globalCache.ThreatDomains["example.com"] = "malware"
    
    result := svc.evaluateDomain(policy, "example.com", "A", time.Now())
    
    assert.Equal(t, DecisionAllow, result.Decision)
    assert.Equal(t, "allowlist", result.Reason)
}

func TestEvaluation_WildcardBlocklist(t *testing.T) {
    policy := &CompiledPolicy{
        BlocklistWildcard: buildSuffixTrie([]string{"*.bad.com"}),
    }
    
    svc := NewPolicyService(policy)
    
    result := svc.evaluateDomain(policy, "sub.bad.com", "A", time.Now())
    
    assert.Equal(t, DecisionBlock, result.Decision)
    assert.Equal(t, "blocklist", result.Reason)
}

func TestEvaluation_ScheduleActive(t *testing.T) {
    loc, _ := time.LoadLocation("America/New_York")
    policy := &CompiledPolicy{
        BlockedCategories: map[string]bool{},
        Schedules: []Schedule{
            {
                Days:      []time.Weekday{time.Monday},
                StartTime: time.Date(0, 0, 0, 9, 0, 0, 0, loc),
                EndTime:   time.Date(0, 0, 0, 17, 0, 0, 0, loc),
                Timezone:  loc,
                AdditionalCategories: map[string]bool{"social_media": true},
            },
        },
    }
    
    svc := NewPolicyService(policy)
    svc.globalCache.DomainCategories["facebook.com"] = "social_media"
    
    // Monday at 10am EST
    now := time.Date(2024, 6, 17, 10, 0, 0, 0, loc)
    result := svc.evaluateDomain(policy, "facebook.com", "A", now)
    
    assert.Equal(t, DecisionBlock, result.Decision)
    assert.Equal(t, "category:social_media", result.Reason)
    
    // Monday at 6pm EST (outside schedule)
    now = time.Date(2024, 6, 17, 18, 0, 0, 0, loc)
    result = svc.evaluateDomain(policy, "facebook.com", "A", now)
    
    assert.Equal(t, DecisionAllow, result.Decision)
}
```
