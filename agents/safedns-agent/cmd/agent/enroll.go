package main

import (
	"strings"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/apiclient"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/credentials"
)

const serviceName = "FluxShieldAgent"

func enrollAndSave(cfg *config.Config, apiBase, token, agentVersion string, roles []string) error {
	deviceID, resp, err := apiclient.Register(apiBase, token, agentVersion, roles)
	if err != nil {
		return err
	}
	cfg.DeviceID = deviceID
	if resp.Data.Config.TenantID != "" {
		cfg.TenantID = resp.Data.Config.TenantID
	}
	if resp.Data.LocationID != "" {
		cfg.LocationID = resp.Data.LocationID
	}
	if len(resp.Data.Roles) > 0 {
		cfg.Roles = resp.Data.Roles
	} else {
		cfg.Roles = roles
	}
	if resp.Data.Config.APIEndpoint != "" {
		cfg.APIEndpoint = resp.Data.Config.APIEndpoint
	}
	if resp.Data.Config.DoHEndpoint != "" {
		cfg.DoHEndpoint = resp.Data.Config.DoHEndpoint
	}
	if len(resp.Data.Config.DNSServers) > 0 {
		cfg.DNSServers = resp.Data.Config.DNSServers
	}
	if len(resp.Data.Config.InternalDnsZones) > 0 {
		cfg.Forwarder.InternalZones = resp.Data.Config.InternalDnsZones
	}
	cfg.DeviceSecret = resp.Data.DeviceSecret
	cfg.Token = resp.Data.DohToken
	if err := cfg.StoreCredentials(); err != nil {
		return err
	}
	return nil
}

func parseRoles(raw string) []string {
	parts := strings.Split(raw, ",")
	var roles []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			roles = append(roles, p)
		}
	}
	return roles
}

func configureServiceRecovery() {
	_ = credentials.ConfigureServiceRecovery(serviceName)
}
