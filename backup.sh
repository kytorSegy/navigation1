#!/bin/bash

# SQL dump based bidirectional sync for the SQLite database used by the app.
# Local changes are exported to nav_data.sql and pushed to GitHub.
# Remote changes are pulled and restored back into the live database file.

for cmd in sqlite3 git; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        if command -v apk >/dev/null 2>&1; then
            apk add --quiet --no-cache "$cmd"
        elif command -v apt-get >/dev/null 2>&1; then
            apt-get update -qq && apt-get install -y -qq "$cmd"
        fi
    fi
done

SOURCE_FILE="${DB_PATH:-/app/database/nav.db}"
SOURCE_DIR=$(dirname "$SOURCE_FILE")
BACKUP_DIR="/app/nav-backup-repo"
SQL_FILE="nav_data.sql"

GITHUB_EMAIL="${GITHUB_EMAIL:-bot@nav.backup}"
GITHUB_NAME="${GITHUB_NAME:-NavBackupBot}"

if [ -n "${BACKUP_REPO_URL:-}" ]; then
    TEMP_URL="${BACKUP_REPO_URL#https://github.com/}"
    TEMP_URL="${TEMP_URL#http://github.com/}"
    TEMP_URL="${TEMP_URL%.git}"
    TEMP_URL="${TEMP_URL%/}"
    GITHUB_USER=$(echo "$TEMP_URL" | cut -d'/' -f1)
    GITHUB_REPO=$(echo "$TEMP_URL" | cut -d'/' -f2)
else
    GITHUB_USER="${GITHUB_USER:-}"
    GITHUB_REPO="${GITHUB_REPO:-}"
fi

if [ -z "${GITHUB_TOKEN:-}" ] || [ -z "$GITHUB_USER" ] || [ -z "$GITHUB_REPO" ]; then
    echo "[sync] missing required GitHub backup settings"
    exit 1
fi

GIT_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
CHECK_INTERVAL="${BACKUP_INTERVAL:-30}"

LAST_DATA_HASH=""
LAST_BG_URL=""
LAST_CARDS_HASH=""

fix_permissions() {
    if [ -d "$SOURCE_DIR" ]; then
        chmod 777 "$SOURCE_DIR"
    fi

    if [ -f "$SOURCE_FILE" ]; then
        chmod 666 "$SOURCE_FILE"
    fi
}

export_db_to_sql() {
    sqlite3 "$SOURCE_FILE" ".dump" > "$BACKUP_DIR/$SQL_FILE"
}

restore_db_from_sql() {
    echo "[sync] restoring database from remote SQL snapshot"

    local temp_db="/tmp/nav_restore.db"
    rm -f "$temp_db"

    sqlite3 "$temp_db" < "$BACKUP_DIR/$SQL_FILE"

    if [ -f "$temp_db" ] && [ -s "$temp_db" ]; then
        cat "$temp_db" > "$SOURCE_FILE"
        rm -f "$temp_db"
        fix_permissions
        update_data_fingerprints
        echo "[sync] restore completed"
    else
        echo "[sync] restore skipped because generated database is empty"
    fi
}

get_background_url() {
    if [ -f "$SOURCE_FILE" ]; then
        sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

get_cards_order_hash() {
    if [ -f "$SOURCE_FILE" ]; then
        sqlite3 "$SOURCE_FILE" "SELECT id, menu_id, sub_menu_id, \"order\" FROM cards ORDER BY id;" 2>/dev/null | md5sum | cut -d' ' -f1
    else
        echo ""
    fi
}

get_data_hash() {
    if [ -f "$SOURCE_FILE" ]; then
        sqlite3 "$SOURCE_FILE" ".dump" 2>/dev/null | md5sum | cut -d' ' -f1
    else
        echo ""
    fi
}

update_data_fingerprints() {
    LAST_DATA_HASH=$(get_data_hash)
    LAST_BG_URL=$(get_background_url)
    LAST_CARDS_HASH=$(get_cards_order_hash)
}

check_data_changed() {
    local current_hash current_bg current_cards
    local changed=0
    local change_reasons=""

    current_hash=$(get_data_hash)
    current_bg=$(get_background_url)
    current_cards=$(get_cards_order_hash)

    if [ "$current_hash" != "$LAST_DATA_HASH" ]; then
        changed=1
        change_reasons="data"
    fi

    if [ "$current_bg" != "$LAST_BG_URL" ]; then
        changed=1
        if [ -n "$change_reasons" ]; then
            change_reasons="$change_reasons + background"
        else
            change_reasons="background"
        fi
        echo "[sync] background changed"
    fi

    if [ "$current_cards" != "$LAST_CARDS_HASH" ]; then
        changed=1
        if [ -n "$change_reasons" ]; then
            change_reasons="$change_reasons + card-order"
        else
            change_reasons="card-order"
        fi
        echo "[sync] card order changed"
    fi

    if [ "$changed" -eq 1 ]; then
        echo "[sync] local changes detected: $change_reasons"
        return 0
    fi

    return 1
}

ensure_repo_ready() {
    git config --global --add safe.directory "$BACKUP_DIR" >/dev/null 2>&1 || true

    if [ ! -d "$BACKUP_DIR/.git" ]; then
        rm -rf "$BACKUP_DIR"
        echo "[sync] cloning backup repository"
        git clone -q "$GIT_URL" "$BACKUP_DIR" || exit 1
    fi

    cd "$BACKUP_DIR" || exit 1
    git config user.email "$GITHUB_EMAIL"
    git config user.name "$GITHUB_NAME"
    cd .. || exit 1
}

init_repo() {
    ensure_repo_ready
    fix_permissions

    if [ -f "$BACKUP_DIR/$SQL_FILE" ]; then
        restore_db_from_sql
    else
        update_data_fingerprints
    fi

    echo "[sync] initial fingerprints captured"
}

monitor() {
    echo "[sync] monitor started"

    while true; do
        sleep "$CHECK_INTERVAL"

        cd "$BACKUP_DIR" || exit 1
        git fetch origin main -q

        if [ "$(git rev-list HEAD..origin/main --count)" -gt 0 ]; then
            echo "[sync] remote updates found"
            git pull origin main --rebase -q
            if git diff HEAD@{1} HEAD --name-only | grep -q "^${SQL_FILE}\$"; then
                cd .. || exit 1
                restore_db_from_sql
                cd "$BACKUP_DIR" || exit 1
            fi
        fi

        cd .. || exit 1

        if [ ! -f "$SOURCE_FILE" ]; then
            continue
        fi

        if check_data_changed; then
            sleep 2

            echo "[sync] exporting local database snapshot"
            export_db_to_sql

            cd "$BACKUP_DIR" || exit 1
            git add "$SQL_FILE"

            if [ -n "$(git status --porcelain)" ]; then
                git commit -q -m "data update: $(date '+%Y-%m-%d %H:%M:%S')"
                if git push origin main -q; then
                    echo "[sync] push completed"
                else
                    echo "[sync] push failed"
                fi
            fi

            update_data_fingerprints
            cd .. || exit 1
        fi
    done
}

case "${1:-}" in
    --init)
        init_repo
        ;;
    --monitor)
        ensure_repo_ready
        update_data_fingerprints
        monitor
        ;;
    *)
        init_repo
        monitor
        ;;
esac
