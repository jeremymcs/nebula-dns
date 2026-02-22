# Phase 33: Operational Readiness - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the platform production-ready with health checks, monitoring probes, graceful shutdown, incident runbooks, HPA auto-scaling, and backup verification. Covers OPS-01, OPS-02, OPS-04, OPS-08, OPS-09, OPS-10.

</domain>

<decisions>
## Implementation Decisions

### Health check behavior
- Tiered readiness probes: critical dependencies (PostgreSQL, Redis) checked in readiness; non-critical (ClickHouse) only logged as degraded
- Conservative failure thresholds: 3 consecutive failures before pod restart, 10-second probe intervals
- Two health endpoints per service: `/healthz` for K8s probes (simple pass/fail 200/503), `/health` for internal debugging (detailed JSON with per-dependency status, latency, version — behind auth)

### Graceful shutdown
- Flush pending ClickHouse query log batches before exiting — no log loss accepted
- Services handle SIGTERM with connection draining within their configured timeout

### Runbook depth & format
- Hybrid format: quick-action checklist at the top for incident response under pressure, detailed explanation with diagnostic context below
- No formal escalation tiers — runbooks focus on technical resolution only
- Runbooks cover: DNS down, DB down, Redis down, policy-svc crash, cert expiration, production deployment, rollback

### Auto-scaling policy
- HPA configured for Policy Service (at minimum) with custom DNS query metrics
- Scale-down behavior and cooldown periods to be determined by research

### Claude's Discretion
- Liveness probe implementation per service (exec-based DNS query probes vs process checks — pick best fit per service)
- Drain timeout duration per service (based on expected request durations)
- Policy Service shutdown behavior (stop accepting vs continue serving during drain)
- Shutdown ordering across services (defined order vs independent — based on architecture analysis)
- Runbook storage location (repo docs/ vs wiki vs both)
- Deployment strategy for rollback runbook (rolling vs blue-green vs canary — based on current infra)
- Primary HPA scaling metric (DNS QPS, CPU, or combined)
- Min/max replica range for Policy Service
- Which other services (API, UI) get HPA
- Scale-down cooldown timing

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User gave broad discretion on most implementation details, focusing on these firm decisions:
- Conservative probe thresholds (3 failures, 10s intervals)
- Tiered dependency checking (critical vs non-critical)
- Dual health endpoints (simple for K8s, detailed for debugging)
- Must flush ClickHouse logs before shutdown (no log loss)
- Hybrid runbook format (quick checklist + detailed explanation)
- No escalation tiers in runbooks

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 33-operational-readiness*
*Context gathered: 2026-02-21*
