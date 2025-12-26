//go:build darwin

package dns

import (
	"os/exec"
	"strings"
)

// Configure sets the system DNS servers
func (m *Manager) Configure(servers []string) error {
	// Get all network services
	services, err := m.getDarwinServices()
	if err != nil {
		return err
	}

	for _, service := range services {
		// Build the networksetup command
		args := []string{"-setdnsservers", service}
		if len(servers) == 0 {
			args = append(args, "Empty")
		} else {
			args = append(args, servers...)
		}

		cmd := exec.Command("networksetup", args...)
		if err := cmd.Run(); err != nil {
			// Some services may not support DNS configuration, ignore errors
			continue
		}
	}

	// Flush DNS cache
	exec.Command("dscacheutil", "-flushcache").Run()
	exec.Command("killall", "-HUP", "mDNSResponder").Run()

	return nil
}

// GetCurrentServers returns the current system DNS servers
func (m *Manager) GetCurrentServers() ([]string, error) {
	// Get the primary network service
	services, err := m.getDarwinServices()
	if err != nil || len(services) == 0 {
		return nil, err
	}

	cmd := exec.Command("networksetup", "-getdnsservers", services[0])
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	outputStr := strings.TrimSpace(string(output))
	if strings.Contains(outputStr, "There aren't any DNS Servers") {
		return nil, nil
	}

	var servers []string
	for _, line := range strings.Split(outputStr, "\n") {
		server := strings.TrimSpace(line)
		if server != "" {
			servers = append(servers, server)
		}
	}

	return servers, nil
}

func (m *Manager) getDarwinServices() ([]string, error) {
	cmd := exec.Command("networksetup", "-listallnetworkservices")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var services []string
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Skip the header line and disabled services
		if line == "" || strings.HasPrefix(line, "An asterisk") || strings.HasPrefix(line, "*") {
			continue
		}
		services = append(services, line)
	}

	return services, nil
}
