#!/bin/bash

# Quest Economy System Deployment Rollback Script
# Provides safe rollback procedures for production deployments

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/backups/quest-economy-system}"
APP_DIR="${APP_DIR:-$PROJECT_ROOT}"
LOG_FILE="${LOG_FILE:-/var/log/quest-economy-rollback.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)  echo -e "${GREEN}[INFO]${NC} $message" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" ;;
        DEBUG) echo -e "${BLUE}[DEBUG]${NC} $message" ;;
    esac
    
    # Also log to file if LOG_FILE is writable
    if [[ -w "$(dirname "$LOG_FILE")" ]]; then
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    fi
}

# Help function
show_help() {
    cat << EOF
Quest Economy System Rollback Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    rollback VERSION    Rollback to specific version
    list-backups       List available backup versions
    create-backup      Create backup of current version
    rollback-db        Rollback database only
    health-check       Check system health after rollback

Options:
    -h, --help         Show this help message
    -v, --verbose      Enable verbose output
    -n, --dry-run      Show what would be done without executing
    --backup-dir DIR   Specify backup directory (default: $BACKUP_DIR)
    --app-dir DIR      Specify application directory (default: $APP_DIR)
    --skip-db          Skip database rollback
    --skip-app         Skip application rollback
    --force            Force rollback without confirmations

Examples:
    $0 rollback v1.2.3
    $0 rollback-db 001_quest_economy_system.sql
    $0 list-backups
    $0 --dry-run rollback v1.2.3

EOF
}

# Parse command line arguments
VERBOSE=false
DRY_RUN=false
SKIP_DB=false
SKIP_APP=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -n|--dry-run)
            DRY_RUN=true
            shift
            ;;
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --app-dir)
            APP_DIR="$2"
            shift 2
            ;;
        --skip-db)
            SKIP_DB=true
            shift
            ;;
        --skip-app)
            SKIP_APP=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            break
            ;;
    esac
done

COMMAND="$1"
shift || true

# Ensure backup directory exists
ensure_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log INFO "Creating backup directory: $BACKUP_DIR"
        if [[ "$DRY_RUN" == "false" ]]; then
            mkdir -p "$BACKUP_DIR"
        fi
    fi
}

# Create backup of current version
create_backup() {
    local backup_name="${1:-current_$(date +%Y%m%d_%H%M%S)}"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log INFO "Creating backup: $backup_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log DEBUG "DRY RUN: Would create backup at $backup_path"
        return 0
    fi
    
    # Create application backup
    if [[ -d "$APP_DIR" ]]; then
        log INFO "Backing up application files..."
        cp -r "$APP_DIR" "$backup_path"
        
        # Create metadata file
        cat > "$backup_path/backup_metadata.json" << EOF
{
    "backup_name": "$backup_name",
    "created_at": "$(date -Iseconds)",
    "app_dir": "$APP_DIR",
    "git_commit": "$(cd "$APP_DIR" && git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(cd "$APP_DIR" && git branch --show-current 2>/dev/null || echo 'unknown')",
    "node_version": "$(node --version)",
    "npm_version": "$(npm --version)"
}
EOF
        
        log INFO "Backup created successfully: $backup_path"
    else
        log ERROR "Application directory not found: $APP_DIR"
        return 1
    fi
}

# List available backups
list_backups() {
    log INFO "Available backups in $BACKUP_DIR:"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log WARN "Backup directory does not exist: $BACKUP_DIR"
        return 0
    fi
    
    local count=0
    for backup in "$BACKUP_DIR"/*; do
        if [[ -d "$backup" ]]; then
            local backup_name=$(basename "$backup")
            local metadata_file="$backup/backup_metadata.json"
            
            if [[ -f "$metadata_file" ]]; then
                local created_at=$(jq -r '.created_at' "$metadata_file" 2>/dev/null || echo "unknown")
                local git_commit=$(jq -r '.git_commit' "$metadata_file" 2>/dev/null || echo "unknown")
                echo "  📦 $backup_name (created: $created_at, commit: ${git_commit:0:8})"
            else
                echo "  📦 $backup_name (no metadata)"
            fi
            ((count++))
        fi
    done
    
    if [[ $count -eq 0 ]]; then
        log WARN "No backups found"
    else
        log INFO "Found $count backup(s)"
    fi
}

# Check if PM2 is available and app is running
check_pm2_status() {
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 list | grep -q "quest-economy-system"; then
            return 0
        fi
    fi
    return 1
}

# Stop application
stop_application() {
    log INFO "Stopping application..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log DEBUG "DRY RUN: Would stop application"
        return 0
    fi
    
    if check_pm2_status; then
        pm2 stop quest-economy-system
        log INFO "Application stopped via PM2"
    elif pgrep -f "next start" >/dev/null; then
        pkill -f "next start"
        log INFO "Application stopped via pkill"
    else
        log WARN "No running application found"
    fi
}

# Start application
start_application() {
    log INFO "Starting application..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log DEBUG "DRY RUN: Would start application"
        return 0
    fi
    
    cd "$APP_DIR"
    
    if command -v pm2 >/dev/null 2>&1; then
        pm2 start ecosystem.config.js --env production
        log INFO "Application started via PM2"
    else
        # Fallback to direct start (not recommended for production)
        nohup npm start > /dev/null 2>&1 &
        log INFO "Application started directly (consider using PM2)"
    fi
}

# Rollback application files
rollback_application() {
    local version="$1"
    local backup_path="$BACKUP_DIR/$version"
    
    if [[ ! -d "$backup_path" ]]; then
        log ERROR "Backup not found: $backup_path"
        return 1
    fi
    
    log INFO "Rolling back application to version: $version"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log DEBUG "DRY RUN: Would rollback application from $backup_path to $APP_DIR"
        return 0
    fi
    
    # Create backup of current version before rollback
    create_backup "pre_rollback_$(date +%Y%m%d_%H%M%S)"
    
    # Stop application
    stop_application
    
    # Remove current application (keep backup)
    if [[ -d "$APP_DIR" ]]; then
        rm -rf "${APP_DIR}.old" 2>/dev/null || true
        mv "$APP_DIR" "${APP_DIR}.old"
    fi
    
    # Restore from backup
    cp -r "$backup_path" "$APP_DIR"
    
    # Remove backup metadata from restored version
    rm -f "$APP_DIR/backup_metadata.json"
    
    # Install dependencies if package.json changed
    cd "$APP_DIR"
    if [[ -f "package.json" ]]; then
        log INFO "Installing dependencies..."
        npm ci --production
    fi
    
    # Build application if needed
    if [[ -f "package.json" ]] && grep -q '"build"' package.json; then
        log INFO "Building application..."
        npm run build
    fi
    
    log INFO "Application rollback completed"
}

# Rollback database
rollback_database() {
    local target_migration="$1"
    
    if [[ -z "$DATABASE_URL" ]]; then
        log ERROR "DATABASE_URL environment variable not set"
        return 1
    fi
    
    log INFO "Rolling back database to migration: $target_migration"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log DEBUG "DRY RUN: Would rollback database to $target_migration"
        return 0
    fi
    
    # Use the migration deployer script
    cd "$PROJECT_ROOT"
    node scripts/deploy-migrations.js rollback "$target_migration"
    
    log INFO "Database rollback completed"
}

# Health check after rollback
health_check() {
    log INFO "Performing health check..."
    
    local app_url="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
    local health_endpoint="$app_url/api/health"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log DEBUG "Health check attempt $attempt/$max_attempts"
        
        if curl -f -s "$health_endpoint" >/dev/null 2>&1; then
            log INFO "✅ Health check passed"
            
            # Get detailed health status
            local health_response=$(curl -s "$health_endpoint" 2>/dev/null || echo '{}')
            local status=$(echo "$health_response" | jq -r '.status' 2>/dev/null || echo 'unknown')
            
            log INFO "Application status: $status"
            return 0
        fi
        
        log DEBUG "Health check failed, waiting 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    log ERROR "❌ Health check failed after $max_attempts attempts"
    return 1
}

# Confirm action with user
confirm_action() {
    local action="$1"
    
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    echo -n "Are you sure you want to $action? (y/N): "
    read -r response
    
    case "$response" in
        [yY]|[yY][eE][sS])
            return 0
            ;;
        *)
            log INFO "Operation cancelled by user"
            return 1
            ;;
    esac
}

# Main rollback function
perform_rollback() {
    local version="$1"
    
    if [[ -z "$version" ]]; then
        log ERROR "Version is required for rollback"
        return 1
    fi
    
    log INFO "🔄 Starting rollback to version: $version"
    
    # Confirm action
    if ! confirm_action "rollback to version $version"; then
        return 1
    fi
    
    # Rollback application
    if [[ "$SKIP_APP" == "false" ]]; then
        rollback_application "$version"
    else
        log INFO "Skipping application rollback"
    fi
    
    # Rollback database if migration specified
    if [[ "$SKIP_DB" == "false" ]] && [[ "$version" =~ \.sql$ ]]; then
        rollback_database "$version"
    elif [[ "$SKIP_DB" == "false" ]]; then
        log WARN "No database migration specified for rollback"
    else
        log INFO "Skipping database rollback"
    fi
    
    # Start application
    if [[ "$SKIP_APP" == "false" ]]; then
        start_application
        
        # Wait a moment for startup
        sleep 10
        
        # Perform health check
        if ! health_check; then
            log ERROR "Health check failed after rollback"
            log ERROR "Consider rolling back further or investigating the issue"
            return 1
        fi
    fi
    
    log INFO "✅ Rollback completed successfully"
}

# Main execution
main() {
    ensure_backup_dir
    
    case "$COMMAND" in
        rollback)
            local version="$1"
            if [[ -z "$version" ]]; then
                log ERROR "Version is required for rollback"
                show_help
                exit 1
            fi
            perform_rollback "$version"
            ;;
            
        list-backups)
            list_backups
            ;;
            
        create-backup)
            local backup_name="$1"
            create_backup "$backup_name"
            ;;
            
        rollback-db)
            local migration="$1"
            if [[ -z "$migration" ]]; then
                log ERROR "Migration is required for database rollback"
                exit 1
            fi
            rollback_database "$migration"
            ;;
            
        health-check)
            health_check
            ;;
            
        *)
            log ERROR "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"