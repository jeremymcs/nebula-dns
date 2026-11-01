// Package config handles agent configuration
package config

import (
	"os"
	"path/filepath"
	"runtime"
	"sync"
)

// InternalDomain represents a domain that should be resolved by internal DNS
type InternalDomain struct {
	Domain     string   `json:"domain"`      // e.g., "corp.contoso.com" or ".contoso.com"
	DNSServers []string `json:"dns_servers"` // e.g., ["192.168.1.10", "192.168.1.11"]
}

// ForwarderConfig contains settings for forwarder mode
type ForwarderConfig struct {
	Enabled         bool             `json:"enabled"`
	ListenAddress   string           `json:"listen_address"`   // e.g., "127.0.0.1:53"
	InternalDomains []InternalDomain `json:"internal_domains"` // Legacy/manual split-DNS rules
	InternalZones   []string         `json:"internal_zones"`   // Tenant/location zones from API
	CacheTTL        int              `json:"cache_ttl"`        // Cache TTL in seconds
	CacheSize       int              `json:"cache_size"`       // Max cache entries
	Timeout         int              `json:"timeout"`          // Query timeout in ms
	FallbackDNS     []string         `json:"fallback_dns"`     // Optional break-glass (default disabled)
	AllowPublicFallback bool         `json:"allow_public_fallback"`
}

// Config represents the agent configuration
type Config struct {
	mu sync.RWMutex

	// Agent identity (stored locally after enrollment)
	DeviceID     string   `json:"device_id"`
	DeviceSecret string   `json:"device_secret,omitempty"`
	TenantID     string   `json:"tenant_id"`
	Roles        []string `json:"roles"`

	// Server configuration
	APIEndpoint string `json:"api_endpoint"`
	DoHEndpoint string `json:"doh_endpoint"` // DoH endpoint for forwarder
	LocationID  string `json:"location_id"`
	APIKey      string `json:"api_key"`
	Token       string `json:"token"` // DoH authentication token

	// DNS configuration
	DNSServers []string `json:"dns_servers"`

	// Agent settings
	HeartbeatInterval int    `json:"heartbeat_interval"` // seconds
	AutoUpdate        bool   `json:"auto_update"`
	LogLevel          string `json:"log_level"`

	// Forwarder mode settings
	Forwarder ForwarderConfig `json:"forwarder"`

	// Shield CA (HTTPS block pages)
	InstallShieldCa bool `json:"install_shield_ca"`

	// Cached policy data
	PolicyVersion string `json:"policy_version"`
}

// DefaultConfig returns a new config with default values
func DefaultConfig() *Config {
	return &Config{
		APIEndpoint:       "https://api.shield.fluxlabs.net",
		DoHEndpoint:       "https://dns.shield.fluxlabs.net/dns-query",
		DNSServers:        []string{"dns1.shield.fluxlabs.net", "dns2.shield.fluxlabs.net"},
		HeartbeatInterval: 60,
		AutoUpdate:        true,
		LogLevel:          "info",
		Roles:             []string{"dns-enforce"},
		Forwarder: ForwarderConfig{
			Enabled:       true,
			ListenAddress: "127.0.0.1:53",
			CacheTTL:      300,
			CacheSize:     10000,
			Timeout:       5000,
			FallbackDNS:   []string{},
			AllowPublicFallback: false,
		},
	}
}

// ConfigPath returns the platform-specific config file path
func ConfigPath() string {
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(os.Getenv("ProgramData"), "FluxShield", "config.json")
	case "darwin":
		return "/Library/Application Support/FluxShield/config.json"
	default: // linux
		return "/etc/fluxshield/config.json"
	}
}

// Load reads configuration from disk
func (c *Config) Load() error {
	return loadFromDisk(c)
}

// Save writes configuration to disk
func (c *Config) Save() error {
	return saveToDisk(c)
}

// GetAPIEndpoint returns the API endpoint thread-safely
func (c *Config) GetAPIEndpoint() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.APIEndpoint
}

// GetLocationID returns the location ID thread-safely
func (c *Config) GetLocationID() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.LocationID
}

func (c *Config) GetDeviceID() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.DeviceID
}

func (c *Config) GetInstallShieldCa() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.InstallShieldCa
}

// SetLocationID sets the location ID thread-safely
func (c *Config) SetLocationID(id string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.LocationID = id
}

// GetDNSServers returns the DNS servers thread-safely
func (c *Config) GetDNSServers() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	servers := make([]string, len(c.DNSServers))
	copy(servers, c.DNSServers)
	return servers
}

func (c *Config) GetDeviceSecret() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.DeviceSecret
}

func (c *Config) GetDoHToken() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.Token
}
