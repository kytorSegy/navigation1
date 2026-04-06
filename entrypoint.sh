#!/bin/bash
# -----------------------------------------------------------------------------
# entrypoint.sh - 容器启动引导 (纯中文日志 + 依赖自检版)
# -----------------------------------------------------------------------------

# 运行前检测所需依赖 (静默补全)
for cmd in node; do
    if ! command -v $cmd >/dev/null 2>&1; then
        if command -v apk >/dev/null 2>&1; then apk add --quiet --no-cache nodejs
        elif command -v apt-get >/dev/null 2>&1; then apt-get update -qq && apt-get install -y -qq nodejs
        fi
    fi
done

echo "[引导] 正在初始化系统环境..."

# 1. 确保权限
chmod +x ./backup.sh

# 2. 执行【启动前】同步（前台运行，确保数据先到位）
if [ -n "$GITHUB_TOKEN" ]; then
    echo "[引导] 正在进行初始数据同步..."
    ./backup.sh --init
else
    echo "[引导] 跳过同步，直接启动。"
fi

# 3. 启动【后台】持续监控任务（不会导致主程序重启）
if [ -n "$GITHUB_TOKEN" ]; then
    echo "[引导] 开启后台同步服务..."
    ./backup.sh --monitor &
fi

# 4. 启动主程序（使用 exec 让 Node.js 成为 1 号进程）
echo "[引导] 启动 Node.js 服务..."
exec node app.js
