#!/bin/bash
for cmd in node; do
    if ! command -v $cmd >/dev/null 2>&1; then
        if command -v apk >/dev/null 2>&1; then apk add --quiet --no-cache nodejs
        elif command -v apt-get >/dev/null 2>&1; then apt-get update -qq && apt-get install -y -qq nodejs
        fi
    fi
done
echo "[引导] 正在初始化系统环境..."
mkdir -p /app/database/uploads
chmod -R 777 /app/database
if [ -d "/app/uploads" ] && [ "$(ls -A /app/uploads 2>/dev/null)" ]; then
    echo "[引导] 发现旧版上传目录，正在迁移..."
    cp -rn /app/uploads/* /app/database/uploads/ 2>/dev/null || true
    echo "[引导] 迁移完成。"
fi
chmod +x ./backup.sh
if [ -n "$GITHUB_TOKEN" ]; then
    echo "[引导] 正在进行初始数据同步..."
    ./backup.sh --init
else
    echo "[引导] 跳过同步，直接启动。"
fi
if [ -n "$GITHUB_TOKEN" ]; then
    echo "[引导] 开启后台同步服务..."
    ./backup.sh --monitor &
fi
echo "[引导] 启动 Node.js 服务..."
exec node app.js
