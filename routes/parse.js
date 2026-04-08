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
  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const parsed = new URL(targetUrl);
    const protocol = parsed.protocol === 'https:' ? https : http;

    const html = await new Promise((resolve, reject) => {
      const req = protocol.get(targetUrl, { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (compatible; NavBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 8000 
      }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // 处理重定向
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
        if (response.statusCode !== 200) {
          return resolve('');
        }
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); resolve(''); });
    });

    if (!html) {
      return res.json({ 
        success: false, 
        title: '', 
        icon: parsed.origin + '/favicon.ico',
        message: '无法获取页面内容，使用默认图标' 
      });
    }

    // 提取标题
    let title = '';
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/\s+/g, ' ').substring(0, 100);
    }

    // 提取 favicon / icon - 优先级：apple-touch-icon > icon > shortcut icon > default
    let icon = '';
    const iconPatterns = [
      /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+rel=["']shortcut icon["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']icon["']/i,
    ];

    for (const pattern of iconPatterns) {
      const match = html.match(pattern);
      if (match) {
        let iconUrl = match[1];
        // 处理相对路径
        if (iconUrl.startsWith('//')) {
          iconUrl = parsed.protocol + iconUrl;
        } else if (iconUrl.startsWith('/')) {
          iconUrl = parsed.origin + iconUrl;
        } else if (!iconUrl.startsWith('http')) {
          iconUrl = parsed.origin + '/' + iconUrl;
        }
        icon = iconUrl;
        break;
      }
    }

    // 如果没找到，使用默认 favicon.ico
    if (!icon) {
      icon = parsed.origin + '/favicon.ico';
    }

    res.json({
      success: true,
      title: title || '',
      icon: icon,
      message: title ? '已自动获取标题和图标' : '已获取图标，标题需手动填写'
    });

  } catch (err) {
    // 失败时提供默认 favicon
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
