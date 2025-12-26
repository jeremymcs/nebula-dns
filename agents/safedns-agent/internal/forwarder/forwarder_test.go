package forwarder

import (
	"testing"
	"time"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
	"github.com/miekg/dns"
	"go.uber.org/zap"
)

func TestMatchInternalDomain(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.Forwarder.InternalDomains = []config.InternalDomain{
		{Domain: "corp.contoso.com", DNSServers: []string{"192.168.1.10"}},
		{Domain: ".internal.local", DNSServers: []string{"10.0.0.1", "10.0.0.2"}},
		{Domain: "exact.test", DNSServers: []string{"172.16.0.1"}},
	}

	logger := zap.NewNop()
	f := New(cfg, logger)

	tests := []struct {
		name     string
		qname    string
		expected bool
	}{
		{"exact match", "corp.contoso.com.", true},
		{"subdomain of corp", "sub.corp.contoso.com.", true},
		{"deep subdomain", "a.b.c.corp.contoso.com.", true},
		{"wildcard suffix", "host.internal.local.", true},
		{"direct wildcard", "internal.local.", true},
		{"exact test domain", "exact.test.", true},
		{"external domain", "google.com.", false},
		{"partial match", "notcorp.contoso.com.", false},
		{"similar but different", "contoso.com.", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := f.matchInternalDomain(tt.qname)
			if (result != nil) != tt.expected {
				t.Errorf("matchInternalDomain(%q) = %v, want match=%v", tt.qname, result, tt.expected)
			}
		})
	}
}

func TestForwarder_StartStop(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.Forwarder.ListenAddress = "127.0.0.1:15353" // Use non-privileged port for testing

	logger := zap.NewNop()
	f := New(cfg, logger)

	// Should not be running initially
	if f.IsRunning() {
		t.Fatal("Forwarder should not be running initially")
	}

	// Start the forwarder
	if err := f.Start(); err != nil {
		t.Fatalf("Failed to start forwarder: %v", err)
	}

	// Wait a bit for servers to fully start
	time.Sleep(50 * time.Millisecond)

	// Should be running now
	if !f.IsRunning() {
		t.Fatal("Forwarder should be running after Start()")
	}

	// Starting again should fail
	if err := f.Start(); err == nil {
		t.Fatal("Starting already running forwarder should fail")
	}

	// Stop the forwarder
	if err := f.Stop(); err != nil {
		t.Logf("Stop returned error (may be expected): %v", err)
	}

	// Should not be running after stop
	if f.IsRunning() {
		t.Fatal("Forwarder should not be running after Stop()")
	}
}

func TestCacheKey(t *testing.T) {
	tests := []struct {
		name  string
		qtype uint16
		want  string
	}{
		{"example.com.", dns.TypeA, "example.com.:A"},
		{"example.com.", dns.TypeAAAA, "example.com.:AAAA"},
		{"example.com.", dns.TypeMX, "example.com.:MX"},
		{"sub.domain.org.", dns.TypeTXT, "sub.domain.org.:TXT"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			got := cacheKey(tt.name, tt.qtype)
			if got != tt.want {
				t.Errorf("cacheKey(%q, %v) = %q, want %q", tt.name, tt.qtype, got, tt.want)
			}
		})
	}
}

func TestNew(t *testing.T) {
	cfg := config.DefaultConfig()
	logger := zap.NewNop()

	f := New(cfg, logger)

	if f == nil {
		t.Fatal("New() returned nil")
	}
	if f.cfg != cfg {
		t.Error("Config not set correctly")
	}
	if f.logger != logger {
		t.Error("Logger not set correctly")
	}
	if f.dohClient == nil {
		t.Error("DoH client not initialized")
	}
	if f.cache == nil {
		t.Error("Cache not initialized")
	}
	if f.IsRunning() {
		t.Error("Forwarder should not be running initially")
	}
}
