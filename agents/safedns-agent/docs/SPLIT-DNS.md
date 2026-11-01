# Flux Shield Agent — Split DNS (Active Directory)

## Goal

Domain-joined Windows endpoints must keep using **domain controllers / DHCP-provided DNS** for internal names (Kerberos SRV records, `_msdcs`, DFS, dynamic A registration to DCs, GPO, etc.) while **all other queries** go through **Flux Shield** filtering (DoH with device identity).

## v1 mechanism: local stub resolver (preferred)

1. Discover AD domain, DNS suffix search list, connection-specific suffixes, and **per-adapter DNS servers** *before* changing client DNS.
2. Start a stub resolver on `127.0.0.1:53` (and TCP).
3. Set active adapter DNS to loopback only.
4. Classify each query:
   - **Internal** → forward to saved DC/DHCP resolvers (UDP/TCP 53).
   - **External** → Flux Shield DoH (`Authorization: Bearer <tenantId>:<dohToken>`, `X-Agent-Device-Id`).

Internal classification includes:

- AD DNS domain and `_msdcs.<domain>`
- DNS suffixes / search list from the client
- Tenant/location **internal zones** configured in the app (e.g. `corp.local`, partner zones)
- Common **private reverse** zones (`10.in-addr.arpa`, `168.192.in-addr.arpa`, `ip6.arpa`, …)

If internal resolvers are unreachable (laptop off-site), internal names **fail closed** (SERVFAIL) — they are **not** sent to Flux Shield, avoiding wrong answers and preserving security boundaries. Internet names still use Shield.

Optional break-glass: `forwarder.allow_public_fallback` (default **false**) may send failed Shield queries to configured public resolvers — disables filtering for those queries; use only for captive portals with explicit MSP approval.

## NRPT (Name Resolution Policy Table) — alternative / future

Windows NRPT can route namespaces to specific DNS servers without loopback. **Tradeoffs:**

| | Stub on 127.0.0.1 | NRPT |
|--|--|--|
| Enforces Shield for all non-internal names | Yes (single choke point) | Requires careful namespace list; easy to miss suffixes |
| AD dynamic updates / GPO | Unchanged (internal path uses DCs) | Same if namespaces complete |
| VPN split-DNS | Uses resolvers present when profile refreshed | NRPT rules may need VPN trigger scripts |
| Tamper resistance | Must watch adapter DNS + service | Must watch NRPT + adapter DNS |
| Complexity | Go forwarder + discovery | PowerShell/GPO + ongoing rule maintenance |

**Decision:** v1 ships **stub resolver**; NRPT documented for sites that cannot bind port 53 on loopback (conflict with other security products) — future optional mode.

## DC forwarders (site-level recommendation)

If domain controllers forward external queries directly to the internet, clients may bypass Shield when using internal DNS for some “external” names resolved via DC recursion. **Recommend** DC conditional forwarders / upstream forwarders point to Flux Shield resolvers (`dns1/dns2.shield.fluxlabs.net`) — site policy, not enforced by the endpoint agent.

## Decision table (routing classification)

| Scenario | Internal examples | External examples | Internal upstream | Off-site internal behavior |
|--|--|--|--|--|
| Domain-joined on-site | `host.contoso.com`, `_ldap._tcp.dc._msdcs.contoso.com`, `5.0.0.10.in-addr.arpa` | `www.google.com` | DC/DHCP DNS saved at install | N/A |
| Domain-joined off-site | Same names still **internal** | `login.microsoftonline.com` | None reachable | SERVFAIL (no Shield leak) |
| Workgroup + configured zones | `app.corp.local` if zone configured | `contoso.com` without AD | DHCP DNS if private | Same |
| VPN split tunnel | Corporate namespaces | Internet | VPN-provided DC/DNS after profile refresh | Depends on tunnel |

Automated tests: `internal/splitdns/router_test.go` (`TestRouteDecisionTable`).

## What we intentionally do not break

- **Domain logon / Kerberos:** SRV + `_msdcs` stay on DC DNS.
- **Dynamic registration:** Clients register with DCs over internal path; stub does not intercept zone transfers to AD.
- **Captive portals:** Optional `allow_public_fallback` only; default fails Shield queries until user completes portal (browser captive detection uses direct IP / DHCP).

## Configuration

- Location settings: `settings.internalDnsZones` (array of suffixes) pushed via agent heartbeat `config.internalDnsZones`.
- Local override: `forwarder.internal_domains` in agent config JSON (legacy/manual).
