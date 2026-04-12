#!/bin/bash
# -----------------------------------------------------------------------------
# backup.sh - SQL 文本同步脚本 (纯中文汇报版 + 进度提示)
# 支持: nav.db 数据库同步 + R2 壁纸链接变更同步
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
WALLPAPER_URL_FILE="wallpaper_url.txt"   # 壁纸链接单独追踪文件

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

# 核心功能 2: 导出壁纸链接 (DB -> wallpaper_url.txt)
export_wallpaper_url() {
    local bg_url
    bg_url=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null)
    local bg_type
    bg_type=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='bg_type';" 2>/dev/null)
    # 写入壁纸链接文件 (含类型信息)
    echo "url=${bg_url}" > "$BACKUP_DIR/$WALLPAPER_URL_FILE"
    echo "type=${bg_type:-auto}" >> "$BACKUP_DIR/$WALLPAPER_URL_FILE"
}

# 核心功能 3: 还原 (SQL -> Live DB)
restore_db_from_sql() {
    echo "[数据库同步] 正在将云端 SQL 还原到本地数据库..."
    TEMP_DB="/tmp/nav_restore.db"
    if [ -f "$TEMP_DB" ]; then rm "$TEMP_DB"; fi
    
    sqlite3 "$TEMP_DB" < "$BACKUP_DIR/$SQL_FILE"
    
    if [ -f "$TEMP_DB" ] && [ -s "$TEMP_DB" ]; then
        cat "$TEMP_DB" > "$SOURCE_FILE"
        rm "$TEMP_DB"
        fix_permissions
        echo "[数据库同步] ✅ 数据库还原完成！系统已自动加载新数据。"
    else
        echo "[数据库同步] ❌ SQL 转换失败，跳过还原。"
    fi
}

# 核心功能 4: 还原壁纸链接 (wallpaper_url.txt -> DB)
restore_wallpaper_url() {
    if [ ! -f "$BACKUP_DIR/$WALLPAPER_URL_FILE" ]; then return; fi
    
    local cloud_url cloud_type
    cloud_url=$(grep '^url=' "$BACKUP_DIR/$WALLPAPER_URL_FILE" | cut -d'=' -f2-)
    cloud_type=$(grep '^type=' "$BACKUP_DIR/$WALLPAPER_URL_FILE" | cut -d'=' -f2-)
    
    if [ -z "$cloud_url" ]; then return; fi
    
    # 读取本地当前壁纸链接
    local local_url
    local_url=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null)
    
    if [ "$cloud_url" = "$local_url" ]; then
        echo "[壁纸链接同步] 壁纸链接未变化，跳过。"
        return
    fi
    
    echo "[壁纸链接同步] 检测到云端壁纸链接变更:"
    echo "[壁纸链接同步]   旧链接: ${local_url:-（空）}"
    echo "[壁纸链接同步]   新链接: $cloud_url"
    
    # 更新数据库中的壁纸链接
    local exists
    exists=$(sqlite3 "$SOURCE_FILE" "SELECT COUNT(*) FROM settings WHERE key='background';" 2>/dev/null)
    if [ "$exists" -gt 0 ] 2>/dev/null; then
        sqlite3 "$SOURCE_FILE" "UPDATE settings SET value='$cloud_url' WHERE key='background';"
    else
        sqlite3 "$SOURCE_FILE" "INSERT INTO settings (key, value) VALUES ('background', '$cloud_url');"
    fi
    
    # 同步壁纸类型
    if [ -n "$cloud_type" ]; then
        local type_exists
        type_exists=$(sqlite3 "$SOURCE_FILE" "SELECT COUNT(*) FROM settings WHERE key='bg_type';" 2>/dev/null)
        if [ "$type_exists" -gt 0 ] 2>/dev/null; then
            sqlite3 "$SOURCE_FILE" "UPDATE settings SET value='$cloud_type' WHERE key='bg_type';"
        else
            sqlite3 "$SOURCE_FILE" "INSERT INTO settings (key, value) VALUES ('bg_type', '$cloud_type');"
        fi
    fi
    
    fix_permissions
    echo "[壁纸链接同步] ✅ 壁纸链接已更新到本地数据库。"
}

# 初始化逻辑
init_repo() {
    git config --global --add safe.directory "$BACKUP_DIR"
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "[同步] 正在克隆云端仓库..."
        git clone -q "$GIT_URL" "$BACKUP_DIR" || exit 1
        cd "$BACKUP_DIR" || exit
        git config user.email "$GITHUB_EMAIL"
        git config user.name "$GITHUB_NAME"
        if [ -f "$SQL_FILE" ]; then
             echo "[数据库同步] 检测到云端已有备份，执行初始恢复..."
             cd ..
             restore_db_from_sql
             cd "$BACKUP_DIR" || exit
        fi
        if [ -f "$WALLPAPER_URL_FILE" ]; then
             echo "[壁纸链接同步] 检测到云端已有壁纸链接备份，执行初始恢复..."
             cd ..
             restore_wallpaper_url
             cd "$BACKUP_DIR" || exit
        fi
        cd ..
    fi
    fix_permissions
}

# 监控循环
monitor() {
    echo "[同步] 启动后台监控 (当前模式: SQL文本双向同步 + 壁纸链接同步)..."
    LAST_TIME=$(stat -c %Y "$SOURCE_FILE" 2>/dev/null || echo 0)
    # 记录上次壁纸链接，用于检测本地壁纸链接变化
    LAST_WALLPAPER_URL=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null || echo "")

    while true; do
        sleep "$CHECK_INTERVAL"
        
        # ============================
        # 阶段一：下行同步 (Cloud -> Local)
        # ============================
        cd "$BACKUP_DIR" || exit
        # 使用 -q 让它安静检查，不输出 FETCH_HEAD
        git fetch origin main -q
        
        if [ $(git rev-list HEAD..origin/main --count) -gt 0 ]; then
            echo "[同步] 发现云端数据有更新，正在拉取..."
            git pull origin main --rebase -q
            
            # 检测 SQL 文件是否变化
            if git diff HEAD@{1} HEAD --name-only | grep -q "$SQL_FILE"; then
                echo "[数据库同步] ↓ 云端数据库有变更，正在还原..."
                cd ..
                restore_db_from_sql
                cd "$BACKUP_DIR" || exit
                LAST_TIME=$(stat -c %Y "$SOURCE_FILE")
                # 还原数据库后重新读取壁纸链接
                LAST_WALLPAPER_URL=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null || echo "")
            fi
            
            # 检测壁纸链接文件是否变化 (独立于 SQL 检测)
            if git diff HEAD@{1} HEAD --name-only | grep -q "$WALLPAPER_URL_FILE"; then
                echo "[壁纸链接同步] ↓ 云端壁纸链接有变更，正在同步..."
                cd ..
                restore_wallpaper_url
                cd "$BACKUP_DIR" || exit
                LAST_TIME=$(stat -c %Y "$SOURCE_FILE")
                LAST_WALLPAPER_URL=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null || echo "")
            fi
        fi
        cd .. 

        # ============================
        # 阶段二：上行同步 (Local -> Cloud)
        # ============================
        if [ ! -f "$SOURCE_FILE" ]; then continue; fi
        CURRENT_TIME=$(stat -c %Y "$SOURCE_FILE")
        
        # 检测本地壁纸链接是否变化 (独立于文件时间戳)
        CURRENT_WALLPAPER_URL=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null || echo "")
        WALLPAPER_CHANGED=false
        if [ "$CURRENT_WALLPAPER_URL" != "$LAST_WALLPAPER_URL" ]; then
            WALLPAPER_CHANGED=true
        fi

        if [ "$CURRENT_TIME" != "$LAST_TIME" ] || [ "$WALLPAPER_CHANGED" = true ]; then
            sleep 2
            
            # 分别输出检测到的变化类型
            if [ "$CURRENT_TIME" != "$LAST_TIME" ]; then
                echo "[数据库同步] ↑ 检测到本地数据库变化，准备备份..."
            fi
            if [ "$WALLPAPER_CHANGED" = true ]; then
                echo "[壁纸链接同步] ↑ 检测到本地壁纸链接变化:"
                echo "[壁纸链接同步]   旧链接: ${LAST_WALLPAPER_URL:-（空）}"
                echo "[壁纸链接同步]   新链接: ${CURRENT_WALLPAPER_URL:-（空）}"
            fi
            
            # 导出数据库 SQL
            export_db_to_sql
            # 导出壁纸链接
            export_wallpaper_url
            
            cd "$BACKUP_DIR" || exit
            
            git add "$SQL_FILE" "$WALLPAPER_URL_FILE"
            if [ -n "$(git status --porcelain)" ]; then
                # 生成有区分度的提交信息
                COMMIT_MSG=""
                SQL_CHANGED=$(git diff --cached --name-only | grep -c "$SQL_FILE" || true)
                WP_CHANGED=$(git diff --cached --name-only | grep -c "$WALLPAPER_URL_FILE" || true)
                
                if [ "$SQL_CHANGED" -gt 0 ] && [ "$WP_CHANGED" -gt 0 ]; then
                    COMMIT_MSG="数据库+壁纸链接更新: $(date '+%Y-%m-%d %H:%M:%S')"
                elif [ "$WP_CHANGED" -gt 0 ]; then
                    COMMIT_MSG="壁纸链接更新: $(date '+%Y-%m-%d %H:%M:%S')"
                else
                    COMMIT_MSG="数据库更新: $(date '+%Y-%m-%d %H:%M:%S')"
                fi
                
                echo "[同步] 正在生成本次更新的数据快照..."
                git commit -q -m "$COMMIT_MSG"
                
                echo "[同步] 正在将数据安全推送到云端..."
                if git push origin main -q; then
                    echo "[同步] 🎉 推送成功！云端数据已是最新状态。"
                    if [ "$SQL_CHANGED" -gt 0 ]; then
                        echo "[数据库同步] ✅ 数据库快照已同步到云端。"
                    fi
                    if [ "$WP_CHANGED" -gt 0 ]; then
                        echo "[壁纸链接同步] ✅ 壁纸链接已同步到云端。"
                    fi
                else
                    echo "[警告] ⚠️ 推送失败，请稍后检查日志。"
                fi
            fi
            LAST_TIME=$(stat -c %Y "$SOURCE_FILE")
            LAST_WALLPAPER_URL="$CURRENT_WALLPAPER_URL"
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
