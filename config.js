require('dotenv').config();

module.exports = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || '123456'
  },

  app: {
    title: process.env.SITE_TITLE || '我的导航',
    background: process.env.background || process.env.BACKGROUND || ''
  },

  // 【新增】统一存储配置
  storage: {
    // 所有上传文件统一存储到 /app/database/uploads
    uploadDir: process.env.UPLOAD_DIR || '/app/database/uploads',
    // 数据库路径
    dbPath: process.env.DB_PATH || '/app/database/nav.db'
  },

  // 【新增】Cloudflare R2 配置（可选，用于多容器同步）
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    publicDomain: process.env.R2_PUBLIC_DOMAIN || ''
  },

  server: {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'nav-item-jwt-secret-2024-secure-key'
  }
};
