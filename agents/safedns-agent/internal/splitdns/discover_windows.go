// Package splitdns — Windows Active Directory / DHCP discovery for split DNS.
//go:build windows

package splitdns

import (
	"os/exec"
	"strings"
)

// DiscoverWindowsProfile reads domain membership, suffixes, and per-adapter DNS servers
// before the agent repoints adapters to 127.0.0.1.
func DiscoverWindowsProfile(configuredZones []string) (Profile, error) {
	p := Profile{ConfiguredZones: configuredZones}

	domain, err := runPowerShell(`(Get-CimInstance Win32_ComputerSystem).Domain`)
	if err == nil {
		domain = strings.TrimSpace(domain)
		if domain != "" && !strings.EqualFold(domain, "WORKGROUP") {
			p.DomainJoined = true
			p.ADDomain = strings.ToLower(domain)
		}
	}

	suffixes, _ := runPowerShell(`(Get-DnsClientGlobalSetting).SuffixSearchList -join ','`)
	for _, s := range strings.Split(suffixes, ",") {
		s = strings.TrimSpace(s)
		if s != "" {
			p.DNSSuffixes = append(p.DNSSuffixes, strings.ToLower(s))
		}
	}

	servers, _ := discoverAdapterDNSServers()
	p.InternalServers = uniqueStrings(servers)
	p.OnSite = len(p.InternalServers) > 0 && containsPrivateOrRFC1918(p.InternalServers)
	return p, nil
}

func discoverAdapterDNSServers() ([]string, error) {
	out, err := runPowerShell(`
Get-DnsClientServerAddress -AddressFamily IPv4 |
  Where-Object { $_.ServerAddresses.Count -gt 0 } |
  ForEach-Object { $_.ServerAddresses } |
  Sort-Object -Unique
`)
	if err != nil {
		return nil, err
	}
	var servers []string
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		if line != "" && line != "127.0.0.1" {
			servers = append(servers, line)
		}
	}
	return servers, nil
}

func runPowerShell(script string) (string, error) {
	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", script)
	out, err := cmd.Output()
	return string(out), err
}

func uniqueStrings(in []string) []string {
	seen := map[string]struct{}{}
	var out []string
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}

func containsPrivateOrRFC1918(servers []string) bool {
	for _, s := range servers {
		if strings.HasPrefix(s, "10.") || strings.HasPrefix(s, "192.168.") || strings.HasPrefix(s, "172.") {
			return true
		}
	}
	return len(servers) > 0
}
