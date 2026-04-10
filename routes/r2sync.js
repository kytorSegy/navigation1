/**
 * routes/r2sync.js - Cloudflare R2 同步核心模块
 *
 * 日志风格与 backup.sh 保持一致: [R2] 前缀 + 中文描述。
 * uploadToR2 使用流式上传，支持大文件 (100MB+)。
 * 历史壁纸清理: 保留最近 5 张，自动删除旧文件。
 *
 * [BUG修复] 中文文件名 URL 编码问题:
 * 数据库存的是编码后的公网URL (%E3%80%90...)，
 * 但 R2 S3 API 的 Key 是原始中文 (【哲风壁纸】...)。
 * 必须先 decodeURIComponent 才能正确匹配 R2 对象。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
  // Key 中可能含中文，拼接公网 URL 时需要编码每个路径段
  const encodedKey = r2Key.split('/').map(seg => encodeURIComponent(seg)).join('/');
  return `${d}/${encodedKey}`;
}

/**
 * 从公网 URL 提取真实的 R2 Key (解码中文)
 * 这是所有从 URL 反向提取 Key 的唯一入口
 *
 * 例:
 *   输入: "https://r2.example.com/uploads/%E3%80%90哲风%E3%80%91.mp4"
 *   输出: "uploads/【哲风】.mp4"
 */
function extractR2Key(fullUrl) {
  let domain = publicDomain || '';
  if (domain.endsWith('/')) domain = domain.slice(0, -1);
  if (!domain || !fullUrl.startsWith(domain)) return null;
  const rawKey = fullUrl.replace(domain + '/', '');
  // 关键修复: URL 编码的中文解码为原始字符
  try {
    return decodeURIComponent(rawKey);
  } catch(e) {
    return rawKey; // 如果解码失败，原样返回
  }
}

/**
 * 为 R2 Key 生成本地安全文件名 (用 hash 避免中文/特殊字符问题)
 * 例: "uploads/【哲风壁纸】xxx.mp4" -> "r2_a1b2c3d4e5f6.mp4"
 */
function r2KeyToLocalName(r2Key) {
  const ext = path.extname(r2Key) || '';
  const hash = crypto.createHash('md5').update(r2Key).digest('hex').substring(0, 12);
  return `r2_${hash}${ext}`;
}

/**
 * 流式上传本地文件到 R2，支持大文件
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
    const sizeMB = (Buffer.concat(chunks).length / 1024 / 1024).toFixed(1);
    console.log(`[R2] 已拉取: ${r2Key} (${sizeMB}MB)`);
    return true;
  } catch(e) {
    if(e.name!=='NoSuchKey') console.error(`[R2] 拉取失败 ${r2Key}:`, e.message);
    return false;
  }
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

async function listByPrefix(prefix) {
  if (!isR2Enabled() || !ListCmd) return [];
  try {
    const resp = await s3.send(new ListCmd({ Bucket:bucketName, Prefix:prefix }));
    const items = (resp.Contents || []).map(obj => ({
      key: obj.Key, lastModified: obj.LastModified, size: obj.Size, etag: obj.ETag
    }));
    items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    return items;
  } catch(e) { console.error('[R2] 列出对象失败:', e.message); return []; }
}

async function cleanupOldWallpapers(prefix, keepCount = 5) {
  if (!isR2Enabled()) return;
  try {
    const items = await listByPrefix(prefix);
    if (items.length <= keepCount) return;
    const toDelete = items.slice(keepCount);
    console.log(`[R2] 壁纸清理: 保留最新 ${keepCount} 个，删除 ${toDelete.length} 个旧文件...`);
    for (const obj of toDelete) await deleteFromR2(obj.key);
  } catch(e) { console.error('[R2] 壁纸清理异常:', e.message); }
}

// =================================================================
// 壁纸同步轮询
// =================================================================
const UPLOAD_DIR = config.storage.uploadDir;
const CHECK_INTERVAL = parseInt(process.env.BACKUP_INTERVAL) || 30;
let lastSyncedBgUrl = null;

function startWallpaperSync(db) {
  if (!isR2Enabled()) return;
  console.log(`[R2] 启动壁纸同步监控 (检查频率: ${CHECK_INTERVAL}s)...`);

  setInterval(async () => {
    try {
      const bgUrl = await new Promise((resolve) => {
        db.get("SELECT value FROM settings WHERE key='background'", (err, row) => {
          resolve(row ? row.value : '');
        });
      });
      if (!bgUrl) return;

      // 数据库 URL 未变化，跳过 (幂等性)
      if (bgUrl === lastSyncedBgUrl) return;

      // 用统一入口提取解码后的 R2 Key
      const r2Key = extractR2Key(bgUrl);
      if (!r2Key) return; // 不是 R2 URL

      // 本地文件名用 hash 命名，避免中文文件名问题
      const localName = r2KeyToLocalName(r2Key);
      const localPath = path.join(UPLOAD_DIR, localName);

      // 本地已存在同名文件，跳过下载
      if (fs.existsSync(localPath)) {
        lastSyncedBgUrl = bgUrl;
        return;
      }

      const displayName = path.basename(r2Key); // 日志用可读名称
      console.log(`[R2] 检测到壁纸更新: ${displayName}, 正在拉取...`);
      const ok = await downloadFromR2(r2Key, localPath);

      if (ok) {
        lastSyncedBgUrl = bgUrl;
        console.log(`[R2] 壁纸同步完成: ${displayName}`);
      } else {
        console.warn(`[R2] 壁纸拉取失败: ${displayName}, 保留旧文件，下次重试`);
      }
    } catch (e) {
      console.error('[R2] 壁纸同步异常:', e.message);
    }
  }, CHECK_INTERVAL * 1000);
}

module.exports = {
  isR2Enabled, getR2PublicUrl, extractR2Key, r2KeyToLocalName,
  uploadToR2, downloadFromR2, getETag, existsOnR2, deleteFromR2,
  listByPrefix, cleanupOldWallpapers, startWallpaperSync
};
