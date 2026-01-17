# Security Scanning Quick Reference

**Nebula DNS - Developer Guide**
**Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>**

## Overview

This project uses comprehensive automated security scanning to detect vulnerabilities early. All scans run automatically on every push, PR, and daily via scheduled jobs.

## What Gets Scanned

### 1. Code (SAST)
- **Tool**: GitHub CodeQL
- **Languages**: JavaScript, TypeScript, Go
- **Detects**: SQL injection, XSS, path traversal, insecure crypto, etc.

### 2. Secrets
- **Tool**: Gitleaks
- **Detects**: API keys, passwords, tokens, private keys, credentials
- **Config**: `.gitleaks.toml`

### 3. Dependencies
- **Tools**: NPM Audit, govulncheck, Snyk
- **Detects**: Known vulnerabilities in packages
- **Threshold**: Fails on HIGH+ severity

### 4. Container Images
- **Tool**: Trivy
- **Detects**: OS vulnerabilities, app dependencies, config issues
- **Threshold**: Fails on CRITICAL/HIGH

### 5. Licenses
- **Tools**: license-checker (NPM), go-licenses
- **Detects**: License compliance issues

## Running Scans Locally

### Before Committing

```bash
# Check for secrets
brew install gitleaks
gitleaks detect --source . --verbose

# NPM vulnerabilities
cd api && npm audit
cd ui && npm audit

# Go vulnerabilities
cd policy-svc
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...

# Container scan
docker build -t test-image ./api
trivy image test-image
```

### Quick Pre-Push Check

```bash
# Run all local checks
./scripts/security-check-local.sh
```

## Viewing Scan Results

### GitHub Security Tab
All findings: `https://github.com/OWNER/nebula-dns/security`

### Workflow Runs
Individual scan details: `https://github.com/OWNER/nebula-dns/actions/workflows/security-scan.yml`

### Artifacts
Download detailed reports from workflow artifacts page

## Fixing Common Issues

### NPM Vulnerabilities

```bash
# Update specific package
npm update <package-name>

# Update all packages (use with caution)
npm update

# Use audit fix (automated patches)
npm audit fix

# For breaking changes
npm audit fix --force
```

### Go Vulnerabilities

```bash
# Update specific module
go get -u <module-name>

# Update all modules
go get -u ./...

# Verify fixes
govulncheck ./...
```

### False Positive Secrets

If Gitleaks flags a false positive, add to `.gitleaks.toml`:

```toml
[allowlist]
regexes = [
  "your-false-positive-pattern",
]
```

### Container Image Issues

```bash
# Update base image
# Edit Dockerfile:
FROM node:20-alpine  # Use latest patch version

# Check for updates
docker pull node:20-alpine
trivy image node:20-alpine
```

## When Scans Fail

### Pull Request Blocked

1. Check the workflow run for details
2. Click on failed job to see specific findings
3. Download artifacts for detailed reports
4. Fix issues and push new commit
5. Scans re-run automatically

### Critical Findings

Automated issue will be created with:
- Direct link to findings
- Severity levels
- Remediation steps

### Getting Help

1. Check [docs/O-security-scanning-ci.md](../docs/O-security-scanning-ci.md)
2. Review scan logs in workflow run
3. Open issue with `security` label
4. Contact security team

## Scan Schedule

- **Every Push**: Full security scan
- **Every PR**: Full security scan
- **Daily 6 AM UTC**: Scheduled scan for new vulnerabilities
- **Manual**: Can trigger via Actions UI

## Exemptions

### Temporary Exemption

If you need to temporarily bypass a scan (NOT recommended):

```yaml
# Add to PR comment (requires approval)
/security-override: <justification>
```

### Permanent Exemption

For known false positives, update configs:
- CodeQL: `.github/codeql/codeql-config.yml`
- Gitleaks: `.gitleaks.toml`
- Trivy: `.trivyignore` (create if needed)

## Best Practices

### Do's ✅

- Run local scans before pushing
- Fix CRITICAL/HIGH immediately
- Update dependencies regularly
- Review Security tab weekly
- Use `.gitleaks.toml` for false positives
- Keep base images updated

### Don'ts ❌

- Don't ignore security failures
- Don't commit real secrets (use env vars)
- Don't use `--force` on security overrides
- Don't skip dependency updates
- Don't disable security scans
- Don't hardcode credentials

## Metrics

Target security posture:
- **Critical Vulnerabilities**: 0
- **High Vulnerabilities**: < 5
- **Mean Time to Fix**: < 24 hours (CRITICAL), < 1 week (HIGH)
- **False Positive Rate**: < 5%

## Tools Installation

### macOS

```bash
brew install gitleaks
brew install trivy
brew install cosign
```

### Linux

```bash
# Gitleaks
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz
tar -xzf gitleaks_8.18.0_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/

# Trivy
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy
```

## FAQ

**Q: Can I skip security scans for a hotfix?**
A: No. Security scans are mandatory. If urgent, fix critical issues in follow-up PR.

**Q: What if a dependency has no patch available?**
A: Document in issue, add to tracking, consider alternative package.

**Q: How do I verify signed images?**
A: Use `cosign verify` with certificate identity (see docs).

**Q: Can I run scans faster?**
A: Local scans are faster. CI scans run in parallel for speed.

**Q: What happens on scheduled scan failures?**
A: Automated issue created, team notified, no deployment blocked.

---

For detailed documentation, see [docs/O-security-scanning-ci.md](../docs/O-security-scanning-ci.md)
