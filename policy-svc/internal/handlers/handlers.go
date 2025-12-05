package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/safedns/policy-svc/internal/models"
	"github.com/safedns/policy-svc/internal/policy"
)

// Handlers contains HTTP handlers for the policy service
type Handlers struct {
	policySvc *policy.Service
	logger    *zap.Logger
}

// NewHandlers creates a new handlers instance
func NewHandlers(policySvc *policy.Service, logger *zap.Logger) *Handlers {
	return &Handlers{
		policySvc: policySvc,
		logger:    logger,
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

// LogQuery handles query logging requests (async, fire-and-forget)
func (h *Handlers) LogQuery(w http.ResponseWriter, r *http.Request) {
	var entry models.QueryLogEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		// Just log and return OK - this is fire-and-forget
		h.logger.Warn("Invalid log entry", zap.Error(err))
		w.WriteHeader(http.StatusAccepted)
		return
	}

	// In production, this would batch and send to ClickHouse
	// For now, just log it
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
