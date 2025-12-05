package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/mux"
)

type QueryRequest struct {
	TenantID   string `json:"tenant_id"`
	LocationID string `json:"location_id"`
	QName      string `json:"qname"`
	QType      int    `json:"qtype"`
	Timestamp  int64  `json:"timestamp"`
}

type Decision struct {
	Action       string `json:"action"` // ALLOW, BLOCK, REWRITE
	Reason       string `json:"reason"`
	Category     string `json:"category,omitempty"`
	RCode        uint8  `json:"rcode"`
	RewriteTarget string `json:"rewrite_target,omitempty"`
}

type PolicySnapshot struct {
	PolicyID    string                 `json:"policy_id"`
	Version     int                    `json:"version"`
	Config      map[string]interface{} `json:"config"`
	Allowlist   map[string][]string    `json:"allowlist"`
	Blocklist   map[string][]string    `json:"blocklist"`
	CategoryMap map[string][]string    `json:"category_map"`
	ThreatMap   map[string]interface{} `json:"threat_map"`
}

type PolicyService struct {
	redis  *redis.Client
	cache  map[string]*PolicySnapshot
	ctx    context.Context
}

func NewPolicyService() *PolicyService {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("Failed to parse Redis URL: %v", err)
	}

	rdb := redis.NewClient(opt)

	// Test connection
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	return &PolicyService{
		redis: rdb,
		cache: make(map[string]*PolicySnapshot),
		ctx:   ctx,
	}
}

func (ps *PolicyService) Evaluate(w http.ResponseWriter, r *http.Request) {
	var req QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Load policy snapshot
	policy, err := ps.getPolicySnapshot(req.LocationID)
	if err != nil {
		log.Printf("Error loading policy: %v", err)
		// Fail open to ALLOW
		decision := Decision{
			Action: "ALLOW",
			Reason: "policy_load_error",
			RCode:  0,
		}
		json.NewEncoder(w).Encode(decision)
		return
	}

	if policy == nil {
		decision := Decision{
			Action: "ALLOW",
			Reason: "no_policy",
			RCode:  0,
		}
		json.NewEncoder(w).Encode(decision)
		return
	}

	// Evaluate policy (simplified - full implementation in policy evaluation doc)
	decision := ps.evaluatePolicy(policy, &req)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(decision)
}

func (ps *PolicyService) getPolicySnapshot(locationID string) (*PolicySnapshot, error) {
	// Check cache first
	if cached, ok := ps.cache[locationID]; ok {
		return cached, nil
	}

	// Load from Redis
	key := fmt.Sprintf("policy:snapshot:%s", locationID)
	data, err := ps.redis.Get(ps.ctx, key).Result()
	if err == redis.Nil {
		return nil, nil // No policy found
	}
	if err != nil {
		return nil, err
	}

	var snapshot PolicySnapshot
	if err := json.Unmarshal([]byte(data), &snapshot); err != nil {
		return nil, err
	}

	// Cache it
	ps.cache[locationID] = &snapshot

	return &snapshot, nil
}

func (ps *PolicyService) evaluatePolicy(policy *PolicySnapshot, req *QueryRequest) *Decision {
	qname := normalizeDomain(req.QName)

	// Check allowlist
	if exact, ok := policy.Allowlist["exact"]; ok {
		for _, domain := range exact {
			if domain == qname {
				return &Decision{Action: "ALLOW", Reason: "allowlist_exact", RCode: 0}
			}
		}
	}

	// Check blocklist
	if exact, ok := policy.Blocklist["exact"]; ok {
		for _, domain := range exact {
			if domain == qname {
				return &Decision{Action: "BLOCK", Reason: "blocklist_exact", RCode: 3}
			}
		}
	}

	// Check threats
	if blockThreats, ok := policy.Config["block_threats"].(bool); ok && blockThreats {
		if threat, ok := policy.ThreatMap[qname]; ok {
			threatType := "malware" // Simplified
			if threatMap, ok := threat.(map[string]interface{}); ok {
				if t, ok := threatMap["type"].(string); ok {
					threatType = t
				}
			}
			return &Decision{
				Action:   "BLOCK",
				Reason:   fmt.Sprintf("threat:%s", threatType),
				Category: threatType,
				RCode:    3,
			}
		}
	}

	// Check categories
	if categories, ok := policy.CategoryMap[qname]; ok {
		if blockCats, ok := policy.Config["block_categories"].([]interface{}); ok {
			for _, cat := range categories {
				for _, blockCat := range blockCats {
					if cat == blockCat {
						return &Decision{
							Action:   "BLOCK",
							Reason:   fmt.Sprintf("category:%s", cat),
							Category: cat,
							RCode:    3,
						}
					}
				}
			}
		}
	}

	// Default: ALLOW
	return &Decision{Action: "ALLOW", Reason: "default", RCode: 0}
}

func normalizeDomain(domain string) string {
	// Simplified - lowercase and trim trailing dot
	domain = strings.ToLower(domain)
	domain = strings.TrimSuffix(domain, ".")
	return domain
}

func main() {
	service := NewPolicyService()

	r := mux.NewRouter()
	r.HandleFunc("/v1/evaluate", service.Evaluate).Methods("POST")
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8053"
	}

	log.Printf("Policy Decision Service listening on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
