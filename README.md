# Nebula DNS - Enterprise DNS Security Platform

Nebula DNS is an enterprise-grade DNS security and content filtering platform that provides comprehensive protection for organizations of all sizes.

## Features

- **Policy-based DNS Filtering** - Create and apply policies for content filtering and security
- **Location-based Rules** - Different policies for different network locations
- **Custom Allow/Block Lists** - Maintain custom domain lists for precise control
- **Real-time Query Logging** - Monitor and analyze DNS queries with ClickHouse
- **Threat Intelligence** - Block malware, phishing, and C2 domains
- **Custom Block Pages** - Branded block pages with access request workflows
- **Client Agents** - Desktop and mobile agents for remote devices
- **SIEM Integration** - Forward logs to Splunk, Elasticsearch, and more
- **Webhooks** - Real-time event notifications
- **MFA & SSO** - Multi-factor authentication and SAML/OIDC single sign-on
- **Scheduled Reports** - Automated email reports

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Clients   │──────│   dnsdist   │──────│   Unbound   │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                    ┌───────┴───────┐
                    │  Policy Svc   │
                    └───────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
┌───┴───┐           ┌───────┴───────┐       ┌──────┴──────┐
│ Redis │           │   API (NestJS) │       │  ClickHouse │
└───────┘           └───────────────┘       └─────────────┘
                            │
                    ┌───────┴───────┐
                    │   PostgreSQL  │
                    └───────────────┘
                            │
                    ┌───────┴───────┐
                    │  UI (Next.js)  │
                    └───────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Go 1.21+ (for policy service development)

### Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Configure the environment variables in `.env`:

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=nebula_dns

# Redis
REDIS_URL=redis://redis:6379

# ClickHouse
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=nebula_dns
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=1h

# API
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
```

### Running with Docker Compose

Start all services:

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** (port 5432) - Main database
- **Redis** (port 6379) - Caching and rate limiting
- **ClickHouse** (port 8123) - Query logging and analytics
- **API** (port 3000) - NestJS backend
- **UI** (port 3001) - Next.js frontend
- **Policy Service** (port 8080) - Go-based policy engine
- **dnsdist** (port 53) - DNS load balancer
- **Unbound** (internal) - Recursive resolver

### Local Development

#### API (NestJS)

```bash
cd api
npm install
npm run start:dev
```

#### UI (Next.js)

```bash
cd ui
npm install
npm run dev
```

#### Policy Service (Go)

```bash
cd policy-svc
go mod download
go run cmd/main.go
```

## Configuration

### DNS Configuration

Point your DNS to the Nebula DNS resolvers:

- **Primary**: Your server IP, port 53
- **DoH**: `https://your-server/dns-query?token=<location-token>`
- **DoT**: `your-server:853`

### Policy Configuration

Policies support:
- Category-based blocking (adult, gambling, malware, etc.)
- Threat feeds (malware, phishing, C2)
- SafeSearch enforcement
- Custom allow/block lists
- Block response types (NXDOMAIN, REFUSED, custom IP)

### Block Page Configuration

Customize the block page with:
- Company branding (logo, colors)
- Custom messages
- Access request forms
- Contact information

## API Documentation

The API documentation is available at `http://localhost:3000/api/docs` when running in development mode.

### Authentication

All API requests require a Bearer token:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/policies
```

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | Authenticate and get tokens |
| `GET /policies` | List policies |
| `GET /locations` | List locations |
| `GET /reports/summary` | Get dashboard statistics |
| `GET /reports/logs` | Get query logs |

## Database Migrations

Run database migrations:

```bash
cd api
npm run migration:run
```

Generate a new migration:

```bash
npm run migration:generate src/database/migrations/MigrationName
```

## Monitoring

### Health Checks

- API: `http://localhost:3000/health`
- Policy Service: `http://localhost:8080/health`

### Logs

View logs with Docker Compose:

```bash
docker-compose logs -f api
docker-compose logs -f policy-svc
docker-compose logs -f dnsdist
```

## Security Considerations

1. **Change default passwords** in production
2. **Enable HTTPS** using a reverse proxy (nginx, Caddy)
3. **Configure firewall** rules for DNS ports
4. **Enable MFA** for admin accounts
5. **Rotate JWT secrets** periodically
6. **Encrypt sensitive data** at rest

## License

Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>

All rights reserved.
