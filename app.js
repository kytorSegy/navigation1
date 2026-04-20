const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const db = require('./db');
const authMiddleware = require('./routes/authMiddleware');

// 【修改点 1】：引入我们新的全能大管家 sync.js，替代原来的 r2sync.js
const syncManager = require('./routes/sync');

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
const UPLOAD_DIR = config.storage.uploadDir;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());

// /uploads 静态服务 + R2 回源
app.use('/uploads', async (req, res, next) => {
  const localPath = path.join(UPLOAD_DIR, req.path);
  if (fs.existsSync(localPath)) return next();
  
  // 【修改点 2】：所有的 r2 调用，全部替换成了 syncManager
  if (syncManager.isR2Enabled()) {
    const ok = await syncManager.downloadFromR2('uploads' + req.path, localPath);
    if (ok) return res.sendFile(localPath);
  }
  next();
}, express.static(UPLOAD_DIR));

app.use(express.static(path.join(__dirname, 'web/dist'), { index: false }));

const sendIndexHtml = (res) => {
  const indexPath = path.join(__dirname, 'web/dist', 'index.html');
  fs.readFile(indexPath, 'utf8', (err, htmlData) => {
    if (err) return res.status(500).send('Server Error');
    db.get("SELECT value FROM settings WHERE key='title'", (dbErr, row) => {
      const siteTitle = (row && row.value) ? row.value : ((config.app && config.app.title) || process.env.SITE_TITLE || '我的导航');
      res.send(htmlData.replace('__SITE_TITLE__', siteTitle));
    });
  });
};

app.get('/', (req, res) => sendIndexHtml(res));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !fs.existsSync(path.join(__dirname, 'web/dist', req.path))) sendIndexHtml(res);
  else next();
});

app.use('/api/menus', menuRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', authRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/parse-link', parseRoutes);

app.get('/api/r2/status', authMiddleware, (req, res) => {
  // 【修改点 3】：r2 替换为 syncManager
  res.json({ enabled: syncManager.isR2Enabled(), bucket: config.r2.bucketName||null, publicDomain: config.r2.publicDomain||null });
});

// 网络壁纸代理 + R2 双写
app.get('/api/background', (req, res) => {
  const bgUrl = req.query.url;
  if (!bgUrl || !bgUrl.startsWith('http')) return res.status(404).send('未配置网络壁纸链接');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const urlHash = crypto.createHash('md5').update(bgUrl).digest('hex');
  let ext = '.jpg'; try { const e = path.extname(new URL(bgUrl).pathname); if(e) ext=e; } catch(e){}
  const fileName = `bg_${urlHash}${ext}`;
  const cachePath = path.join(UPLOAD_DIR, fileName);
  if (fs.existsSync(cachePath)) return res.redirect(`/uploads/${fileName}`);
  const client = bgUrl.startsWith('https') ? https : http;
  client.get(bgUrl, (response) => {
    if (response.statusCode === 200) {
      const file = fs.createWriteStream(cachePath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        // 【修改点 4】：r2 替换为 syncManager
        syncManager.uploadToR2(cachePath, `uploads/${fileName}`, response.headers['content-type']||'image/jpeg').catch(()=>{});
        res.redirect(`/uploads/${fileName}`);
      });
    } else res.redirect(bgUrl);
  }).on('error', () => res.redirect(bgUrl));
});

// 图标代理 + R2 双写
app.get('/api/icon-proxy', async (req, res) => {
  const iconUrl = req.query.url;
  if (!iconUrl || !iconUrl.startsWith('http')) return res.status(400).send('无效图标链接');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const urlHash = crypto.createHash('md5').update(iconUrl).digest('hex');
  let ext = '.png'; try { const e = path.extname(new URL(iconUrl).pathname); if(e&&e.length<=5) ext=e; } catch(e){}
  const fileName = `icon_${urlHash}${ext}`;
  const cachePath = path.join(UPLOAD_DIR, fileName);
  const r2Key = `uploads/${fileName}`;
  if (fs.existsSync(cachePath)) return res.redirect(`/uploads/${fileName}`);
  
  // 【修改点 5】：r2 替换为 syncManager
  if (syncManager.isR2Enabled()) { const ok = await syncManager.downloadFromR2(r2Key, cachePath); if(ok) return res.redirect(`/uploads/${fileName}`); }
  
  const client = iconUrl.startsWith('https') ? https : http;
  client.get(iconUrl, { timeout: 5000 }, (response) => {
    if (response.statusCode === 200) {
      const file = fs.createWriteStream(cachePath);
      response.pipe(file);
      // 【修改点 6】：r2 替换为 syncManager
      file.on('finish', () => { file.close(); syncManager.uploadToR2(cachePath,r2Key,response.headers['content-type']||'image/png').catch(()=>{}); res.redirect(`/uploads/${fileName}`); });
    } else res.redirect(iconUrl);
  }).on('error', () => res.redirect(iconUrl));
});

// 配置接口
app.get('/api/config', (req, res) => {
  db.all("SELECT key, value FROM settings WHERE key IN ('background', 'title', 'bg_type')", (err, rows) => {
    let bgUrl='', titleStr='', bgType='auto';
    if(rows) rows.forEach(r => { if(r.key==='background')bgUrl=r.value; if(r.key==='title')titleStr=r.value; if(r.key==='bg_type')bgType=r.value; });
    if(!bgUrl) bgUrl=(config.app&&config.app.background)||process.env.BACKGROUND||'';
    if(!titleStr) titleStr=(config.app&&config.app.title)||process.env.SITE_TITLE||'我的导航';

    const isR2Url = config.r2.publicDomain && bgUrl.startsWith(config.r2.publicDomain);
    const isLocalPath = bgUrl.startsWith('/uploads/');
    const isVideo = bgUrl.toLowerCase().match(/\.(mp4|webm|ogg|mov|m4v|avi|mkv)(\?|$)/);

    if (!isR2Url && !isLocalPath && !isVideo && bgUrl && bgUrl.startsWith('http')) {
      bgUrl = '/api/background?url=' + encodeURIComponent(bgUrl);
    }

    // 【修改点 7】：r2 替换为 syncManager
    res.json({ title:titleStr, background:bgUrl, bg_type:bgType, r2_enabled:syncManager.isR2Enabled() });
  });
});

// 配置保存
app.post('/api/config/settings', authMiddleware, (req, res) => {
  const { title, background, bg_type } = req.body;
  const updates = [];
  if(title!==undefined) updates.push({key:'title',value:title});
  if(background!==undefined) updates.push({key:'background',value:background});
  if(bg_type!==undefined) updates.push({key:'bg_type',value:bg_type});
  if(updates.length===0) return res.json({success:true});
  let completed=0, hasError=false;
  updates.forEach(item => {
    db.get("SELECT * FROM settings WHERE key=?", [item.key], (err, row) => {
      if(row) db.run("UPDATE settings SET value=? WHERE key=?", [item.value||'',item.key], done);
      else db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [item.key,item.value||''], done);
    });
  });
  function done(err) { if(err)hasError=true; completed++; if(completed===updates.length){if(hasError)return res.status(500).json({error:'部分设置保存失败'});res.json({success:true});} }
});

// ==========================================
// 【修改点 8】新增：SSE 接口，给前端建立热更新“电话线”
// ==========================================
app.get('/api/stream', (req, res) => {
  // 设置 SSE (Server-Sent Events) 必需的 HTTP 响应头
  // 这样浏览器就知道这是一个长连接，而不是普通的网页请求
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // 立即把头部发送给浏览器

  // 告诉前端：“电话线已经连通了！”
  res.write('data: {"status": "connected"}\n\n');

  // 定义一个监听函数：当大管家发现更新时，就通过电话线通知浏览器
  const updateListener = () => {
    // 写入 action: reload 指令给前端
    res.write('data: {"action": "reload"}\n\n');
  };
  
  // 监听我们在 sync.js 里触发的 'update_needed' 事件
  syncManager.syncEvents.on('update_needed', updateListener);

  // 重要：如果用户关闭了浏览器页面，我们需要把这根电话线拔掉，防止服务器内存泄漏
  req.on('close', () => {
    syncManager.syncEvents.removeListener('update_needed', updateListener);
    res.end();
  });
});

// 启动服务器，设置超时适应大文件上传
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
  
  // 【修改点 9】：r2 替换为 syncManager
  console.log(`[R2] 同步状态: ${syncManager.isR2Enabled() ? '已启用' : '未启用 (配置 R2 环境变量即可开启)'}`);
  
  // 【修改点 10】：启动全能同步大管家（接管 Git 与 R2），替换了原来的 startWallpaperSync
  syncManager.startUnifiedSync(db);
});

// 10 分钟超时，避免大文件上传时 Bad Gateway
server.timeout = 600000;
server.keepAliveTimeout = 620000;
server.headersTimeout = 630000;
