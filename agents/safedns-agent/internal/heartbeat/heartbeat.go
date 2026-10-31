// Package heartbeat handles agent heartbeat and configuration sync
package heartbeat

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"time"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
	"go.uber.org/zap"
)

// HeartbeatRequest is sent to the server
type HeartbeatRequest struct {
	DeviceID        string `json:"deviceId"`
	LocationID      string `json:"location_id,omitempty"`
	AgentVersion    string `json:"agentVersion"`
	OS              string `json:"os"`
	Arch            string `json:"arch"`
	Hostname        string `json:"hostname"`
	PolicyVersion   string `json:"policy_version"`
	Timestamp       string `json:"timestamp"`
	DnsEnforced     *bool  `json:"dnsEnforced,omitempty"`
	TamperDetected   *bool  `json:"tamperDetected,omitempty"`
	TamperDetail    string `json:"tamperDetail,omitempty"`
}

// HeartbeatResponse is received from the server
type HeartbeatResponse struct {
	Success         bool     `json:"success"`
	ConfigUpdated   bool     `json:"configUpdated"`
	UpdateAvailable bool     `json:"updateAvailable"`
	LatestVersion   string   `json:"latestVersion,omitempty"`
	DownloadURL     string   `json:"downloadUrl,omitempty"`
	PolicyVersion   string   `json:"policy_version,omitempty"`
	DNSServers      []string `json:"dns_servers,omitempty"`
	InternalDnsZones []string `json:"internalDnsZones,omitempty"`
	Config          *RuntimeConfig `json:"config,omitempty"`
	Message         string   `json:"message,omitempty"`
}

// RuntimeConfig is pushed from the API on heartbeat/register.
type RuntimeConfig struct {
	APIEndpoint      string   `json:"apiEndpoint"`
	DoHEndpoint      string   `json:"dohEndpoint"`
	DNSServers       []string `json:"dnsServers"`
	Roles            []string `json:"roles"`
	TenantID         string   `json:"tenantId"`
	LocationID       string   `json:"locationId"`
	InternalDnsZones []string `json:"internalDnsZones"`
}

// ConfigUpdateCallback is called when configuration is updated
type ConfigUpdateCallback func(dnsServers []string, policyVersion string)
type RuntimeConfigCallback func(cfg *RuntimeConfig)

// Service handles periodic heartbeats
type Service struct {
	config            *config.Config
	logger            *zap.Logger
	httpClient        *http.Client
	version           string
	hostname          string
	stopCh            chan struct{}
	onConfigUpdate    ConfigUpdateCallback
	onRuntimeConfig   RuntimeConfigCallback
	onUpdateAvailable func(version, downloadURL string)
	statusProvider  func() (dnsEnforced bool, tamperDetected bool, tamperDetail string)
}

// NewService creates a new heartbeat service
func NewService(cfg *config.Config, logger *zap.Logger, version, hostname string) *Service {
	return &Service{
		config: cfg,
		logger: logger,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		version:  version,
		hostname: hostname,
		stopCh:   make(chan struct{}),
	}
}

// Start begins the heartbeat loop
func (s *Service) Start(ctx context.Context) {
	interval := time.Duration(s.config.HeartbeatInterval) * time.Second
	if interval < 30*time.Second {
		interval = 30 * time.Second
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Send initial heartbeat
	s.sendHeartbeat()

	for {
		select {
		case <-ctx.Done():
			return
		case <-s.stopCh:
			return
		case <-ticker.C:
			s.sendHeartbeat()
		}
	}
}

// Stop stops the heartbeat service
func (s *Service) Stop() {
	close(s.stopCh)
}

func (s *Service) SetStatusProvider(fn func() (bool, bool, string)) {
	s.statusProvider = fn
}

func (s *Service) sendHeartbeat() {
	req := HeartbeatRequest{
		DeviceID:      s.config.GetDeviceID(),
		LocationID:    s.config.GetLocationID(),
		AgentVersion:  s.version,
		OS:            runtime.GOOS,
		Arch:          runtime.GOARCH,
		Hostname:      s.hostname,
		PolicyVersion: s.config.PolicyVersion,
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
	}
	if s.statusProvider != nil {
		enforced, tamper, detail := s.statusProvider()
		req.DnsEnforced = &enforced
		req.TamperDetected = &tamper
		req.TamperDetail = detail
	}

	body, err := json.Marshal(req)
	if err != nil {
		s.logger.Error("Failed to marshal heartbeat", zap.Error(err))
		return
	}

	url := fmt.Sprintf("%s/api/v1/agents/heartbeat", s.config.GetAPIEndpoint())
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		s.logger.Error("Failed to create heartbeat request", zap.Error(err))
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if s.config.GetDeviceID() != "" && s.config.GetDeviceSecret() != "" {
		httpReq.Header.Set("X-Device-Id", s.config.GetDeviceID())
		httpReq.Header.Set("Authorization", "Bearer "+s.config.GetDeviceSecret())
	} else if s.config.APIKey != "" {
		httpReq.Header.Set("X-API-Key", s.config.APIKey)
	}

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		s.logger.Warn("Heartbeat failed", zap.Error(err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		s.logger.Warn("Heartbeat returned non-OK status", zap.Int("status", resp.StatusCode))
		return
	}

	var heartbeatResp HeartbeatResponse
	if err := json.NewDecoder(resp.Body).Decode(&heartbeatResp); err != nil {
		s.logger.Error("Failed to decode heartbeat response", zap.Error(err))
		return
	}

	s.logger.Debug("Heartbeat successful",
		zap.String("policy_version", heartbeatResp.PolicyVersion),
		zap.Bool("config_updated", heartbeatResp.ConfigUpdated),
		zap.Bool("update_available", heartbeatResp.UpdateAvailable))

	// Handle configuration updates from server
	if heartbeatResp.Config != nil && s.onRuntimeConfig != nil {
		s.onRuntimeConfig(heartbeatResp.Config)
	} else if heartbeatResp.ConfigUpdated && s.onConfigUpdate != nil {
		s.logger.Info("Configuration update received",
			zap.Strings("dns_servers", heartbeatResp.DNSServers),
			zap.String("policy_version", heartbeatResp.PolicyVersion))
		s.onConfigUpdate(heartbeatResp.DNSServers, heartbeatResp.PolicyVersion)
	}

	// Handle agent updates
	if heartbeatResp.UpdateAvailable && s.onUpdateAvailable != nil {
		s.logger.Info("Agent update available",
			zap.String("latest_version", heartbeatResp.LatestVersion),
			zap.String("download_url", heartbeatResp.DownloadURL))
		s.onUpdateAvailable(heartbeatResp.LatestVersion, heartbeatResp.DownloadURL)
	}
}

func (s *Service) SetRuntimeConfigCallback(cb RuntimeConfigCallback) {
	s.onRuntimeConfig = cb
}

// SetConfigUpdateCallback sets the callback for configuration updates
func (s *Service) SetConfigUpdateCallback(cb ConfigUpdateCallback) {
	s.onConfigUpdate = cb
}

// SetUpdateAvailableCallback sets the callback for agent updates
func (s *Service) SetUpdateAvailableCallback(cb func(version, downloadURL string)) {
	s.onUpdateAvailable = cb
}
