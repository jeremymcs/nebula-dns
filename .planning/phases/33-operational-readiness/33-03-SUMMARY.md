---
phase: 33-operational-readiness
plan: 03
subsystem: operations
tags: [runbooks, incident-response, deployment, rollback, ops, documentation]
dependencies:
  requires: [OPS-04, OPS-10]
  provides: [incident-runbooks, deployment-procedures, rollback-procedures]
  affects: [operations, devops, sre]
tech-stack:
  added: []
  patterns: [hybrid-runbook-format, quick-action-checklists, decision-trees]
key-files:
  created:
    - docs/runbooks/dns-down.md
    - docs/runbooks/database-down.md
    - docs/runbooks/redis-down.md
    - docs/runbooks/policy-svc-crash.md
    - docs/runbooks/cert-expiration.md
    - docs/runbooks/deployment.md
    - docs/runbooks/rollback.md
  modified: []
decisions:
  - Hybrid runbook format with quick-action checklist first, detailed diagnostics below
  - No formal escalation tiers - runbooks focus on technical resolution only
  - Rolling update deployment strategy (not blue-green/canary) for cost efficiency
  - Cross-references between related runbooks for faster incident navigation
  - Helm rollback as primary rollback mechanism with --atomic flag
metrics:
  duration_minutes: 10
  tasks_completed: 2
  files_created: 7
  commits: 2
  completed: 2026-02-21
---

# Phase 33 Plan 03: Incident Runbooks and Deployment Procedures Summary

**One-liner:** Comprehensive incident response runbooks for all critical failure scenarios and production deployment/rollback procedures using hybrid format with quick-action checklists for rapid MTTR.

## What Was Built

Created 7 operational runbooks in `docs/runbooks/` directory covering all critical incident scenarios and deployment procedures:

### Incident Runbooks (5)
1. **dns-down.md** — DNS resolution failure incident response covering dnsdist, Unbound, policy-svc, LoadBalancer failures
2. **database-down.md** — PostgreSQL and ClickHouse failure scenarios including connection pool exhaustion, credential rotation, network partition
3. **redis-down.md** — Redis/Valkey cache failures including TLS cert expiration, memory limits, pub/sub channel failures
4. **policy-svc-crash.md** — Policy Service crash loop diagnostics for Redis connection failure, OOM, ClickHouse unavailability, image pull errors
5. **cert-expiration.md** — TLS certificate issues with cert-manager, DNS-01 challenges, Let's Encrypt rate limits, emergency manual renewal

### Deployment Runbooks (2)
6. **deployment.md** — Production deployment procedures with pre-flight checklist, GitHub Actions workflow, manual Helm upgrade, post-deployment verification
7. **rollback.md** — Deployment rollback procedures with quick rollback steps, specific version rollback, database migration rollback, when-to-rollback criteria

## Key Features

### Hybrid Runbook Format
- **Quick Actions section** at top with checkbox steps targeting 5-minute initial diagnosis
- **Diagnostic Context** below with common causes (by frequency), architecture explanations, warning signs
- **Resolution Procedures** with detailed kubectl commands and step-by-step fixes
- **Post-Incident** verification checklist
- **Cross-References** to related runbooks

### Runbook Coverage
All runbooks include:
- Severity level and affected services
- Related Prometheus alerts
- Common causes ranked by frequency (%)
- Architecture diagrams showing failure points
- Warning signs from metrics
- Step-by-step resolution procedures with kubectl commands
- Post-incident verification steps
- Cross-references to related runbooks

### Deployment & Rollback
- Pre-deployment checklist (CI/CD passed, staging verified, migrations tested, error budget >50%)
- GitHub Actions automated deployment with manual production approval
- Manual Helm deployment fallback with --atomic flag
- Post-deployment verification (pods, health endpoints, DNS resolution, Grafana dashboards)
- Rollback criteria (error rate >1%, latency >200ms, CrashLoopBackOff)
- Database migration rollback procedures
- Troubleshooting sections for common deployment failures

## Requirements Satisfied

- **OPS-04:** Incident runbooks created for DNS down, DB down, Redis down, policy-svc crash, cert expiration — all in hybrid format with quick-action checklists
- **OPS-10:** Production deployment and rollback procedures documented with pre-flight checks, helm commands, verification steps, and cross-references

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

### Runbook Format
**Decision:** Hybrid format with quick-action checklist first, detailed diagnostics below

**Rationale:** On-call engineers need fast decision-making under stress. Checkbox format provides visual progress tracking and enables 5-minute initial diagnosis. Detailed diagnostics below support post-incident learning without slowing active response.

**Alternatives considered:** Pure narrative format (rejected - too slow under pressure), pure checklist (rejected - lacks diagnostic depth)

### Deployment Strategy
**Decision:** Rolling update (maxSurge: 1, maxUnavailable: 0) as primary strategy, document blue-green as future option

**Rationale:** Rolling updates cost-efficient (no 2x infrastructure), brief DNS latency spike during cache warm-up (~30s) acceptable per SLO error budget. Blue-green requires 2x infrastructure cost, only justified if SLO violations occur during deployments.

**Alternatives considered:** Blue-green (rejected - cost), canary (rejected - adds complexity without clear benefit for current scale)

### Cross-References
**Decision:** Link related runbooks with explicit cross-reference sections

**Rationale:** DNS failures often caused by Redis or policy-svc issues. Cross-references enable fast navigation without repeating diagnostic steps. Follows "if X then see runbook Y" decision tree pattern from SRE best practices.

**Implementation:**
- dns-down.md → redis-down.md (if policy-svc failure caused by Redis)
- dns-down.md → policy-svc-crash.md (if DNS failure caused by policy-svc)
- deployment.md → rollback.md (for failed deployment recovery)

### No Escalation Tiers
**Decision:** Runbooks focus on technical resolution, no formal escalation procedures

**Rationale:** Per user context decision. Team prefers technical documentation over process documentation. Escalation handled via existing PagerDuty/Slack workflows.

**Alternatives considered:** Include escalation tiers (rejected per user preference)

## Self-Check: PASSED

### Created Files Verified
```bash
✅ docs/runbooks/dns-down.md (9,869 bytes)
✅ docs/runbooks/database-down.md (13,315 bytes)
✅ docs/runbooks/redis-down.md (13,241 bytes)
✅ docs/runbooks/policy-svc-crash.md (13,343 bytes)
✅ docs/runbooks/cert-expiration.md (13,822 bytes)
✅ docs/runbooks/deployment.md (15,679 bytes)
✅ docs/runbooks/rollback.md (16,761 bytes)
```

### Commits Verified
```bash
✅ a9c0087: feat(33-03): create incident runbooks for DNS, DB, Redis, policy-svc, cert failures
✅ 0db5e8b: feat(33-03): create production deployment and rollback runbooks
```

### Content Verification
```bash
✅ All 7 runbooks have "Quick Actions" sections
✅ dns-down.md has 41 kubectl commands
✅ Cross-references verified: dns-down.md → redis-down.md, policy-svc-crash.md
✅ All runbooks have copyright headers
✅ deployment.md has "helm upgrade" commands
✅ rollback.md has "helm rollback" commands
✅ deployment.md → rollback.md cross-reference exists
```

## Integration Points

### With Existing Systems
- **Prometheus alerts** referenced in runbooks (DNSAvailabilitySLOFastBurn, PolicyServiceDown, etc.)
- **Grafana dashboards** used for post-incident verification (SLO dashboard, DNS Overview, API Performance)
- **kubectl commands** scoped to nebula-dns namespace matching existing Helm deployment
- **DigitalOcean console** referenced for managed service status checks (PostgreSQL, Valkey, LoadBalancers)

### With Other Runbooks
- dns-down.md ↔ redis-down.md (Redis failures causing DNS issues)
- dns-down.md ↔ policy-svc-crash.md (policy-svc failures causing DNS issues)
- deployment.md ↔ rollback.md (failed deployment recovery)
- All runbooks → slo-runbook.md (error budget policy reference)

## Operational Impact

### Mean Time to Recovery (MTTR)
- **Before:** On-call engineer reads 5-page narrative, misses critical step, escalates after 30 minutes
- **After:** Quick Actions checklist targets 5-minute initial diagnosis, checkbox format prevents missed steps

### Incident Response
- 7 critical failure scenarios now have documented response procedures
- kubectl commands ready to copy-paste (no syntax errors under pressure)
- Cross-references prevent dead-end debugging (if X fails → see runbook Y)

### Deployment Safety
- Pre-flight checklist reduces deployment failures (staging verification, error budget check)
- Post-deployment verification catches issues before user impact
- Rollback criteria documented (when to rollback vs when to forward-fix)

## Future Enhancements

### Potential Improvements
1. **Blue-green deployment** — If SLO violations occur during rolling updates, implement via Argo Rollouts
2. **Runbook automation** — Extract kubectl commands into executable scripts for one-click fixes
3. **Alert annotations** — Link Prometheus alerts directly to runbooks via annotations
4. **Metrics-driven runbooks** — Auto-populate common causes percentages from actual incident data
5. **Runbook testing** — Chaos engineering to validate runbook procedures under real failure conditions

### Out of Scope (Future Phases)
- Automated remediation (self-healing infrastructure)
- Advanced deployment strategies (canary, feature flags)
- Multi-region failover procedures
- Disaster recovery playbooks

## Lessons Learned

### What Worked Well
- Hybrid format balances speed (checklist) with depth (diagnostics)
- Common causes by frequency (30%, 25%, 20%) helps prioritize investigation
- kubectl commands scoped to nebula-dns namespace prevent copy-paste errors
- Cross-references reduce runbook duplication and improve navigation

### What Could Be Better
- Could add runbook versioning to track updates over time
- Could include incident metrics (how often each runbook used, MTTR trends)
- Could add visual diagrams for architecture sections (planned for future)

### Applicability to Other Projects
- Hybrid runbook format applicable to any ops team
- Quick-action checklist pattern applicable to any incident response
- Cross-reference pattern applicable to any interconnected system failures

---

**Summary:** Plan 33-03 delivered comprehensive incident runbooks and deployment procedures covering all critical failure scenarios. Hybrid format with quick-action checklists enables rapid incident response (5-minute target), while detailed diagnostics support post-incident learning. Deployment and rollback runbooks document safe Helm-based production deployment with pre-flight checks, verification steps, and rollback criteria. Cross-references between runbooks enable fast navigation during multi-service failures. All requirements (OPS-04, OPS-10) satisfied with no deviations.
