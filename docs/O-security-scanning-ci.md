# Security Scanning CI/CD Pipeline

**Nebula DNS - Security Scanning Documentation**
**Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>**

## Overview

The Nebula DNS security scanning pipeline provides comprehensive, automated security analysis for all code changes, dependencies, and container images. This multi-layered approach ensures vulnerabilities are detected early in the development lifecycle.

## Workflow Triggers

The security scanning workflow (`security-scan.yml`) runs on:

- **Push events**: Commits to `main` or `develop` branches
- **Pull requests**: All PRs targeting `main` or `develop`
- **Scheduled scans**: Daily at 6:00 AM UTC
- **Manual triggers**: Via GitHub Actions UI

## Security Scanning Layers

### 1. Static Application Security Testing (SAST)

**Tool**: GitHub CodeQL

**Languages Covered**:
- JavaScript
- TypeScript
- Go

**Features**:
- Security and quality queries
- Extended security analysis
- Custom query suites
- SARIF output to GitHub Security tab

**Configuration**: `.github/codeql/codeql-config.yml`

**Exclusions**:
- Test files (`*.test.ts`, `*.spec.js`)
- Node modules and vendor directories
- Build artifacts and coverage reports
- Minified files

### 2. Secrets Detection

**Tool**: Gitleaks

**Detects**:
- API keys and tokens
- Database credentials
- JWT secrets
- Private keys
- Cloud provider credentials
- Custom Nebula DNS secrets

**Configuration**: `.gitleaks.toml`

**Custom Rules**:
- Nebula API keys
- JWT secrets
- Stripe API keys
- ClickHouse passwords
- Redis authentication
- PostgreSQL connection strings

**Features**:
- Full git history scanning
- SARIF output for GitHub Security
- Smart allowlisting for test files
- Stopwords for false positive reduction

### 3. Dependency Vulnerability Scanning

**Tools**:
- NPM Audit (JavaScript/TypeScript)
- govulncheck (Go)
- Snyk (optional, requires token)

**Components Scanned**:
- API (`api/`)
- UI (`ui/`)
- Policy Service (`policy-svc/`)

**Severity Levels**:
- CRITICAL: Immediate action required
- HIGH: Priority remediation
- MODERATE: Scheduled fixes
- LOW: Track for future updates

**Outputs**:
- JSON audit reports
- SARIF for GitHub Security
- Workflow artifacts for analysis

**Thresholds**:
- Fails on HIGH+ vulnerabilities
- Warns on MODERATE
- Tracks LOW for monitoring

### 4. Container Image Scanning

**Tool**: Trivy

**Scans**:
- OS package vulnerabilities
- Application dependencies
- Configuration issues
- Secrets in layers

**Images Scanned**:
- `nebula-dns-api`
- `nebula-dns-ui`
- `nebula-dns-policy-svc`

**Severity Levels**:
- CRITICAL, HIGH, MEDIUM, LOW

**Outputs**:
- SARIF format for GitHub Security
- JSON reports for detailed analysis
- Table format for quick review

**Failure Conditions**:
- Exit code 1 on CRITICAL or HIGH vulnerabilities
- Continues on MEDIUM/LOW for tracking

### 5. Software Bill of Materials (SBOM)

**Tool**: Syft (Anchore)

**Format**: SPDX JSON

**Generated For**:
- All container images
- Per-component breakdown

**Features**:
- Complete dependency inventory
- License information
- Package versions
- Vulnerability tracking

**Secondary Scan**: Grype scans SBOM for additional vulnerabilities

### 6. Container Image Signing

**Tool**: Cosign (Sigstore)

**When**: Main branch pushes only

**Registry**: GitHub Container Registry (ghcr.io)

**Process**:
1. Build and push images
2. Sign with keyless signing (OIDC)
3. Verify signatures
4. Tag as `latest` and commit SHA

**Verification**:
```bash
cosign verify \
  --certificate-identity=https://github.com/OWNER/nebula-dns/.github/workflows/security-scan.yml@refs/heads/main \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  ghcr.io/OWNER/nebula-dns-api:SHA
```

### 7. License Compliance Scanning

**Tools**:
- license-checker (NPM packages)
- go-licenses (Go modules)

**Checks**:
- License types
- Disallowed licenses
- License compatibility

**Outputs**:
- JSON summary (NPM)
- Text report (Go)
- Compliance status

**Disallowed License Types**:
- Forbidden licenses
- Restricted licenses

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Security Scan Trigger                  │
│         (Push / PR / Schedule / Manual)                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Parallel Scanning                     │
├──────────────┬──────────────┬──────────────┬────────────┤
│   CodeQL     │   Secrets    │ Dependency   │  License   │
│    SAST      │   Detection  │   Scanning   │   Scan     │
│              │              │              │            │
│ JS/TS/Go     │  Gitleaks    │ NPM/Go Vuln  │  Checker   │
└──────────────┴──────────────┴──────────────┴────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Container Image Scanning                    │
│         (Trivy - API, UI, Policy Service)               │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  SBOM Generation                         │
│           (Syft + Grype Vulnerability Scan)             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│          Container Image Signing (Main Only)             │
│         (Cosign - Push to ghcr.io)                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               Security Summary Generation                │
│      (Aggregate results, create issues if critical)     │
└─────────────────────────────────────────────────────────┘
```

## Viewing Security Results

### GitHub Security Tab

All security findings are automatically uploaded to:
```
https://github.com/OWNER/nebula-dns/security
```

**Views**:
- **Code Scanning**: CodeQL, Trivy, Snyk results
- **Dependabot**: Dependency vulnerabilities
- **Secret Scanning**: Leaked credentials

### Workflow Summary

Each workflow run includes a summary:
- Scan completion status
- Results table
- Links to detailed findings
- Next steps

### Artifacts

Download detailed reports from workflow artifacts:
- `npm-audit-api.json`
- `npm-audit-ui.json`
- `govulncheck-results.json`
- `trivy-results-*.json`
- `sbom-*.spdx.json`
- `licenses-*.json`

## Automated Issue Creation

When CRITICAL vulnerabilities are detected, the workflow automatically creates a GitHub issue with:

- Workflow run link
- Commit SHA
- Scan result summary
- Remediation steps
- Labels: `security`, `critical`, `automated`

## Environment Variables

Required secrets:
```yaml
GITHUB_TOKEN: # Auto-provided by GitHub Actions
SNYK_TOKEN: # Optional - for Snyk scanning
GITLEAKS_LICENSE: # Optional - for Gitleaks Pro
```

## Permissions

The workflow requires:
```yaml
permissions:
  contents: read          # Read repository
  security-events: write  # Upload SARIF
  issues: write          # Create issues
  pull-requests: write   # Comment on PRs
  packages: write        # Push to ghcr.io
  id-token: write        # Cosign signing
```

## Performance Optimization

### Parallel Execution

Independent scans run in parallel:
- CodeQL (JS/TS/Go) - matrix strategy
- Secrets detection
- Dependency scanning (API/UI/Policy) - matrix
- License compliance

### Caching

Build caches are leveraged:
- NPM cache for Node.js dependencies
- Go module cache
- Docker layer cache (BuildKit)

### Fail-Fast Disabled

Matrix jobs continue even if one fails, ensuring complete coverage.

## Failure Policies

### Hard Failures (Exit Code 1)

- CRITICAL container vulnerabilities
- HIGH severity in production images
- Forbidden licenses detected

### Soft Failures (Continue)

- MEDIUM/LOW vulnerabilities (tracked)
- Non-blocking CodeQL findings
- Snyk scanning (optional)

### Issue Creation

Automatically creates issues on:
- Any CRITICAL findings
- Multiple HIGH severity findings
- Workflow failures

## Best Practices

### For Developers

1. **Run scans locally before pushing**:
   ```bash
   # NPM audit
   cd api && npm audit

   # Go vulnerabilities
   cd policy-svc && govulncheck ./...

   # Secrets detection
   gitleaks detect --source . --verbose
   ```

2. **Review Security tab regularly**: Check for new findings

3. **Update dependencies promptly**: Don't let vulnerabilities accumulate

4. **Use .gitleaks.toml allowlist**: For known false positives

### For Security Team

1. **Monitor scheduled scans**: Review daily scan results

2. **Triage automated issues**: Prioritize CRITICAL findings

3. **Update scanning rules**: Keep `.gitleaks.toml` and CodeQL config current

4. **Review SBOM**: Track dependency changes

5. **Verify signatures**: Ensure all production images are signed

## Customization

### Adding Custom CodeQL Queries

Edit `.github/codeql/codeql-config.yml`:
```yaml
queries:
  - uses: security-and-quality
  - uses: ./custom-queries  # Add custom query directory
```

### Custom Secrets Rules

Edit `.gitleaks.toml`:
```toml
[[rules]]
id = "custom-secret"
description = "Custom Secret Pattern"
regex = '''your-regex-here'''
tags = ["custom"]
```

### Adjusting Severity Thresholds

Edit `security-scan.yml`:
```yaml
- name: NPM Audit
  run: npm audit --audit-level=critical  # Adjust level
```

## Compliance & Reporting

### Standards Supported

- **OWASP Top 10**: Covered by CodeQL and Trivy
- **CWE**: Common Weakness Enumeration in findings
- **CVE**: Common Vulnerabilities and Exposures tracking
- **SPDX**: SBOM format compliance

### Audit Trail

All scans are logged with:
- Timestamp
- Commit SHA
- Scan results
- SARIF uploads to GitHub

### Retention

- Workflow logs: 90 days (GitHub default)
- Security alerts: Permanent
- Artifacts: 90 days
- Container signatures: Permanent (Sigstore transparency log)

## Troubleshooting

### Common Issues

**CodeQL Analysis Fails**:
- Check language detection
- Verify code compiles
- Review excluded paths

**Container Scan Timeout**:
- Large images may need extended timeout
- Check Docker layer cache

**False Positive Secrets**:
- Add to `.gitleaks.toml` allowlist
- Use stopwords

**SBOM Generation Fails**:
- Ensure image exists in cache
- Check BuildKit settings

### Debug Mode

Enable debug logging:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

## Integration with CI/CD

The security scan workflow integrates with:

- **Main CI workflow** (`ci.yml`): Runs in parallel
- **Release workflow** (`release.yml`): Blocks on security issues
- **Deployment**: Only signed images are deployed

## Metrics & SLIs

Track these metrics:

- **Scan Duration**: Target < 15 minutes total
- **Critical Findings**: Target 0
- **High Findings**: Target < 5
- **Mean Time to Remediate**: Target < 24 hours for CRITICAL
- **False Positive Rate**: Target < 5%

## Future Enhancements

Planned improvements:

1. **DAST (Dynamic Analysis)**: Runtime security testing
2. **Fuzzing**: Automated fuzz testing
3. **Compliance Scanning**: SOC2, HIPAA checks
4. **Security Scorecard**: OpenSSF Scorecard integration
5. **Supply Chain Security**: SLSA provenance
6. **Policy as Code**: OPA security policies

## References

- [GitHub CodeQL Documentation](https://codeql.github.com/docs/)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [Trivy](https://aquasecurity.github.io/trivy/)
- [Cosign](https://docs.sigstore.dev/cosign/overview/)
- [Syft](https://github.com/anchore/syft)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)

## Support

For security scanning issues:
1. Check workflow logs
2. Review this documentation
3. Open issue with `security` label
4. Contact security team

---

**Last Updated**: 2026-01-16
**Workflow Version**: 1.0.0
**Compliance**: OWASP Top 10, CWE/CVE Tracking
