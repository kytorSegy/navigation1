
# Nav-item - 个人导航站（Nav-item）

> 教程（YouTube）：https://www.youtube.com/watch?v=AEXj3VR2LMY

一个现代化的个人导航站项目，提供简洁美观的导航界面与强大的后台管理系统，帮助你快速访问常用网站与工具。  
前后端分离架构：**Vue 3 + Node.js + SQLite**。

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
  - [源码部署](#源码部署)
  - [Docker 部署](#docker-部署)
  - [docker-compose 部署](#docker-compose-部署)
- [配置说明](#配置说明)
  - [基础环境变量](#基础环境变量)
  - [数据持久化](#数据持久化)
- [Serv00 | CT8 | Hostuno 一键安装脚本](#serv00--ct8--hostuno-一键安装脚本)
- [自动 Git 双向同步 & 备份脚本（Sidecar 模式）](#自动-git-双向同步--备份脚本sidecar-模式)
  - [核心特性](#核心特性)
  - [前置准备](#前置准备)
  - [环境变量](#环境变量)
  - [docker-compose Sidecar 示例](#docker-compose-sidecar-示例)
- [安全建议](#安全建议)
- [贡献指南](#贡献指南)
- [许可证](#许可证)
- [作者](#作者)
- [致谢](#致谢)

---

## 功能特性

### 前端功能
- 🏠 **首页导航**：卡片式导航界面，简洁美观
- 🔍 **聚合搜索**：支持 Google / 百度 / Bing / GitHub / 站内搜索
- 📱 **响应式设计**：桌面端与移动端自适应
- 🎨 **现代化 UI**：渐变背景 + 毛玻璃效果
- 🔗 **友情链接**：支持友链展示
- 📢 **广告位**：支持左右两侧广告位展示

### 后台管理
- 👤 **用户管理**：管理员登录、用户信息管理
- 📋 **栏目管理**：主菜单/子菜单增删改查
- 🃏 **卡片管理**：导航卡片增删改查
- 📢 **广告管理**：广告位增删改查
- 🔗 **友链管理**：友情链接增删改查
- 📊 **数据统计**：登录时间、IP 等统计信息

### 技术特性
- 🔐 **JWT 认证**：安全的用户认证机制
- 🗄️ **SQLite 数据库**：轻量级，无需额外服务
- 📤 **文件上传**：支持图片上传
- 🔎 **搜索能力**：站内搜索 + 外部搜索
- 📱 **移动端体验**：适配触控与小屏布局

---

## 技术栈

- **前端**：Vue 3 + Vite
- **后端**：Node.js
- **数据库**：SQLite

---

## 项目结构

```text
nav-item/
├── app.js                 # 后端主入口文件
├── config.js              # 配置文件
├── db.js                  # 数据库初始化
├── package.json           # 后端依赖配置
├── database/              # 数据库文件目录（建议持久化挂载）
│   └── nav.db             # SQLite 数据库文件
├── routes/                # 后端路由
│   ├── auth.js            # 认证相关
│   ├── menu.js            # 菜单管理
│   ├── card.js            # 卡片管理
│   ├── ad.js              # 广告管理
│   ├── friend.js          # 友链管理
│   ├── user.js            # 用户管理
│   └── upload.js          # 上传管理
├── uploads/               # 上传目录（建议持久化挂载）
│   └── default-favicon.png
├── web/                   # 前端项目（Vue + Vite）
│   ├── package.json       # 前端依赖
│   ├── vite.config.mjs    # Vite 配置
│   ├── index.html         # HTML 入口
│   ├── public/            # 静态资源
│   │   ├── background.webp
│   │   ├── default-favicon.png
│   │   └── robots.txt
│   └── src/               # 前端源码
│       ├── main.js        # Vue 入口
│       ├── router.js      # 路由
│       ├── api.js         # API 封装
│       ├── App.vue        # 根组件
│       ├── components/    # 公共组件
│       │   ├── MenuBar.vue
│       │   └── CardGrid.vue
│       └── views/         # 页面
│           ├── Home.vue
│           ├── Admin.vue
│           └── admin/
│               ├── MenuManage.vue
│               ├── CardManage.vue
│               ├── AdManage.vue
│               ├── FriendLinkManage.vue
│               └── UserManage.vue
├── Dockerfile             # Docker 构建文件
└── docker-compose.yml     # 可选：编排文件
````

---

## 快速开始

### 源码部署

#### 1) 克隆项目

```bash
git clone https://github.com/kystor/navtest.git
cd nav-item
```

#### 2) 安装后端依赖

```bash
npm install
```

#### 3) 构建前端

```bash
cd web
npm install
npm run build
```

#### 4) 启动服务

```bash
cd ..
npm start
```

#### 5) 访问地址

* 前端：`http://localhost:3000`
* 后台：`http://localhost:3000/admin`
* 默认管理员：`admin / 123456`（上线务必修改）

---

## Docker 部署

### 1) Docker 快速部署（推荐）

> 强烈建议挂载 `database/` 与 `uploads/`，避免容器重建丢数据。

```bash
docker run -d \
  --name navtest \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  -e NODE_ENV=production \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=123456 \
  ghcr.io/kystor/navtest:latest
```

### 2) 可用镜像地址

```text
eooce/nav-item
ghcr.io/kystor/navtest:latest
```

---

## docker-compose 部署

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
      - ADMIN_PASSWORD=123456
      # 可选：站点标题
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

## 配置说明

### 基础环境变量

| 变量名              | 默认值                   | 描述            |
| :--------------- | :-------------------- | :------------ |
| `PORT`           | `3000`                | 服务端口          |
| `ADMIN_USERNAME` | `admin`               | 后台管理员用户名      |
| `ADMIN_PASSWORD` | `123456`              | 后台管理员密码       |
| `SITE_TITLE`     | `我的导航`                | 网页名称/站点标题     |
| `background`     | `public 文件夹中的图片或图片链接` | 网页背景图（支持 URL） |

> 注意：`background` 的具体读取方式取决于你项目内实现（例如前端读取配置或后端注入）。如不生效，请检查 `config.js`/前端配置逻辑。

### 数据持久化

使用 Docker 部署时建议挂载：

* `./database` → `/app/database`（SQLite 数据库持久化）
* `./uploads` → `/app/uploads`（上传文件持久化）

---

## Serv00 | CT8 | Hostuno 一键安装脚本

* 说明：环境变量放在脚本前面，使用空格隔开，跟脚本一起运行
* 默认后台用户名/密码：`admin / 123456`
* `DOMAIN`：自定义站点域名

```bash
bash <(curl -Ls https://github.com/eooce/nav-item/releases/download/ct8-and-serv00/install.sh)
```

---

# 自动 Git 双向同步 & 备份脚本（Sidecar 模式）

这是一个专为 **容器化环境** 设计的轻量 Shell 脚本。它能将本地文件变化推送到 GitHub，并可定期拉取远端更新覆盖本地。

同时针对 **SQLite** 做了额外优化，尽量避免 Docker 卷里常见的权限与锁问题（例如 `Read-only database`）。

---

## 核心特性

* **⚡️ 双向同步**

  * **上行**：监控本地文件变化 → 自动 commit & push
  * **下行**：启动或轮询时检查远端 → 自动 pull 并覆盖本地（适合多地部署）
* **🛡️ SQLite 专属保护**

  * 自动 `chmod` 修复目录/文件权限
  * 用 `cat > file` 写入方式减少 inode 变化带来的锁风险
* **⏳ 防抖机制**

  * 等待文件写入完成后再触发同步
* **🐳 容器友好**

  * 支持 `BACKUP_REPO_URL` 完整链接配置

---

## 前置准备

1. GitHub 账号
2. 建议准备一个 **私有仓库**（用于存放备份数据）
3. 创建 GitHub Personal Access Token（PAT）

   * 权限建议：`repo`（如果是私有仓库则必须）

---

## 环境变量

### 🔴 必填项（二选一）

**方案 A（推荐）：完整 URL**

| 变量名               | 示例值                                       | 描述               |
| :---------------- | :---------------------------------------- | :--------------- |
| `BACKUP_REPO_URL` | `https://github.com/username/my-repo.git` | 完整仓库地址           |
| `GITHUB_TOKEN`    | `ghp_xxxxxxxxxxxx`                        | GitHub Token（必须） |

**方案 B：拆分配置**

| 变量名            | 示例值                | 描述               |
| :------------- | :----------------- | :--------------- |
| `GITHUB_USER`  | `kystor`           | GitHub 用户名       |
| `GITHUB_REPO`  | `nav-backup`       | 仓库名称             |
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxx` | GitHub Token（必须） |

### 🟢 选填项（有默认值）

| 变量名               | 默认值                    | 描述         |
| :---------------- | :--------------------- | :--------- |
| `DB_PATH`         | `/app/database/nav.db` | 监控的源文件绝对路径 |
| `BACKUP_INTERVAL` | `10`                   | 轮询频率（秒）    |
| `GITHUB_EMAIL`    | `bot@nav.backup`       | Git 提交邮箱   |
| `GITHUB_NAME`     | `NavBackupBot`         | Git 提交用户名  |

---

## docker-compose Sidecar 示例

将备份脚本作为“边车（Sidecar）”容器运行，与主应用共享同一个数据卷。

```yaml
version: "3"

services:
  # 1) 主应用
  nav-app:
    image: ghcr.io/kystor/navtest:latest
    container_name: nav-app
    restart: always
    volumes:
      - ./data:/app/database

  # 2) 备份与同步服务（Sidecar）
  backup-service:
    image: alpine/git:latest
    container_name: nav-sync
    restart: always
    volumes:
      - ./data:/app/database
      - ./backup.sh:/app/backup.sh
    entrypoint: ["/bin/sh", "/app/backup.sh"]
    environment:
      - GITHUB_TOKEN=ghp_你的Token写在这里
      - BACKUP_REPO_URL=https://github.com/yourname/your-repo.git
      - DB_PATH=/app/database/nav.db
      - GITHUB_EMAIL=my@email.com
      - GITHUB_NAME=NavBackupBot
      - BACKUP_INTERVAL=10
```

---

## 安全建议

1. **修改默认密码** — 上线第一件事，不要使用 `admin / 123456`
2. **启用 HTTPS** — 使用 Nginx / Caddy 反向代理，配置 SSL 证书
3. **限制后台访问** — 对 `/admin` 路径做 IP 白名单或额外认证
4. **保护敏感信息** — `GITHUB_TOKEN`、`JWT_SECRET` 等使用环境变量，不要提交到代码仓库
5. **备份仓库私有化** — 数据备份仓库建议设为 Private，防止数据泄露。

---

## 贡献指南

1. Fork 本仓库
2. 新建分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m "Add some AmazingFeature"`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 发起 Pull Request

---

## 许可证

本项目采用 **MIT License**。详情见 [LICENSE](LICENSE)。

---

## 作者

**eooce** - [https://github.com/eooce](https://github.com/eooce)

---

## 致谢

感谢所有为该项目做出贡献的开发者！

---

⭐ 如果这个项目对你有帮助，欢迎点个 Star！


