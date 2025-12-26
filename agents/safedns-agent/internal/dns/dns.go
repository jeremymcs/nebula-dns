// Package dns handles system DNS configuration
package dns

// Manager handles DNS configuration for the system
type Manager struct {
	originalServers []string
}

// NewManager creates a new DNS manager
func NewManager() *Manager {
	return &Manager{}
}

// Restore restores the original DNS configuration
func (m *Manager) Restore() error {
	if len(m.originalServers) == 0 {
		return nil
	}
	return m.Configure(m.originalServers)
}

// SaveOriginal saves the current DNS configuration for later restoration
func (m *Manager) SaveOriginal() error {
	servers, err := m.GetCurrentServers()
	if err != nil {
		return err
	}
	m.originalServers = servers
	return nil
}
