package splitdns

import "testing"

// Decision table: expected routing for representative queries per scenario.
func TestRouteDecisionTable(t *testing.T) {
	domain := "contoso.com"
	configured := []string{"corp.local"}

	type row struct {
		scenario Scenario
		qname    string
		want     RouteTarget
	}

	rows := []row{
		// Domain-joined on-site
		{ScenarioDomainJoinedOnSite, "ws1.contoso.com.", RouteInternal},
		{ScenarioDomainJoinedOnSite, "_ldap._tcp.dc._msdcs.contoso.com.", RouteInternal},
		{ScenarioDomainJoinedOnSite, "host.corp.local.", RouteInternal},
		{ScenarioDomainJoinedOnSite, "5.0.0.10.in-addr.arpa.", RouteInternal},
		{ScenarioDomainJoinedOnSite, "www.google.com.", RouteExternal},

		// Domain-joined off-site (same classification; upstream may be unreachable)
		{ScenarioDomainJoinedOffSite, "ws1.contoso.com.", RouteInternal},
		{ScenarioDomainJoinedOffSite, "login.microsoftonline.com.", RouteExternal},

		// Workgroup — only configured zones + private reverse if servers present
		{ScenarioWorkgroupOnSite, "printer.corp.local.", RouteInternal},
		{ScenarioWorkgroupOnSite, "ws1.contoso.com.", RouteExternal},

		// VPN split — internal namespaces still internal
		{ScenarioVPN, "dc01.contoso.com.", RouteInternal},
		{ScenarioVPN, "cdn.example.net.", RouteExternal},
	}

	for _, tt := range rows {
		t.Run(string(tt.scenario)+"/"+tt.qname, func(t *testing.T) {
			p := ProfileForScenario(tt.scenario, domain, configured)
			r := NewRouter(p)
			got := r.Route(tt.qname)
			if got != tt.want {
				t.Fatalf("Route(%q) = %s, want %s (scenario %s)", tt.qname, got, tt.want, tt.scenario)
			}
		})
	}
}

func TestMSDCSAndSRVRecords(t *testing.T) {
	p := ProfileForScenario(ScenarioDomainJoinedOnSite, "fabrikam.com", nil)
	r := NewRouter(p)

	internal := []string{
		"_ldap._tcp.dc._msdcs.fabrikam.com.",
		"_kerberos._tcp.dc._msdcs.fabrikam.com.",
		"gc._msdcs.fabrikam.com.",
	}
	for _, q := range internal {
		if r.Route(q) != RouteInternal {
			t.Fatalf("expected internal route for %s", q)
		}
	}
}

func TestConfiguredTenantZones(t *testing.T) {
	p := Profile{
		ConfiguredZones: []string{"internal.example", ".partner.net"},
		InternalServers: []string{"10.1.1.1"},
	}
	r := NewRouter(p)
	if r.Route("app.internal.example.") != RouteInternal {
		t.Fatal("expected configured zone match")
	}
	if r.Route("host.partner.net.") != RouteInternal {
		t.Fatal("expected partner zone suffix match")
	}
}

func TestPrivateReverseDetection(t *testing.T) {
	if !IsPrivateReverse("5.0.0.10.in-addr.arpa.") {
		t.Fatal("10/8 reverse should be private")
	}
	if IsPrivateReverse("8.8.8.8.in-addr.arpa.") {
		t.Fatal("public reverse should not match private helper")
	}
}
