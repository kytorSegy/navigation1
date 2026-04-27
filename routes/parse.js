// 文件路径：routes/parse.js
const express = require('express');
const router = express.Router();
const http = require('http');
const https = require('https');

// 智能链接解析：抓取目标网站标题和 favicon
router.get('/', async (req, res) => {
  // 获取前端传过来的网址
  const { url } = req.query;
  
  // 检查网址是否为空
  if (!url || !url.trim()) {
    return res.status(400).json({ error: '请提供网址' });
  }

  // 去除网址前后的空格
  let targetUrl = url.trim();
  // 补充协议头：如果用户只输入了 www.baidu.com，默认帮它加上 https://
  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    // 使用 URL 对象解析网址，方便后续拼接路径
    const parsed = new URL(targetUrl);
    // 判断该用 http 还是 https 模块来发起请求
    const protocol = parsed.protocol === 'https:' ? https : http;

    // 发起网络请求，获取目标网站的 HTML 源代码
    const html = await new Promise((resolve, reject) => {
      const req = protocol.get(targetUrl, { 
        headers: { 
          // 伪装请求头：假装自己是 Chrome 浏览器，防止被某些网站的防火墙拦截
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 8000 // 8秒超时时间
      }, (response) => {
        // 处理网站重定向 (比如 301/302 状态码)，跟随跳转到新的网址
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
        // 如果网页状态码不是 200 (正常)，返回空
        if (response.statusCode !== 200) {
          return resolve('');
        }
        // 把接收到的网页数据块拼接到一起
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
      });
      // 遇到网络错误或超时，结束请求并返回空
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); resolve(''); });
    });

    // 如果获取不到 HTML 源代码，返回默认的图标
    if (!html) {
      return res.json({ 
        success: false, 
        title: '', 
        icon: parsed.origin + '/favicon.ico',
        message: '无法获取页面内容，使用默认图标' 
      });
    }

    // ============================================
    // 1. 提取网页标题 (Title)
    // ============================================
    let title = '';
    // 使用正则匹配 <title> 标签，[\s\S]*? 可以匹配带换行符的内容
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      // 去除提取出来的标题中的回车换行，并把多个连续空格变成一个空格
      title = titleMatch[1].replace(/[\r\n]+/g, '').trim().replace(/\s+/g, ' ').substring(0, 100);
    }

    // ============================================
    // 2. 提取网站图标 (Favicon/Icon)
    // ============================================
    let icon = '';
    // 找出网页中所有的 <link> 标签
    const linkTags = html.match(/<link[^>]+>/gi) || [];
    
    // 遍历每一个被找到的 <link> 标签
    for (const tag of linkTags) {
      // 检查里面是否有 rel="icon" 或 rel="shortcut icon" 或 rel="apple-touch-icon"
      if (/rel=["']?(?:shortcut )?icon["']?/i.test(tag) || /rel=["']?apple-touch-icon["']?/i.test(tag)) {
        // 如果有，提取出 href="..." 里面的链接路径
        const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
          icon = hrefMatch[1]; 
          break; // 找到了就跳出循环
        }
      }
    }

    // ============================================
    // 3. 规范化图标的链接路径
    // ============================================
    if (icon) {
      try {
        // 使用 URL 对象，智能地把相对路径（例如 /logo.png）和原网址合并成绝对路径
        icon = new URL(icon, targetUrl).href;
      } catch (e) {
        // 如果合并失败，保持原样
      }
    } else {
      // 如果网页里没写图标代码，默认猜它在域名根目录下的 favicon.ico
      icon = parsed.origin + '/favicon.ico';
    }

    // 最终将成功的数据返回给前端
    res.json({
      success: true,
      title: title || '',
      icon: icon,
      message: title ? '已自动获取标题和图标' : '已获取图标，标题需手动填写'
    });

  } catch (err) {
    // 发生系统级别错误时的降级方案
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
