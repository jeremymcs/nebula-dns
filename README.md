# SafeDNS

A multi-tenant SaaS platform for DNS security and content filtering, designed for SMB organizations.

## Overview

SafeDNS provides:
- **DNS-based threat protection** - Block malware, phishing, and C2 domains
- **Content filtering** - Category-based filtering with customizable policies
- **Custom lists** - Tenant-specific allowlists and blocklists
- **SafeSearch enforcement** - Force safe search on popular search engines
- **Comprehensive logging** - Query logs with analytics and reporting
- **Multi-tenant architecture** - Isolated data per organization

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Control Plane                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │ Next.js  │  │ NestJS   │  │ Postgres │  │ Background       ││
│  │ Admin UI │──│ API      │──│          │  │ Workers          ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Data Plane                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │ dnsdist  │──│ Policy   │──│ Unbound  │  │ ClickHouse       ││
│  │ DoH/DoT  │  │ Service  │  │ Resolver │  │ Query Logs       ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘│
│                     │                                           │
│                     ▼                                           │
│               ┌──────────┐                                      │
│               │  Redis   │                                      │
│               │  Cache   │                                      │
│               └──────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Go 1.21+ (for policy service development)

### Running Locally

```bash
# Clone the repository
git clone https://github.com/your-org/safedns.git
cd safedns

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Access the services:
# - Admin UI: http://localhost:3001
# - API: http://localhost:3000
# - API Docs: http://localhost:3000/api/docs
# - DNS (non-TLS): localhost:53
```

### Default Credentials

- **Admin UI**: `admin@demo.local` / `Admin@12345!`
- **Tenant**: Demo Company (slug: `demo`)

## Project Structure

```
safedns/
├── api/                    # NestJS Control Plane API
│   ├── src/
│   │   ├── modules/       # Feature modules
│   │   ├── common/        # Shared utilities
│   │   └── config/        # Configuration
│   └── Dockerfile
│
├── policy-svc/            # Go Policy Decision Service
│   ├── cmd/               # Entry point
│   ├── internal/
│   │   ├── handlers/      # HTTP handlers
│   │   ├── policy/        # Evaluation logic
│   │   ├── cache/         # Caching layer
│   │   └── models/        # Data structures
│   └── Dockerfile
│
├── ui/                    # Next.js Admin Dashboard
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities
│   └── Dockerfile
│
├── config/
│   ├── dnsdist/           # dnsdist configuration
│   └── unbound/           # Unbound configuration
│
├── scripts/
│   ├── init-postgres.sql  # PostgreSQL schema
│   └── init-clickhouse.sql # ClickHouse schema
│
├── docs/                  # Design documentation
│   ├── A-system-design.md
│   ├── B-threat-model.md
│   ├── C-database-schema.md
│   ├── D-api-spec.md
│   ├── E-policy-evaluation.md
│   ├── F-dnsdist-routing.md
│   ├── H-test-plan.md
│   └── I-mvp-milestones.md
│
└── docker-compose.yml
```

## Documentation

- [A. System Design](docs/A-system-design.md) - Architecture overview
- [B. Threat Model](docs/B-threat-model.md) - Security considerations
- [C. Database Schema](docs/C-database-schema.md) - Data model
- [D. API Specification](docs/D-api-spec.md) - REST API reference
- [E. Policy Evaluation](docs/E-policy-evaluation.md) - Decision algorithm
- [F. dnsdist Routing](docs/F-dnsdist-routing.md) - DNS flow
- [H. Test Plan](docs/H-test-plan.md) - Testing strategy
- [I. MVP Milestones](docs/I-mvp-milestones.md) - Development roadmap

## Development

### API Development

```bash
cd api
npm install
npm run start:dev
```

### Policy Service Development

```bash
cd policy-svc
go run cmd/main.go
```

### UI Development

```bash
cd ui
npm install
npm run dev
```

### Running Tests

```bash
# API tests
cd api && npm test

# Policy service tests
cd policy-svc && go test ./...

# E2E tests
cd api && npm run test:e2e
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | Authenticate user |
| `GET /policies` | List policies |
| `POST /policies` | Create policy |
| `GET /locations` | List locations |
| `POST /locations/:id/tokens` | Generate DoH token |
| `GET /reports/summary` | Get statistics |
| `GET /logs/queries` | Query DNS logs |

See [API Specification](docs/D-api-spec.md) for complete documentation.

## Security

SafeDNS is designed with security as a priority:

- **Tenant Isolation**: All data scoped by `tenant_id`
- **RBAC**: Role-based access control (Owner, Admin, Analyst, Read-only)
- **Audit Logging**: All admin actions logged
- **Secure Auth**: JWT with refresh tokens, bcrypt password hashing
- **Rate Limiting**: Protection against abuse
- **DNSSEC**: Validated responses from upstream

See [Threat Model](docs/B-threat-model.md) for detailed security analysis.

## Configuration

### Environment Variables

**API Service:**
```
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key
HMAC_SECRET=your-hmac-secret
```

**Policy Service:**
```
PORT=8080
REDIS_URL=redis:6379
FAIL_MODE=open  # or "closed"
LOG_LEVEL=debug
```

## Deployment

### Production Considerations

1. **TLS Certificates**: Configure valid certificates for DoH/DoT
2. **Secrets Management**: Use a secrets manager for sensitive config
3. **Database**: Use managed PostgreSQL and Redis
4. **Scaling**: Policy service scales horizontally
5. **Monitoring**: Configure Prometheus/Grafana

### Docker Build

```bash
# Build all images
docker compose build

# Build specific service
docker compose build api
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

Proprietary - All rights reserved.

## Support

For support inquiries, contact: support@safedns.example
