#!/bin/bash
# -----------------------------------------------------------------------------
# backup.sh - SQL 文本同步脚本 (增强版：壁纸链接 + 卡片排序 完整同步)
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

# ================= 新增：数据指纹缓存 =================
# 用于检测数据内容变化，而非仅依赖文件时间戳
LAST_DATA_HASH=""
LAST_BG_URL=""
LAST_CARDS_HASH=""

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
    echo "[同步] 正在将云端 SQL 还原到本地数据库..."
    TEMP_DB="/tmp/nav_restore.db"
    if [ -f "$TEMP_DB" ]; then rm "$TEMP_DB"; fi
    
    sqlite3 "$TEMP_DB" < "$BACKUP_DIR/$SQL_FILE"
    
    if [ -f "$TEMP_DB" ] && [ -s "$TEMP_DB" ]; then
        cat "$TEMP_DB" > "$SOURCE_FILE"
        rm "$TEMP_DB"
        fix_permissions
        echo "[同步] 数据库还原完成！系统已自动加载新数据。"
        
        # 更新缓存的数据指纹
        update_data_fingerprints
    else
        echo "[错误] SQL 转换失败，跳过还原。"
    fi
}

# ================= 新增：数据指纹函数 =================

# 获取壁纸链接
get_background_url() {
    if [ -f "$SOURCE_FILE" ]; then
        sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# 获取卡片排序指纹 (id:order 的组合哈希)
get_cards_order_hash() {
    if [ -f "$SOURCE_FILE" ]; then
        sqlite3 "$SOURCE_FILE" "SELECT id, menu_id, sub_menu_id, \"order\" FROM cards ORDER BY id;" 2>/dev/null | md5sum | cut -d' ' -f1
    else
        echo ""
    fi
}

# 获取整体数据哈希 (用于检测任何数据变化)
get_data_hash() {
    if [ -f "$SOURCE_FILE" ]; then
        sqlite3 "$SOURCE_FILE" ".dump" 2>/dev/null | md5sum | cut -d' ' -f1
    else
        echo ""
    fi
}

# 更新所有数据指纹缓存
update_data_fingerprints() {
    LAST_DATA_HASH=$(get_data_hash)
    LAST_BG_URL=$(get_background_url)
    LAST_CARDS_HASH=$(get_cards_order_hash)
}

# 检测数据是否有变化
check_data_changed() {
    local current_hash=$(get_data_hash)
    local current_bg=$(get_background_url)
    local current_cards=$(get_cards_order_hash)
    
    local changed=0
    local change_reasons=""
    
    # 检测整体数据变化
    if [ "$current_hash" != "$LAST_DATA_HASH" ]; then
        changed=1
        change_reasons="数据变化"
    fi
    
    # 检测壁纸链接变化
    if [ "$current_bg" != "$LAST_BG_URL" ]; then
        changed=1
        if [ -n "$change_reasons" ]; then
            change_reasons="$change_reasons + 壁纸更新"
        else
            change_reasons="壁纸更新"
        fi
        echo "[同步] 检测到壁纸链接变化:"
        echo "       旧: $LAST_BG_URL"
        echo "       新: $current_bg"
    fi
    
    # 检测卡片排序变化
    if [ "$current_cards" != "$LAST_CARDS_HASH" ]; then
        changed=1
        if [ -n "$change_reasons" ]; then
            change_reasons="$change_reasons + 卡片排序"
        else
            change_reasons="卡片排序"
        fi
        echo "[同步] 检测到卡片排序变化"
    fi
    
    if [ $changed -eq 1 ]; then
        echo "[同步] 变化类型: $change_reasons"
    fi
    
    return $changed
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
             echo "[同步] 检测到云端已有备份，执行初始恢复..."
             cd ..
             restore_db_from_sql
             cd "$BACKUP_DIR" || exit
        fi
        cd ..
    fi
    fix_permissions
    
    # 初始化数据指纹
    update_data_fingerprints
    echo "[同步] 初始数据指纹已记录"
}

# 监控循环
monitor() {
    echo "[同步] 启动后台监控 (当前模式: SQL文本双向同步 + 壁纸/排序检测)..."

    while true; do
        sleep "$CHECK_INTERVAL"
        
        # 阶段一：下行同步 (Cloud -> Local)
        cd "$BACKUP_DIR" || exit
        git fetch origin main -q
        
        if [ $(git rev-list HEAD..origin/main --count) -gt 0 ]; then
            echo "[同步] 发现云端数据有更新，正在拉取..."
            git pull origin main --rebase -q
            if git diff HEAD@{1} HEAD --name-only | grep -q "$SQL_FILE"; then
                cd ..
                restore_db_from_sql
                cd "$BACKUP_DIR" || exit
            fi
        fi
        cd .. 

        # 阶段二：上行同步 (Local -> Cloud) - 使用数据指纹检测
        if [ ! -f "$SOURCE_FILE" ]; then continue; fi
        
        # 使用数据内容哈希检测变化，而非仅依赖文件时间戳
        if check_data_changed; then
            sleep 2
            
            echo "[同步] 检测到本地数据变化，准备备份..."
            export_db_to_sql
            cd "$BACKUP_DIR" || exit
            
            git add "$SQL_FILE"
            if [ -n "$(git status --porcelain)" ]; then
                echo "[同步] 正在生成本次更新的数据快照..."
                git commit -q -m "数据更新: $(date '+%Y-%m-%d %H:%M:%S')"
                
                echo "[同步] 正在将数据安全推送到云端..."
                if git push origin main -q; then
                    echo "[同步] 🎉 推送成功！云端数据已是最新状态。"
                else
                    echo "[警告] ⚠️ 推送失败，请稍后检查日志。"
                fi
            fi
            
            # 更新数据指纹缓存
            update_data_fingerprints
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
