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

  // 统一存储配置
  storage: {
    uploadDir: process.env.UPLOAD_DIR || '/app/database/uploads',
    dbPath: process.env.DB_PATH || '/app/database/nav.db'
  },

  // Cloudflare R2 配置
  r2: {
    accountId:       process.env.R2_ACCOUNT_ID       || '',
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName:      process.env.R2_BUCKET_NAME       || '',
    publicDomain:    process.env.R2_PUBLIC_DOMAIN     || ''
  },

  server: {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'nav-item-jwt-secret-2024-secure-key'
  }
};
