<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.4-42b883?logo=vuedotjs&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/github/license/kystor/navtest" alt="License" />
</p>

<h1 align="center">🧭 Nav-Item</h1>
<p align="center"><b>一个现代化的个人导航站，前后端分离，开箱即用</b></p>
<p align="center">卡片式导航 · 聚合搜索 · 动态壁纸 · 后台管理 · Docker 一键部署</p>

---

## 📸 预览

| 首页导航 | 后台管理 |
|:---:|:---:|
| 卡片式布局 + 毛玻璃搜索栏 + 动态壁纸 | 栏目 / 卡片 / 广告 / 友链 / 系统设置 |

> 📺 视频教程：[YouTube](https://www.youtube.com/watch?v=AEXj3VR2LMY)

---

## ✨ 功能特性

### 🏠 前端

| 功能 | 说明 |
|:---|:---|
| **卡片导航** | 主菜单 + 子菜单分类，卡片式布局，支持拖拽排序 |
| **聚合搜索** | Google / 百度 / Bing / GitHub / 站内搜索一键切换 |
| **动态壁纸** | 支持 `.mp4` `.webm` 视频壁纸 & 普通图片背景，后台可配置 |
| **个性化壁纸** | 访客可自定义壁纸（存储在本地浏览器，互不干扰） |
| **响应式设计** | 桌面端 & 移动端自适应布局 |
| **友情链接** | 弹窗展示友链，支持 Logo + 标题 |
| **广告位** | 支持左右两侧广告位展示 |

### 🔧 后台管理

| 功能 | 说明 |
|:---|:---|
| **栏目管理** | 主菜单 / 子菜单增删改查 |
| **卡片管理** | 导航卡片增删改查，支持自定义 Logo 上传 |
| **广告管理** | 广告位增删改查，支持左 / 右位置 |
| **友链管理** | 友情链接增删改查 |
| **系统设置** | 网站标题 + 背景壁纸全局配置 |
| **用户管理** | 管理员登录、修改密码、登录日志 |

### 🛡️ 技术特性

- **JWT 认证** — 安全的管理员身份验证
- **SQLite** — 轻量级数据库，零配置，无需额外服务
- **文件上传** — 支持自定义 Logo 图片上传
- **背景代理** — 后端自动缓存网络壁纸，加速加载
- **Git 自动备份** — Sidecar 模式双向同步数据库到 GitHub

---

## 🛠️ 技术栈

```
前端    Vue 3 + Vite + Vue Router + Axios + vuedraggable
后端    Node.js + Express + SQLite3
认证    JSON Web Token (JWT) + bcrypt
部署    Docker + Docker Compose
```

---

## 📁 项目结构

```
navtest/
├── app.js                  # 后端主入口
├── config.js               # 环境配置
├── db.js                   # SQLite 数据库初始化
├── package.json            # 后端依赖
├── Dockerfile              # 多阶段构建
├── docker-compose.yml      # 编排文件
├── entrypoint.sh           # 容器启动引导脚本
├── backup.sh               # Git 自动同步脚本
│
├── routes/                 # 后端 API 路由
│   ├── auth.js             # 登录认证
│   ├── authMiddleware.js   # JWT 中间件
│   ├── menu.js             # 菜单管理
│   ├── card.js             # 卡片管理
│   ├── ad.js               # 广告管理
│   ├── friend.js           # 友链管理
│   ├── user.js             # 用户管理
│   └── upload.js           # 文件上传
│
├── database/               # SQLite 数据库目录 (持久化挂载)
│   └── nav.db
├── uploads/                # 上传文件目录 (持久化挂载)
│   └── default-favicon.png
│
└── web/                    # 前端项目 (Vue 3 + Vite)
    ├── package.json
    ├── vite.config.mjs
    ├── index.html
    ├── public/
    │   ├── background.webp
    │   ├── default-favicon.png
    │   └── robots.txt
    └── src/
        ├── main.js         # Vue 入口
        ├── router.js       # 前端路由
        ├── api.js          # API 请求封装
        ├── App.vue         # 根组件
        ├── components/
        │   ├── MenuBar.vue     # 导航菜单栏
        │   └── CardGrid.vue    # 卡片网格
        └── views/
            ├── Home.vue        # 首页
            ├── Admin.vue       # 后台管理
            └── admin/
                ├── MenuManage.vue
                ├── CardManage.vue
                ├── AdManage.vue
                ├── FriendLinkManage.vue
                ├── SystemManage.vue
                └── UserManage.vue
```

---

## 🚀 快速开始

### 方式一：源码部署

#### 1. 克隆项目

```bash
git clone https://github.com/kystor/navtest.git
cd navtest
```

#### 2. 安装后端依赖

```bash
npm install
```

#### 3. 构建前端

```bash
cd web
npm install
npm run build
cd ..
```

#### 4. 启动服务

```bash
npm start
```

#### 5. 访问

| 地址 | 说明 |
|:---|:---|
| `http://localhost:3000` | 前端首页 |
| `http://localhost:3000/admin` | 后台管理 |

> ⚠️ 默认管理员账号：`admin` / `123456`，**上线前务必修改！**

---

### 方式二：Docker 部署（推荐）

#### 快速启动

```bash
docker run -d \
  --name nav-item \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  -e SITE_TITLE=我的导航 \
  ghcr.io/kystor/navtest:latest
```

#### 可用镜像

```
ghcr.io/kystor/navtest:latest
eooce/nav-item
```

---

### 方式三：Docker Compose 部署

创建 `docker-compose.yml`：

```yaml
version: "3"

services:
  nav-item:
    image: ghcr.io/kystor/navtest:latest
    container_name: nav-item
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your_secure_password
      - SITE_TITLE=我的导航
    volumes:
      - ./database:/app/database
      - ./uploads:/app/uploads
    restart: unless-stopped
```

启动：

```bash
docker compose up -d
```

---

### 方式四：Serv00 / CT8 / Hostuno 一键安装

```bash
bash <(curl -Ls https://github.com/eooce/nav-item/releases/download/ct8-and-serv00/install.sh)
```

> 环境变量放在脚本前面，用空格隔开。默认后台账号：`admin` / `123456`。

---

## ⚙️ 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|:---|:---|:---|
| `PORT` | `3000` | 服务监听端口 |
| `ADMIN_USERNAME` | `admin` | 后台管理员用户名 |
| `ADMIN_PASSWORD` | `123456` | 后台管理员密码 |
| `SITE_TITLE` | `我的导航` | 网站标题（浏览器标签页显示） |
| `BACKGROUND` | — | 默认背景图 URL（支持图片和视频链接） |
| `JWT_SECRET` | 内置默认值 | JWT 签名密钥（生产环境建议自定义） |

> 💡 网站标题和背景壁纸也可以在后台管理 → **系统设置** 中在线修改，优先级高于环境变量。

### 数据持久化

使用 Docker 部署时，**务必挂载以下目录**，否则容器重建后数据丢失：

| 宿主机路径 | 容器路径 | 说明 |
|:---|:---|:---|
| `./database` | `/app/database` | SQLite 数据库文件 |
| `./uploads` | `/app/uploads` | 上传的 Logo 和缓存的壁纸文件 |

---

## 🔄 自动 Git 备份（Sidecar 模式）

Nav-Item 内置了一个轻量的 Shell 脚本，可以将数据库文件自动同步到 GitHub 仓库，实现数据备份与多端同步。

### 核心特性

- ⚡ **双向同步** — 本地变化自动 push，启动时自动 pull 远端更新
- 🛡️ **SQLite 保护** — 自动修复权限，减少容器卷中的锁问题
- ⏳ **防抖机制** — 等待文件写入完成后再触发同步
- 🐳 **容器友好** — 作为 Sidecar 容器运行，不影响主应用

### 环境变量

**必填（二选一）：**

| 方案 | 变量 | 示例 |
|:---|:---|:---|
| **A（推荐）** | `BACKUP_REPO_URL` | `https://github.com/username/my-backup.git` |
| | `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxx` |
| **B（拆分）** | `GITHUB_USER` | `kystor` |
| | `GITHUB_REPO` | `nav-backup` |
| | `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxx` |

**选填：**

| 变量 | 默认值 | 说明 |
|:---|:---|:---|
| `DB_PATH` | `/app/database/nav.db` | 监控的数据库文件路径 |
| `BACKUP_INTERVAL` | `10` | 轮询间隔（秒） |
| `GITHUB_EMAIL` | `bot@nav.backup` | Git 提交邮箱 |
| `GITHUB_NAME` | `NavBackupBot` | Git 提交用户名 |

### Docker Compose Sidecar 示例

```yaml
version: "3"

services:
  # 主应用
  nav-app:
    image: ghcr.io/kystor/navtest:latest
    container_name: nav-app
    ports:
      - "3000:3000"
    environment:
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your_secure_password
    volumes:
      - ./data:/app/database
      - ./uploads:/app/uploads
    restart: always

  # 备份服务（Sidecar）
  backup-service:
    image: alpine/git:latest
    container_name: nav-sync
    volumes:
      - ./data:/app/database
      - ./backup.sh:/app/backup.sh
    entrypoint: ["/bin/sh", "/app/backup.sh"]
    environment:
      - GITHUB_TOKEN=ghp_your_token_here
      - BACKUP_REPO_URL=https://github.com/yourname/your-backup-repo.git
      - DB_PATH=/app/database/nav.db
      - BACKUP_INTERVAL=10
    restart: always
```

---

## 🔒 安全建议

1. **修改默认密码** — 上线第一件事，不要使用 `admin / 123456`
2. **启用 HTTPS** — 使用 Nginx / Caddy 反向代理，配置 SSL 证书
3. **限制后台访问** — 对 `/admin` 路径做 IP 白名单或额外认证
4. **保护敏感信息** — `GITHUB_TOKEN`、`JWT_SECRET` 等使用环境变量或密钥管理工具，不要提交到代码仓库
5. **备份仓库私有化** — 数据备份仓库建议设为 Private，防止数据泄露

---

## 🤝 贡献指南

欢迎任何形式的贡献！

```bash
# 1. Fork 本仓库
# 2. 创建特性分支
git checkout -b feature/your-feature

# 3. 提交更改
git commit -m "feat: add your feature"

# 4. 推送分支
git push origin feature/your-feature

# 5. 发起 Pull Request
```

### 提交规范

| 前缀 | 说明 |
|:---|:---|
| `feat:` | 新功能 |
| `fix:` | Bug 修复 |
| `docs:` | 文档更新 |
| `style:` | 样式调整（不影响逻辑） |
| `refactor:` | 代码重构 |
| `perf:` | 性能优化 |

---

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 开源许可证。

---

## 👤 作者

**eooce** — [GitHub](https://github.com/eooce)

---

## 🙏 致谢

感谢所有为该项目做出贡献的开发者！

---

<p align="center">
  ⭐ 如果这个项目对你有帮助，欢迎点个 Star 支持一下！
</p>
