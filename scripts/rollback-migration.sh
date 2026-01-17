#!/bin/bash

# Nebula DNS - Database Migration Rollback Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# This script rolls back the last database migration in Kubernetes.
# It can run in two modes:
#   1. Kubectl mode (runs migration:revert in a pod)
#   2. Local mode (connects to database directly)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-nebula-dns}"
DEPLOYMENT="${DEPLOYMENT:-api}"
SECRET_NAME="${SECRET_NAME:-api-secrets}"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Roll back the last database migration in Kubernetes.

OPTIONS:
    -n, --namespace NAMESPACE    Kubernetes namespace (default: nebula-dns)
    -d, --deployment DEPLOYMENT  API deployment name (default: api)
    -s, --secret SECRET_NAME     Secret name for database URL (default: api-secrets)
    -l, --local                  Run locally (requires DATABASE_URL env var)
    -h, --help                   Show this help message

EXAMPLES:
    # Rollback in Kubernetes (default)
    $0

    # Rollback in specific namespace
    $0 -n production

    # Rollback locally (requires DATABASE_URL)
    DATABASE_URL=postgresql://... $0 --local

EOF
}

check_prerequisites() {
    if [ "$LOCAL_MODE" = "true" ]; then
        if [ -z "$DATABASE_URL" ]; then
            log_error "DATABASE_URL environment variable is required for local mode"
            exit 1
        fi

        if ! command -v npm &> /dev/null; then
            log_error "npm is required for local mode"
            exit 1
        fi

        if [ ! -d "api" ]; then
            log_error "Must run from project root directory (api/ directory not found)"
            exit 1
        fi
    else
        if ! command -v kubectl &> /dev/null; then
            log_error "kubectl is required for Kubernetes mode"
            exit 1
        fi
    fi
}

show_current_migrations() {
    log_info "Fetching current migration status..."

    if [ "$LOCAL_MODE" = "true" ]; then
        cd api
        npm run migration:show
        cd ..
    else
        # Get first pod from deployment
        POD=$(kubectl get pods -n "$NAMESPACE" -l "app=$DEPLOYMENT" -o jsonpath='{.items[0].metadata.name}')

        if [ -z "$POD" ]; then
            log_error "No pods found for deployment $DEPLOYMENT in namespace $NAMESPACE"
            exit 1
        fi

        log_info "Using pod: $POD"
        kubectl exec -n "$NAMESPACE" "$POD" -- npm run migration:show
    fi
}

confirm_rollback() {
    echo ""
    log_warning "This will revert the last migration. This action cannot be undone automatically."
    read -p "Are you sure you want to proceed? (yes/no): " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
}

perform_rollback() {
    log_info "Rolling back last migration..."

    if [ "$LOCAL_MODE" = "true" ]; then
        cd api
        npm run migration:revert
        cd ..
        log_success "Migration rolled back successfully (local mode)"
    else
        # Create a job to run the rollback
        JOB_NAME="db-rollback-$(date +%s)"

        kubectl create job -n "$NAMESPACE" "$JOB_NAME" \
            --from=cronjob/placeholder --dry-run=client -o yaml 2>/dev/null || \
        kubectl run "$JOB_NAME" -n "$NAMESPACE" \
            --image="$(kubectl get deployment -n "$NAMESPACE" "$DEPLOYMENT" -o jsonpath='{.spec.template.spec.containers[0].image}')" \
            --restart=Never \
            --env="NODE_ENV=production" \
            --command -- npm run migration:revert

        log_info "Created rollback job: $JOB_NAME"
        log_info "Waiting for job to complete..."

        kubectl wait --for=condition=complete --timeout=300s -n "$NAMESPACE" "job/$JOB_NAME"

        log_info "Job output:"
        kubectl logs -n "$NAMESPACE" "job/$JOB_NAME"

        log_success "Migration rolled back successfully"

        # Clean up job
        log_info "Cleaning up job..."
        kubectl delete job -n "$NAMESPACE" "$JOB_NAME"
    fi
}

verify_rollback() {
    log_info "Verifying rollback..."
    echo ""
    show_current_migrations
}

create_backup_instructions() {
    cat << EOF

${YELLOW}IMPORTANT BACKUP NOTES:${NC}
Before running migrations in production, always:

1. Create database backup:
   kubectl exec -n $NAMESPACE postgres-0 -- pg_dump -U nebula nebula > backup.sql

2. Export to file:
   kubectl cp $NAMESPACE/postgres-0:backup.sql ./db-backup-\$(date +%Y%m%d-%H%M%S).sql

3. Verify backup:
   ls -lh db-backup-*.sql

To restore from backup:
   kubectl cp ./db-backup-YYYYMMDD-HHMMSS.sql $NAMESPACE/postgres-0:/tmp/restore.sql
   kubectl exec -n $NAMESPACE postgres-0 -- psql -U nebula nebula < /tmp/restore.sql

EOF
}

# Parse arguments
LOCAL_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -d|--deployment)
            DEPLOYMENT="$2"
            shift 2
            ;;
        -s|--secret)
            SECRET_NAME="$2"
            shift 2
            ;;
        -l|--local)
            LOCAL_MODE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log_info "Nebula DNS - Database Migration Rollback"
    echo ""

    check_prerequisites

    if [ "$LOCAL_MODE" = "true" ]; then
        log_info "Running in LOCAL mode"
    else
        log_info "Running in KUBERNETES mode"
        log_info "Namespace: $NAMESPACE"
        log_info "Deployment: $DEPLOYMENT"
    fi

    echo ""
    show_current_migrations

    echo ""
    confirm_rollback

    echo ""
    perform_rollback

    echo ""
    verify_rollback

    echo ""
    create_backup_instructions

    echo ""
    log_success "Rollback complete!"
}

main
