// routes/parse.js
const express = require('express');
const router = express.Router();
const http = require('http');
const https = require('https');

// 智能链接解析：抓取目标网站标题和 favicon
router.get('/', async (req, res) => {
  const { url } = req.query;
  
  if (!url || !url.trim()) {
    return res.status(400).json({ error: '请提供网址' });
  }

  let targetUrl = url.trim();
  // 如果用户没有输入 http 或 https，默认加上 https://
  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const parsed = new URL(targetUrl);
    const protocol = parsed.protocol === 'https:' ? https : http;

    // 发起网络请求获取网页源代码
    const html = await new Promise((resolve, reject) => {
      const req = protocol.get(targetUrl, { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // 伪装成真实的浏览器，防止被拦截
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 8000 
      }, (response) => {
        // 处理 301/302 重定向的情况
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = new URL(response.headers.location, targetUrl).href;
          const redirectProtocol = redirectUrl.startsWith('https') ? https : http;
          redirectProtocol.get(redirectUrl, { timeout: 8000 }, (r2) => {
            let data = '';
            r2.on('data', chunk => data += chunk);
            r2.on('end', () => resolve(data));
            r2.on('error', reject);
          }).on('error', reject);
          return;
        }
        
        // 如果不是正常返回的数据，就返回空字符串
        if (response.statusCode !== 200) {
          return resolve('');
        }
        
        // 接收数据块并拼接到 html 变量中
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); resolve(''); });
    });

    // 如果没抓取到任何内容
    if (!html) {
      return res.json({ 
        success: false, 
        title: '', 
        icon: parsed.origin + '/favicon.ico',
        message: '无法获取页面内容，使用默认图标' 
      });
    }

    // -----------------------------------------
    // 1. 提取网页标题 (优化版)
    // -----------------------------------------
    let title = '';
    // 使用 [\s\S]* 来匹配，这样就算标题中间有换行符也能抓取到
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      // 提取出来后，去除可能存在的换行符，并将多个空格压缩成一个空格，最多保留100个字符
      title = titleMatch[1].replace(/[\r\n]+/g, '').trim().replace(/\s+/g, ' ').substring(0, 100);
    }

    // -----------------------------------------
    // 2. 提取网站图标 (重点优化版)
    // -----------------------------------------
    let icon = '';
    // 先匹配出网页中所有的 <link ... > 标签，不区分大小写
    const linkTags = html.match(/<link[^>]+>/gi) || [];
    
    // 遍历每一个被找到的 <link> 标签
    for (const tag of linkTags) {
      // 检查这个标签内是否包含 rel="icon" 或 rel="apple-touch-icon" 等图标关键字
      if (/rel=["']?(?:shortcut )?icon["']?/i.test(tag) || /rel=["']?apple-touch-icon["']?/i.test(tag)) {
        // 如果确认是图标标签，再从这个标签里匹配 href="网址"
        const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
          icon = hrefMatch[1]; // 提取出了图标的路径（可能是相对路径如 /logo.png）
          break; // 找到了就跳出循环，不再找了
        }
      }
    }

    // -----------------------------------------
    // 3. 规范化图标的链接
    // -----------------------------------------
    if (icon) {
      try {
        // 这里是新手非常推荐使用的 URL 对象魔法！
        // 如果 icon 是 '/logo.png'，targetUrl 是 'https://a.com/bb'
        // 它会自动帮你拼装成 'https://a.com/logo.png'
        icon = new URL(icon, targetUrl).href;
      } catch (e) {
        // 如果解析出错，啥也不做，保留原样
      }
    } else {
      // 如果网页里压根没写 <link> 标签，我们默认猜测它在根目录下的 favicon.ico
      icon = parsed.origin + '/favicon.ico';
    }

    // 将解析结果返回给前端
    res.json({
      success: true,
      title: title || '',
      icon: icon,
      message: title ? '已自动获取标题和图标' : '已获取图标，标题需手动填写'
    });

  } catch (err) {
    // 整个过程报错时的降级处理
    let defaultIcon = '';
    try {
      const p = new URL(targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl);
      defaultIcon = p.origin + '/favicon.ico';
    } catch {
      defaultIcon = '';
    }
    res.json({
      success: false,
      title: '',
      icon: defaultIcon,
      message: '自动解析失败，请手动填写标题和图标链接'
    });
  }
});

module.exports = router;
