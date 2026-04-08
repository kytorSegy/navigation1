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

// =================================================================
// [修改]：在加载首页时，从数据库读取你设置的标题，渲染到 index.html
// =================================================================
const sendIndexHtml = (res) => {
  const indexPath = path.join(__dirname, 'web/dist', 'index.html');
  fs.readFile(indexPath, 'utf8', (err, htmlData) => {
    if (err) return res.status(500).send('Server Error');
    
    // 从 settings 表中查找 title
    db.get("SELECT value FROM settings WHERE key='title'", (dbErr, row) => {
      // 如果数据库有标题就用数据库的，没有就用 config 默认的
      const siteTitle = (row && row.value) ? row.value : ((config.app && config.app.title) || process.env.SITE_TITLE || '我的导航');
      // 替换 HTML 中的占位符
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
// [修改]：给前端返回配置信息（同时返回标题和壁纸）
// =================================================================
app.get('/api/config', (req, res) => {
  db.all("SELECT key, value FROM settings WHERE key IN ('background', 'title')", (err, rows) => {
    let bgUrl = '';
    let titleStr = '';
    
    // 遍历数据库结果，分别赋值
    if (rows) {
      rows.forEach(r => {
        if (r.key === 'background') bgUrl = r.value;
        if (r.key === 'title') titleStr = r.value;
      });
    }

    if (!bgUrl) bgUrl = (config.app && config.app.background) || process.env.BACKGROUND || '';
    if (!titleStr) titleStr = (config.app && config.app.title) || process.env.SITE_TITLE || '我的导航';

    const isVideo = bgUrl.toLowerCase().match(/\.(mp4|webm|ogg)$/);

    if (!isVideo && bgUrl && bgUrl.startsWith('http')) {
      bgUrl = '/api/background?url=' + encodeURIComponent(bgUrl); 
    }

    res.json({
      title: titleStr,
      background: bgUrl
    });
  });
});

// =================================================================
// [修改]：升级配置保存接口，支持一次性保存多个设置项
// =================================================================
app.post('/api/config/settings', authMiddleware, (req, res) => {
  // 从前端接收 title 和 background
  const { title, background } = req.body;
  const updates = [];
  
  // 将前端传来的有效值放入更新队列
  if (title !== undefined) updates.push({ key: 'title', value: title });
  if (background !== undefined) updates.push({ key: 'background', value: background });

  if (updates.length === 0) return res.json({ success: true });

  let completed = 0;
  let hasError = false;

  // 循环更新或插入每一项配置
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
    // 当所有项目处理完毕后返回结果
    if (completed === updates.length) {
      if (hasError) return res.status(500).json({ error: '部分设置保存失败' });
      res.json({ success: true });
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});
