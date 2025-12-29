// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// HTTP Handlers for Policy Service

package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/nebuladns/policy-svc/internal/cache"
	"github.com/nebuladns/policy-svc/internal/clickhouse"
	"github.com/nebuladns/policy-svc/internal/models"
	"github.com/nebuladns/policy-svc/internal/policy"
)

// Handlers contains HTTP handlers for the policy service
type Handlers struct {
	policySvc  *policy.Service
	cache      *cache.PolicyCache
	clickhouse *clickhouse.Client
	logger     *zap.Logger
}

// NewHandlers creates a new handlers instance
func NewHandlers(policySvc *policy.Service, policyCache *cache.PolicyCache, ch *clickhouse.Client, logger *zap.Logger) *Handlers {
	return &Handlers{
		policySvc:  policySvc,
		cache:      policyCache,
		clickhouse: ch,
		logger:     logger,
	}
}

// Health handles health check requests
func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// Ready handles readiness check requests for K8s probes
func (h *Handlers) Ready(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// Check if policy service is initialized
	ready := h.policySvc != nil
	if ready {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ready":     true,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ready":     false,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	}
}

// Live handles liveness check requests for K8s probes
func (h *Handlers) Live(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"alive":     true,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// Evaluate handles DNS query policy evaluation requests
func (h *Handlers) Evaluate(w http.ResponseWriter, r *http.Request) {
	var req models.EvaluateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid evaluate request", zap.Error(err))
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.TenantID == "" || req.LocationID == "" || req.QName == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Evaluate policy
	result := h.policySvc.Evaluate(r.Context(), &req)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// ValidateToken handles token validation requests
func (h *Handlers) ValidateToken(w http.ResponseWriter, r *http.Request) {
	var req models.ValidateTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid validate request", zap.Error(err))
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Token == "" {
		http.Error(w, "Token is required", http.StatusBadRequest)
		return
	}

	// Hash the token for lookup
	tokenHash := hashToken(req.Token)

	// Validate token
	result := h.policySvc.ValidateToken(r.Context(), tokenHash)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// LookupIP handles IP-based location lookup requests
func (h *Handlers) LookupIP(w http.ResponseWriter, r *http.Request) {
	var req models.LookupIPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid lookup IP request", zap.Error(err))
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ClientIP == "" {
		http.Error(w, "client_ip is required", http.StatusBadRequest)
		return
	}

	// Lookup location by IP
	result, err := h.cache.LookupByIP(req.ClientIP)
	if err != nil {
		h.logger.Error("IP lookup failed", zap.Error(err))
		http.Error(w, "Lookup failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// LogQuery handles query logging requests (async, fire-and-forget)
func (h *Handlers) LogQuery(w http.ResponseWriter, r *http.Request) {
	var entry models.QueryLogEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		// Just log and return OK - this is fire-and-forget
		h.logger.Warn("Invalid log entry", zap.Error(err))
		w.WriteHeader(http.StatusAccepted)
		return
	}

	// Set timestamp if not provided
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now().UTC()
	}

	// Send to ClickHouse via batched client
	if h.clickhouse != nil {
		h.clickhouse.Log(entry)
	}

	h.logger.Debug("Query log entry",
		zap.String("tenant_id", entry.TenantID),
		zap.String("location_id", entry.LocationID),
		zap.String("qname", entry.QName),
		zap.String("action", entry.Action),
		zap.String("reason", entry.Reason),
		zap.Float64("latency_ms", entry.LatencyMs),
	)

	w.WriteHeader(http.StatusAccepted)
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// Metrics handles Prometheus metrics requests
func (h *Handlers) Metrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")

	// Basic metrics in Prometheus format
	lines := []string{
		"# HELP policy_svc_up Whether the policy service is up",
		"# TYPE policy_svc_up gauge",
		"policy_svc_up 1",
		"",
		"# HELP policy_svc_evaluations_total Total policy evaluations",
		"# TYPE policy_svc_evaluations_total counter",
		"policy_svc_evaluations_total 0",
		"",
		"# HELP policy_svc_cache_hits_total Total cache hits",
		"# TYPE policy_svc_cache_hits_total counter",
		"policy_svc_cache_hits_total 0",
		"",
	}

	for _, line := range lines {
		w.Write([]byte(line + "\n"))
	}
}
