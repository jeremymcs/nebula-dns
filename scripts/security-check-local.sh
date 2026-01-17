#!/bin/bash
# Nebula DNS - Local Security Check Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Run security checks locally before pushing code

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "Nebula DNS - Local Security Check"
echo "================================================"
echo ""

FAILED=0
WARNINGS=0

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${YELLOW}⚠ Warning: $1 not installed. Skipping $2 scan.${NC}"
        echo "  Install: $3"
        ((WARNINGS++))
        return 1
    fi
    return 0
}

# 1. Secrets Detection
echo "1. Checking for secrets (Gitleaks)..."
if check_tool "gitleaks" "secrets" "brew install gitleaks"; then
    if gitleaks detect --source . --verbose --no-git 2>&1 | grep -q "Finding:"; then
        echo -e "${RED}✗ Secrets detected! Please remove before committing.${NC}"
        gitleaks detect --source . --verbose --no-git
        ((FAILED++))
    else
        echo -e "${GREEN}✓ No secrets detected${NC}"
    fi
else
    echo -e "${YELLOW}  Skipping secrets scan${NC}"
fi
echo ""

# 2. NPM Audit - API
echo "2. Checking API dependencies (NPM Audit)..."
if [ -d "api" ] && [ -f "api/package.json" ]; then
    cd api
    if npm audit --audit-level=high 2>&1 | grep -q "found.*vulnerabilities"; then
        echo -e "${RED}✗ API has HIGH+ vulnerabilities${NC}"
        npm audit --audit-level=high
        ((FAILED++))
    else
        echo -e "${GREEN}✓ API dependencies clean${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}  API directory not found, skipping${NC}"
fi
echo ""

# 3. NPM Audit - UI
echo "3. Checking UI dependencies (NPM Audit)..."
if [ -d "ui" ] && [ -f "ui/package.json" ]; then
    cd ui
    if npm audit --audit-level=high 2>&1 | grep -q "found.*vulnerabilities"; then
        echo -e "${RED}✗ UI has HIGH+ vulnerabilities${NC}"
        npm audit --audit-level=high
        ((FAILED++))
    else
        echo -e "${GREEN}✓ UI dependencies clean${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}  UI directory not found, skipping${NC}"
fi
echo ""

# 4. Go Vulnerability Check
echo "4. Checking Go vulnerabilities (govulncheck)..."
if check_tool "govulncheck" "Go vulnerabilities" "go install golang.org/x/vuln/cmd/govulncheck@latest"; then
    if [ -d "policy-svc" ] && [ -f "policy-svc/go.mod" ]; then
        cd policy-svc
        if govulncheck ./... 2>&1 | grep -q "Vulnerability"; then
            echo -e "${RED}✗ Go vulnerabilities found${NC}"
            govulncheck ./...
            ((FAILED++))
        else
            echo -e "${GREEN}✓ No Go vulnerabilities${NC}"
        fi
        cd ..
    else
        echo -e "${YELLOW}  Policy service directory not found, skipping${NC}"
    fi
else
    echo -e "${YELLOW}  Skipping Go vulnerability scan${NC}"
fi
echo ""

# 5. Container Image Scan (if images exist)
echo "5. Checking container images (Trivy)..."
if check_tool "trivy" "container images" "brew install trivy"; then
    IMAGES=("nebula-dns-api" "nebula-dns-ui" "nebula-dns-policy-svc")
    IMAGE_FOUND=0

    for IMAGE in "${IMAGES[@]}"; do
        if docker image inspect "$IMAGE:latest" &> /dev/null; then
            ((IMAGE_FOUND++))
            echo "  Scanning $IMAGE:latest..."
            if trivy image --severity CRITICAL,HIGH --exit-code 1 "$IMAGE:latest"; then
                echo -e "${GREEN}  ✓ $IMAGE:latest is clean${NC}"
            else
                echo -e "${RED}  ✗ $IMAGE:latest has vulnerabilities${NC}"
                ((FAILED++))
            fi
        fi
    done

    if [ $IMAGE_FOUND -eq 0 ]; then
        echo -e "${YELLOW}  No local images found. Build images first with:${NC}"
        echo "    docker compose build"
    fi
else
    echo -e "${YELLOW}  Skipping container image scan${NC}"
fi
echo ""

# 6. Check for common security issues in code
echo "6. Checking for common security issues..."
ISSUES_FOUND=0

# Check for hardcoded secrets patterns
if grep -r -n -E "(password|secret|api[_-]?key|token)\s*=\s*['\"][^'\"]{8,}['\"]" --include="*.ts" --include="*.js" --include="*.go" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build . 2>/dev/null | grep -v "test" | grep -v "example"; then
    echo -e "${YELLOW}⚠ Potential hardcoded credentials found${NC}"
    ((WARNINGS++))
    ((ISSUES_FOUND++))
fi

# Check for console.log in production code (should use proper logging)
if grep -r -n "console\.log\|console\.debug" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist api/src ui/src 2>/dev/null; then
    echo -e "${YELLOW}⚠ console.log found in source (use proper logging)${NC}"
    ((WARNINGS++))
    ((ISSUES_FOUND++))
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ No common security issues detected${NC}"
fi
echo ""

# Summary
echo "================================================"
echo "Summary"
echo "================================================"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All security checks passed!${NC}"
    echo ""
    echo "Safe to commit and push."
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠ Security checks completed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Review warnings above. Consider fixing before pushing."
    exit 0
else
    echo -e "${RED}✗ Security checks failed with $FAILED error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the issues above before pushing."
    echo ""
    echo "Need help? Check .github/SECURITY_SCANNING.md"
    exit 1
fi
