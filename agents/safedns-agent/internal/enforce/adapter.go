package enforce

import "github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/dns"

// DNSManager adapts dns.Manager to DNSController.
type DNSManager struct {
	M *dns.Manager
}

func (d DNSManager) ApplyEnforcement() error {
	return d.M.Configure(dns.EnforcedServers)
}

func (d DNSManager) CheckEnforcement() (bool, string, error) {
	return d.M.CheckEnforcement()
}
