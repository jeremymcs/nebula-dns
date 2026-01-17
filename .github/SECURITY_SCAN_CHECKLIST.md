# Security Scanning Implementation Checklist

**Nebula DNS - US-031 Deployment Checklist**
**Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>**

## Pre-Deployment Checklist

Use this checklist before deploying the security scanning workflow to production.

### 1. Configuration Files

- [x] `.github/workflows/security-scan.yml` created
- [x] `.github/codeql/codeql-config.yml` created
- [x] `.gitleaks.toml` created
- [x] `.trivyignore` created (template)
- [x] Documentation created (`docs/O-security-scanning-ci.md`)
- [x] Quick reference created (`.github/SECURITY_SCANNING.md`)
- [x] Local security script created (`scripts/security-check-local.sh`)

### 2. Repository Settings

- [ ] Enable GitHub Advanced Security (if private repo)
- [ ] Enable Code Scanning
- [ ] Enable Secret Scanning
- [ ] Enable Dependency Graph
- [ ] Enable Dependabot Alerts
- [ ] Configure Security Advisories

**Steps**:
1. Go to `Settings` → `Security & analysis`
2. Enable all security features
3. Configure notification settings

### 3. Secrets Configuration

Required GitHub Secrets:
- [ ] `GITHUB_TOKEN` (auto-provided, verify permissions)
- [ ] `SNYK_TOKEN` (optional - for Snyk scanning)
- [ ] `GITLEAKS_LICENSE` (optional - for Gitleaks Pro features)

**Steps**:
1. Go to `Settings` → `Secrets and variables` → `Actions`
2. Add required secrets
3. Verify secret access in workflow permissions

### 4. Permissions Configuration

Verify workflow permissions:
- [ ] `contents: read` - Read repository
- [ ] `security-events: write` - Upload SARIF results
- [ ] `issues: write` - Create security issues
- [ ] `pull-requests: write` - Comment on PRs
- [ ] `packages: write` - Push to GitHub Container Registry
- [ ] `id-token: write` - Cosign keyless signing

**Steps**:
1. Go to `Settings` → `Actions` → `General`
2. Under "Workflow permissions", select "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"

### 5. Branch Protection Rules

Update branch protection for `main` and `develop`:
- [ ] Require status checks to pass (include "Security Scan")
- [ ] Require security scan before merging
- [ ] Require code scanning results
- [ ] Restrict who can push to matching branches

**Steps**:
1. Go to `Settings` → `Branches`
2. Edit branch protection rule for `main`
3. Under "Require status checks", add:
   - `CodeQL SAST Analysis`
   - `Secrets Detection`
   - `Dependency Vulnerability Scan`
   - `Container Image Security Scan`

### 6. Container Registry Setup

If using signed images:
- [ ] Enable GitHub Container Registry
- [ ] Configure registry permissions
- [ ] Set up image retention policies

**Steps**:
1. Go to organization/user settings
2. Enable GitHub Packages
3. Configure package visibility (private/public)
4. Set retention policy (e.g., keep 10 versions)

### 7. Notification Configuration

Set up security notifications:
- [ ] Email notifications for security alerts
- [ ] Slack/Teams webhook for critical findings
- [ ] On-call escalation for CRITICAL issues

**Steps**:
1. Go to `Settings` → `Notifications`
2. Configure email settings
3. Add webhook integrations if needed

### 8. Testing Plan

Before enabling on production:
- [ ] Test on feature branch first
- [ ] Verify all jobs complete successfully
- [ ] Check SARIF upload to Security tab
- [ ] Test issue creation (simulate failure)
- [ ] Verify container signing (main branch)
- [ ] Test manual workflow dispatch
- [ ] Verify scheduled run (wait for next day)

**Test Branch**:
```bash
git checkout -b test/security-scanning
git push -u origin test/security-scanning
# Observe workflow run
# Fix any issues
# Merge to develop after successful test
```

### 9. Documentation Review

- [ ] Update README.md with security badges
- [ ] Add security scanning to CONTRIBUTING.md
- [ ] Update developer onboarding docs
- [ ] Add security policy (SECURITY.md)
- [ ] Document triage process

### 10. Team Training

- [ ] Security team trained on triage process
- [ ] Developers briefed on local security checks
- [ ] On-call team knows escalation process
- [ ] Document owners assigned for each scan type

## Post-Deployment Checklist

After the workflow is live:

### Week 1

- [ ] Monitor first scheduled run (Day 1)
- [ ] Review all generated issues
- [ ] Tune false positive rates
- [ ] Update `.trivyignore` and `.gitleaks.toml` as needed
- [ ] Measure average scan duration
- [ ] Check artifact storage usage

### Week 2-4

- [ ] Review Security tab trends
- [ ] Analyze issue creation patterns
- [ ] Optimize slow scans
- [ ] Gather developer feedback
- [ ] Update documentation based on feedback
- [ ] Schedule security retrospective

### Monthly

- [ ] Review vulnerability trends
- [ ] Update CodeQL queries
- [ ] Check for new security tools
- [ ] Audit false positive rate
- [ ] Review MTTR metrics
- [ ] Update team training

### Quarterly

- [ ] Review all security configurations
- [ ] Update tool versions
- [ ] Security posture assessment
- [ ] Compliance audit
- [ ] Update documentation
- [ ] Plan improvements

## Rollback Plan

If critical issues occur:

### Immediate Rollback
```bash
# Disable workflow temporarily
gh workflow disable security-scan.yml

# Or remove from required checks
# Settings → Branches → Edit protection rule
```

### Partial Rollback
```yaml
# Edit workflow to disable problematic job
# Add condition to skip:
if: false  # Temporarily disable this job
```

### Full Rollback
```bash
# Revert commit that added workflow
git revert <commit-sha>
git push
```

## Troubleshooting Guide

### Common Issues

**CodeQL Analysis Fails**
- Check language detection in logs
- Verify code compiles successfully
- Review excluded paths in config
- Check for syntax errors in code

**Container Scan Timeout**
- Increase timeout in workflow
- Check image size (optimize if > 2GB)
- Verify Docker BuildKit cache works

**False Positive Secrets**
- Add pattern to `.gitleaks.toml` allowlist
- Use stopwords for common test strings
- Document justification for each allowlist entry

**SBOM Generation Fails**
- Ensure image built successfully
- Check Syft version compatibility
- Verify image format supported

**Image Signing Fails**
- Check OIDC token permissions
- Verify Cosign version
- Check registry authentication

**Issue Creation Spam**
- Tune failure thresholds
- Combine related findings
- Implement rate limiting

## Metrics to Track

### Performance Metrics
- [ ] Scan duration (target: < 20 minutes)
- [ ] Workflow success rate (target: > 99%)
- [ ] Cache hit rate (target: > 80%)
- [ ] Artifact storage usage

### Security Metrics
- [ ] Critical vulnerabilities (target: 0)
- [ ] High vulnerabilities (target: < 5)
- [ ] MTTR for CRITICAL (target: < 24h)
- [ ] MTTR for HIGH (target: < 7d)
- [ ] False positive rate (target: < 5%)

### Developer Experience
- [ ] Time to fix (average)
- [ ] Developer satisfaction score
- [ ] Local security check usage rate
- [ ] Documentation clarity score

## Success Criteria

The security scanning implementation is successful when:

- ✅ All scans run reliably (> 99% success rate)
- ✅ SARIF results upload to Security tab
- ✅ Issues created for critical findings
- ✅ No production vulnerabilities for 30 days
- ✅ MTTR meets SLA targets
- ✅ Developer feedback is positive (> 80%)
- ✅ False positive rate is acceptable (< 5%)
- ✅ Scheduled scans complete daily
- ✅ Container images are signed
- ✅ SBOM generated for all releases

## Support Contacts

### Security Team
- **Lead**: [Name] <email>
- **On-Call**: security-oncall@company.com
- **Slack**: #security

### DevOps Team
- **Lead**: [Name] <email>
- **On-Call**: devops-oncall@company.com
- **Slack**: #devops

### Documentation
- Full docs: `docs/O-security-scanning-ci.md`
- Quick reference: `.github/SECURITY_SCANNING.md`
- Implementation summary: `.github/workflows/SECURITY_SCAN_SUMMARY.md`

## Sign-Off

Before marking this as complete, obtain sign-off from:

- [ ] Security Team Lead
- [ ] DevOps Team Lead
- [ ] Engineering Manager
- [ ] Compliance Officer (if applicable)

**Deployment Date**: _________________

**Deployed By**: _________________

**Sign-Off**: _________________

---

**Version**: 1.0.0
**Last Updated**: 2026-01-16
**Status**: Ready for Deployment
