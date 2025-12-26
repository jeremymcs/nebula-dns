package forwarder

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
	"github.com/miekg/dns"
	"go.uber.org/zap"
)

// DoHClient handles DNS-over-HTTPS queries to the cloud service
type DoHClient struct {
	cfg        *config.Config
	logger     *zap.Logger
	httpClient *http.Client
}

// NewDoHClient creates a new DoH client
func NewDoHClient(cfg *config.Config, logger *zap.Logger) *DoHClient {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
	}

	return &DoHClient{
		cfg:    cfg,
		logger: logger,
		httpClient: &http.Client{
			Transport: transport,
			Timeout:   time.Duration(cfg.Forwarder.Timeout) * time.Millisecond,
		},
	}
}

// Query sends a DNS query over HTTPS and returns the response
func (c *DoHClient) Query(ctx context.Context, msg *dns.Msg) (*dns.Msg, error) {
	// Pack DNS message
	wire, err := msg.Pack()
	if err != nil {
		return nil, fmt.Errorf("failed to pack DNS message: %w", err)
	}

	// Try POST method first (more reliable for large queries)
	resp, err := c.queryPOST(ctx, wire)
	if err != nil {
		c.logger.Debug("POST failed, trying GET", zap.Error(err))
		resp, err = c.queryGET(ctx, wire)
	}

	return resp, err
}

// queryPOST sends DNS query using POST method
func (c *DoHClient) queryPOST(ctx context.Context, wire []byte) (*dns.Msg, error) {
	req, err := http.NewRequestWithContext(ctx, "POST", c.cfg.DoHEndpoint, bytes.NewReader(wire))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(req)
	req.Header.Set("Content-Type", "application/dns-message")

	return c.doRequest(req)
}

// queryGET sends DNS query using GET method (RFC 8484)
func (c *DoHClient) queryGET(ctx context.Context, wire []byte) (*dns.Msg, error) {
	// Base64url encode the DNS message
	encoded := base64.RawURLEncoding.EncodeToString(wire)
	url := fmt.Sprintf("%s?dns=%s", c.cfg.DoHEndpoint, encoded)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(req)
	return c.doRequest(req)
}

// setHeaders sets common headers for DoH requests
func (c *DoHClient) setHeaders(req *http.Request) {
	req.Header.Set("Accept", "application/dns-message")
	req.Header.Set("User-Agent", "NebulaDNS-Agent/1.0")

	// Add authentication token if configured
	if c.cfg.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.cfg.Token)
	}

	// Add location ID for policy lookup
	if c.cfg.LocationID != "" {
		req.Header.Set("X-Location-ID", c.cfg.LocationID)
	}
}

// doRequest executes the HTTP request and parses the DNS response
func (c *DoHClient) doRequest(req *http.Request) (*dns.Msg, error) {
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("DoH server returned %d: %s", resp.StatusCode, string(body))
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Unpack DNS response
	response := new(dns.Msg)
	if err := response.Unpack(body); err != nil {
		return nil, fmt.Errorf("failed to unpack DNS response: %w", err)
	}

	return response, nil
}

