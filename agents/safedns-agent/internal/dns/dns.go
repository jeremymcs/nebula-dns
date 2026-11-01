// Package dns handles system DNS configuration
package dns

// Manager handles DNS configuration for the system
type Manager struct {
	backup *AdapterBackup
}

// NewManager creates a new DNS manager
func NewManager() *Manager {
	return &Manager{}
}
