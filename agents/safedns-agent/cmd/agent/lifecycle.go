package main

import (
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/dns"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/enforce"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/forwarder"
)

func (a *agent) noteTamper(detected bool, detail string) {
	a.tamperMu.Lock()
	defer a.tamperMu.Unlock()
	a.tamperDetected = detected
	a.tamperDetail = detail
}

func (a *agent) tamperSnapshot() (detected bool, detail string) {
	a.tamperMu.Lock()
	defer a.tamperMu.Unlock()
	return a.tamperDetected, a.tamperDetail
}

func (a *agent) setDNSEnforced(v bool) {
	a.enforceMu.Lock()
	defer a.enforceMu.Unlock()
	a.dnsEnforced = v
}

func (a *agent) dnsEnforcedSnapshot() bool {
	a.enforceMu.Lock()
	defer a.enforceMu.Unlock()
	return a.dnsEnforced
}

func (a *agent) shutdownDNS() {
	if a.forwarder != nil && a.forwarder.IsRunning() {
		_ = a.forwarder.Stop()
	}
	if err := a.dnsManager.RestoreFromDisk(); err != nil {
		_ = a.dnsManager.Restore()
	}
	a.setDNSEnforced(false)
}

func (a *agent) startEnforcement() bool {
	a.forwarder = forwarder.New(a.config, a.logger)
	if err := a.forwarder.Start(); err != nil {
		a.logger.Error("Stub resolver failed to bind — leaving original DNS untouched")
		return false
	}
	if err := a.dnsManager.SaveOriginal(); err != nil {
		a.logger.Warn("Failed to backup adapter DNS")
	}
	if err := a.dnsManager.Configure(dns.EnforcedServers); err != nil {
		a.logger.Error("Failed to apply loopback DNS — rolling back")
		_ = a.forwarder.Stop()
		_ = a.dnsManager.RestoreFromDisk()
		return false
	}
	a.setDNSEnforced(true)
	ctrl := enforce.DNSManager{M: a.dnsManager}
	watcher := enforce.NewWatcher(ctrl, a.noteTamper)
	go watcher.Start(a.ctx)
	return true
}
