const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const config = require('../config');
const r2 = require('./r2sync');
const db = require('../db');
const router = express.Router();

const UPLOAD_DIR = config.storage.uploadDir;
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    if (req.query.type === 'wallpaper') cb(null, `bg_admin_wallpaper${ext}`);
    else cb(null, `upload_${Date.now()}_${Math.floor(Math.random()*1000)}${ext}`);
  }
});
const upload = multer({ storage });

// 辅助: 更新 settings 表
function upsertSetting(key, value) {
  db.get("SELECT * FROM settings WHERE key=?", [key], (err, row) => {
    if (row) db.run("UPDATE settings SET value=? WHERE key=?", [value, key]);
    else db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, value]);
  });
}

// =================================================================
// 接口 1: 手动上传本地文件
// 本地存储 -> 写入/覆盖 R2 -> 返回 R2 公网 URL
// 壁纸上传时自动更新数据库 background 字段
// =================================================================
router.post('/', upload.any(), async (req, res) => {
  try {
    const file = req.files && req.files.length > 0 ? req.files[0] : null;
    if (!file) return res.status(400).json({ error: '没有获取到文件' });

    const localPath = path.join(UPLOAD_DIR, file.filename);
    const r2Key = `uploads/${file.filename}`;
    const type = file.mimetype.includes('video') ? 'video' : 'image';

    // 写入/覆盖 R2
    const r2Url = await r2.uploadToR2(localPath, r2Key, file.mimetype);

    // 确定返回给前端的 URL: R2 启用时用公网地址，否则用本地路径
    const finalUrl = r2Url || `/uploads/${file.filename}`;

    // 壁纸上传时自动同步更新数据库
    if (req.query.type === 'wallpaper') {
      upsertSetting('background', finalUrl);
      upsertSetting('bg_type', type);
      console.log(`[R2] 壁纸已更新并同步到数据库: ${finalUrl}`);
    }

    res.json({
      filename: file.originalname,
      url: finalUrl,
      r2_url: r2Url || null,
      r2_synced: !!r2Url,
      type
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ error: '上传失败: ' + error.message });
  }
});

// =================================================================
// 接口 2: 下载网络资源并缓存到本地 + R2
// 返回 R2 公网 URL
// =================================================================
router.post('/fetch-and-cache', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: '缺少链接参数' });
  try {
    const response = await new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { timeout: 15000 }, (resp) => {
        if (resp.statusCode !== 200) { reject(new Error(`HTTP ${resp.statusCode}`)); return; }
        const chunks = [];
        resp.on('data', chunk => chunks.push(chunk));
        resp.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: resp.headers['content-type']||'application/octet-stream' }));
        resp.on('error', reject);
      }).on('error', reject);
    });
    const contentType = response.contentType;
    const type = contentType.includes('video') ? 'video' : 'image';
    const urlHash = crypto.createHash('md5').update(url).digest('hex');
    let ext = '.bin';
    try { const e = path.extname(new URL(url).pathname); if(e&&e.length<=6)ext=e; }
    catch(e) { const m={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','video/mp4':'.mp4','video/webm':'.webm'}; ext=m[contentType]||'.bin'; }
    const fileName = `bg_cached_${urlHash}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, response.buffer);

    const r2Key = `uploads/${fileName}`;
    const r2Url = await r2.uploadToR2(filePath, r2Key, contentType);
    const finalUrl = r2Url || `/uploads/${fileName}`;

    res.json({ success: true, url: finalUrl, r2_url: r2Url||null, r2_synced: !!r2Url, type, recommended_type: type });
  } catch (error) {
    console.error('缓存网络资源失败:', error);
    res.status(500).json({ error: '缓存失败: ' + error.message });
  }
});

module.exports = router;
