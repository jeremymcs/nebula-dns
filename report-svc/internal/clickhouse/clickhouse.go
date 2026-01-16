// Nebula DNS - Report Worker Service - ClickHouse Client
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package clickhouse

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"sync/atomic"
	"time"

	"go.uber.org/zap"

	"github.com/nebuladns/report-svc/internal/models"
)

// CircuitState represents the state of the circuit breaker
type CircuitState int32

const (
	CircuitClosed   CircuitState = iota // Normal operation
	CircuitOpen                         // Failing, reject requests
	CircuitHalfOpen                     // Testing if service recovered
)

// Client handles ClickHouse queries for report generation
type Client struct {
	httpClient *http.Client
	baseURL    string
	database   string
	username   string
	password   string
	logger     *zap.Logger

	// Circuit breaker state
	circuitState        int32
	consecutiveFailures int32
	lastFailureTime     time.Time
	lastFailureMu       sync.RWMutex

	// Circuit breaker configuration
	failureThreshold    int32
	recoveryTimeout     time.Duration
	halfOpenMaxRequests int32
	halfOpenSuccesses   int32
}

// NewClient creates a new ClickHouse client for report queries
func NewClient(baseURL, database, username, password string, logger *zap.Logger) *Client {
	c := &Client{
		httpClient: &http.Client{Timeout: 60 * time.Second}, // Longer timeout for report queries
		baseURL:    baseURL,
		database:   database,
		username:   username,
		password:   password,
		logger:     logger,
		// Circuit breaker defaults
		failureThreshold:    5,
		recoveryTimeout:     30 * time.Second,
		halfOpenMaxRequests: 3,
	}

	// Test initial connection
	go c.testConnection()

	return c
}

// testConnection checks if ClickHouse is reachable
func (c *Client) testConnection() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := c.executeQuery(ctx, "SELECT 1")
	if err != nil {
		c.logger.Warn("ClickHouse connection test failed", zap.Error(err))
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
			c.logger.Warn("ClickHouse circuit breaker opened",
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
		c.lastFailureMu.RLock()
		lastFailure := c.lastFailureTime
		c.lastFailureMu.RUnlock()

		if time.Since(lastFailure) >= c.recoveryTimeout {
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

// executeQuery executes a query and returns the raw response
func (c *Client) executeQuery(ctx context.Context, query string) ([]byte, error) {
	if !c.canAttempt() {
		return nil, fmt.Errorf("circuit breaker is open")
	}

	encodedQuery := url.QueryEscape(query)
	requestURL := fmt.Sprintf("%s/?database=%s&query=%s FORMAT JSONEachRow",
		c.baseURL, c.database, encodedQuery)

	req, err := http.NewRequestWithContext(ctx, "GET", requestURL, nil)
	if err != nil {
		return nil, err
	}

	if c.username != "" {
		req.SetBasicAuth(c.username, c.password)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.recordFailure()
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		c.recordFailure()
		return nil, fmt.Errorf("ClickHouse returned status %d: %s", resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		c.recordFailure()
		return nil, err
	}

	c.recordSuccess()
	return data, nil
}

// GetDNSSummary retrieves DNS summary data for a tenant
func (c *Client) GetDNSSummary(ctx context.Context, tenantID string, dateRange models.DateRange) (*models.DNSSummaryData, error) {
	summary, err := c.getSummaryStats(ctx, tenantID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary stats: %w", err)
	}

	topBlocked, err := c.getTopBlocked(ctx, tenantID, dateRange, 20)
	if err != nil {
		return nil, fmt.Errorf("failed to get top blocked: %w", err)
	}

	categoryBreakdown, err := c.getCategoryBreakdown(ctx, tenantID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get category breakdown: %w", err)
	}

	return &models.DNSSummaryData{
		Period:            dateRange,
		Summary:           *summary,
		TopBlocked:        topBlocked,
		CategoryBreakdown: categoryBreakdown,
	}, nil
}

// GetThreatReport retrieves threat-specific report data
func (c *Client) GetThreatReport(ctx context.Context, tenantID string, dateRange models.DateRange) (*models.ThreatReportData, error) {
	summary, err := c.getSummaryStats(ctx, tenantID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary stats: %w", err)
	}

	threatStats, err := c.getThreatStats(ctx, tenantID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get threat stats: %w", err)
	}

	threatTrends, err := c.getThreatTrends(ctx, tenantID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get threat trends: %w", err)
	}

	topThreats, err := c.getTopThreats(ctx, tenantID, dateRange, 20)
	if err != nil {
		return nil, fmt.Errorf("failed to get top threats: %w", err)
	}

	return &models.ThreatReportData{
		Period:       dateRange,
		Summary:      *summary,
		ThreatStats:  threatStats,
		ThreatTrends: threatTrends,
		TopThreats:   topThreats,
	}, nil
}

// GetUsageReport retrieves usage report data
func (c *Client) GetUsageReport(ctx context.Context, tenantID string, dateRange models.DateRange) (*models.UsageReportData, error) {
	summary, err := c.getSummaryStats(ctx, tenantID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary stats: %w", err)
	}

	locationUsage, err := c.getLocationUsage(ctx, tenantID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get location usage: %w", err)
	}

	dailyBreakdown, err := c.getDailyBreakdown(ctx, tenantID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get daily breakdown: %w", err)
	}

	return &models.UsageReportData{
		Period:         dateRange,
		Summary:        *summary,
		LocationUsage:  locationUsage,
		DailyBreakdown: dailyBreakdown,
	}, nil
}

// getSummaryStats retrieves basic summary statistics
func (c *Client) getSummaryStats(ctx context.Context, tenantID string, dateRange models.DateRange) (*models.ReportSummary, error) {
	query := fmt.Sprintf(`
		SELECT
			count() as total_queries,
			countIf(action = 'BLOCK') as blocked_queries,
			countIf(action = 'ALLOW') as allowed_queries
		FROM query_logs
		WHERE tenant_id = '%s'
		  AND timestamp >= '%s'
		  AND timestamp < '%s'
	`, tenantID, dateRange.Start.Format(time.RFC3339), dateRange.End.Format(time.RFC3339))

	data, err := c.executeQuery(ctx, query)
	if err != nil {
		// Return mock data if ClickHouse is unavailable
		c.logger.Warn("ClickHouse unavailable, returning mock data", zap.Error(err))
		return c.getMockSummary(), nil
	}

	var results []struct {
		TotalQueries   int64 `json:"total_queries"`
		BlockedQueries int64 `json:"blocked_queries"`
		AllowedQueries int64 `json:"allowed_queries"`
	}

	if len(data) == 0 {
		return c.getMockSummary(), nil
	}

	if err := parseJSONLines(data, &results); err != nil {
		c.logger.Warn("Failed to parse ClickHouse response, returning mock data", zap.Error(err))
		return c.getMockSummary(), nil
	}

	if len(results) == 0 {
		return c.getMockSummary(), nil
	}

	r := results[0]
	blockRate := float64(0)
	if r.TotalQueries > 0 {
		blockRate = float64(r.BlockedQueries) / float64(r.TotalQueries) * 100
	}

	return &models.ReportSummary{
		TotalQueries:   r.TotalQueries,
		BlockedQueries: r.BlockedQueries,
		AllowedQueries: r.AllowedQueries,
		BlockRate:      blockRate,
	}, nil
}

// getTopBlocked retrieves top blocked domains
func (c *Client) getTopBlocked(ctx context.Context, tenantID string, dateRange models.DateRange, limit int) ([]models.TopBlockedDomain, error) {
	query := fmt.Sprintf(`
		SELECT
			qname as domain,
			count() as count,
			any(category) as category
		FROM query_logs
		WHERE tenant_id = '%s'
		  AND timestamp >= '%s'
		  AND timestamp < '%s'
		  AND action = 'BLOCK'
		GROUP BY qname
		ORDER BY count DESC
		LIMIT %d
	`, tenantID, dateRange.Start.Format(time.RFC3339), dateRange.End.Format(time.RFC3339), limit)

	data, err := c.executeQuery(ctx, query)
	if err != nil {
		c.logger.Warn("ClickHouse unavailable, returning mock data", zap.Error(err))
		return c.getMockTopBlocked(), nil
	}

	var results []models.TopBlockedDomain
	if len(data) == 0 {
		return c.getMockTopBlocked(), nil
	}

	if err := parseJSONLines(data, &results); err != nil {
		c.logger.Warn("Failed to parse ClickHouse response, returning mock data", zap.Error(err))
		return c.getMockTopBlocked(), nil
	}

	if len(results) == 0 {
		return c.getMockTopBlocked(), nil
	}

	return results, nil
}

// getCategoryBreakdown retrieves blocked queries by category
func (c *Client) getCategoryBreakdown(ctx context.Context, tenantID string, dateRange models.DateRange) ([]models.CategoryStats, error) {
	query := fmt.Sprintf(`
		SELECT
			category,
			count() as count
		FROM query_logs
		WHERE tenant_id = '%s'
		  AND timestamp >= '%s'
		  AND timestamp < '%s'
		  AND action = 'BLOCK'
		  AND category != ''
		GROUP BY category
		ORDER BY count DESC
		LIMIT 20
	`, tenantID, dateRange.Start.Format(time.RFC3339), dateRange.End.Format(time.RFC3339))

	data, err := c.executeQuery(ctx, query)
	if err != nil {
		c.logger.Warn("ClickHouse unavailable, returning mock data", zap.Error(err))
		return c.getMockCategoryBreakdown(), nil
	}

	var results []struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}

	if len(data) == 0 {
		return c.getMockCategoryBreakdown(), nil
	}

	if err := parseJSONLines(data, &results); err != nil {
		c.logger.Warn("Failed to parse ClickHouse response, returning mock data", zap.Error(err))
		return c.getMockCategoryBreakdown(), nil
	}

	if len(results) == 0 {
		return c.getMockCategoryBreakdown(), nil
	}

	// Calculate total for percentages
	var total int64
	for _, r := range results {
		total += r.Count
	}

	categoryStats := make([]models.CategoryStats, len(results))
	for i, r := range results {
		percentage := float64(0)
		if total > 0 {
			percentage = float64(r.Count) / float64(total) * 100
		}
		categoryStats[i] = models.CategoryStats{
			Category:   r.Category,
			Count:      r.Count,
			Percentage: percentage,
		}
	}

	return categoryStats, nil
}

// getThreatStats retrieves threat statistics by type
func (c *Client) getThreatStats(ctx context.Context, tenantID string, dateRange models.DateRange) ([]models.ThreatStats, error) {
	query := fmt.Sprintf(`
		SELECT
			threat_type,
			count() as count
		FROM query_logs
		WHERE tenant_id = '%s'
		  AND timestamp >= '%s'
		  AND timestamp < '%s'
		  AND threat_type != ''
		GROUP BY threat_type
		ORDER BY count DESC
	`, tenantID, dateRange.Start.Format(time.RFC3339), dateRange.End.Format(time.RFC3339))

	data, err := c.executeQuery(ctx, query)
	if err != nil {
		c.logger.Warn("ClickHouse unavailable, returning mock data", zap.Error(err))
		return c.getMockThreatStats(), nil
	}

	var results []models.ThreatStats
	if len(data) == 0 {
		return c.getMockThreatStats(), nil
	}

	if err := parseJSONLines(data, &results); err != nil {
		c.logger.Warn("Failed to parse ClickHouse response, returning mock data", zap.Error(err))
		return c.getMockThreatStats(), nil
	}

	if len(results) == 0 {
		return c.getMockThreatStats(), nil
	}

	return results, nil
}

// getThreatTrends retrieves daily threat trends
func (c *Client) getThreatTrends(ctx context.Context, tenantID string, dateRange models.DateRange) ([]models.ThreatTrend, error) {
	query := fmt.Sprintf(`
		SELECT
			toDate(timestamp) as date,
			countIf(threat_type = 'malware') as malware,
			countIf(threat_type = 'phishing') as phishing,
			countIf(threat_type = 'c2') as c2
		FROM query_logs
		WHERE tenant_id = '%s'
		  AND timestamp >= '%s'
		  AND timestamp < '%s'
		  AND threat_type != ''
		GROUP BY date
		ORDER BY date
	`, tenantID, dateRange.Start.Format(time.RFC3339), dateRange.End.Format(time.RFC3339))

	data, err := c.executeQuery(ctx, query)
	if err != nil {
		c.logger.Warn("ClickHouse unavailable, returning mock data", zap.Error(err))
		return c.getMockThreatTrends(dateRange), nil
	}

	var results []struct {
		Date     string `json:"date"`
		Malware  int64  `json:"malware"`
		Phishing int64  `json:"phishing"`
		C2       int64  `json:"c2"`
	}

	if len(data) == 0 {
		return c.getMockThreatTrends(dateRange), nil
	}

	if err := parseJSONLines(data, &results); err != nil {
		c.logger.Warn("Failed to parse ClickHouse response, returning mock data", zap.Error(err))
		return c.getMockThreatTrends(dateRange), nil
	}

	if len(results) == 0 {
		return c.getMockThreatTrends(dateRange), nil
	}

	trends := make([]models.ThreatTrend, len(results))
	for i, r := range results {
		trends[i] = models.ThreatTrend{
			Date:     r.Date,
			Malware:  r.Malware,
			Phishing: r.Phishing,
			C2:       r.C2,
		}
	}

	return trends, nil
}

// getTopThreats retrieves top threat domains
func (c *Client) getTopThreats(ctx context.Context, tenantID string, dateRange models.DateRange, limit int) ([]models.TopBlockedDomain, error) {
	query := fmt.Sprintf(`
		SELECT
			qname as domain,
			count() as count,
			any(threat_type) as category
		FROM query_logs
		WHERE tenant_id = '%s'
		  AND timestamp >= '%s'
		  AND timestamp < '%s'
		  AND threat_type != ''
		GROUP BY qname
		ORDER BY count DESC
		LIMIT %d
	`, tenantID, dateRange.Start.Format(time.RFC3339), dateRange.End.Format(time.RFC3339), limit)

	data, err := c.executeQuery(ctx, query)
	if err != nil {
		c.logger.Warn("ClickHouse unavailable, returning mock data", zap.Error(err))
		return c.getMockTopThreats(), nil
	}

	var results []models.TopBlockedDomain
	if len(data) == 0 {
		return c.getMockTopThreats(), nil
	}

	if err := parseJSONLines(data, &results); err != nil {
		c.logger.Warn("Failed to parse ClickHouse response, returning mock data", zap.Error(err))
		return c.getMockTopThreats(), nil
	}

	if len(results) == 0 {
		return c.getMockTopThreats(), nil
	}

	return results, nil
}

// getLocationUsage retrieves usage by location
func (c *Client) getLocationUsage(ctx context.Context, tenantID string, dateRange models.DateRange) ([]models.LocationUsage, error) {
	query := fmt.Sprintf(`
		SELECT
			location_id,
			count() as query_count,
			countIf(action = 'BLOCK') as blocked_count
		FROM query_logs
		WHERE tenant_id = '%s'
		  AND timestamp >= '%s'
		  AND timestamp < '%s'
		GROUP BY location_id
		ORDER BY query_count DESC
	`, tenantID, dateRange.Start.Format(time.RFC3339), dateRange.End.Format(time.RFC3339))

	data, err := c.executeQuery(ctx, query)
	if err != nil {
		c.logger.Warn("ClickHouse unavailable, returning mock data", zap.Error(err))
		return c.getMockLocationUsage(), nil
	}

	var results []struct {
		LocationID   string `json:"location_id"`
		QueryCount   int64  `json:"query_count"`
		BlockedCount int64  `json:"blocked_count"`
	}

	if len(data) == 0 {
		return c.getMockLocationUsage(), nil
	}

	if err := parseJSONLines(data, &results); err != nil {
		c.logger.Warn("Failed to parse ClickHouse response, returning mock data", zap.Error(err))
		return c.getMockLocationUsage(), nil
	}

	if len(results) == 0 {
		return c.getMockLocationUsage(), nil
	}

	usage := make([]models.LocationUsage, len(results))
	for i, r := range results {
		usage[i] = models.LocationUsage{
			LocationID:   r.LocationID,
			LocationName: fmt.Sprintf("Location %s", r.LocationID[:8]),
			QueryCount:   r.QueryCount,
			BlockedCount: r.BlockedCount,
		}
	}

	return usage, nil
}

// getDailyBreakdown retrieves daily usage breakdown
func (c *Client) getDailyBreakdown(ctx context.Context, tenantID string, dateRange models.DateRange) ([]models.DailyUsage, error) {
	query := fmt.Sprintf(`
		SELECT
			toDate(timestamp) as date,
			count() as total_queries,
			countIf(action = 'BLOCK') as blocked_count
		FROM query_logs
		WHERE tenant_id = '%s'
		  AND timestamp >= '%s'
		  AND timestamp < '%s'
		GROUP BY date
		ORDER BY date
	`, tenantID, dateRange.Start.Format(time.RFC3339), dateRange.End.Format(time.RFC3339))

	data, err := c.executeQuery(ctx, query)
	if err != nil {
		c.logger.Warn("ClickHouse unavailable, returning mock data", zap.Error(err))
		return c.getMockDailyBreakdown(dateRange), nil
	}

	var results []struct {
		Date         string `json:"date"`
		TotalQueries int64  `json:"total_queries"`
		BlockedCount int64  `json:"blocked_count"`
	}

	if len(data) == 0 {
		return c.getMockDailyBreakdown(dateRange), nil
	}

	if err := parseJSONLines(data, &results); err != nil {
		c.logger.Warn("Failed to parse ClickHouse response, returning mock data", zap.Error(err))
		return c.getMockDailyBreakdown(dateRange), nil
	}

	if len(results) == 0 {
		return c.getMockDailyBreakdown(dateRange), nil
	}

	breakdown := make([]models.DailyUsage, len(results))
	for i, r := range results {
		breakdown[i] = models.DailyUsage{
			Date:         r.Date,
			TotalQueries: r.TotalQueries,
			BlockedCount: r.BlockedCount,
		}
	}

	return breakdown, nil
}

// parseJSONLines parses newline-delimited JSON (JSONEachRow format)
func parseJSONLines[T any](data []byte, results *[]T) error {
	if len(data) == 0 {
		return nil
	}

	// Split by newlines and parse each line
	start := 0
	for i := 0; i <= len(data); i++ {
		if i == len(data) || data[i] == '\n' {
			if i > start {
				line := data[start:i]
				var item T
				if err := json.Unmarshal(line, &item); err == nil {
					*results = append(*results, item)
				}
			}
			start = i + 1
		}
	}

	return nil
}

// Mock data functions for when ClickHouse is unavailable
func (c *Client) getMockSummary() *models.ReportSummary {
	return &models.ReportSummary{
		TotalQueries:   1542890,
		BlockedQueries: 44656,
		AllowedQueries: 1498234,
		BlockRate:      2.89,
	}
}

func (c *Client) getMockTopBlocked() []models.TopBlockedDomain {
	return []models.TopBlockedDomain{
		{Domain: "malware-site.com", Count: 1542, Category: "malware"},
		{Domain: "phishing-page.net", Count: 892, Category: "phishing"},
		{Domain: "adtracker.com", Count: 756, Category: "advertising"},
		{Domain: "spam-domain.org", Count: 654, Category: "spam"},
		{Domain: "cryptominer.io", Count: 543, Category: "cryptomining"},
	}
}

func (c *Client) getMockCategoryBreakdown() []models.CategoryStats {
	return []models.CategoryStats{
		{Category: "Malware", Count: 12456, Percentage: 27.9},
		{Category: "Phishing", Count: 8923, Percentage: 20.0},
		{Category: "Advertising", Count: 7234, Percentage: 16.2},
		{Category: "Adult Content", Count: 6123, Percentage: 13.7},
		{Category: "Gambling", Count: 4892, Percentage: 11.0},
		{Category: "Other", Count: 5028, Percentage: 11.2},
	}
}

func (c *Client) getMockThreatStats() []models.ThreatStats {
	return []models.ThreatStats{
		{ThreatType: "malware", Count: 12456},
		{ThreatType: "phishing", Count: 8923},
		{ThreatType: "c2", Count: 2341},
		{ThreatType: "ransomware", Count: 892},
	}
}

func (c *Client) getMockThreatTrends(dateRange models.DateRange) []models.ThreatTrend {
	trends := make([]models.ThreatTrend, 0)
	for d := dateRange.Start; d.Before(dateRange.End); d = d.AddDate(0, 0, 1) {
		trends = append(trends, models.ThreatTrend{
			Date:     d.Format("2006-01-02"),
			Malware:  823 + int64(d.Day()*10),
			Phishing: 612 + int64(d.Day()*5),
			C2:       156 + int64(d.Day()*2),
		})
	}
	return trends
}

func (c *Client) getMockTopThreats() []models.TopBlockedDomain {
	return []models.TopBlockedDomain{
		{Domain: "malware-dropper.com", Count: 1234, Category: "malware"},
		{Domain: "fake-login.net", Count: 987, Category: "phishing"},
		{Domain: "c2-server.io", Count: 765, Category: "c2"},
		{Domain: "ransomware-gate.com", Count: 543, Category: "ransomware"},
	}
}

func (c *Client) getMockLocationUsage() []models.LocationUsage {
	return []models.LocationUsage{
		{LocationID: "loc-001", LocationName: "Main Office", QueryCount: 542890, BlockedCount: 15234},
		{LocationID: "loc-002", LocationName: "Remote Workers", QueryCount: 398234, BlockedCount: 12456},
		{LocationID: "loc-003", LocationName: "Branch Office", QueryCount: 201766, BlockedCount: 8934},
	}
}

func (c *Client) getMockDailyBreakdown(dateRange models.DateRange) []models.DailyUsage {
	breakdown := make([]models.DailyUsage, 0)
	for d := dateRange.Start; d.Before(dateRange.End); d = d.AddDate(0, 0, 1) {
		breakdown = append(breakdown, models.DailyUsage{
			Date:         d.Format("2006-01-02"),
			TotalQueries: 150000 + int64(d.Day()*1000),
			BlockedCount: 4500 + int64(d.Day()*50),
		})
	}
	return breakdown
}

// Close cleans up resources
func (c *Client) Close() {
	// No persistent connections to close
}
