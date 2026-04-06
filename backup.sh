#!/bin/bash
# -----------------------------------------------------------------------------
# backup.sh - SQL 文本同步脚本 (纯中文日志 + 子进程输出保留版)
# -----------------------------------------------------------------------------

# 运行前检测所需依赖 (静默补全)
for cmd in sqlite3 git; do
    if ! command -v $cmd >/dev/null 2>&1; then
        if command -v apk >/dev/null 2>&1; then apk add --quiet --no-cache $cmd
        elif command -v apt-get >/dev/null 2>&1; then apt-get update -qq && apt-get install -y -qq $cmd
        fi
    fi
done

# ================= 配置区域 =================
SOURCE_FILE="${DB_PATH:-/app/database/nav.db}"
SOURCE_DIR=$(dirname "$SOURCE_FILE")
BACKUP_DIR="/app/nav-backup-repo"
SQL_FILE="nav_data.sql"

# Git 环境变量
GITHUB_EMAIL="${GITHUB_EMAIL:-bot@nav.backup}"
GITHUB_NAME="${GITHUB_NAME:-NavBackupBot}"

# --- URL 解析 ---
if [ -n "$BACKUP_REPO_URL" ]; then
    TEMP_URL="${BACKUP_REPO_URL#https://github.com/}"
    TEMP_URL="${TEMP_URL#http://github.com/}"
    TEMP_URL="${TEMP_URL%.git}"
    TEMP_URL="${TEMP_URL%/}"
    GITHUB_USER=$(echo "$TEMP_URL" | cut -d'/' -f1)
    GITHUB_REPO=$(echo "$TEMP_URL" | cut -d'/' -f2)
else
    GITHUB_USER="${GITHUB_USER}"
    GITHUB_REPO="${GITHUB_REPO}"
fi

# 安全检查
if [ -z "$GITHUB_TOKEN" ] || [ -z "$GITHUB_USER" ] || [ -z "$GITHUB_REPO" ]; then
    echo "[错误] 环境变量缺失，无法启动同步。"
    exit 1
fi

GIT_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
CHECK_INTERVAL="${BACKUP_INTERVAL:-30}"

# 辅助函数：权限修复
fix_permissions() {
    if [ -d "$SOURCE_DIR" ]; then chmod 777 "$SOURCE_DIR"; fi
    if [ -f "$SOURCE_FILE" ]; then chmod 666 "$SOURCE_FILE"; fi
}

# 核心功能 1: 导出 (DB -> SQL)
export_db_to_sql() {
    sqlite3 "$SOURCE_FILE" .dump > "$BACKUP_DIR/$SQL_FILE"
}

# 核心功能 2: 还原 (SQL -> Live DB)
restore_db_from_sql() {
    echo "[同步] 正在从 SQL 还原数据库..."
    TEMP_DB="/tmp/nav_restore.db"
    if [ -f "$TEMP_DB" ]; then rm "$TEMP_DB"; fi
    
    sqlite3 "$TEMP_DB" < "$BACKUP_DIR/$SQL_FILE"
    
    if [ -f "$TEMP_DB" ] && [ -s "$TEMP_DB" ]; then
        cat "$TEMP_DB" > "$SOURCE_FILE"
        rm "$TEMP_DB"
        fix_permissions
        echo "[同步] 数据库还原完成。SQLite 会自动加载新数据，无需重启。"
    else
        echo "[错误] SQL 转换失败，跳过还原。"
    fi
}

# 初始化逻辑
init_repo() {
    git config --global --add safe.directory "$BACKUP_DIR"
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "[同步] 正在克隆仓库..."
        git clone "$GIT_URL" "$BACKUP_DIR" || exit 1
        cd "$BACKUP_DIR" || exit
        git config user.email "$GITHUB_EMAIL"
        git config user.name "$GITHUB_NAME"
        if [ -f "$SQL_FILE" ]; then
             echo "[同步] 检测到云端备份，执行初始恢复..."
             cd ..
             restore_db_from_sql
             cd "$BACKUP_DIR" || exit
        fi
        cd ..
    fi
    fix_permissions
}

# 监控循环
monitor() {
    echo "[同步] 启动后台监控 (SQL文本同步)..."
    LAST_TIME=$(stat -c %Y "$SOURCE_FILE" 2>/dev/null || echo 0)

    while true; do
        sleep "$CHECK_INTERVAL"
        
        # 阶段一：下行同步 (Cloud -> Local)
        cd "$BACKUP_DIR" || exit
        git fetch origin main
        if [ $(git rev-list HEAD..origin/main --count) -gt 0 ]; then
            echo "[同步] 云端有更新，正在拉取..."
            git pull origin main --rebase
            if git diff HEAD@{1} HEAD --name-only | grep -q "$SQL_FILE"; then
                cd ..
                restore_db_from_sql
                cd "$BACKUP_DIR" || exit
                LAST_TIME=$(stat -c %Y "$SOURCE_FILE")
            fi
        fi
        cd .. 

        # 阶段二：上行同步 (Local -> Cloud)
        if [ ! -f "$SOURCE_FILE" ]; then continue; fi
        CURRENT_TIME=$(stat -c %Y "$SOURCE_FILE")

        if [ "$CURRENT_TIME" != "$LAST_TIME" ]; then
            sleep 2
            export_db_to_sql
            cd "$BACKUP_DIR" || exit
            git add "$SQL_FILE"
            if [ -n "$(git status --porcelain)" ]; then
                git commit -m "数据更新: $(date '+%Y-%m-%d %H:%M:%S')"
                git push origin main && echo "[同步] 推送成功。"
            fi
            LAST_TIME=$(stat -c %Y "$SOURCE_FILE")
            cd ..
        fi
    done
}

# 根据参数决定是初始化还是启动监控
case "$1" in
    "--init")
        init_repo
        ;;
    "--monitor")
        monitor
        ;;
    *)
        init_repo
        monitor
        ;;
esac
