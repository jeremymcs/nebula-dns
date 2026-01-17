#!/bin/bash

# Nebula DNS - Migration Helper Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Quick helper script for common migration operations

set -e

NAMESPACE="${NAMESPACE:-nebula-dns}"
DEPLOYMENT="${DEPLOYMENT:-api}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_menu() {
    cat << EOF

${GREEN}Nebula DNS - Migration Helper${NC}

Select an operation:

  ${BLUE}1)${NC} Show migration status
  ${BLUE}2)${NC} Run pending migrations
  ${BLUE}3)${NC} Rollback last migration
  ${BLUE}4)${NC} View migration job logs
  ${BLUE}5)${NC} Test database connectivity
  ${BLUE}6)${NC} Create database backup
  ${BLUE}7)${NC} Initialize ClickHouse
  ${BLUE}8)${NC} Verify all databases
  ${BLUE}9)${NC} Clean up migration jobs
  ${BLUE}0)${NC} Exit

EOF
    read -p "Enter choice [0-9]: " choice
}

get_api_pod() {
    kubectl get pods -n "$NAMESPACE" -l "app=$DEPLOYMENT" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null
}

show_migration_status() {
    log_info "Fetching migration status..."
    POD=$(get_api_pod)
    if [ -z "$POD" ]; then
        log_warning "No API pods found. Checking migration job..."
        kubectl logs -n "$NAMESPACE" job/db-migration --tail=50 2>/dev/null || echo "No migration job found"
    else
        kubectl exec -n "$NAMESPACE" "$POD" -- npm run migration:show
    fi
}

run_migrations() {
    log_warning "This will run all pending migrations"
    read -p "Continue? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Running migrations..."
        POD=$(get_api_pod)
        if [ -z "$POD" ]; then
            log_info "Creating migration job..."
            kubectl apply -f k8s/base/jobs/db-migration-job.yaml
            kubectl wait --for=condition=complete --timeout=600s -n "$NAMESPACE" job/db-migration
            kubectl logs -n "$NAMESPACE" job/db-migration
        else
            kubectl exec -n "$NAMESPACE" "$POD" -- npm run migration:run
        fi
        log_success "Migrations complete"
    fi
}

rollback_migration() {
    log_warning "This will rollback the last migration"
    read -p "Continue? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rolling back..."
        ./scripts/rollback-migration.sh -n "$NAMESPACE"
    fi
}

view_job_logs() {
    log_info "Migration job logs:"
    kubectl logs -n "$NAMESPACE" job/db-migration --tail=100 2>/dev/null || log_warning "No migration job found"

    echo ""
    log_info "ClickHouse init job logs:"
    kubectl logs -n "$NAMESPACE" job/clickhouse-init --tail=100 2>/dev/null || log_warning "No ClickHouse init job found"
}

test_connectivity() {
    log_info "Testing PostgreSQL connectivity..."
    kubectl run db-test-$$  -n "$NAMESPACE" --rm -i --restart=Never \
        --image=postgres:16-alpine -- \
        pg_isready -h postgres -p 5432 && log_success "PostgreSQL is ready"

    echo ""
    log_info "Testing ClickHouse connectivity..."
    kubectl run ch-test-$$ -n "$NAMESPACE" --rm -i --restart=Never \
        --image=curlimages/curl:8.5.0 -- \
        curl -sf http://clickhouse:8123/ping && log_success "ClickHouse is ready"
}

create_backup() {
    log_info "Creating database backup..."
    BACKUP_FILE="db-backup-$(date +%Y%m%d-%H%M%S).sql"

    kubectl exec -n "$NAMESPACE" postgres-0 -- \
        pg_dump -U nebula nebula > "$BACKUP_FILE"

    log_success "Backup created: $BACKUP_FILE"
    ls -lh "$BACKUP_FILE"
}

init_clickhouse() {
    log_info "Initializing ClickHouse..."
    kubectl apply -f k8s/base/jobs/clickhouse-init-job.yaml
    kubectl wait --for=condition=complete --timeout=300s -n "$NAMESPACE" job/clickhouse-init
    kubectl logs -n "$NAMESPACE" job/clickhouse-init
    log_success "ClickHouse initialized"
}

verify_databases() {
    log_info "Verifying PostgreSQL..."
    POD=$(get_api_pod)
    if [ -n "$POD" ]; then
        kubectl exec -n "$NAMESPACE" "$POD" -- npm run migration:show
    fi

    echo ""
    log_info "Verifying ClickHouse tables..."
    kubectl exec -n "$NAMESPACE" clickhouse-0 -- \
        clickhouse-client -q "SHOW TABLES FROM nebula_dns" 2>/dev/null || log_warning "ClickHouse not accessible"

    echo ""
    log_success "Database verification complete"
}

cleanup_jobs() {
    log_info "Cleaning up migration jobs..."
    kubectl delete job -n "$NAMESPACE" db-migration 2>/dev/null && log_success "Deleted db-migration job" || log_info "No db-migration job found"
    kubectl delete job -n "$NAMESPACE" clickhouse-init 2>/dev/null && log_success "Deleted clickhouse-init job" || log_info "No clickhouse-init job found"
}

# Main loop
while true; do
    show_menu

    case $choice in
        1) show_migration_status ;;
        2) run_migrations ;;
        3) rollback_migration ;;
        4) view_job_logs ;;
        5) test_connectivity ;;
        6) create_backup ;;
        7) init_clickhouse ;;
        8) verify_databases ;;
        9) cleanup_jobs ;;
        0) log_info "Goodbye!"; exit 0 ;;
        *) log_warning "Invalid option. Please try again." ;;
    esac

    echo ""
    read -p "Press Enter to continue..."
done
