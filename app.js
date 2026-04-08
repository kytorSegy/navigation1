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

app.use(cors());
app.use(express.json());
app.use(compression());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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
// 背景图代理（仅代理静态图片，视频直接返回原始URL）
// =================================================================
app.get('/api/background', (req, res) => {
  const bgUrl = req.query.url;
  if (!bgUrl || !bgUrl.startsWith('http')) {
    return res.status(404).send('未配置网络壁纸链接或链接无效');
  }

  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const urlHash = crypto.createHash('md5').update(bgUrl).digest('hex');
  let ext = '.jpg';
  try {
    const extname = path.extname(new URL(bgUrl).pathname);
    if (extname) ext = extname;
  } catch (e) {}

  const fileName = `bg_${urlHash}${ext}`;
  const cachePath = path.join(uploadDir, fileName);

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
// [改动] /api/detect-media —— 新增接口，检测URL是视频还是图片
// 用于无后缀名的链接（如好壁纸网站的链接）
// =================================================================
app.get('/api/detect-media', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: '缺少 url 参数' });

  // 1. 先按后缀名判断
  const urlLower = url.toLowerCase();
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  for (const ext of videoExts) {
    if (urlLower.includes(ext)) return res.json({ type: 'video', url });
  }
  for (const ext of imageExts) {
    if (urlLower.includes(ext)) return res.json({ type: 'image', url });
  }

  // 2. 无后缀名，发 HEAD 请求探测 Content-Type
  try {
    const fetch = (await import('node-fetch')).default;
    let response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow',
        timeout: 8000
      });
    } catch (e) {
      // HEAD 被拒绝，尝试 GET Range
      response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-32' },
        redirect: 'follow',
        timeout: 8000
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('video/')) return res.json({ type: 'video', contentType, url });
    if (contentType.startsWith('image/')) return res.json({ type: 'image', contentType, url });

    // 3. Content-Type 不明确，读取前几个字节判断魔数
    if (!contentType || contentType === 'application/octet-stream') {
      const getResp = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-32' },
        redirect: 'follow',
        timeout: 8000
      });
      const buf = Buffer.from(await getResp.arrayBuffer());
      // ftyp = MP4/MOV
      if (buf.length >= 8 && buf.toString('ascii', 4, 8) === 'ftyp') {
        return res.json({ type: 'video', contentType: 'video/mp4', url, detected: 'magic-bytes' });
      }
      // WebM
      if (buf.length >= 4 && buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) {
        return res.json({ type: 'video', contentType: 'video/webm', url, detected: 'magic-bytes' });
      }
      // JPEG
      if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
        return res.json({ type: 'image', contentType: 'image/jpeg', url, detected: 'magic-bytes' });
      }
      // PNG
      if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
        return res.json({ type: 'image', contentType: 'image/png', url, detected: 'magic-bytes' });
      }
    }
    return res.json({ type: 'unknown', contentType, url });
  } catch (err) {
    return res.json({ type: 'unknown', error: err.message, url });
  }
});

// =================================================================
// [改动] /api/config —— 增加 bg_type 字段返回
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

    // 判断是否为视频：先看 bg_type，再看后缀
    let isVideo = (bgType === 'video');
    if (!isVideo && bgType === 'auto') {
      isVideo = /\.(mp4|webm|ogg)$/i.test(bgUrl);
    }

    // 只有非视频的http链接才走代理
    if (!isVideo && bgUrl && bgUrl.startsWith('http')) {
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
// [改动] /api/config/settings —— 增加 bg_type 保存
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
