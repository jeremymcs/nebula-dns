# Network Policy Connection Matrix

This matrix shows which services can communicate with each other.

## Legend

- ✅ **Allowed** - Traffic explicitly permitted by network policy
- ❌ **Denied** - Traffic blocked by network policy
- 🌐 **Internet** - External internet access allowed
- 📊 **Metrics** - Prometheus metrics scraping

## Service-to-Service Communication Matrix

| Source → Target | API | UI | Policy Svc | dnsdist | PostgreSQL | Redis | ClickHouse | Unbound | Internet |
|----------------|-----|-----|------------|---------|------------|-------|------------|---------|----------|
| **API** | ✅ | ❌ | ❌ | ❌ | ✅ :5432 | ✅ :6379 | ✅ :8123/9000 | ❌ | 🌐 :443 |
| **UI** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Policy Svc** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ :6379 | ✅ :8123/9000 | ✅ :53 | ❌ |
| **dnsdist** | ❌ | ❌ | ✅ :8080 | ✅ | ❌ | ❌ | ❌ | ✅ :53 | ❌ |
| **PostgreSQL** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 🌐 :443 (S3) |
| **Redis** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **ClickHouse** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | 🌐 :443 (S3) |
| **Unbound** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | 🌐 :53/853 |
| **Ingress NGINX** | ✅ :3000 | ✅ :3000 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Prometheus** | 📊 :3000 | ❌ | 📊 :8080 | 📊 :8083 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Internet** | ❌ | ❌ | ❌ | ✅ :853/443 | ❌ | ❌ | ❌ | ❌ | - |
| **Backup Jobs** | ❌ | ❌ | ❌ | ❌ | ✅ :5432 | ❌ | ✅ :8123/9000 | ❌ | 🌐 :443 (S3) |

## Detailed Port Matrix

### API Service (app=api)

**Ingress**:
- Ingress NGINX → API:3000 ✅

**Egress**:
- API → PostgreSQL:5432 ✅
- API → Redis:6379 ✅
- API → ClickHouse:8123 ✅
- API → ClickHouse:9000 ✅
- API → Internet:443 (HTTPS) ✅ *Stripe, SendGrid, etc.*
- API → Internet:80 (HTTP) ✅
- API → kube-dns:53 ✅

---

### UI Service (app=ui)

**Ingress**:
- Ingress NGINX → UI:3000 ✅

**Egress**:
- UI → kube-dns:53 ✅
- *All other traffic blocked (API calls via browser)*

---

### Policy Service (app=policy-svc)

**Ingress**:
- dnsdist → Policy Service:8080 ✅
- API → Policy Service:8080 ✅

**Egress**:
- Policy Service → Redis:6379 ✅
- Policy Service → ClickHouse:8123 ✅
- Policy Service → ClickHouse:9000 ✅
- Policy Service → Unbound:53 ✅
- Policy Service → kube-dns:53 ✅

---

### dnsdist (app=dnsdist)

**Ingress**:
- Internet → dnsdist:853 (DoT) ✅
- Internet → dnsdist:443 (DoH) ✅
- Prometheus → dnsdist:8083 (metrics) ✅

**Egress**:
- dnsdist → Policy Service:8080 ✅
- dnsdist → Unbound:53 ✅
- dnsdist → kube-dns:53 ✅

---

### PostgreSQL (app=postgres)

**Ingress**:
- API → PostgreSQL:5432 ✅
- Backup Jobs → PostgreSQL:5432 ✅

**Egress**:
- PostgreSQL → kube-dns:53 ✅
- PostgreSQL → Internet:443 (S3 backup) ✅

---

### Redis (app=redis)

**Ingress**:
- API → Redis:6379 ✅
- Policy Service → Redis:6379 ✅
- Report Service → Redis:6379 ✅

**Egress**:
- Redis → kube-dns:53 ✅

---

### ClickHouse (app=clickhouse)

**Ingress**:
- API → ClickHouse:8123 ✅
- API → ClickHouse:9000 ✅
- Policy Service → ClickHouse:8123 ✅
- Policy Service → ClickHouse:9000 ✅
- Report Service → ClickHouse:8123 ✅
- Report Service → ClickHouse:9000 ✅
- Backup Jobs → ClickHouse:8123 ✅
- Backup Jobs → ClickHouse:9000 ✅

**Egress**:
- ClickHouse → kube-dns:53 ✅
- ClickHouse → Internet:443 (S3 backup) ✅

---

### Unbound (app=unbound)

**Ingress**:
- dnsdist → Unbound:53 ✅
- Policy Service → Unbound:53 ✅

**Egress**:
- Unbound → Internet:53 (DNS) ✅
- Unbound → Internet:853 (DNS over TLS) ✅
- Unbound → kube-dns:53 ✅

---

## DNS Resolution

All pods can resolve DNS via kube-dns:

```
All Pods → kube-dns (kube-system):53 ✅
```

## Traffic Flows

### DNS Query Flow

```
Internet → dnsdist:853/443
         → Policy Service:8080
         → Unbound:53
         → Internet:53/853
```

### API Request Flow

```
Internet → Ingress NGINX:443
         → UI:3000 (frontend)
Browser  → Ingress NGINX:443
         → API:3000
         → PostgreSQL:5432 / Redis:6379 / ClickHouse:8123
```

### Analytics Flow

```
Policy Service → ClickHouse:8123 (log queries)
API            → ClickHouse:8123 (generate reports)
```

### Backup Flow

```
Backup Job → PostgreSQL:5432 / ClickHouse:8123
           → Internet:443 (S3)
```

## Security Boundaries

### Application Layer
- **UI**: Isolated, no backend access
- **API**: Full database access, external HTTPS
- **Policy Service**: Redis + ClickHouse only, no PostgreSQL

### DNS Layer
- **dnsdist**: Internet-facing, policy evaluation only
- **Policy Service**: Central policy engine
- **Unbound**: Recursive resolver, internet DNS access

### Data Layer
- **PostgreSQL**: API only
- **Redis**: API + Policy Service + Report Service
- **ClickHouse**: API + Policy Service + Report Service

## Testing Matrix

Use this matrix to verify network policies:

| Test | Expected Result |
|------|----------------|
| Unauthorized Pod → PostgreSQL | ❌ Timeout |
| Unauthorized Pod → Redis | ❌ Timeout |
| API → PostgreSQL | ✅ Success |
| API → Redis | ✅ Success |
| API → ClickHouse | ✅ Success |
| Policy Service → Redis | ✅ Success |
| Policy Service → PostgreSQL | ❌ Timeout |
| UI → API | ❌ Timeout |
| UI → Redis | ❌ Timeout |
| dnsdist → Policy Service | ✅ Success |
| All Pods → kube-dns:53 | ✅ Success |
| API → stripe.com:443 | ✅ Success |
| Policy Service → stripe.com:443 | ❌ Timeout |

## Notes

1. **Default Deny**: All traffic not explicitly listed above is denied
2. **DNS Access**: All pods can resolve DNS (kube-dns:53)
3. **External HTTPS**: Only API can make external HTTPS calls
4. **Database Access**: Only API can access PostgreSQL
5. **Internet DNS**: Only Unbound can query external DNS servers
6. **LoadBalancer**: Only dnsdist is exposed to internet
7. **Metrics**: Prometheus can scrape all application metrics endpoints

## Validation

Run the verification script to test this matrix:

```bash
cd /Users/jeremymcspadden/Github/nebula-dns/k8s/base/network-policies/
./verify-netpol.sh
```

Each test in the script corresponds to a row in the testing matrix above.
