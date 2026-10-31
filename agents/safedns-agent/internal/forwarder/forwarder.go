// Package forwarder implements a DNS forwarder with split-DNS support.
// It listens for DNS queries, routes internal domains to corporate DNS,
// and forwards external queries to the Nebula DNS cloud via DoH.
package forwarder

import (
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/splitdns"
	"github.com/miekg/dns"
	"go.uber.org/zap"
)

// Forwarder handles DNS forwarding with split-DNS support
type Forwarder struct {
	cfg       *config.Config
	logger    *zap.Logger
	dohClient *DoHClient
	cache     *Cache
	metrics   *Metrics
	router    *splitdns.Router

	udpServer *dns.Server
	tcpServer *dns.Server
	running   bool
	mu        sync.RWMutex

	ctx    context.Context
	cancel context.CancelFunc
}

// New creates a new Forwarder instance
func New(cfg *config.Config, logger *zap.Logger) *Forwarder {
	ctx, cancel := context.WithCancel(context.Background())
	f := &Forwarder{
		cfg:       cfg,
		logger:    logger,
		dohClient: NewDoHClient(cfg, logger),
		cache:     NewCache(cfg.Forwarder.CacheSize, time.Duration(cfg.Forwarder.CacheTTL)*time.Second),
		metrics:   NewMetrics(),
		ctx:       ctx,
		cancel:    cancel,
	}
	f.rebuildRouter()
	return f
}

// RefreshSplitDNSProfile re-runs discovery (e.g. after VPN connect or heartbeat config push).
func (f *Forwarder) RefreshSplitDNSProfile() {
	f.rebuildRouter()
}

func (f *Forwarder) rebuildRouter() {
	profile, err := splitdns.DiscoverWindowsProfile(f.cfg.Forwarder.InternalZones)
	if err != nil {
		f.logger.Warn("Split DNS discovery failed", zap.Error(err))
	}
	// Merge legacy manual internal domain rules into configured zones list
	for _, rule := range f.cfg.Forwarder.InternalDomains {
		profile.ConfiguredZones = append(profile.ConfiguredZones, rule.Domain)
		if len(profile.InternalServers) == 0 && len(rule.DNSServers) > 0 {
			profile.InternalServers = append(profile.InternalServers, rule.DNSServers...)
		}
	}
	f.router = splitdns.NewRouter(profile)
}

// GetMetrics returns the metrics instance for HTTP handler registration
func (f *Forwarder) GetMetrics() *Metrics {
	return f.metrics
}

// Start begins listening for DNS queries
func (f *Forwarder) Start() error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.running {
		return fmt.Errorf("forwarder already running")
	}

	addr := f.cfg.Forwarder.ListenAddress
	f.logger.Info("Starting DNS forwarder", zap.String("address", addr))

	handler := dns.HandlerFunc(f.handleQuery)

	f.udpServer = &dns.Server{
		Addr:    addr,
		Net:     "udp",
		Handler: handler,
	}

	f.tcpServer = &dns.Server{
		Addr:    addr,
		Net:     "tcp",
		Handler: handler,
	}

	// Start UDP server
	go func() {
		if err := f.udpServer.ListenAndServe(); err != nil {
			f.logger.Error("UDP server error", zap.Error(err))
		}
	}()

	// Start TCP server
	go func() {
		if err := f.tcpServer.ListenAndServe(); err != nil {
			f.logger.Error("TCP server error", zap.Error(err))
		}
	}()

	f.running = true
	f.logger.Info("DNS forwarder started successfully")
	return nil
}

// Stop shuts down the forwarder
func (f *Forwarder) Stop() error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if !f.running {
		return nil
	}

	f.logger.Info("Stopping DNS forwarder")
	f.cancel()

	var errs []error
	if f.udpServer != nil {
		if err := f.udpServer.Shutdown(); err != nil {
			errs = append(errs, err)
		}
	}
	if f.tcpServer != nil {
		if err := f.tcpServer.Shutdown(); err != nil {
			errs = append(errs, err)
		}
	}

	f.running = false
	if len(errs) > 0 {
		return fmt.Errorf("errors during shutdown: %v", errs)
	}
	return nil
}

// handleQuery processes incoming DNS queries
func (f *Forwarder) handleQuery(w dns.ResponseWriter, r *dns.Msg) {
	if len(r.Question) == 0 {
		return
	}

	startTime := time.Now()
	f.metrics.IncActiveQueries()
	defer f.metrics.DecActiveQueries()

	q := r.Question[0]
	qname := strings.ToLower(q.Name)
	qtype := dns.TypeToString[q.Qtype]

	f.logger.Debug("Received query", zap.String("name", qname), zap.String("type", qtype))

	// Check cache first
	if cached := f.cache.Get(qname, q.Qtype); cached != nil {
		cached.Id = r.Id
		w.WriteMsg(cached)
		f.logger.Debug("Cache hit", zap.String("name", qname))
		f.metrics.RecordCacheHit()
		f.metrics.RecordQuery(qtype, "success")
		f.metrics.RecordQueryDuration("cache", time.Since(startTime))
		return
	}
	f.metrics.RecordCacheMiss()

	// Determine upstream
	var response *dns.Msg
	var err error
	var upstream string

	if internal, servers := f.routeInternal(qname); internal {
		upstream = "internal"
		if len(servers) == 0 {
			response = new(dns.Msg)
			response.SetRcode(r, dns.RcodeServerFailure)
			f.metrics.RecordInternalQuery()
		} else {
			response, err = f.queryInternal(r, servers)
			f.metrics.RecordInternalQuery()
			if err != nil {
				f.logger.Warn("Internal DNS unavailable (fail closed for this name)",
					zap.String("name", qname), zap.Error(err))
				response = new(dns.Msg)
				response.SetRcode(r, dns.RcodeServerFailure)
				err = nil
			}
		}
	} else {
		// Route to Flux Shield DoH
		upstream = "doh"
		response, err = f.dohClient.Query(f.ctx, r)
		f.metrics.RecordExternalQuery()
		if err != nil && f.cfg.Forwarder.AllowPublicFallback && len(f.cfg.Forwarder.FallbackDNS) > 0 {
			upstream = "fallback"
			response, err = f.queryInternal(r, f.cfg.Forwarder.FallbackDNS)
		}
	}

	if err != nil {
		f.logger.Error("Query failed", zap.String("name", qname), zap.Error(err))
		f.metrics.RecordUpstreamError(upstream)
	}

	if err != nil || response == nil {
		f.logger.Error("All upstreams failed", zap.String("name", qname))
		f.metrics.RecordUpstreamError(upstream)
		f.metrics.RecordQuery(qtype, "error")
		response = new(dns.Msg)
		response.SetRcode(r, dns.RcodeServerFailure)
	} else {
		f.metrics.RecordQuery(qtype, "success")
	}

	// Record query duration
	f.metrics.RecordQueryDuration(upstream, time.Since(startTime))

	// Cache successful responses
	if response.Rcode == dns.RcodeSuccess {
		f.cache.Set(qname, q.Qtype, response)
		f.metrics.SetCacheSize(f.cache.Size())
	}

	response.Id = r.Id
	w.WriteMsg(response)
}

// routeInternal reports whether qname must not go to Flux Shield.
func (f *Forwarder) routeInternal(qname string) (internal bool, servers []string) {
	if f.router != nil && f.router.Route(qname) == splitdns.RouteInternal {
		servers = f.router.InternalServers()
		if len(servers) == 0 {
			if legacy := f.matchInternalDomainServers(qname); len(legacy) > 0 {
				return true, legacy
			}
			return true, nil
		}
		return true, servers
	}
	if legacy := f.matchInternalDomainServers(qname); legacy != nil {
		return true, legacy
	}
	return false, nil
}

func (f *Forwarder) matchInternalDomainServers(qname string) []string {
	for _, rule := range f.cfg.Forwarder.InternalDomains {
		domain := strings.ToLower(rule.Domain)
		if qname == dns.Fqdn(domain) || strings.HasSuffix(qname, "."+dns.Fqdn(domain)) {
			return rule.DNSServers
		}
		if strings.HasPrefix(domain, ".") && strings.HasSuffix(qname, dns.Fqdn(domain[1:])) {
			return rule.DNSServers
		}
	}
	return nil
}

// matchInternalDomain checks legacy internal domain rules (tests).
func (f *Forwarder) matchInternalDomain(qname string) []string {
	return f.matchInternalDomainServers(qname)
}

// queryInternal forwards query to internal DNS servers
func (f *Forwarder) queryInternal(r *dns.Msg, servers []string) (*dns.Msg, error) {
	timeout := time.Duration(f.cfg.Forwarder.Timeout) * time.Millisecond
	c := new(dns.Client)
	c.Timeout = timeout

	var lastErr error
	for _, server := range servers {
		addr := server
		if !strings.Contains(addr, ":") {
			addr = net.JoinHostPort(addr, "53")
		}

		resp, _, err := c.Exchange(r, addr)
		if err == nil && resp != nil {
			f.logger.Debug("Internal query success", zap.String("server", server))
			return resp, nil
		}
		lastErr = err
		f.logger.Warn("Internal DNS failed", zap.String("server", server), zap.Error(err))
	}
	return nil, fmt.Errorf("all internal servers failed: %w", lastErr)
}

// queryFallback tries the fallback DNS servers
func (f *Forwarder) queryFallback(r *dns.Msg) (*dns.Msg, error) {
	if len(f.cfg.Forwarder.FallbackDNS) == 0 {
		return nil, fmt.Errorf("no fallback DNS configured")
	}

	f.logger.Debug("Trying fallback DNS")
	return f.queryInternal(r, f.cfg.Forwarder.FallbackDNS)
}

// IsRunning returns whether the forwarder is currently running
func (f *Forwarder) IsRunning() bool {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return f.running
}
