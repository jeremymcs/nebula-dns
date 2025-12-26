package models

import "time"

// TokenInfo contains validated token information
type TokenInfo struct {
	TenantID   string
	LocationID string
	RateLimit  int
	ExpiresAt  time.Time
}

// EvaluateRequest represents a DNS query evaluation request from dnsdist
type EvaluateRequest struct {
	TenantID   string `json:"tenant_id"`
	LocationID string `json:"location_id"`
	QName      string `json:"qname"`
	QType      int    `json:"qtype"`
	ClientIP   string `json:"client_ip"`
	Timestamp  string `json:"timestamp,omitempty"`
}

// EvaluateResponse represents the policy decision response
type EvaluateResponse struct {
	Decision      string `json:"decision"` // ALLOW, BLOCK, REWRITE
	Reason        string `json:"reason"`
	Category      string `json:"category,omitempty"`
	BlockType     string `json:"block_type,omitempty"`   // NXDOMAIN, null, blockpage
	RewriteType   string `json:"rewrite_type,omitempty"` // CNAME, A, AAAA
	RewriteTarget string `json:"rewrite_target,omitempty"`
	TTL           int    `json:"ttl"`
}

// Block response types
const (
	BlockTypeNXDOMAIN  = "NXDOMAIN"
	BlockTypeNull      = "null"
	BlockTypeBlockPage = "blockpage"
)

// ValidateTokenRequest represents a token validation request
type ValidateTokenRequest struct {
	Token string `json:"token"`
}

// ValidateTokenResponse represents the token validation response
type ValidateTokenResponse struct {
	Valid      bool   `json:"valid"`
	TenantID   string `json:"tenant_id,omitempty"`
	LocationID string `json:"location_id,omitempty"`
	RateLimit  int    `json:"rate_limit,omitempty"`
}

// QueryLogEntry represents a DNS query log entry for ClickHouse
type QueryLogEntry struct {
	Timestamp     time.Time `json:"timestamp"`
	TenantID      string    `json:"tenant_id"`
	LocationID    string    `json:"location_id"`
	ClientIP      string    `json:"client_ip,omitempty"`
	QName         string    `json:"qname"`
	QType         int       `json:"qtype"`
	Action        string    `json:"action"`
	Reason        string    `json:"reason"`
	Category      string    `json:"category,omitempty"`
	ThreatType    string    `json:"threat_type,omitempty"`
	PolicyVersion int       `json:"policy_version,omitempty"`
	RCode         int       `json:"rcode"`
	LatencyMs     float64   `json:"latency_ms"`
	Upstream      string    `json:"upstream,omitempty"`
	Cached        bool      `json:"cached"`
	ResponseIP    string    `json:"response_ip,omitempty"`
}

// CompiledPolicy represents a pre-processed policy for fast evaluation
type CompiledPolicy struct {
	TenantID                  string                    `json:"tenantId"`
	LocationID                string                    `json:"locationId"`
	PolicyVersion             int                       `json:"policyVersion"`
	AllowlistExact            map[string]bool           `json:"allowlistExact"`
	AllowlistWildcardPatterns []string                  `json:"allowlistWildcardPatterns"`
	AllowlistWildcard         *SuffixTrie               `json:"-"`
	BlocklistExact            map[string]bool           `json:"blocklistExact"`
	BlocklistWildcardPatterns []string                  `json:"blocklistWildcardPatterns"`
	BlocklistWildcard         *SuffixTrie               `json:"-"`
	BlockedCategories         map[string]bool           `json:"blockedCategories"`
	ThreatFeeds               []string                  `json:"threatFeeds"`
	SafeSearchEnabled         bool                      `json:"safesearchEnabled"`
	SafeSearchRules           map[string]SafeSearchRule `json:"safesearchRules"`
	Schedules                 []Schedule                `json:"schedules"`
	BlockResponseType         string                    `json:"blockResponseType"` // NXDOMAIN or null
	UpdatedAt                 time.Time                 `json:"updatedAt"`
}

// SafeSearchRule defines a SafeSearch rewrite rule
type SafeSearchRule struct {
	TargetCNAME string `json:"target_cname"`
	TargetA     string `json:"target_a,omitempty"`
	TargetAAAA  string `json:"target_aaaa,omitempty"`
}

// Schedule defines a time-based policy schedule
type Schedule struct {
	Name                 string   `json:"name"`
	Days                 []string `json:"days"`       // mon, tue, wed, thu, fri, sat, sun
	StartTime            string   `json:"start_time"` // HH:MM
	EndTime              string   `json:"end_time"`   // HH:MM
	Timezone             string   `json:"timezone"`
	AdditionalCategories []string `json:"additional_categories"`
}

// SuffixTrie is a trie structure for efficient wildcard domain matching
type SuffixTrie struct {
	children map[string]*SuffixTrie
	isEnd    bool
}

// NewSuffixTrie creates a new suffix trie
func NewSuffixTrie() *SuffixTrie {
	return &SuffixTrie{
		children: make(map[string]*SuffixTrie),
	}
}

// Insert adds a domain pattern to the trie
// Domain is inserted in reverse label order for suffix matching
func (t *SuffixTrie) Insert(domain string) {
	labels := reverseDomainLabels(domain)
	current := t

	for _, label := range labels {
		if _, exists := current.children[label]; !exists {
			current.children[label] = NewSuffixTrie()
		}
		current = current.children[label]
	}
	current.isEnd = true
}

// Match checks if a domain matches any pattern in the trie
func (t *SuffixTrie) Match(domain string) bool {
	labels := reverseDomainLabels(domain)
	current := t

	for _, label := range labels {
		// Check for wildcard match
		if current.isEnd {
			return true
		}

		if next, exists := current.children[label]; exists {
			current = next
		} else if next, exists := current.children["*"]; exists {
			current = next
		} else {
			return false
		}
	}

	return current.isEnd
}

// reverseDomainLabels splits a domain and reverses the labels
// e.g., "www.example.com" -> ["com", "example", "www"]
func reverseDomainLabels(domain string) []string {
	var labels []string
	var current string

	for i := len(domain) - 1; i >= 0; i-- {
		if domain[i] == '.' {
			if current != "" {
				labels = append(labels, current)
				current = ""
			}
		} else {
			current = string(domain[i]) + current
		}
	}
	if current != "" {
		labels = append(labels, current)
	}

	return labels
}
