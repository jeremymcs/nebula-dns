# TLS material for local dnsdist (DoT / DoH)

**Private keys are not committed.** Generate them locally before `docker compose up`:

```bash
./generate-dev-certs.sh
```

This creates `server.key` and `server.crt` (self-signed, gitignored).

For production droplet deployment, use Caddy ACME and `deploy/droplet/scripts/sync-caddy-certs.sh` instead.
