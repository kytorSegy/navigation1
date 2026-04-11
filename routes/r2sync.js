/**
 * routes/r2sync.js - Cloudflare R2 同步核心模块
 *
 * 修复问题：listByPrefix 可能因为分页或权限问题导致文件列表不完整
 * 解决方案：添加 MaxKeys 参数、详细日志、分页支持
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

let s3 = null, PutCmd = null, GetCmd = null, HeadCmd = null, DeleteCmd = null, ListCmd = null;
const { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = config.r2;
const r2Ready = !!(accountId && accessKeyId && secretAccessKey && bucketName);

if (r2Ready) {
  try {
    const sdk = require('@aws-sdk/client-s3');
    s3 = new sdk.S3Client({ region:'auto', endpoint:`https://${accountId}.r2.cloudflarestorage.com`, credentials:{accessKeyId,secretAccessKey} });
    PutCmd = sdk.PutObjectCommand;
    GetCmd = sdk.GetObjectCommand;
    HeadCmd = sdk.HeadObjectCommand;
    DeleteCmd = sdk.DeleteObjectCommand;
    ListCmd = sdk.ListObjectsV2Command;
    console.log('[R2] Cloudflare R2 已连接, Bucket:', bucketName);
  } catch(e) { console.warn('[R2] @aws-sdk/client-s3 未安装，R2 同步已禁用'); }
} else {
  console.log('[R2] 未检测到 R2 环境变量，仅使用本地存储');
}

function isR2Enabled() { return !!(s3 && r2Ready); }

function getR2PublicUrl(r2Key) {
  if (!publicDomain) return null;
  let d = publicDomain; if (d.endsWith('/')) d = d.slice(0,-1);
  return `${d}/${r2Key}`;
}

/**
 * 流式上传本地文件到 R2，支持大文件 (80MB+)
 */
async function uploadToR2(localPath, r2Key, mimeType) {
  if (!isR2Enabled()) return null;
  try {
    const fileStream = fs.createReadStream(localPath);
    const fileSize = fs.statSync(localPath).size;
    await s3.send(new PutCmd({
      Bucket: bucketName,
      Key: r2Key,
      Body: fileStream,
      ContentLength: fileSize,
      ContentType: mimeType || 'application/octet-stream',
    }));
    const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
    console.log(`[R2] 已上传: ${r2Key} (${sizeMB}MB)`);
    return getR2PublicUrl(r2Key);
  } catch(e) {
    console.error(`[R2] 上传失败 ${r2Key}:`, e.message);
    return null;
  }
}

async function downloadFromR2(r2Key, localPath) {
  if (!isR2Enabled()) return false;
  try {
    const resp = await s3.send(new GetCmd({ Bucket:bucketName, Key:r2Key }));
    const chunks = []; for await (const c of resp.Body) chunks.push(c);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(localPath, Buffer.concat(chunks));
    console.log(`[R2] 已拉取: ${r2Key}`);
    return true;
  } catch(e) { if(e.name!=='NoSuchKey') console.error(`[R2] 拉取失败 ${r2Key}:`,e.message); return false; }
}

async function getETag(r2Key) {
  if (!isR2Enabled()) return null;
  try {
    const resp = await s3.send(new HeadCmd({ Bucket:bucketName, Key:r2Key }));
    return resp.ETag || null;
  } catch(e) { return null; }
}

async function existsOnR2(r2Key) {
  if (!isR2Enabled()) return false;
  try { await s3.send(new HeadCmd({Bucket:bucketName,Key:r2Key})); return true; } catch{ return false; }
}

async function deleteFromR2(r2Key) {
  if (!isR2Enabled()) return false;
  try { await s3.send(new DeleteCmd({Bucket:bucketName,Key:r2Key})); console.log(`[R2] 已删除: ${r2Key}`); return true; }
  catch(e) { console.error(`[R2] 删除失败 ${r2Key}:`,e.message); return false; }
}

/**
 * 【修复】列出指定前缀的所有对象，支持分页获取
 * 
 * 修复内容：
 * 1. 添加 MaxKeys: 1000 参数，确保每次请求返回足够多的对象
 * 2. 添加分页循环，使用 ContinuationToken 获取所有对象
 * 3. 添加详细日志，方便调试
 * 4. 返回所有匹配的文件列表
 */
async function listByPrefix(prefix) {
  if (!isR2Enabled() || !ListCmd) {
    console.warn('[R2] R2 未启用或 ListCmd 不可用');
    return [];
  }
  
  const allItems = [];
  let continuationToken = null;
  let pageCount = 0;
  
  try {
    do {
      pageCount++;
      const params = {
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: 1000,  // 显式设置最大返回数量
      };
      
      if (continuationToken) {
        params.ContinuationToken = continuationToken;
      }
      
      const resp = await s3.send(new ListCmd(params));
      
      if (resp.Contents && resp.Contents.length > 0) {
        const pageItems = resp.Contents.map(obj => ({
          key: obj.Key,
          lastModified: obj.LastModified,
          size: obj.Size,
          etag: obj.ETag
        }));
        allItems.push(...pageItems);
        console.log(`[R2] 列出对象 (第${pageCount}页): 找到 ${pageItems.length} 个文件，前缀: ${prefix}`);
      }
      
      continuationToken = resp.NextContinuationToken;
      
    } while (continuationToken);  // 循环直到获取所有对象
    
    console.log(`[R2] 列出对象完成: 共找到 ${allItems.length} 个文件，前缀: ${prefix}`);
    
    // 按最后修改时间降序排列
    allItems.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    // 打印前几个文件名，方便调试
    if (allItems.length > 0) {
      console.log(`[R2] 文件列表 (前5个):`, allItems.slice(0, 5).map(i => i.key).join(', '));
    }
    
    return allItems;
  } catch(e) {
    console.error('[R2] 列出对象失败:', e.message);
    console.error('[R2] 错误详情:', e);
    return [];
  }
}

/**
 * 【修复】清理历史壁纸，保留最近 keepCount 张
 * 
 * 修复内容：
 * 1. 使用修复后的 listByPrefix 获取完整文件列表
 * 2. 添加更详细的日志
 */
async function cleanupOldWallpapers(prefix, keepCount = 5) {
  if (!isR2Enabled()) {
    console.log('[R2] R2 未启用，跳过壁纸清理');
    return;
  }
  
  try {
    console.log(`[R2] 开始壁纸清理，前缀: ${prefix}, 保留数量: ${keepCount}`);
    
    const items = await listByPrefix(prefix);
    
    if (items.length === 0) {
      console.log(`[R2] 未找到匹配前缀 '${prefix}' 的文件`);
      return;
    }
    
    if (items.length <= keepCount) {
      console.log(`[R2] 壁纸清理: 当前 ${items.length} 个文件，未超过上限 ${keepCount}，无需清理`);
      return;
    }
    
    const toDelete = items.slice(keepCount);
    console.log(`[R2] 壁纸清理: 共 ${items.length} 个文件，保留最新 ${keepCount} 个，删除 ${toDelete.length} 个旧文件...`);
    
    // 打印要删除的文件列表
    console.log(`[R2] 将删除的文件:`, toDelete.map(i => i.key).join(', '));
    
    for (const obj of toDelete) {
      await deleteFromR2(obj.key);
    }
    
    console.log(`[R2] 壁纸清理完成，已删除 ${toDelete.length} 个历史文件`);
  } catch(e) {
    console.error('[R2] 壁纸清理异常:', e.message);
    console.error('[R2] 错误堆栈:', e.stack);
  }
}

// =================================================================
// 壁纸同步轮询
// =================================================================
const UPLOAD_DIR = config.storage.uploadDir;
const CHECK_INTERVAL = parseInt(process.env.BACKUP_INTERVAL) || 30;
let lastSyncedBgUrl = null;

function startWallpaperSync(db) {
  if (!isR2Enabled()) return;
  console.log(`[R2] 启动壁纸同步监控 (检查频率: ${CHECK_INTERVAL}s, 与数据库同步一致)...`);

  setInterval(async () => {
    try {
      const bgUrl = await new Promise((resolve) => {
        db.get("SELECT value FROM settings WHERE key='background'", (err, row) => {
          resolve(row ? row.value : '');
        });
      });
      if (!bgUrl) return;

      let domain = publicDomain || '';
      if (domain.endsWith('/')) domain = domain.slice(0, -1);
      if (!domain || !bgUrl.startsWith(domain)) return;

      // 数据库中的 URL 未变化，跳过 (幂等性)
      if (bgUrl === lastSyncedBgUrl) return;

      const r2Key = bgUrl.replace(domain + '/', '');
      const fileName = path.basename(r2Key);
      const localPath = path.join(UPLOAD_DIR, fileName);

      // 本地已存在同名文件，跳过下载
      if (fs.existsSync(localPath)) {
        lastSyncedBgUrl = bgUrl;
        return;
      }

      console.log(`[R2] 检测到壁纸更新: ${fileName}, 正在拉取...`);
      const ok = await downloadFromR2(r2Key, localPath);

      if (ok) {
        lastSyncedBgUrl = bgUrl;
        console.log(`[R2] 壁纸同步完成: ${fileName}`);
      } else {
        console.warn(`[R2] 壁纸拉取失败: ${fileName}, 保留旧文件，下次重试`);
      }
    } catch (e) {
      console.error('[R2] 壁纸同步异常:', e.message);
    }
  }, CHECK_INTERVAL * 1000);
}

module.exports = {
  isR2Enabled, getR2PublicUrl, uploadToR2, downloadFromR2,
  getETag, existsOnR2, deleteFromR2,
  listByPrefix, cleanupOldWallpapers, startWallpaperSync
};
