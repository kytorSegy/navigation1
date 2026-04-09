const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const db = require('./db');
const authMiddleware = require('./routes/authMiddleware');

const menuRoutes = require('./routes/menu');
const cardRoutes = require('./routes/card');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const adRoutes = require('./routes/ad');
const friendRoutes = require('./routes/friend');
const userRoutes = require('./routes/user');
const parseRoutes = require('./routes/parse');
const compression = require('compression');

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// 【核心改动】统一存储路径
const UPLOAD_DIR = config.storage.uploadDir; // /app/database/uploads

app.use(cors());
app.use(express.json());
app.use(compression());

// 【核心改动】静态文件服务指向统一存储目录
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'web/dist'), { index: false }));

const sendIndexHtml = (res) => {
  const indexPath = path.join(__dirname, 'web/dist', 'index.html');
  fs.readFile(indexPath, 'utf8', (err, htmlData) => {
    if (err) return res.status(500).send('Server Error');
    db.get("SELECT value FROM settings WHERE key='title'", (dbErr, row) => {
      const siteTitle = (row && row.value) ? row.value : ((config.app && config.app.title) || process.env.SITE_TITLE || '我的导航');
      const renderedHtml = htmlData.replace('__SITE_TITLE__', siteTitle);
      res.send(renderedHtml);
    });
  });
};

app.get('/', (req, res) => sendIndexHtml(res));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !fs.existsSync(path.join(__dirname, 'web/dist', req.path))) {
    sendIndexHtml(res);
  } else {
    next();
  }
});

app.use('/api/menus', menuRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', authRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/parse-link', parseRoutes);

// =================================================================
// 【改动】网络壁纸代理与缓存 - 统一到 /app/database/uploads
// =================================================================
app.get('/api/background', (req, res) => {
  const bgUrl = req.query.url;

  if (!bgUrl || !bgUrl.startsWith('http')) {
    return res.status(404).send('未配置网络壁纸链接或链接无效');
  }

  // 【核心改动】缓存目录改为统一存储路径
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const urlHash = crypto.createHash('md5').update(bgUrl).digest('hex');
  let ext = '.jpg';
  try {
    const extname = path.extname(new URL(bgUrl).pathname);
    if (extname) ext = extname;
  } catch (e) {}
  
  const fileName = `bg_${urlHash}${ext}`;
  const cachePath = path.join(UPLOAD_DIR, fileName);

  if (fs.existsSync(cachePath)) {
    return res.redirect(`/uploads/${fileName}`);
  }

  const client = bgUrl.startsWith('https') ? https : http;
  client.get(bgUrl, (response) => {
    if (response.statusCode === 200) {
      const file = fs.createWriteStream(cachePath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        res.redirect(`/uploads/${fileName}`);
      });
    } else {
      res.redirect(bgUrl);
    }
  }).on('error', () => {
    res.redirect(bgUrl);
  });
});

// =================================================================
// 【新增】图标代理与缓存 - 网络图标首次使用时自动下载缓存
// =================================================================
app.get('/api/icon-proxy', (req, res) => {
  const iconUrl = req.query.url;
  if (!iconUrl || !iconUrl.startsWith('http')) {
    return res.status(400).send('无效的图标链接');
  }

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const urlHash = crypto.createHash('md5').update(iconUrl).digest('hex');
  let ext = '.png';
  try {
    const extname = path.extname(new URL(iconUrl).pathname);
    if (extname && extname.length <= 5) ext = extname;
  } catch (e) {}

  const fileName = `icon_${urlHash}${ext}`;
  const cachePath = path.join(UPLOAD_DIR, fileName);

  // 已缓存则直接返回
  if (fs.existsSync(cachePath)) {
    return res.redirect(`/uploads/${fileName}`);
  }

  // 首次使用，下载并缓存
  const client = iconUrl.startsWith('https') ? https : http;
  client.get(iconUrl, { timeout: 5000 }, (response) => {
    if (response.statusCode === 200) {
      const file = fs.createWriteStream(cachePath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        res.redirect(`/uploads/${fileName}`);
      });
    } else {
      res.redirect(iconUrl);
    }
  }).on('error', () => {
    res.redirect(iconUrl);
  });
});

// =================================================================
// 【改动】配置接口 - 新增 bg_type 字段支持
// =================================================================
app.get('/api/config', (req, res) => {
  db.all("SELECT key, value FROM settings WHERE key IN ('background', 'title', 'bg_type')", (err, rows) => {
    let bgUrl = '';
    let titleStr = '';
    let bgType = 'auto';
    
    if (rows) {
      rows.forEach(r => {
        if (r.key === 'background') bgUrl = r.value;
        if (r.key === 'title') titleStr = r.value;
        if (r.key === 'bg_type') bgType = r.value;
      });
    }

    if (!bgUrl) bgUrl = (config.app && config.app.background) || process.env.BACKGROUND || '';
    if (!titleStr) titleStr = (config.app && config.app.title) || process.env.SITE_TITLE || '我的导航';

    // 【改动】智能判断：如果是本地上传的文件（/uploads/ 开头）则不走代理
    const isLocalFile = bgUrl.startsWith('/uploads/');
    const isVideo = bgUrl.toLowerCase().match(/\.(mp4|webm|ogg)$/);

    if (!isLocalFile && !isVideo && bgUrl && bgUrl.startsWith('http')) {
      bgUrl = '/api/background?url=' + encodeURIComponent(bgUrl);
    }

    res.json({
      title: titleStr,
      background: bgUrl,
      bg_type: bgType
    });
  });
});

// =================================================================
// 【改动】配置保存接口 - 支持 bg_type
// =================================================================
app.post('/api/config/settings', authMiddleware, (req, res) => {
  const { title, background, bg_type } = req.body;
  const updates = [];
  
  if (title !== undefined) updates.push({ key: 'title', value: title });
  if (background !== undefined) updates.push({ key: 'background', value: background });
  if (bg_type !== undefined) updates.push({ key: 'bg_type', value: bg_type });

  if (updates.length === 0) return res.json({ success: true });

  let completed = 0;
  let hasError = false;

  updates.forEach(item => {
    db.get("SELECT * FROM settings WHERE key=?", [item.key], (err, row) => {
      if (row) {
        db.run("UPDATE settings SET value=? WHERE key=?", [item.value || '', item.key], checkDone);
      } else {
        db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [item.key, item.value || ''], checkDone);
      }
    });
  });

  function checkDone(err) {
    if (err) hasError = true;
    completed++;
    if (completed === updates.length) {
      if (hasError) return res.status(500).json({ error: '部分设置保存失败' });
      res.json({ success: true });
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});
