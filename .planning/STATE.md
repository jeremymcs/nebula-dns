# Project State

// Nebula DNS - Project State
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Provide reliable, scalable DNS security filtering that blocks threats in real-time — backed by an ops dashboard for MSP management
**Current focus:** v1.3 Production Readiness — Phase 24 Infrastructure Provisioning

## Current Position

Phase: 24 of 33 (Infrastructure Provisioning)
Plan: 2 of 4 in current phase
Status: Executing
Last activity: 2026-02-12 — Completed 24-02-PLAN.md (Managed databases with PostgreSQL + Valkey)

Progress: [███████░░░] 23/33 phases (70% — v1-v1.2 shipped, v1.3 in progress)

## Performance Metrics

**Velocity (v1-v1.2 shipped):**
- Total plans completed: 142
- v1: 23 requirements, 8 phases, ~23 plans
- v1.1: 35 requirements, 8 phases, ~45 plans
- v1.2: 37 requirements, 7 phases, ~74 plans

**v1.3 In Progress:**
- 31 requirements (13 DEPLOY, 8 TEST, 10 OPS)
- 10 phases (24-33)
- Estimated: 50-80 plans based on historical velocity
- Completed: 2 plans (24-01: Terraform foundation, 24-02: Managed databases)

## Milestones Shipped

### v1.2 Admin Roles & Alerting (2026-02-03)
- 7 phases (17-23), 31 plans
- 37 requirements complete
- RBAC, admin management, alerting integrations

### v1.1 Mission Control Frontend (2026-01-19)
- 8 phases (9-16), 16 plans
- 35 requirements complete
- Full admin UI for MSP management

### v1 Backend API (2026-01-18)
- 8 phases (1-8), 17 plans
- 23 requirements complete
- Complete admin backend

## Accumulated Context

### Decisions

Recent decisions affecting v1.3:

- **DigitalOcean over AWS/GCP:** Simpler pricing, sufficient for 100K-999K queries/day, 1-10 tenants
- **ClickHouse Cloud over self-hosted:** Managed service reduces ops burden for small team
- **Managed Valkey over Redis:** DO discontinued Redis (EOL June 2025), Valkey is compatible successor

**Phase 24-01 (Terraform Foundation):**
- **VPC IP range 10.10.0.0/16:** Provides 65,536 IPs for cluster expansion
- **DOKS auto-scaling 3-10 nodes:** Balances cost (3 min) with capacity (10 max) on s-4vcpu-8gb
- **HA control plane enabled:** Production reliability with 99.95% SLA
- **Remote state in DO Spaces:** Team collaboration and state locking via S3-compatible backend
- **Modular Terraform structure:** Separate VPC and DOKS modules for independent versioning

**Phase 24-02 (Managed Databases):**
- **PostgreSQL 2-node HA with PgBouncer:** 50-connection pool in transaction mode for stateless queries
- **Valkey 2-node HA with TLS:** Redis-compatible caching for policy invalidation via pub/sub
- **Database firewall rules:** Restrict access to DOKS cluster only, no public access
- **Both pooled and direct URIs:** Pooled for application, direct for database migrations
- **VPC-private networking:** All databases in private VPC network for security

Full decision log in PROJECT.md Key Decisions table.

### Pending Todos

None.

### Blockers/Concerns

**Pre-Phase 24 validation:**
- ClickHouse Cloud schema: Test MergeTree (not Replicated*) on trial account before production
- Valkey compatibility: Audit Redis commands, test locally before migration
- Next.js runtime env vars: NEXT_PUBLIC_ baked at build time, need refactoring strategy

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 24-02-PLAN.md (Managed databases - PostgreSQL + Valkey)
Resume file: None

---
*Last updated: 2026-02-12*
