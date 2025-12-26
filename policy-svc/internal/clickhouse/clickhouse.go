// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// ClickHouse Client for Query Logging

package clickhouse

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"go.uber.org/zap"

	"github.com/nebuladns/policy-svc/internal/models"
)

// CircuitState represents the state of the circuit breaker
type CircuitState int32

const (
	CircuitClosed   CircuitState = iota // Normal operation
	CircuitOpen                         // Failing, reject requests
	CircuitHalfOpen                     // Testing if service recovered
)

// Client handles ClickHouse query logging
type Client struct {
	httpClient *http.Client
	baseURL    string
	database   string
	logger     *zap.Logger

	// Batching
	buffer     []models.QueryLogEntry
	bufferMu   sync.Mutex
	batchSize  int
	flushTimer *time.Ticker
	done       chan struct{}

	// Circuit breaker state
	circuitState        int32 // Use int32 for atomic operations
	consecutiveFailures int32
	lastFailureTime     time.Time
	lastFailureMu       sync.RWMutex

	// Circuit breaker configuration
	failureThreshold    int32         // Number of failures before opening circuit
	recoveryTimeout     time.Duration // Time to wait before trying again
	halfOpenMaxRequests int32         // Max requests in half-open state
	halfOpenSuccesses   int32         // Successful requests in half-open state
}

// NewClient creates a new ClickHouse client
func NewClient(baseURL, database string, logger *zap.Logger) *Client {
	c := &Client{
		httpClient: &http.Client{Timeout: 5 * time.Second},
		baseURL:    baseURL,
		database:   database,
		logger:     logger,
		buffer:     make([]models.QueryLogEntry, 0, 1000),
		batchSize:  500,
		flushTimer: time.NewTicker(5 * time.Second),
		done:       make(chan struct{}),
		// Circuit breaker defaults
		failureThreshold:    5,
		recoveryTimeout:     30 * time.Second,
		halfOpenMaxRequests: 3,
	}

	// Start background flusher
	go c.backgroundFlusher()

	// Test initial connection
	go c.testConnection()

	return c
}

// testConnection checks if ClickHouse is reachable
func (c *Client) testConnection() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	url := fmt.Sprintf("%s/?database=%s&query=SELECT%%201", c.baseURL, c.database)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		c.logger.Warn("Failed to create ClickHouse test request", zap.Error(err))
		c.recordFailure()
		return
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Warn("ClickHouse connection test failed - will retry on flush", zap.Error(err))
		c.recordFailure()
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		c.logger.Warn("ClickHouse connection test returned error status",
			zap.Int("status", resp.StatusCode))
		c.recordFailure()
		return
	}

	c.logger.Info("ClickHouse connection test successful")
	c.recordSuccess()
}

// IsHealthy returns true if ClickHouse is reachable
func (c *Client) IsHealthy() bool {
	return atomic.LoadInt32(&c.circuitState) != int32(CircuitOpen)
}

// GetCircuitState returns the current circuit breaker state
func (c *Client) GetCircuitState() CircuitState {
	return CircuitState(atomic.LoadInt32(&c.circuitState))
}

// recordFailure records a failed request
func (c *Client) recordFailure() {
	failures := atomic.AddInt32(&c.consecutiveFailures, 1)

	c.lastFailureMu.Lock()
	c.lastFailureTime = time.Now()
	c.lastFailureMu.Unlock()

	if failures >= c.failureThreshold {
		if atomic.CompareAndSwapInt32(&c.circuitState, int32(CircuitClosed), int32(CircuitOpen)) {
			c.logger.Warn("ClickHouse circuit breaker opened - too many failures",
				zap.Int32("failures", failures))
		}
	}
}

// recordSuccess records a successful request
func (c *Client) recordSuccess() {
	atomic.StoreInt32(&c.consecutiveFailures, 0)

	state := CircuitState(atomic.LoadInt32(&c.circuitState))
	if state == CircuitHalfOpen {
		successes := atomic.AddInt32(&c.halfOpenSuccesses, 1)
		if successes >= c.halfOpenMaxRequests {
			if atomic.CompareAndSwapInt32(&c.circuitState, int32(CircuitHalfOpen), int32(CircuitClosed)) {
				c.logger.Info("ClickHouse circuit breaker closed - service recovered")
				atomic.StoreInt32(&c.halfOpenSuccesses, 0)
			}
		}
	} else if state == CircuitOpen {
		// Shouldn't happen, but reset just in case
		atomic.StoreInt32(&c.circuitState, int32(CircuitClosed))
	}
}

// canAttempt checks if we should attempt a request based on circuit state
func (c *Client) canAttempt() bool {
	state := CircuitState(atomic.LoadInt32(&c.circuitState))

	switch state {
	case CircuitClosed:
		return true
	case CircuitOpen:
		// Check if enough time has passed to try again
		c.lastFailureMu.RLock()
		lastFailure := c.lastFailureTime
		c.lastFailureMu.RUnlock()

		if time.Since(lastFailure) >= c.recoveryTimeout {
			// Transition to half-open
			if atomic.CompareAndSwapInt32(&c.circuitState, int32(CircuitOpen), int32(CircuitHalfOpen)) {
				c.logger.Info("ClickHouse circuit breaker half-open - testing recovery")
				atomic.StoreInt32(&c.halfOpenSuccesses, 0)
			}
			return true
		}
		return false
	case CircuitHalfOpen:
		return true
	default:
		return true
	}
}

// Log adds a query log entry to the buffer
func (c *Client) Log(entry models.QueryLogEntry) {
	c.bufferMu.Lock()
	defer c.bufferMu.Unlock()

	c.buffer = append(c.buffer, entry)

	// Flush if buffer is full
	if len(c.buffer) >= c.batchSize {
		go c.flush()
	}
}

// backgroundFlusher periodically flushes the buffer
func (c *Client) backgroundFlusher() {
	for {
		select {
		case <-c.flushTimer.C:
			c.flush()
		case <-c.done:
			c.flush() // Final flush
			return
		}
	}
}

// flush sends buffered entries to ClickHouse
func (c *Client) flush() {
	// Check circuit breaker first
	if !c.canAttempt() {
		c.logger.Debug("ClickHouse circuit is open, skipping flush")
		return
	}

	c.bufferMu.Lock()
	if len(c.buffer) == 0 {
		c.bufferMu.Unlock()
		return
	}

	// Copy and clear buffer
	entries := make([]models.QueryLogEntry, len(c.buffer))
	copy(entries, c.buffer)
	c.buffer = c.buffer[:0]
	c.bufferMu.Unlock()

	// Send to ClickHouse
	if err := c.insertBatch(context.Background(), entries); err != nil {
		c.logger.Error("Failed to insert query logs to ClickHouse",
			zap.Error(err),
			zap.Int("count", len(entries)),
		)
		c.recordFailure()

		// Re-add to buffer on failure (with limit to prevent memory issues)
		// Only re-add if circuit is not open to prevent infinite growth
		if c.canAttempt() {
			c.bufferMu.Lock()
			if len(c.buffer) < 10000 {
				c.buffer = append(c.buffer, entries...)
			} else {
				c.logger.Warn("ClickHouse buffer full, dropping entries",
					zap.Int("dropped", len(entries)))
			}
			c.bufferMu.Unlock()
		} else {
			c.logger.Warn("ClickHouse circuit open, dropping entries to prevent memory buildup",
				zap.Int("dropped", len(entries)))
		}
	} else {
		c.recordSuccess()
		c.logger.Debug("Flushed query logs to ClickHouse", zap.Int("count", len(entries)))
	}
}

// insertBatch inserts a batch of entries to ClickHouse
func (c *Client) insertBatch(ctx context.Context, entries []models.QueryLogEntry) error {
	// Build JSONEachRow format
	var buf bytes.Buffer
	for _, entry := range entries {
		row := map[string]any{
			"timestamp":   entry.Timestamp,
			"tenant_id":   entry.TenantID,
			"location_id": entry.LocationID,
			"client_ip":   entry.ClientIP,
			"qname":       entry.QName,
			"qtype":       entry.QType,
			"action":      entry.Action,
			"reason":      entry.Reason,
			"category":    entry.Category,
			"threat_type": entry.ThreatType,
			"latency_ms":  entry.LatencyMs,
			"upstream":    entry.Upstream,
			"cached":      entry.Cached,
			"response_ip": entry.ResponseIP,
		}
		data, _ := json.Marshal(row)
		buf.Write(data)
		buf.WriteByte('\n')
	}

	// Send to ClickHouse HTTP interface
	url := fmt.Sprintf("%s/?database=%s&query=INSERT%%20INTO%%20query_logs%%20FORMAT%%20JSONEachRow",
		c.baseURL, c.database)

	req, err := http.NewRequestWithContext(ctx, "POST", url, &buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("ClickHouse returned status %d", resp.StatusCode)
	}

	return nil
}

// Close stops the background flusher and flushes remaining entries
func (c *Client) Close() {
	c.flushTimer.Stop()
	close(c.done)
}
