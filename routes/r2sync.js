/**
 * routes/r2sync.js - Cloudflare R2 同步核心模块
 *
 * 所有 R2 读写逻辑的唯一入口。
 * 日志风格与 backup.sh 保持一致: [R2] 前缀 + 中文描述。
 * 未配置时自动降级，不报错。
 *
 * 壁纸同步轮询: 与 backup.sh 相同频率 (BACKUP_INTERVAL, 默认 30s)
 * 通过 ETag 检测变更，幂等且容错。
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

let s3 = null, PutCmd = null, GetCmd = null, HeadCmd = null, DeleteCmd = null;
const { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = config.r2;
const r2Ready = !!(accountId && accessKeyId && secretAccessKey && bucketName);

if (r2Ready) {
  try {
    const { S3Client, PutObjectCommand, GetObjectCommand,
            HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    s3 = new S3Client({ region:'auto', endpoint:`https://${accountId}.r2.cloudflarestorage.com`, credentials:{accessKeyId,secretAccessKey} });
    PutCmd=PutObjectCommand; GetCmd=GetObjectCommand; HeadCmd=HeadObjectCommand; DeleteCmd=DeleteObjectCommand;
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

async function uploadToR2(localPath, r2Key, mimeType) {
  if (!isR2Enabled()) return null;
  try {
    await s3.send(new PutCmd({ Bucket:bucketName, Key:r2Key, Body:fs.readFileSync(localPath), ContentType:mimeType||'application/octet-stream' }));
    console.log(`[R2] 已上传: ${r2Key}`);
    return getR2PublicUrl(r2Key);
  } catch(e) { console.error(`[R2] 上传失败 ${r2Key}:`, e.message); return null; }
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

/**
 * 获取 R2 对象的 ETag，用于变更检测
 * @returns {string|null} ETag 字符串，不存在或失败返回 null
 */
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

// =================================================================
// 壁纸同步轮询 - 与 backup.sh 相同频率
// 通过 ETag 检测变更，幂等且容错
// =================================================================
const UPLOAD_DIR = config.storage.uploadDir;
const CHECK_INTERVAL = parseInt(process.env.BACKUP_INTERVAL) || 30; // 与 backup.sh 一致
let lastWallpaperETag = null;

/**
 * 启动壁纸同步轮询
 * 需要在 app.js 启动时调用，传入 db 实例用于读取当前壁纸设置
 */
function startWallpaperSync(db) {
  if (!isR2Enabled()) return;
  console.log(`[R2] 启动壁纸同步监控 (检查频率: ${CHECK_INTERVAL}s, 与数据库同步一致)...`);

  setInterval(async () => {
    try {
      // 从数据库读取当前壁纸设置
      const bgUrl = await new Promise((resolve) => {
        db.get("SELECT value FROM settings WHERE key='background'", (err, row) => {
          resolve(row ? row.value : '');
        });
      });

      if (!bgUrl) return; // 未设置壁纸

      // 只处理 R2 公网 URL (以 publicDomain 开头)
      let domain = publicDomain || '';
      if (domain.endsWith('/')) domain = domain.slice(0, -1);
      if (!domain || !bgUrl.startsWith(domain)) return; // 不是 R2 URL，跳过

      // 提取 R2 Key
      const r2Key = bgUrl.replace(domain + '/', '');
      const fileName = path.basename(r2Key);
      const localPath = path.join(UPLOAD_DIR, fileName);

      // 通过 ETag 检测变更 (幂等性: 相同则跳过)
      const currentETag = await getETag(r2Key);
      if (!currentETag) return; // R2 上不存在或获取失败

      if (currentETag === lastWallpaperETag) return; // 未变更，跳过

      // 发现变更，拉取最新壁纸
      console.log(`[R2] 检测到壁纸更新 (ETag: ${currentETag.substring(0,12)}...), 正在拉取...`);
      const ok = await downloadFromR2(r2Key, localPath);

      if (ok) {
        lastWallpaperETag = currentETag;
        console.log('[R2] 壁纸同步完成，本地已更新');
      } else {
        // 容错: 下载失败保留旧壁纸，下次轮询重试
        console.warn('[R2] 壁纸拉取失败，保留旧文件，将在下次检查时重试');
      }
    } catch (e) {
      console.error('[R2] 壁纸同步异常:', e.message);
    }
  }, CHECK_INTERVAL * 1000);
}

module.exports = { isR2Enabled, getR2PublicUrl, uploadToR2, downloadFromR2, getETag, existsOnR2, deleteFromR2, startWallpaperSync };
