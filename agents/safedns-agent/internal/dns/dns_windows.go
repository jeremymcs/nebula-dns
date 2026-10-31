//go:build windows

package dns

import (
	"fmt"
	"os/exec"
	"strings"
)

// SaveOriginal captures per-adapter DNS and persists to disk (skips if backup already exists).
func (m *Manager) SaveOriginal() error {
	if b, err := loadBackupFromDisk(); err == nil && len(b.Adapters) > 0 {
		m.backup = b
		return nil
	}
	adapters, err := m.listAdapterDNS()
	if err != nil {
		return err
	}
	filtered := make([]AdapterDNS, 0, len(adapters))
	for _, a := range adapters {
		if isLoopbackOnly(a.Servers) {
			continue
		}
		filtered = append(filtered, a)
	}
	if len(filtered) == 0 {
		if b, err := loadBackupFromDisk(); err == nil && len(b.Adapters) > 0 {
			m.backup = b
			return nil
		}
		return fmt.Errorf("refusing to overwrite DNS backup while only loopback resolvers are configured")
	}
	m.backup = &AdapterBackup{Adapters: filtered}
	return saveBackupToDisk(m.backup)
}

// RestoreFromDisk restores DNS from persisted backup (safe if service dies).
func (m *Manager) RestoreFromDisk() error {
	b, err := loadBackupFromDisk()
	if err != nil {
		return m.Restore()
	}
	m.backup = b
	return m.restoreBackup()
}

// Restore applies the in-memory or on-disk adapter backup.
func (m *Manager) Restore() error {
	if m.backup == nil || len(m.backup.Adapters) == 0 {
		if b, err := loadBackupFromDisk(); err == nil {
			m.backup = b
		}
	}
	if m.backup == nil || len(m.backup.Adapters) == 0 {
		return nil
	}
	return m.restoreBackup()
}

func (m *Manager) restoreBackup() error {
	for _, a := range m.backup.Adapters {
		if err := m.setAdapterDNS(a.Name, a.Servers); err != nil {
			return err
		}
	}
	exec.Command("ipconfig", "/flushdns").Run()
	return nil
}

// Configure sets DNS on all active adapters (used for loopback enforcement).
func (m *Manager) Configure(servers []string) error {
	adapters, err := m.getWindowsAdapters()
	if err != nil {
		return err
	}
	for _, adapter := range adapters {
		if err := m.setAdapterDNS(adapter, servers); err != nil {
			return err
		}
	}
	exec.Command("ipconfig", "/flushdns").Run()
	return nil
}

// CheckEnforcement reports whether all active adapters use loopback DNS only.
func (m *Manager) CheckEnforcement() (bool, string, error) {
	adapters, err := m.listAdapterDNS()
	if err != nil {
		return false, "", err
	}
	var issues []string
	for _, a := range adapters {
		if len(a.Servers) == 0 {
			continue
		}
		if !isLoopbackOnly(a.Servers) {
			issues = append(issues, fmt.Sprintf("%s=%v", a.Name, a.Servers))
		}
	}
	if len(issues) > 0 {
		return false, strings.Join(issues, "; "), nil
	}
	return true, "", nil
}

func (m *Manager) setAdapterDNS(adapter string, servers []string) error {
	if len(servers) == 0 {
		cmd := exec.Command("netsh", "interface", "ip", "set", "dns",
			fmt.Sprintf("name=%q", adapter), "dhcp")
		return cmd.Run()
	}
	cmd := exec.Command("netsh", "interface", "ip", "set", "dns",
		fmt.Sprintf("name=%q", adapter), "static", servers[0])
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("set primary DNS for %s: %w", adapter, err)
	}
	// remove extra entries by resetting indexes — add secondary if needed
	for i := 1; i < len(servers); i++ {
		add := exec.Command("netsh", "interface", "ip", "add", "dns",
			fmt.Sprintf("name=%q", adapter), servers[i], fmt.Sprintf("index=%d", i+1))
		if err := add.Run(); err != nil {
			return fmt.Errorf("set secondary DNS for %s: %w", adapter, err)
		}
	}
	return nil
}

func (m *Manager) listAdapterDNS() ([]AdapterDNS, error) {
	out, err := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command",
		`Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses.Count -gt 0 } | ForEach-Object { $_.InterfaceAlias + "|" + ($_.ServerAddresses -join ",") }`,
	).Output()
	if err != nil {
		return nil, err
	}
	var result []AdapterDNS
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 2)
		if len(parts) != 2 {
			continue
		}
		servers := strings.Split(parts[1], ",")
		result = append(result, AdapterDNS{Name: parts[0], Servers: servers})
	}
	return result, nil
}

func isLoopbackOnly(servers []string) bool {
	for _, s := range servers {
		s = strings.TrimSpace(s)
		if s != "127.0.0.1" && s != "::1" {
			return false
		}
	}
	return len(servers) > 0
}

func (m *Manager) getWindowsAdapters() ([]string, error) {
	cmd := exec.Command("netsh", "interface", "show", "interface")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	var adapters []string
	for _, line := range strings.Split(string(output), "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 4 && fields[0] == "Enabled" && fields[1] == "Connected" {
			adapters = append(adapters, strings.Join(fields[3:], " "))
		}
	}
	return adapters, nil
}

func (m *Manager) GetCurrentServers() ([]string, error) {
	adapters, err := m.listAdapterDNS()
	if err != nil {
		return nil, err
	}
	seen := map[string]struct{}{}
	var servers []string
	for _, a := range adapters {
		for _, s := range a.Servers {
			if _, ok := seen[s]; !ok {
				seen[s] = struct{}{}
				servers = append(servers, s)
			}
		}
	}
	return servers, nil
}
