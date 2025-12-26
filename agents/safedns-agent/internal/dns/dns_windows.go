//go:build windows

package dns

import (
	"fmt"
	"os/exec"
	"strings"
)

// Configure sets the system DNS servers
func (m *Manager) Configure(servers []string) error {
	// Get all network adapters
	adapters, err := m.getWindowsAdapters()
	if err != nil {
		return err
	}

	for _, adapter := range adapters {
		// Set primary DNS
		if len(servers) > 0 {
			cmd := exec.Command("netsh", "interface", "ip", "set", "dns",
				fmt.Sprintf("name=%q", adapter), "static", servers[0])
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("failed to set primary DNS for %s: %w", adapter, err)
			}
		}

		// Set secondary DNS
		if len(servers) > 1 {
			cmd := exec.Command("netsh", "interface", "ip", "add", "dns",
				fmt.Sprintf("name=%q", adapter), servers[1], "index=2")
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("failed to set secondary DNS for %s: %w", adapter, err)
			}
		}
	}

	// Flush DNS cache
	exec.Command("ipconfig", "/flushdns").Run()

	return nil
}

// GetCurrentServers returns the current system DNS servers
func (m *Manager) GetCurrentServers() ([]string, error) {
	cmd := exec.Command("netsh", "interface", "ip", "show", "dns")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var servers []string
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.Contains(line, "DNS Servers") || strings.Contains(line, "Statically Configured DNS Servers") {
			parts := strings.Split(line, ":")
			if len(parts) > 1 {
				server := strings.TrimSpace(parts[1])
				if server != "" && server != "None" {
					servers = append(servers, server)
				}
			}
		}
	}

	return servers, nil
}

func (m *Manager) getWindowsAdapters() ([]string, error) {
	cmd := exec.Command("netsh", "interface", "show", "interface")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var adapters []string
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) >= 4 && fields[0] == "Enabled" && fields[1] == "Connected" {
			// Join remaining fields as adapter name
			name := strings.Join(fields[3:], " ")
			adapters = append(adapters, name)
		}
	}

	return adapters, nil
}
