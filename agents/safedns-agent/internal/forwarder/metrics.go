package forwarder

import (
	"net/http"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics holds Prometheus metrics for the DNS forwarder
type Metrics struct {
	queriesTotal    *prometheus.CounterVec
	queryDuration   *prometheus.HistogramVec
	cacheHits       prometheus.Counter
	cacheMisses     prometheus.Counter
	cacheSize       prometheus.Gauge
	upstreamErrors  *prometheus.CounterVec
	activeQueries   prometheus.Gauge
	internalQueries prometheus.Counter
	externalQueries prometheus.Counter
	blockedQueries  prometheus.Counter

	registry *prometheus.Registry
	mu       sync.RWMutex
}

// NewMetrics creates a new Metrics instance with all forwarder metrics
func NewMetrics() *Metrics {
	m := &Metrics{
		registry: prometheus.NewRegistry(),
	}

	m.queriesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "nebuladns",
			Subsystem: "forwarder",
			Name:      "queries_total",
			Help:      "Total number of DNS queries processed",
		},
		[]string{"type", "status"},
	)

	m.queryDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "nebuladns",
			Subsystem: "forwarder",
			Name:      "query_duration_seconds",
			Help:      "DNS query duration in seconds",
			Buckets:   []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5},
		},
		[]string{"upstream"},
	)

	m.cacheHits = prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: "nebuladns",
			Subsystem: "forwarder",
			Name:      "cache_hits_total",
			Help:      "Total number of cache hits",
		},
	)

	m.cacheMisses = prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: "nebuladns",
			Subsystem: "forwarder",
			Name:      "cache_misses_total",
			Help:      "Total number of cache misses",
		},
	)

	m.cacheSize = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: "nebuladns",
			Subsystem: "forwarder",
			Name:      "cache_size",
			Help:      "Current number of entries in the cache",
		},
	)

	m.upstreamErrors = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "nebuladns",
			Subsystem: "forwarder",
			Name:      "upstream_errors_total",
			Help:      "Total number of upstream DNS errors",
		},
		[]string{"upstream"},
	)

	m.activeQueries = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: "nebuladns",
			Subsystem: "forwarder",
			Name:      "active_queries",
			Help:      "Number of currently active DNS queries",
		},
	)

	m.internalQueries = prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: "nebuladns",
			Subsystem: "forwarder",
			Name:      "internal_queries_total",
			Help:      "Total number of queries routed to internal DNS",
		},
	)

	m.externalQueries = prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: "nebuladns",
			Subsystem: "forwarder",
			Name:      "external_queries_total",
			Help:      "Total number of queries routed to cloud DoH",
		},
	)

	m.blockedQueries = prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: "nebuladns",
			Subsystem: "forwarder",
			Name:      "blocked_queries_total",
			Help:      "Total number of blocked DNS queries",
		},
	)

	// Register all metrics
	m.registry.MustRegister(
		m.queriesTotal,
		m.queryDuration,
		m.cacheHits,
		m.cacheMisses,
		m.cacheSize,
		m.upstreamErrors,
		m.activeQueries,
		m.internalQueries,
		m.externalQueries,
		m.blockedQueries,
	)

	return m
}

// Handler returns an HTTP handler for the metrics endpoint
func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
}

// RecordQuery records a DNS query with its type and status
func (m *Metrics) RecordQuery(qtype, status string) {
	m.queriesTotal.WithLabelValues(qtype, status).Inc()
}

// RecordQueryDuration records the duration of a DNS query
func (m *Metrics) RecordQueryDuration(upstream string, duration time.Duration) {
	m.queryDuration.WithLabelValues(upstream).Observe(duration.Seconds())
}

// RecordCacheHit records a cache hit
func (m *Metrics) RecordCacheHit() {
	m.cacheHits.Inc()
}

// RecordCacheMiss records a cache miss
func (m *Metrics) RecordCacheMiss() {
	m.cacheMisses.Inc()
}

// SetCacheSize sets the current cache size
func (m *Metrics) SetCacheSize(size int) {
	m.cacheSize.Set(float64(size))
}

// RecordUpstreamError records an upstream DNS error
func (m *Metrics) RecordUpstreamError(upstream string) {
	m.upstreamErrors.WithLabelValues(upstream).Inc()
}

// IncActiveQueries increments the active queries gauge
func (m *Metrics) IncActiveQueries() {
	m.activeQueries.Inc()
}

// DecActiveQueries decrements the active queries gauge
func (m *Metrics) DecActiveQueries() {
	m.activeQueries.Dec()
}

// RecordInternalQuery records a query routed to internal DNS
func (m *Metrics) RecordInternalQuery() {
	m.internalQueries.Inc()
}

// RecordExternalQuery records a query routed to cloud DoH
func (m *Metrics) RecordExternalQuery() {
	m.externalQueries.Inc()
}

// RecordBlockedQuery records a blocked DNS query
func (m *Metrics) RecordBlockedQuery() {
	m.blockedQueries.Inc()
}
