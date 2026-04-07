const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const db = require('./db'); // [新增] 引入数据库模块，以便读取设置
const authMiddleware = require('./routes/authMiddleware'); // [新增] 鉴权中间件

const menuRoutes = require('./routes/menu');
const cardRoutes = require('./routes/card');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const adRoutes = require('./routes/ad');
const friendRoutes = require('./routes/friend');
const userRoutes = require('./routes/user');
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
    const siteTitle = (config.app && config.app.title) || process.env.SITE_TITLE || '我的导航';
    const renderedHtml = htmlData.replace('__SITE_TITLE__', siteTitle);
    res.send(renderedHtml);
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

// =================================================================
// [修改]：从前端传来的 url 参数中直接获取地址进行下载缓存
// =================================================================
app.get('/api/background', (req, res) => {
  const bgUrl = req.query.url; // 新逻辑：从问号后的参数获取地址

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
      res.redirect(bgUrl); // 失败兜底，直接返回原链接
    }
  }).on('error', () => {
    res.redirect(bgUrl);
  });
});

// =================================================================
// [修改]：给前端返回配置信息（优先从数据库读取）
// =================================================================
app.get('/api/config', (req, res) => {
  db.get("SELECT value FROM settings WHERE key = 'background'", (err, row) => {
    let bgUrl = '';
    if (row && row.value) {
      bgUrl = row.value;
    } else {
      bgUrl = (config.app && config.app.background) || process.env.background || process.env.BACKGROUND || '';
    }

    // 识别是不是动态视频文件
    const isVideo = bgUrl.toLowerCase().match(/\.(mp4|webm|ogg)$/);

    // 如果是图片，并且以http开头，我们在它前面加上代理接口的地址缓存它
    // 如果是动态视频，坚决不走代理缓存（因为视频太大了代理会卡死），让前端直接去原链接拉取
    if (!isVideo && bgUrl && bgUrl.startsWith('http')) {
      bgUrl = '/api/background?url=' + encodeURIComponent(bgUrl); 
    }

    res.json({
      title: (config.app && config.app.title) || process.env.SITE_TITLE || '我的导航',
      background: bgUrl
    });
  });
});

// =================================================================
// [新增]：管理员在后台保存全局配置
// =================================================================
app.post('/api/config/background', authMiddleware, (req, res) => {
  const { background } = req.body;
  // 检查表里是否有背景记录，有就更新，没有就插入
  db.get("SELECT * FROM settings WHERE key='background'", (err, row) => {
    if (row) {
      db.run("UPDATE settings SET value=? WHERE key='background'", [background || ''], (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ success: true });
      });
    } else {
      db.run("INSERT INTO settings (key, value) VALUES ('background', ?)", [background || ''], (insertErr) => {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        res.json({ success: true });
      });
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});
