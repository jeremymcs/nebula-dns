package config

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/credentials"
)

type diskConfig struct {
	DeviceID          string          `json:"device_id"`
	TenantID          string          `json:"tenant_id"`
	Roles             []string        `json:"roles"`
	APIEndpoint       string          `json:"api_endpoint"`
	DoHEndpoint       string          `json:"doh_endpoint"`
	LocationID        string          `json:"location_id"`
	APIKey            string          `json:"api_key"`
	DNSServers        []string        `json:"dns_servers"`
	HeartbeatInterval int             `json:"heartbeat_interval"`
	AutoUpdate        bool            `json:"auto_update"`
	LogLevel          string          `json:"log_level"`
	Forwarder         ForwarderConfig `json:"forwarder"`
	PolicyVersion     string          `json:"policy_version"`
}

func (c *Config) toDisk() diskConfig {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return diskConfig{
		DeviceID:          c.DeviceID,
		TenantID:          c.TenantID,
		Roles:             append([]string(nil), c.Roles...),
		APIEndpoint:       c.APIEndpoint,
		DoHEndpoint:       c.DoHEndpoint,
		LocationID:        c.LocationID,
		APIKey:            c.APIKey,
		DNSServers:        append([]string(nil), c.DNSServers...),
		HeartbeatInterval: c.HeartbeatInterval,
		AutoUpdate:        c.AutoUpdate,
		LogLevel:          c.LogLevel,
		Forwarder:         c.Forwarder,
		PolicyVersion:     c.PolicyVersion,
	}
}

func (c *Config) applyDisk(d diskConfig) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.DeviceID = d.DeviceID
	c.TenantID = d.TenantID
	c.Roles = d.Roles
	c.APIEndpoint = d.APIEndpoint
	c.DoHEndpoint = d.DoHEndpoint
	c.LocationID = d.LocationID
	c.APIKey = d.APIKey
	c.DNSServers = d.DNSServers
	c.HeartbeatInterval = d.HeartbeatInterval
	c.AutoUpdate = d.AutoUpdate
	c.LogLevel = d.LogLevel
	c.Forwarder = d.Forwarder
	c.PolicyVersion = d.PolicyVersion
}

func loadFromDisk(c *Config) error {
	path := ConfigPath()
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	var d diskConfig
	if err := json.Unmarshal(data, &d); err != nil {
		return err
	}
	c.applyDisk(d)
	return nil
}

func saveToDisk(c *Config) error {
	path := ConfigPath()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(c.toDisk(), "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0600)
}

// LoadCredentials loads device secret and DoH token from the platform store.
func (c *Config) LoadCredentials() error {
	store, err := credentials.Open()
	if err != nil {
		return err
	}
	secret, err := store.LoadDeviceSecret()
	if err == nil {
		c.mu.Lock()
		c.DeviceSecret = secret
		c.mu.Unlock()
	}
	token, err := store.LoadDoHToken()
	if err == nil {
		c.mu.Lock()
		c.Token = token
		c.mu.Unlock()
	}
	return nil
}

// StoreCredentials persists secrets via DPAPI (Windows LOCAL_MACHINE).
func (c *Config) StoreCredentials() error {
	store, err := credentials.Open()
	if err != nil {
		return err
	}
	c.mu.RLock()
	secret := c.DeviceSecret
	token := c.Token
	c.mu.RUnlock()
	if secret != "" {
		if err := store.SaveDeviceSecret(secret); err != nil {
			return err
		}
	}
	if token != "" {
		if err := store.SaveDoHToken(token); err != nil {
			return err
		}
	}
	c.mu.Lock()
	c.DeviceSecret = ""
	c.Token = ""
	c.mu.Unlock()
	return c.Save()
}

// ClearCredentials removes protected secrets.
func (c *Config) ClearCredentials() error {
	store, err := credentials.Open()
	if err != nil {
		return err
	}
	return store.DeleteAll()
}
