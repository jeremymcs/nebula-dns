// Nebula DNS - Policy Service HTTP Handlers
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

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
	"github.com/nebuladns/policy-svc/internal/metrics"
	"github.com/nebuladns/policy-svc/internal/models"
	"github.com/nebuladns/policy-svc/internal/policy"
)

// Handlers contains HTTP handlers for the policy service
type Handlers struct {
	policySvc  *policy.Service
	cache      *cache.PolicyCache
	clickhouse *clickhouse.Client
	metrics    *metrics.Metrics
	logger     *zap.Logger
}

// NewHandlers creates a new handlers instance
func NewHandlers(policySvc *policy.Service, policyCache *cache.PolicyCache, ch *clickhouse.Client, m *metrics.Metrics, logger *zap.Logger) *Handlers {
	return &Handlers{
		policySvc:  policySvc,
		cache:      policyCache,
		clickhouse: ch,
		metrics:    m,
		logger:     logger,
	}
}

// Healthz handles simple liveness check for K8s probes (no dependency checks)
func (h *Handlers) Healthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
	})
}

// Health handles detailed health check requests
func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Report ClickHouse status without affecting overall health.
	// ClickHouse is a non-critical dependency; degraded CH must not mark
	// the service as unhealthy or block DNS evaluation.
	chStatus := "ok"
	if h.clickhouse != nil && !h.clickhouse.IsHealthy() {
		chStatus = "degraded"
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "healthy",
		"clickhouse": chStatus,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
	})
}

// Ready handles readiness check requests for K8s probes
// Verifies Redis connectivity (not just process existence)
func (h *Handlers) Ready(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Check if policy service is initialized
	if h.policySvc == nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ready":     false,
			"reason":    "policy service not initialized",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	// Verify Redis connectivity via cache
	ctx := r.Context()
	if err := h.cache.Ping(ctx); err != nil {
		h.logger.Warn("Redis connectivity check failed", zap.Error(err))
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ready":     false,
			"reason":    "redis unavailable",
			"error":     err.Error(),
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ready":     true,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// Live handles liveness check requests for K8s probes (simple process health)
func (h *Handlers) Live(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"alive":     true,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// Evaluate handles DNS query policy evaluation requests
// US-029: Checks subscription status before evaluating policy
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

	// US-029: Check subscription status before evaluating
	// Suspended tenants receive NXDOMAIN for all queries
	if h.cache.IsTenantSuspended(r.Context(), req.TenantID) {
		h.logger.Info("Blocked query for suspended tenant",
			zap.String("tenantId", req.TenantID),
			zap.String("qname", req.QName),
		)

		// Return NXDOMAIN block response for suspended tenants
		result := &models.EvaluateResponse{
			Decision:  "BLOCK",
			Reason:    "subscription_suspended",
			BlockType: models.BlockTypeNXDOMAIN,
			TTL:       60,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
		return
	}

	// Evaluate policy normally for active/grace tenants
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
	// Update gauge metrics before serving
	if h.metrics != nil {
		if h.cache != nil {
			h.metrics.SetPolicyCacheSize(h.cache.GetPolicyCacheSize())
		}
		if h.clickhouse != nil {
			h.metrics.SetClickHouseQueueSize(h.clickhouse.GetQueueSize())
		}
	}

	// Use the actual Prometheus handler
	metrics.Handler().ServeHTTP(w, r)
}
