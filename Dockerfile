# =====================================================
# 文件: Dockerfile
# 说明: 整体替换此文件
# 改动: 移除独立的 uploads 目录，uploads 改为 database/uploads 子目录
# =====================================================

# --- 第一阶段：前端构建 ---
FROM node:20-alpine3.20 AS frontend-builder

WORKDIR /app
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# --- 第二阶段：生产环境 ---
FROM node:20-alpine3.20 AS production

RUN apk add --no-cache \
    sqlite \
    git \
    bash \
    sed \
    tzdata \
    && rm -rf /var/cache/apk/*

ENV TZ=Asia/Shanghai

WORKDIR /app
# [改动] uploads 不再是独立目录，放到 database 下面
RUN mkdir -p database/uploads web/dist

COPY package*.json ./
RUN npm install --production

COPY app.js config.js db.js ./
COPY routes/ ./routes/
COPY --from=frontend-builder /app/dist ./web/dist

COPY backup.sh entrypoint.sh ./

RUN sed -i 's/\r$//' backup.sh entrypoint.sh && \
    chmod +x backup.sh entrypoint.sh

# [改动] 如果原 uploads/ 根目录下有默认文件(如 default-favicon.png)，
# 复制到新路径。如果你的仓库里 uploads/ 下有文件就取消下面这行的注释：
# COPY uploads/ ./database/uploads/

ENV NODE_ENV=production
EXPOSE 3000/tcp

ENTRYPOINT ["./entrypoint.sh"]
