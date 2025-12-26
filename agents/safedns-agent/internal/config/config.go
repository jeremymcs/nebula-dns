// Package config handles agent configuration
package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"sync"
)

// Config represents the agent configuration
type Config struct {
	mu sync.RWMutex

	// Server configuration
	APIEndpoint string `json:"api_endpoint"`
	LocationID  string `json:"location_id"`
	APIKey      string `json:"api_key"`

	// DNS configuration
	DNSServers []string `json:"dns_servers"`

	// Agent settings
	HeartbeatInterval int  `json:"heartbeat_interval"` // seconds
	AutoUpdate        bool `json:"auto_update"`
	LogLevel          string `json:"log_level"`

	// Cached policy data
	PolicyVersion string `json:"policy_version"`
}

// DefaultConfig returns a new config with default values
func DefaultConfig() *Config {
	return &Config{
		APIEndpoint:       "https://api.safedns.io",
		DNSServers:        []string{"dns1.safedns.io", "dns2.safedns.io"},
		HeartbeatInterval: 60,
		AutoUpdate:        true,
		LogLevel:          "info",
	}
}

// ConfigPath returns the platform-specific config file path
func ConfigPath() string {
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(os.Getenv("ProgramData"), "SafeDNS", "config.json")
	case "darwin":
		return "/Library/Application Support/SafeDNS/config.json"
	default: // linux
		return "/etc/safedns/config.json"
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

