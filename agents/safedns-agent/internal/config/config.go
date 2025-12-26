// Package config handles agent configuration
package config

import (
	"encoding/json"
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
	ListenAddress   string           `json:"listen_address"`   // e.g., "0.0.0.0:53"
	InternalDomains []InternalDomain `json:"internal_domains"` // Split-DNS rules
	CacheTTL        int              `json:"cache_ttl"`        // Cache TTL in seconds
	CacheSize       int              `json:"cache_size"`       // Max cache entries
	Timeout         int              `json:"timeout"`          // Query timeout in ms
	FallbackDNS     []string         `json:"fallback_dns"`     // Fallback if cloud unreachable
}

// Config represents the agent configuration
type Config struct {
	mu sync.RWMutex

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

	// Cached policy data
	PolicyVersion string `json:"policy_version"`
}

// DefaultConfig returns a new config with default values
func DefaultConfig() *Config {
	return &Config{
		APIEndpoint:       "https://api.nebuladns.io",
		DoHEndpoint:       "https://dns.nebuladns.io/dns-query",
		DNSServers:        []string{"dns1.nebuladns.io", "dns2.nebuladns.io"},
		HeartbeatInterval: 60,
		AutoUpdate:        true,
		LogLevel:          "info",
		Forwarder: ForwarderConfig{
			Enabled:       false,
			ListenAddress: "127.0.0.1:53",
			CacheTTL:      300,
			CacheSize:     10000,
			Timeout:       5000,
			FallbackDNS:   []string{"1.1.1.1", "8.8.8.8"},
		},
	}
}

// ConfigPath returns the platform-specific config file path
func ConfigPath() string {
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(os.Getenv("ProgramData"), "NebulaDNS", "config.json")
	case "darwin":
		return "/Library/Application Support/NebulaDNS/config.json"
	default: // linux
		return "/etc/nebuladns/config.json"
	}
}

// Load reads configuration from disk
func (c *Config) Load() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	path := ConfigPath()
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			// Use defaults if no config exists
			return nil
		}
		return err
	}

	return json.Unmarshal(data, c)
}

// Save writes configuration to disk
func (c *Config) Save() error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	path := ConfigPath()

	// Ensure directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0600)
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
