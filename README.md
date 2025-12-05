# SafeDNS - Multi-Tenant DNS Security SaaS

SafeDNS is a SaaS control plane + DNS data plane that enforces per-tenant policies (threat blocking + category filtering) and provides logs and reporting.

## Architecture

See `docs/` directory for detailed design documents:
- **A-high-level-system-design.md**: System architecture and request flows
- **B-threat-model-mitigations.md**: Security threats and mitigations
- **C-database-schema.md**: PostgreSQL and ClickHouse schemas
- **D-api-spec.md**: REST API specification
- **E-policy-evaluation-algorithm.md**: Policy evaluation logic
- **F-dnsdist-routing-approach.md**: DNS routing and tenant resolution

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Go 1.21+ (for policy service)

### Start Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- ClickHouse (ports 8123, 9000)
- NestJS API (port 3000)
- Next.js UI (port 3001)
- Policy Service (port 8053)
- Unbound (port 5300)
- dnsdist (ports 53, 443, 853)

### Seed Data

After starting services, seed the database:

```bash
# Connect to postgres container
docker exec -it safedns-postgres psql -U safedns -d safedns

# Run seed script (manually copy from scripts/seed-data.sql)
```

### Access Services

- **API**: http://localhost:3000/v1
- **UI**: http://localhost:3001
- **ClickHouse**: http://localhost:8123

## Development

### API (NestJS)

```bash
cd api
npm install
npm run start:dev
```

### UI (Next.js)

```bash
cd ui
npm install
npm run dev
```

### Policy Service (Go)

```bash
cd policy-service
go mod download
go run main.go
```

## Project Structure

```
.
├── api/                 # NestJS API service
│   ├── src/
│   │   ├── auth/       # Authentication module
│   │   ├── users/      # User management
│   │   ├── tenants/    # Tenant management
│   │   ├── policies/   # Policy CRUD
│   │   ├── locations/  # Location management
│   │   └── ...
│   └── Dockerfile
├── ui/                  # Next.js web UI
│   ├── pages/
│   └── Dockerfile
├── policy-service/      # Go policy decision service
│   ├── main.go
│   └── Dockerfile
├── config/              # Configuration files
│   ├── dnsdist/
│   └── unbound/
├── scripts/             # Database initialization scripts
├── docs/                # Design documents
└── docker-compose.yml   # Service orchestration
```

## Testing

See `docs/H-test-plan.md` for test plan.

## MVP Milestones

See `docs/I-mvp-milestones.md` for development roadmap.

## License

Proprietary - Internal use only
