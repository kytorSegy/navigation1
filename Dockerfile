# -----------------------------------------------------------------------------
# Dockerfile - (移除 nodemon 的生产级稳定版)
# -----------------------------------------------------------------------------
# --- 第一阶段：前端构建 ---
FROM node:20-alpine3.20 AS frontend-builder

WORKDIR /app
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# --- 第二阶段：生产环境 ---
FROM node:20-alpine3.20 AS production

# [关键修改] 安装基础依赖，删除了 nodemon 的安装，保持镜像纯净
RUN apk add --no-cache \
    sqlite \
    git \
    bash \
    sed \
    tzdata \
    && rm -rf /var/cache/apk/*

# 设置时区
ENV TZ=Asia/Shanghai

WORKDIR /app
# 提前创建必要的目录
RUN mkdir -p uploads database web/dist

# 复制后端依赖描述文件
COPY package*.json ./
# [优化] 只安装生产环境需要的依赖，减小镜像体积
RUN npm install --production

# 复制后端核心代码
COPY app.js config.js db.js ./
COPY routes/ ./routes/
# 从第一阶段提取构建好的前端页面
COPY --from=frontend-builder /app/dist ./web/dist

# 复制引导和同步脚本
COPY backup.sh entrypoint.sh ./

# 权限处理 (处理 Windows 换行符并赋予执行权限)
RUN sed -i 's/\r$//' backup.sh entrypoint.sh && \
    chmod +x backup.sh entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000/tcp

# 启动入口指向我们的引导脚本
ENTRYPOINT ["./entrypoint.sh"]
