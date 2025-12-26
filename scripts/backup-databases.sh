#!/bin/bash
# SafeDNS Database Backup Script
# Backs up PostgreSQL and ClickHouse databases

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# PostgreSQL settings
PG_HOST="${PG_HOST:-postgres}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-nebula}"
PG_DB="${PG_DB:-nebula_dns}"

# ClickHouse settings
CH_HOST="${CH_HOST:-clickhouse}"
CH_PORT="${CH_PORT:-9000}"
CH_USER="${CH_USER:-default}"
CH_DB="${CH_DB:-nebula_logs}"

# S3 settings (optional)
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-safedns-backups}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

backup_postgres() {
    log "Starting PostgreSQL backup..."
    local backup_file="${BACKUP_DIR}/postgres_${PG_DB}_${TIMESTAMP}.sql.gz"
    
    PGPASSWORD="${PG_PASSWORD}" pg_dump \
        -h "$PG_HOST" \
        -p "$PG_PORT" \
        -U "$PG_USER" \
        -d "$PG_DB" \
        --format=custom \
        --compress=9 \
        -f "$backup_file"
    
    log "PostgreSQL backup completed: $backup_file"
    echo "$backup_file"
}

backup_clickhouse() {
    log "Starting ClickHouse backup..."
    local backup_file="${BACKUP_DIR}/clickhouse_${CH_DB}_${TIMESTAMP}.tar.gz"
    
    # Create backup using clickhouse-backup or native backup
    clickhouse-client \
        --host="$CH_HOST" \
        --port="$CH_PORT" \
        --user="$CH_USER" \
        --password="${CH_PASSWORD:-}" \
        --query="BACKUP DATABASE ${CH_DB} TO Disk('backups', '${TIMESTAMP}')"
    
    # Compress the backup
    tar -czf "$backup_file" -C "${BACKUP_DIR}/clickhouse" "${TIMESTAMP}"
    
    log "ClickHouse backup completed: $backup_file"
    echo "$backup_file"
}

upload_to_s3() {
    local file="$1"
    if [ -n "$S3_BUCKET" ]; then
        log "Uploading $file to S3..."
        aws s3 cp "$file" "s3://${S3_BUCKET}/${S3_PREFIX}/$(basename "$file")"
        log "Upload completed"
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    log "Cleanup completed"
}

main() {
    log "Starting SafeDNS database backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup PostgreSQL
    pg_backup=$(backup_postgres)
    upload_to_s3 "$pg_backup"
    
    # Backup ClickHouse
    ch_backup=$(backup_clickhouse)
    upload_to_s3 "$ch_backup"
    
    # Cleanup old backups
    cleanup_old_backups
    
    log "All backups completed successfully"
}

main "$@"

