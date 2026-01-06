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
- **Stripe Payments** - Subscription billing with Stripe
- **Metrics & Monitoring** - Prometheus-compatible metrics endpoint

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
- Node.js 20+ (for local development)
- Go 1.21+ (for policy service development)

### Environment Setup

1. Copy the example environment files:

```bash
cp .env.example .env
cp api/.env.example api/.env
cp ui/.env.example ui/.env
```

2. Configure the environment variables (see `.env.example` for all options)

### Running with Docker Compose

#### Development

```bash
docker-compose up -d
```

#### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This will start:
- **PostgreSQL** (port 4432) - Main database
- **Redis** (port 4379) - Caching and rate limiting
- **ClickHouse** (port 4123) - Query logging and analytics
- **API** (port 4000) - NestJS backend
- **UI** (port 4001) - Next.js frontend
- **Policy Service** (port 4080) - Go-based policy engine
- **dnsdist** (port 853/443) - DNS frontend (DoT/DoH)
- **Unbound** (port 5354) - Recursive resolver

### Production Domains

| Service | URL |
|---------|-----|
| Dashboard | https://app.nebuladns.io |
| API | https://api.nebuladns.io |
| DNS (DoT) | tls://dns1.nebuladns.io:853, tls://dns2.nebuladns.io:853 |
| DNS (DoH) | https://dns1.nebuladns.io/dns-query, https://dns2.nebuladns.io/dns-query |

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

## Production Deployment

See the full [Production Deployment Guide](docs/N-production-deployment.md) for detailed instructions.

### Kubernetes

Deploy to Kubernetes using Kustomize:

```bash
# Install prerequisites
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Apply base configuration
kubectl apply -k k8s/base

# Configure secrets (copy and edit first)
cp k8s/overlays/production/secrets.yaml.example k8s/overlays/production/secrets.yaml
# Edit secrets.yaml with your values

# Apply production overlay
kubectl apply -k k8s/overlays/production
```

### Optional Components

Enable additional Kubernetes resources as needed:

```bash
# TLS certificates with cert-manager
kubectl apply -k k8s/base/cert-manager

# External secrets management
kubectl apply -k k8s/base/external-secrets

# Automated database backups
kubectl apply -k k8s/base/backups

# Prometheus alerts and Grafana dashboards
kubectl apply -k k8s/base/monitoring
```

### Environment Variables

Required for production:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for JWT signing (min 64 chars) |
| `SENDGRID_API_KEY` | SendGrid API key for emails |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SENTRY_DSN` | Sentry DSN for error tracking |

### Database Migrations

Run database migrations:

```bash
cd api
npm run migration:run
```

Generate a new migration:

```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

## Monitoring & Observability

### Health Checks

- API: `GET /health`
- Policy Service: `GET /health`

### Prometheus Metrics

Metrics are exposed at `/metrics` on the API:

```bash
curl http://localhost:4000/metrics
```

Available metrics:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency histogram
- `nodejs_heap_size_bytes` - Memory usage
- `process_uptime_seconds` - Service uptime

### Sentry Error Tracking

Enable Sentry by setting `SENTRY_DSN` in your environment.

### Logging

- Development: Human-readable colored output
- Production: JSON-formatted logs for log aggregators

## API Documentation

The API documentation is available at `http://localhost:4000/api/docs` (Swagger UI).

### Authentication

All API requests require a Bearer token:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/v1/policies
```

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | Authenticate and get tokens |
| `GET /policies` | List policies |
| `GET /locations` | List locations |
| `GET /reports/summary` | Get dashboard statistics |
| `GET /reports/logs` | Get query logs |
| `POST /payments/checkout` | Create Stripe checkout session |
| `GET /metrics` | Prometheus metrics |

## Testing

### API Tests

```bash
cd api
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage report
```

### UI Tests

```bash
cd ui
npm run test:e2e           # Run Playwright E2E tests
npm run test:e2e:ui        # Run with interactive UI
npm run test:e2e:headed    # Run in headed browser mode
```

### Policy Service Tests

```bash
cd policy-svc
go test ./...         # All tests
go test -bench=.      # Benchmarks
```

## CI/CD

GitHub Actions workflows are provided for:

- **CI** (`.github/workflows/ci.yml`): Runs on PRs and pushes to main
  - API linting and tests
  - UI type checking and build
  - Policy service tests
  - Docker image builds
  - Security scanning (Trivy)

- **Release** (`.github/workflows/release.yml`): Runs on version tags
  - Builds and pushes Docker images
  - Creates GitHub releases

## Security

### Built-in Security Features

- **Rate Limiting** - Configurable per-endpoint rate limits
- **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
- **JWT Authentication** - Short-lived access tokens with refresh
- **Password Hashing** - bcrypt with configurable rounds
- **MFA Support** - TOTP-based two-factor authentication
- **RBAC** - Role-based access control (owner, admin, analyst, readonly)

### Production Checklist

- [ ] Change all default passwords
- [ ] Use real TLS certificates (not self-signed)
- [ ] Enable MFA for admin accounts
- [ ] Configure firewall rules
- [ ] Set up log aggregation
- [ ] Configure backup strategy
- [ ] Enable Sentry error tracking
- [ ] Set up monitoring alerts
- [ ] Load threat intelligence data
- [ ] Load domain categorization data
- [ ] Run load tests before launch

## Load Testing

Load test scripts are provided using [k6](https://k6.io):

```bash
# Install k6
brew install k6  # macOS

# Run API load test
k6 run scripts/load-testing/api-load-test.js

# Run DNS load test
k6 run scripts/load-testing/dns-load-test.js
```

See [scripts/load-testing/README.md](scripts/load-testing/README.md) for more details.

## Data Loading

### Threat Intelligence

Load threat feeds for real-time malware/phishing blocking:

```bash
cd scripts/data-loaders
pip install -r requirements.txt

# Load all available threat feeds
python threat-feed-loader.py --all-feeds --redis-url=redis://localhost:4379

# List available feeds
python threat-feed-loader.py --list-feeds
```

### Domain Categorization

Load domain categories for content filtering:

```bash
# Load Shallalist (free)
python category-loader.py --source=shallalist --redis-url=redis://localhost:4379

# Check statistics
python category-loader.py --stats-only
```

See [scripts/data-loaders/README.md](scripts/data-loaders/README.md) for more details.

## License

Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>

All rights reserved.
