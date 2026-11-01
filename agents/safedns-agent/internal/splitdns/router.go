// Package splitdns decides whether a query is answered by internal (AD/DHCP) resolvers
// or forwarded to Flux Shield (DoH/DoT).
package splitdns

import (
	"net"
	"strings"

	"github.com/miekg/dns"
)

// RouteTarget indicates which resolver path to use.
type RouteTarget int

const (
	RouteExternal RouteTarget = iota
	RouteInternal
)

func (t RouteTarget) String() string {
	switch t {
	case RouteInternal:
		return "internal"
	default:
		return "external"
	}
}

// Profile captures everything needed to classify queries on an endpoint.
type Profile struct {
	// AD / DHCP discovery
	DomainJoined   bool
	ADDomain       string   // e.g. contoso.com
	DNSSuffixes    []string // search list + connection-specific suffix
	InternalServers []string // DC / DHCP-provided resolvers (deduped)

	// Admin-configured zones from Flux Shield location/tenant settings
	ConfiguredZones []string

	// Scenario hints (for metrics/docs; routing uses servers + zones)
	OnSite bool
	VPNActive bool
}

// Router classifies qnames.
type Router struct {
	profile Profile
	zones   []zoneRule
}

type zoneRule struct {
	suffix string // lowercase FQDN suffix including trailing dot, or arpa suffix
	kind   string // forward | reverse
}

// NewRouter builds a router from a profile.
func NewRouter(p Profile) *Router {
	r := &Router{profile: p}
	r.zones = compileZoneRules(p)
	return r
}

// InternalServers returns upstreams for internal queries (may be empty off-site).
func (r *Router) InternalServers() []string {
	return append([]string(nil), r.profile.InternalServers...)
}

// Route decides internal vs Flux Shield for a DNS question name.
func (r *Router) Route(qname string) RouteTarget {
	name := strings.ToLower(dns.Fqdn(qname))
	if r.matchInternal(name) {
		return RouteInternal
	}
	return RouteExternal
}

func (r *Router) matchInternal(qname string) bool {
	for _, z := range r.zones {
		if z.kind == "reverse" {
			if strings.HasSuffix(qname, z.suffix) {
				return true
			}
			continue
		}
		if qname == z.suffix || strings.HasSuffix(qname, "."+z.suffix) {
			return true
		}
	}
	if len(r.profile.InternalServers) > 0 || r.profile.DomainJoined {
		if IsPrivateReverse(qname) {
			return true
		}
	}
	return false
}

func compileZoneRules(p Profile) []zoneRule {
	seen := map[string]struct{}{}
	var rules []zoneRule

	addForward := func(label string) {
		label = strings.TrimSpace(strings.ToLower(label))
		label = strings.TrimPrefix(label, ".")
		if label == "" {
			return
		}
		suffix := dns.Fqdn(label)
		if _, ok := seen[suffix]; ok {
			return
		}
		seen[suffix] = struct{}{}
		rules = append(rules, zoneRule{suffix: suffix, kind: "forward"})
	}

	if p.ADDomain != "" {
		addForward(p.ADDomain)
		addForward("_msdcs." + p.ADDomain)
	}
	for _, s := range p.DNSSuffixes {
		addForward(s)
	}
	for _, z := range p.ConfiguredZones {
		addForward(z)
	}

	// Private reverse zones (RFC1918 + ULA) — internal AD DNS often authoritative here.
	for _, arpa := range privateReverseZones() {
		suffix := dns.Fqdn(arpa)
		if _, ok := seen[suffix]; ok {
			continue
		}
		seen[suffix] = struct{}{}
		rules = append(rules, zoneRule{suffix: suffix, kind: "reverse"})
	}

	return rules
}

func privateReverseZones() []string {
	return []string{
		"10.in-addr.arpa",
		"16.172.in-addr.arpa", "17.172.in-addr.arpa", "18.172.in-addr.arpa", "19.172.in-addr.arpa",
		"20.172.in-addr.arpa", "21.172.in-addr.arpa", "22.172.in-addr.arpa", "23.172.in-addr.arpa",
		"24.172.in-addr.arpa", "25.172.in-addr.arpa", "26.172.in-addr.arpa", "27.172.in-addr.arpa",
		"28.172.in-addr.arpa", "29.172.in-addr.arpa", "30.172.in-addr.arpa", "31.172.in-addr.arpa",
		"168.192.in-addr.arpa",
		"ip6.arpa", // link-local/site-specific reverse often under ip6.arpa subtrees
	}
}

// IsPrivateReverse returns true if qname is a reverse lookup under common private ranges.
func IsPrivateReverse(qname string) bool {
	name := strings.ToLower(dns.Fqdn(qname))
	if !strings.HasSuffix(name, ".in-addr.arpa.") && !strings.HasSuffix(name, ".ip6.arpa.") {
		return false
	}
	labels := strings.Split(strings.TrimSuffix(name, "."), ".")
	if len(labels) < 3 {
		return false
	}
	// 10.x.y.z.in-addr.arpa
	if len(labels) >= 5 && labels[len(labels)-3] == "10" {
		return true
	}
	// 192.168.x.y
	if len(labels) >= 5 && labels[len(labels)-3] == "168" && labels[len(labels)-4] == "192" {
		return true
	}
	// 172.16-31.x.y
	if len(labels) >= 5 && labels[len(labels)-3] == "172" {
		if o, err := parseOctet(labels[len(labels)-4]); err == nil && o >= 16 && o <= 31 {
			return true
		}
	}
	// Unique local IPv6 fd00::/8 → first label under ip6.arpa often encodes nibble order; treat all ip6.arpa as internal when domain-joined is handled at router level
	if strings.HasSuffix(name, ".ip6.arpa.") {
		return true
	}
	return false
}

func parseOctet(s string) (int, error) {
	var n int
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, net.InvalidAddrError("bad octet")
		}
		n = n*10 + int(c-'0')
	}
	return n, nil
}

// Scenario describes a high-level endpoint context for documentation/tests.
type Scenario string

const (
	ScenarioDomainJoinedOnSite  Scenario = "domain_joined_on_site"
	ScenarioDomainJoinedOffSite Scenario = "domain_joined_off_site"
	ScenarioWorkgroupOnSite     Scenario = "workgroup_on_site"
	ScenarioVPN                 Scenario = "vpn_split_tunnel"
)

// ProfileForScenario builds representative profiles for tests and docs.
func ProfileForScenario(s Scenario, domain string, configured []string) Profile {
	p := Profile{
		ConfiguredZones: configured,
	}
	switch s {
	case ScenarioDomainJoinedOnSite:
		p.DomainJoined = true
		p.ADDomain = domain
		p.DNSSuffixes = []string{domain, "corp.local"}
		p.OnSite = true
		p.InternalServers = []string{"10.0.0.10", "10.0.0.11"}
	case ScenarioDomainJoinedOffSite:
		p.DomainJoined = true
		p.ADDomain = domain
		p.DNSSuffixes = []string{domain}
		p.OnSite = false
		p.InternalServers = nil
	case ScenarioWorkgroupOnSite:
		p.DomainJoined = false
		p.OnSite = true
		p.InternalServers = []string{"192.168.1.1"}
	case ScenarioVPN:
		p.DomainJoined = true
		p.ADDomain = domain
		p.DNSSuffixes = []string{domain}
		p.VPNActive = true
		p.OnSite = true
		p.InternalServers = []string{"10.0.0.10"}
	}
	return p
}
