# ==========================================
# 第一阶段：前端构建阶段 (frontend-builder)
# ==========================================
FROM node:20-alpine3.20 AS frontend-builder
WORKDIR /app
COPY web/package*.json ./

# 【修改点 1】: 安装前端依赖
# 添加了 --no-cache 参数，并且使用 npm cache clean --force 强制清理 npm 留在系统里的缓存垃圾
# 这样可以确保拉取最新依赖，并释放不必要的空间
RUN npm install --no-cache && npm cache clean --force

COPY web/ ./
RUN npm run build

# ==========================================
# 第二阶段：生产运行阶段 (production)
# ==========================================
FROM node:20-alpine3.20 AS production

# 这里你原本已经写得很好了，apk add 已经带了 --no-cache
RUN apk add --no-cache sqlite git bash sed tzdata && rm -rf /var/cache/apk/*
ENV TZ=Asia/Shanghai
WORKDIR /app

# 创建所需目录
RUN mkdir -p database/uploads web/dist

# 拷贝后端的依赖配置文件
COPY package*.json ./

# 【修改点 2】: 安装后端生产依赖
# 同样加上了 --no-cache 参数，以及清理缓存的命令
# 这一步非常关键，因为它直接决定了你最终上传到服务器的镜像有多大
RUN npm install --production --no-cache && npm cache clean --force

# 拷贝后端源代码文件
COPY app.js config.js db.js ./
COPY routes/ ./routes/

# 从第一阶段把打包好的前端网页文件拿过来
COPY --from=frontend-builder /app/dist ./web/dist

# 拷贝启动脚本并赋予执行权限
COPY backup.sh entrypoint.sh ./
RUN sed -i 's/\r$//' backup.sh entrypoint.sh && chmod +x backup.sh entrypoint.sh

# 设置环境变量为生产模式，并暴露 3000 端口
ENV NODE_ENV=production
EXPOSE 3000/tcp

# 设置容器启动时默认执行的命令
ENTRYPOINT ["./entrypoint.sh"]
