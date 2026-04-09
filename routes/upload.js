const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const config = require('../config');
const router = express.Router();

// 【核心改动】统一存储目录
const UPLOAD_DIR = config.storage.uploadDir; // /app/database/uploads

// 确保目录存在
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 【改动】改为磁盘存储，直接存到统一目录
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    // 壁纸上传使用固定文件名，实现覆盖替换
    if (req.query.type === 'wallpaper') {
      cb(null, `bg_admin_wallpaper${ext}`);
    } else {
      // 普通上传用时间戳 + 随机数
      cb(null, `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
    }
  }
});
const upload = multer({ storage });

// 【可选】R2 双写功能（配置了 R2 环境变量时自动启用）
let s3 = null;
try {
  if (config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey) {
    const { S3Client } = require('@aws-sdk/client-s3');
    s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
    console.log('[R2] Cloudflare R2 双写已启用');
  }
} catch (e) {
  console.log('[R2] R2 SDK 未安装或配置不完整，仅使用本地存储');
}

async function syncToR2(filePath, key, mimeType) {
  if (!s3 || !config.r2.bucketName) return null;
  try {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const buffer = fs.readFileSync(filePath);
    await s3.send(new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType
    }));
    let domain = config.r2.publicDomain || '';
    if (domain.endsWith('/')) domain = domain.slice(0, -1);
    return `${domain}/${key}`;
  } catch (e) {
    console.error('[R2] 同步失败:', e.message);
    return null;
  }
}

// =================================================================
// 接口 1：手动上传本地文件（图片/视频）
// 支持 ?type=wallpaper 参数，壁纸上传时使用固定文件名覆盖
// =================================================================
router.post('/', upload.any(), async (req, res) => {
  try {
    const file = req.files && req.files.length > 0 ? req.files[0] : null;
    if (!file) return res.status(400).json({ error: '没有获取到文件' });

    const localUrl = `/uploads/${file.filename}`;
    
    // 可选：同步到 R2
    const r2Url = await syncToR2(
      path.join(UPLOAD_DIR, file.filename),
      `uploads/${file.filename}`,
      file.mimetype
    );

    res.json({
      filename: file.originalname,
      url: localUrl,          // 本地访问路径
      r2_url: r2Url || null,  // R2 链接（可选）
      type: file.mimetype.includes('video') ? 'video' : 'image'
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ error: '上传失败: ' + error.message });
  }
});

// =================================================================
// 接口 2：下载网络资源并缓存到本地
// 【改动】移除“自动识别”按钮，但保留自动判断逻辑
// 更新时覆盖替换原文件（使用固定 hash 文件名）
// =================================================================
router.post('/fetch-and-cache', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: '缺少链接参数' });

  try {
    // 下载网络资源
    const response = await new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { timeout: 15000 }, (resp) => {
        if (resp.statusCode !== 200) {
          reject(new Error(`HTTP ${resp.statusCode}`));
          return;
        }
        const chunks = [];
        resp.on('data', chunk => chunks.push(chunk));
        resp.on('end', () => resolve({
          buffer: Buffer.concat(chunks),
          contentType: resp.headers['content-type'] || 'application/octet-stream'
        }));
        resp.on('error', reject);
      }).on('error', reject);
    });

    const contentType = response.contentType;
    
    // 【保留】自动判断资源类型（作为推荐，管理员拥有最终选择权）
    const type = contentType.includes('video') ? 'video' : 'image';
    
    // 使用 URL hash 作为文件名，相同 URL 会覆盖替换
    const urlHash = crypto.createHash('md5').update(url).digest('hex');
    let ext = '.bin';
    try {
      const extname = path.extname(new URL(url).pathname);
      if (extname && extname.length <= 6) ext = extname;
    } catch (e) {
      const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'video/mp4': '.mp4', 'video/webm': '.webm' };
      ext = extMap[contentType] || '.bin';
    }
    
    const fileName = `bg_cached_${urlHash}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // 写入本地（覆盖旧文件）
    fs.writeFileSync(filePath, response.buffer);
    
    const localUrl = `/uploads/${fileName}`;
    
    // 可选：同步到 R2
    await syncToR2(filePath, `uploads/${fileName}`, contentType);
    
    res.json({ success: true, url: localUrl, type, recommended_type: type });
  } catch (error) {
    console.error('缓存网络资源失败:', error);
    res.status(500).json({ error: '缓存网络资源失败，请确认链接可被服务器访问' });
  }
});

module.exports = router;
