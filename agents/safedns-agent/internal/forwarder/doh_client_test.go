package forwarder

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
	"github.com/miekg/dns"
	"go.uber.org/zap"
)

func TestDoHClient_Query(t *testing.T) {
	// Create a mock DoH server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify headers
		if r.Header.Get("Accept") != "application/dns-message" {
			t.Errorf("Expected Accept: application/dns-message, got %s", r.Header.Get("Accept"))
		}
		if r.Header.Get("User-Agent") != "NebulaDNS-Agent/1.0" {
			t.Errorf("Expected User-Agent: NebulaDNS-Agent/1.0, got %s", r.Header.Get("User-Agent"))
		}

		// Create a response
		response := new(dns.Msg)
		response.SetReply(&dns.Msg{})
		response.Answer = append(response.Answer, &dns.A{
			Hdr: dns.RR_Header{Name: "test.com.", Rrtype: dns.TypeA, Class: dns.ClassINET, Ttl: 300},
			A:   []byte{1, 2, 3, 4},
		})

		wire, _ := response.Pack()
		w.Header().Set("Content-Type", "application/dns-message")
		w.Write(wire)
	}))
	defer server.Close()

	cfg := config.DefaultConfig()
	cfg.DoHEndpoint = server.URL
	cfg.Token = "test-token"
	cfg.LocationID = "loc-123"

	logger := zap.NewNop()
	client := NewDoHClient(cfg, logger)

	// Create query
	query := new(dns.Msg)
	query.SetQuestion("test.com.", dns.TypeA)

	// Execute query
	resp, err := client.Query(context.Background(), query)
	if err != nil {
		t.Fatalf("Query failed: %v", err)
	}

	if resp == nil {
		t.Fatal("Response is nil")
	}

	if len(resp.Answer) != 1 {
		t.Fatalf("Expected 1 answer, got %d", len(resp.Answer))
	}
}

func TestDoHClient_AuthHeaders(t *testing.T) {
	var receivedAuth, receivedLocation string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuth = r.Header.Get("Authorization")
		receivedLocation = r.Header.Get("X-Location-ID")

		// Return minimal valid response
		response := new(dns.Msg)
		wire, _ := response.Pack()
		w.Header().Set("Content-Type", "application/dns-message")
		w.Write(wire)
	}))
	defer server.Close()

	cfg := config.DefaultConfig()
	cfg.DoHEndpoint = server.URL
	cfg.Token = "my-secret-token"
	cfg.LocationID = "location-456"

	logger := zap.NewNop()
	client := NewDoHClient(cfg, logger)

	query := new(dns.Msg)
	query.SetQuestion("auth-test.com.", dns.TypeA)
	client.Query(context.Background(), query)

	if receivedAuth != "Bearer my-secret-token" {
		t.Errorf("Expected Authorization: Bearer my-secret-token, got %s", receivedAuth)
	}
	if receivedLocation != "location-456" {
		t.Errorf("Expected X-Location-ID: location-456, got %s", receivedLocation)
	}
}

func TestDoHClient_ErrorHandling(t *testing.T) {
	// Server that returns 500 error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Internal Server Error"))
	}))
	defer server.Close()

	cfg := config.DefaultConfig()
	cfg.DoHEndpoint = server.URL

	logger := zap.NewNop()
	client := NewDoHClient(cfg, logger)

	query := new(dns.Msg)
	query.SetQuestion("error.com.", dns.TypeA)

	_, err := client.Query(context.Background(), query)
	if err == nil {
		t.Fatal("Expected error for 500 response, got nil")
	}
}

func TestNewDoHClient(t *testing.T) {
	cfg := config.DefaultConfig()
	logger := zap.NewNop()

	client := NewDoHClient(cfg, logger)

	if client == nil {
		t.Fatal("NewDoHClient returned nil")
	}
	if client.cfg != cfg {
		t.Error("Config not set correctly")
	}
	if client.httpClient == nil {
		t.Error("HTTP client not initialized")
	}
}

