#!/bin/bash
# -----------------------------------------------------------------------------
# backup.sh - SQL 文本同步脚本 (纯中文汇报版 + 进度提示)
# 支持: nav.db 数据库同步 + R2 壁纸链接变更同步
# 修复: 解决了暴力覆盖文件导致的 Node.js 500 报错问题，并优化了同步日志
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
# 定义数据库源文件路径和备份目录
SOURCE_FILE="${DB_PATH:-/app/database/nav.db}"
SOURCE_DIR=$(dirname "$SOURCE_FILE")
BACKUP_DIR="/app/nav-backup-repo"
SQL_FILE="nav_data.sql"
WALLPAPER_URL_FILE="wallpaper_url.txt"   # 壁纸链接单独追踪文件

# Git 环境变量配置
GITHUB_EMAIL="${GITHUB_EMAIL:-bot@nav.backup}"
GITHUB_NAME="${GITHUB_NAME:-NavBackupBot}"

# --- URL 解析：从仓库地址中提取用户名和仓库名 ---
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

# 安全检查：确保所有必要的 Git 信息都已提供
if [ -z "$GITHUB_TOKEN" ] || [ -z "$GITHUB_USER" ] || [ -z "$GITHUB_REPO" ]; then
    echo "[错误] 环境变量缺失，无法启动同步。"
    exit 1
fi

GIT_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
CHECK_INTERVAL="${BACKUP_INTERVAL:-30}"

# 辅助函数：权限修复 (防止由于权限不足导致的读写失败)
fix_permissions() {
    if [ -d "$SOURCE_DIR" ]; then chmod 777 "$SOURCE_DIR"; fi
    if [ -f "$SOURCE_FILE" ]; then chmod 666 "$SOURCE_FILE"; fi
}

# 核心功能 1: 导出 (DB -> SQL)
export_db_to_sql() {
    sqlite3 "$SOURCE_FILE" .dump > "$BACKUP_DIR/$SQL_FILE"
}

# 核心功能 2: 导出壁纸链接 (将数据库中的壁纸信息导出到 txt 文本)
export_wallpaper_url() {
    local bg_url
    bg_url=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null)
    local bg_type
    bg_type=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='bg_type';" 2>/dev/null)
    
    # 将获取到的壁纸链接和类型写入到专门的文件中
    echo "url=${bg_url}" > "$BACKUP_DIR/$WALLPAPER_URL_FILE"
    echo "type=${bg_type:-auto}" >> "$BACKUP_DIR/$WALLPAPER_URL_FILE"
}

# 核心功能 3: 还原 (SQL -> Live DB) - 【关键修复区域】
restore_db_from_sql() {
    echo "[数据库同步] 正在将云端 SQL 还原到本地数据库..."
    TEMP_DB="/tmp/nav_restore.db"
    
    # 清理之前可能残留的临时文件
    if [ -f "$TEMP_DB" ]; then rm "$TEMP_DB"; fi
    
    # 将云端的 SQL 文本先还原成一个临时的二进制数据库
    sqlite3 "$TEMP_DB" < "$BACKUP_DIR/$SQL_FILE"
    
    # 检查临时数据库是否成功生成并且有内容
    if [ -f "$TEMP_DB" ] && [ -s "$TEMP_DB" ]; then
        
        # 💡 [修复点] 使用 SQLite 自带的 .restore 指令进行热更新！
        # 这样不会破坏文件的底层结构，Node.js 也就不会报 500 错误了。
        sqlite3 "$SOURCE_FILE" ".restore '$TEMP_DB'"
        
        rm "$TEMP_DB" # 完事后把临时文件删掉，保持干净
        fix_permissions
        echo "[数据库同步] ✅ 数据库还原完成！系统已平滑热加载新数据。"
    else
        echo "[数据库同步] ❌ SQL 转换失败，跳过还原。"
    fi
}

# 核心功能 4: 还原壁纸链接 (wallpaper_url.txt -> DB)
restore_wallpaper_url() {
    if [ ! -f "$BACKUP_DIR/$WALLPAPER_URL_FILE" ]; then return; fi
    
    local cloud_url cloud_type
    # 从文本中提取云端保存的链接和类型
    cloud_url=$(grep '^url=' "$BACKUP_DIR/$WALLPAPER_URL_FILE" | cut -d'=' -f2-)
    cloud_type=$(grep '^type=' "$BACKUP_DIR/$WALLPAPER_URL_FILE" | cut -d'=' -f2-)
    
    if [ -z "$cloud_url" ]; then return; fi
    
    # 读取本地当前壁纸链接用来比对
    local local_url
    local_url=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null)
    
    if [ "$cloud_url" = "$local_url" ]; then
        echo "[壁纸链接同步] 壁纸链接未变化，跳过。"
        return
    fi
    
    echo "[壁纸链接同步] 检测到云端壁纸链接变更:"
    echo "[壁纸链接同步]   旧链接: ${local_url:-（空）}"
    echo "[壁纸链接同步]   新链接: $cloud_url"
    
    # 将新链接更新写入到本地的 SQLite 数据库中
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

# 初始化逻辑：只在容器刚启动时运行一次
init_repo() {
    git config --global --add safe.directory "$BACKUP_DIR"
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "[同步] 正在克隆云端仓库..."
        git clone -q "$GIT_URL" "$BACKUP_DIR" || exit 1
        cd "$BACKUP_DIR" || exit
        git config user.email "$GITHUB_EMAIL"
        git config user.name "$GITHUB_NAME"
        
        # 初始检查：如果云端已经有数据了，就先拉下来恢复
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

# 监控循环：后台无限死循环，每隔几十秒检查一次
monitor() {
    echo "[同步] 启动后台监控 (当前模式: SQL文本双向同步 + 壁纸链接同步)..."
    LAST_TIME=$(stat -c %Y "$SOURCE_FILE" 2>/dev/null || echo 0)
    # 记录上次壁纸链接，用于检测本地壁纸链接是否被用户手动修改了
    LAST_WALLPAPER_URL=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null || echo "")

    while true; do
        sleep "$CHECK_INTERVAL"
        
        # ============================
        # 阶段一：下行同步 (Cloud -> Local) - 拉取云端最新数据
        # ============================
        cd "$BACKUP_DIR" || exit
        # 使用 -q 让它安静检查
        git fetch origin main -q
        
        if [ $(git rev-list HEAD..origin/main --count) -gt 0 ]; then
            echo "[同步] 发现云端数据有更新，正在拉取..."
            git pull origin main --rebase -q
            
            # 💡 [新增变量] 作为一个状态开关，记住“数据库刚才到底有没有更新”
            DB_RESTORED=false
            
            # 检测 SQL 文件是否变化
            if git diff HEAD@{1} HEAD --name-only | grep -q "$SQL_FILE"; then
                echo "[数据库同步] ↓ 云端数据库有变更，正在还原..."
                cd ..
                restore_db_from_sql
                cd "$BACKUP_DIR" || exit
                LAST_TIME=$(stat -c %Y "$SOURCE_FILE")
                # 还原数据库后重新读取壁纸链接，以免误判
                LAST_WALLPAPER_URL=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null || echo "")
                
                # 数据库还原成功，把开关设为 true
                DB_RESTORED=true 
            fi
            
            # 检测壁纸链接文件是否变化
            if git diff HEAD@{1} HEAD --name-only | grep -q "$WALLPAPER_URL_FILE"; then
                
                # 💡 [逻辑优化] 检查刚才的开关。如果为 true，说明数据库已经把壁纸包含进去了，跳过操作。
                if [ "$DB_RESTORED" = true ]; then
                    echo "[壁纸链接同步] 数据库已包含最新壁纸数据，无需重复写入。"
                else
                    echo "[壁纸链接同步] ↓ 云端壁纸链接有变更，正在同步..."
                    cd ..
                    restore_wallpaper_url
                    cd "$BACKUP_DIR" || exit
                    LAST_TIME=$(stat -c %Y "$SOURCE_FILE")
                    LAST_WALLPAPER_URL=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null || echo "")
                fi
            fi
        fi
        cd .. 

        # ============================
        # 阶段二：上行同步 (Local -> Cloud) - 将本地数据推送到云端
        # ============================
        if [ ! -f "$SOURCE_FILE" ]; then continue; fi
        CURRENT_TIME=$(stat -c %Y "$SOURCE_FILE")
        
        # 检测本地壁纸链接是否变化 (独立于文件修改时间戳的判断)
        CURRENT_WALLPAPER_URL=$(sqlite3 "$SOURCE_FILE" "SELECT value FROM settings WHERE key='background';" 2>/dev/null || echo "")
        WALLPAPER_CHANGED=false
        if [ "$CURRENT_WALLPAPER_URL" != "$LAST_WALLPAPER_URL" ]; then
            WALLPAPER_CHANGED=true
        fi

        # 如果时间戳变了，或者壁纸变了，说明可能要备份了
        if [ "$CURRENT_TIME" != "$LAST_TIME" ] || [ "$WALLPAPER_CHANGED" = true ]; then
            sleep 2 # 稍微等两秒，确保数据写入完成
            
            # 先默默导出，交给 Git 去鉴定到底有没有真正的改动
            export_db_to_sql
            export_wallpaper_url
            
            cd "$BACKUP_DIR" || exit
            git add "$SQL_FILE" "$WALLPAPER_URL_FILE"
            
            # 让 Git 来判断文件内容是否真的变化了
            if [ -n "$(git status --porcelain)" ]; then
                
                # 只有这里确认了真有实质性变化，才开始打印提示日志 (解决刷屏问题)
                if [ "$CURRENT_TIME" != "$LAST_TIME" ]; then
                    echo "[数据库同步] ↑ 检测到本地数据库变化，准备备份..."
                fi
                if [ "$WALLPAPER_CHANGED" = true ]; then
                    echo "[壁纸链接同步] ↑ 检测到本地壁纸链接变化:"
                    echo "[壁纸链接同步]   旧链接: ${LAST_WALLPAPER_URL:-（空）}"
                    echo "[壁纸链接同步]   新链接: ${CURRENT_WALLPAPER_URL:-（空）}"
                fi

                # 根据改变的文件，生成有区分度的提交日志
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
                    if [ "$SQL_CHANGED" -gt 0 ]; then echo "[数据库同步] ✅ 数据库快照已同步到云端。"; fi
                    if [ "$WP_CHANGED" -gt 0 ]; then echo "[壁纸链接同步] ✅ 壁纸链接已同步到云端。"; fi
                else
                    echo "[警告] ⚠️ 推送失败，请稍后检查日志。"
                fi
            fi
            # 更新状态变量 (无论有没有实质变化，都刷新一下时间戳避免死循环)
            LAST_TIME=$(stat -c %Y "$SOURCE_FILE")
            LAST_WALLPAPER_URL="$CURRENT_WALLPAPER_URL"
            cd ..
        fi
    done
}

# 脚本入口点：根据传入的参数决定做什么
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
