# Runbook: TLS Certificate Expiration

// Nebula DNS - TLS Certificate Expiration Incident Response
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Severity:** Critical (DoT/DoH) / Warning (Ingress HTTPS)
**Services Affected:** DNS over TLS (DoT), DNS over HTTPS (DoH), API/UI HTTPS endpoints
**Related Alerts:** CertificateExpiringSoon, CertificateExpired, TLSHandshakeFailure

## Quick Actions (DO THIS FIRST)

⏱️ **Target: 5 minutes to initial diagnosis**

- [ ] 1. Check certificate status: `kubectl get certificates -n nebula-dns`
- [ ] 2. View certificate details: `kubectl describe certificate <cert-name> -n nebula-dns`
- [ ] 3. Check cert-manager pod: `kubectl get pods -n cert-manager`
- [ ] 4. View cert-manager logs: `kubectl logs -n cert-manager deploy/cert-manager --tail=100`
- [ ] 5. Check ACME challenge status: `kubectl get challenges -n nebula-dns`
- [ ] 6. Verify DNS-01 solver: `dig _acme-challenge.<domain> TXT`
- [ ] 7. If cert-manager pod down → Restart: `kubectl rollout restart deployment/cert-manager -n cert-manager`
- [ ] 8. If DNS-01 challenge failed → Check external-dns logs and DigitalOcean DNS
- [ ] 9. If Let's Encrypt rate limit → Use staging issuer or wait for rate limit reset
- [ ] 10. If emergency, use manual certbot renewal (see Emergency Procedure)

---

## Diagnostic Context

### Common Causes (by frequency)

1. **cert-manager pod down** (30%) — Pod crash, OOMKill, deployment issue, namespace misconfiguration
2. **DNS-01 challenge failure** (30%) — external-dns not creating TXT records, DigitalOcean API errors, DNS propagation delay
3. **Let's Encrypt rate limit** (20%) — Too many cert requests (50/week limit), testing without staging issuer
4. **DNS propagation delay** (20%) — TXT records created but not yet propagated, ACME validation fails before propagation completes

### How TLS Certificate Renewal Works

```
1. cert-manager monitors Certificate resources
   ↓
2. 30 days before expiry, creates CertificateRequest
   ↓
3. Creates ACME Challenge (dns-01 type)
   ↓
4. external-dns creates TXT record at _acme-challenge.<domain>
   ↓
5. DNS propagates (30s-5min)
   ↓
6. Let's Encrypt validates TXT record
   ↓
7. If valid, issues certificate
   ↓
8. cert-manager stores cert in Kubernetes Secret
   ↓
9. Ingress controller reloads cert (automatic)
```

**Certificates in Nebula DNS:**
- **Wildcard cert:** `*.staging.nebuladns.io` or `*.nebuladns.io` (covers api, admin, app, doh subdomains)
- **DNS certs:** `dns1.staging.nebuladns.io`, `dns2.staging.nebuladns.io` (DoT endpoints)
- **Issuer:** ClusterIssuer letsencrypt-prod (or letsencrypt-staging for testing)
- **Challenge type:** DNS-01 (required for wildcard certs)
- **DNS provider:** DigitalOcean (via external-dns)

**DigitalOcean droplet (Flux Shield production):** TLS is issued by **Caddy** (HTTP-01), not cert-manager. Caddy obtains **one certificate per hostname** (`api.shield.fluxlabs.net`, `dns1|dns2.shield.fluxlabs.net`, and legacy `*.nebuladns.io`). `deploy/droplet/scripts/sync-caddy-certs.sh` copies them into `./certs/` for dnsdist; the systemd timer `nebula-dns-sync-certs` runs daily with `--reload-if-changed`. After manual Caddy or cert fixes, run the sync script and restart dnsdist if the hash changed. See `deploy/droplet/README.md`.

### Warning Signs

- `certmanager_certificate_expiration_timestamp_seconds` < 2592000 (30 days)
- Certificate resource shows `Ready: False` status
- Challenge stuck in "pending" state for >10 minutes
- cert-manager logs show "failed to determine DNS Name for challenge"
- external-dns logs show "failed to create TXT record"

### Related Alerts

- **CertificateExpiringSoon** → Certificate expires in <30 days (warning, investigate during business hours)
- **CertificateExpired** → Certificate already expired (critical, page immediately)
- **TLSHandshakeFailure** → Clients failing TLS handshake (critical, cert likely expired)
- **CertManagerDown** → cert-manager pod unavailable (critical, auto-renewal disabled)

### Resolution Procedures

#### cert-manager Pod Down

**Symptoms:**
- cert-manager pod in CrashLoopBackOff or NotReady state
- No certificate renewals happening
- Logs show startup errors or OOM

**Steps:**
```bash
# 1. Check cert-manager pod status
kubectl get pods -n cert-manager

# 2. View cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager --tail=100

# 3. Check for OOMKill or resource issues
kubectl describe pod -n cert-manager -l app=cert-manager

# 4. Restart cert-manager if unhealthy
kubectl rollout restart deployment/cert-manager -n cert-manager
kubectl rollout status deployment/cert-manager -n cert-manager --timeout=300s

# 5. Verify cert-manager is processing certificates
kubectl logs -n cert-manager deploy/cert-manager --tail=50 -f | grep "certificate"

# 6. Trigger manual renewal by deleting secret (cert-manager will recreate)
# CAUTION: This causes brief downtime for the affected service
kubectl delete secret <cert-secret-name> -n nebula-dns
# cert-manager will request new certificate within 1 minute

# 7. Monitor certificate creation
kubectl get certificaterequest -n nebula-dns --watch
```

#### DNS-01 Challenge Failure

**Symptoms:**
- Challenge stuck in "pending" state
- cert-manager logs show "waiting for DNS record"
- external-dns not creating TXT records

**Steps:**
```bash
# 1. Check challenge status
kubectl get challenges -n nebula-dns
kubectl describe challenge -n nebula-dns <challenge-name>

# 2. Verify TXT record was created
dig _acme-challenge.<domain> TXT @8.8.8.8
# Expected: TXT record with ACME challenge token

# 3. If TXT record missing, check external-dns logs
kubectl logs -n nebula-dns deploy/external-dns --tail=100 | grep -i txt

# 4. Check DigitalOcean API connectivity
kubectl exec -n nebula-dns deploy/external-dns -- curl -H "Authorization: Bearer $DO_TOKEN" https://api.digitalocean.com/v2/domains
# Should return JSON list of domains

# 5. If external-dns failed, verify DigitalOcean token
kubectl get secret external-dns-digitalocean -n nebula-dns -o jsonpath='{.data.token}' | base64 -d
# Token should be valid (check in DO console → API → Tokens)

# 6. If token expired, update secret:
kubectl create secret generic external-dns-digitalocean \
  --from-literal=token=<new-token> \
  -n nebula-dns \
  --dry-run=client -o yaml | kubectl apply -f -

# 7. Restart external-dns to pick up new token
kubectl rollout restart deployment/external-dns -n nebula-dns

# 8. If DNS propagation slow, wait up to 5 minutes
# Monitor with: watch -n 10 'dig _acme-challenge.<domain> TXT @8.8.8.8'

# 9. If challenge times out, cert-manager will retry automatically
# Check: kubectl get certificaterequest -n nebula-dns
```

#### Let's Encrypt Rate Limit Hit

**Symptoms:**
- cert-manager logs show "rate limit exceeded" or "too many certificates"
- Certificate issuance fails with 429 status code
- Multiple failed renewal attempts

**Steps:**
```bash
# 1. Verify rate limit error in cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager --tail=100 | grep -i "rate limit"

# 2. Check Let's Encrypt rate limits documentation
# https://letsencrypt.org/docs/rate-limits/
# Production: 50 certificates per registered domain per week
# Staging: Much higher limits, use for testing

# 3. If in staging environment, switch to letsencrypt-staging issuer:
# Edit Certificate resource:
kubectl edit certificate <cert-name> -n nebula-dns
# Change: issuerRef.name: letsencrypt-prod → letsencrypt-staging

# 4. If in production and hit limit, WAIT
# Rate limits reset weekly (rolling window)
# Check when limit resets: https://crt.sh/?q=nebuladns.io

# 5. If emergency in production, consider alternatives:
# - Manual cert from another CA (ZeroSSL, BuyPass)
# - Use existing valid cert from backup
# - Contact Let's Encrypt support for rate limit increase (unlikely to grant)

# 6. Prevent future rate limit issues:
# - Always test with letsencrypt-staging first
# - Don't delete certs unnecessarily (reuse existing)
# - Coordinate renewals to avoid simultaneous requests
```

#### DNS Propagation Delay

**Symptoms:**
- TXT record created but ACME validation fails
- Challenge shows "waiting for DNS propagation"
- Works after retry in 5-10 minutes

**Steps:**
```bash
# 1. Verify TXT record exists
dig _acme-challenge.<domain> TXT @8.8.8.8
dig _acme-challenge.<domain> TXT @1.1.1.1

# 2. Check if record is consistent across nameservers
dig _acme-challenge.<domain> TXT @ns1.digitalocean.com
dig _acme-challenge.<domain> TXT @ns2.digitalocean.com
dig _acme-challenge.<domain> TXT @ns3.digitalocean.com

# 3. If inconsistent, wait for propagation (up to 5 minutes)
watch -n 30 'dig _acme-challenge.<domain> TXT @8.8.8.8'

# 4. If consistent but validation still fails, check ACME solver:
kubectl describe challenge -n nebula-dns <challenge-name>
# Look for: "Waiting for DNS record to propagate"

# 5. Increase DNS propagation wait time if needed:
# Edit ClusterIssuer:
kubectl edit clusterissuer letsencrypt-prod
# Add/modify:
spec:
  acme:
    solvers:
      - dns01:
          digitalocean:
            tokenSecretRef: ...
          propagationCheck:
            dnsServers:
              - "8.8.8.8:53"
              - "1.1.1.1:53"

# 6. cert-manager will retry automatically after delay
# No manual intervention needed, just wait
```

#### Certificate Already Expired (Emergency)

**Symptoms:**
- Certificate expired (notAfter date in past)
- TLS handshake failures for clients
- Services unreachable via HTTPS/DoT/DoH

**Steps:**
```bash
# 1. Check certificate expiration
kubectl get secret <cert-secret-name> -n nebula-dns -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates

# 2. If cert expired and automatic renewal failed, MANUAL INTERVENTION REQUIRED

# 3. EMERGENCY PROCEDURE - Manual certbot renewal:
# Install certbot if not available:
# brew install certbot (macOS)
# apt-get install certbot (Ubuntu)

# 4. Request certificate via DNS challenge:
certbot certonly \
  --manual \
  --preferred-challenges dns \
  --email ops@nebuladns.io \
  --agree-tos \
  -d "*.staging.nebuladns.io" \
  -d "dns1.staging.nebuladns.io" \
  -d "dns2.staging.nebuladns.io"

# 5. certbot will prompt you to create TXT record
# Create manually in DigitalOcean DNS:
# Name: _acme-challenge.staging.nebuladns.io
# Type: TXT
# Value: <token from certbot>

# 6. Wait for DNS propagation (verify with dig)
dig _acme-challenge.staging.nebuladns.io TXT @8.8.8.8

# 7. Press Enter in certbot to continue validation

# 8. After successful validation, certbot saves certs to:
# /etc/letsencrypt/live/staging.nebuladns.io/fullchain.pem (cert)
# /etc/letsencrypt/live/staging.nebuladns.io/privkey.pem (key)

# 9. Create Kubernetes secret from certbot files:
kubectl create secret tls <cert-secret-name> \
  --cert=/etc/letsencrypt/live/staging.nebuladns.io/fullchain.pem \
  --key=/etc/letsencrypt/live/staging.nebuladns.io/privkey.pem \
  -n nebula-dns \
  --dry-run=client -o yaml | kubectl apply -f -

# 10. Restart affected services to pick up new cert:
kubectl rollout restart deployment/dnsdist -n nebula-dns
kubectl rollout restart ingress/nebula-dns-ingress -n nebula-dns

# 11. Verify TLS handshake works:
openssl s_client -connect dns1.staging.nebuladns.io:853 </dev/null
curl -v https://api.staging.nebuladns.io/health

# 12. Fix cert-manager to prevent future manual renewals:
# Investigate why automatic renewal failed, fix root cause
```

#### ClusterIssuer Misconfiguration

**Symptoms:**
- Certificates never get issued
- cert-manager logs show "issuer not found" or configuration errors
- CertificateRequest stuck in "pending" indefinitely

**Steps:**
```bash
# 1. Verify ClusterIssuer exists
kubectl get clusterissuer

# 2. Check ClusterIssuer configuration
kubectl describe clusterissuer letsencrypt-prod

# 3. Verify ACME account registered
# Look for: "The ACME account was registered with the ACME server"

# 4. If not registered, check email and server URL:
kubectl get clusterissuer letsencrypt-prod -o yaml
# email: Should be valid email for notifications
# server: https://acme-v02.api.letsencrypt.org/directory (prod)
#         https://acme-staging-v02.api.letsencrypt.org/directory (staging)

# 5. If misconfigured, update ClusterIssuer:
kubectl edit clusterissuer letsencrypt-prod
# Fix email or server URL

# 6. Delete and recreate ACME account secret:
kubectl delete secret letsencrypt-prod -n cert-manager
# cert-manager will re-register account

# 7. Trigger certificate re-issuance:
kubectl delete certificaterequest -n nebula-dns <request-name>
# cert-manager will create new request
```

### Post-Incident

After resolution, verify the following:

1. **All certificates valid:**
   ```bash
   kubectl get certificates -n nebula-dns
   # All should show Ready: True

   # Check expiration dates:
   kubectl get secret <cert-secret-name> -n nebula-dns -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
   # notAfter should be 90 days in future
   ```

2. **TLS handshake working:**
   ```bash
   # DoT:
   openssl s_client -connect dns1.staging.nebuladns.io:853 </dev/null
   # DoH:
   curl -v https://doh.staging.nebuladns.io/dns-query
   # API:
   curl -v https://api.staging.nebuladns.io/health
   ```

3. **cert-manager healthy:**
   ```bash
   kubectl get pods -n cert-manager
   kubectl logs -n cert-manager deploy/cert-manager --tail=50 | grep -i error
   # No errors related to certificate issuance
   ```

4. **No pending challenges:**
   ```bash
   kubectl get challenges -n nebula-dns
   # Should be empty or all "valid"
   ```

5. **Metrics recovering:**
   - `certmanager_certificate_expiration_timestamp_seconds` >2592000 (>30 days)
   - No TLS handshake failures in logs
   - DoT/DoH probe success rate at 100%

6. **Document in incident report:**
   - Root cause (cert-manager down, DNS-01 failure, rate limit, propagation delay, expired cert)
   - Manual intervention taken (if any)
   - Long-term fixes (monitoring improvements, rate limit prevention, propagation delay tuning)

### Cross-References

- [DNS Down](dns-down.md) — If cert expiration causes DoT/DoH failures
- [Deployment Runbook](deployment.md) — How to deploy with updated cert-manager configuration

---

**Runbook Version:** 1.0
**Last Updated:** 2026-02-21
**Owner:** DevOps/SRE Team
