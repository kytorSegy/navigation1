/**
 * routes/r2sync.js - Cloudflare R2 同步核心模块
 *
 * 所有 R2 读写逻辑的唯一入口。
 * 日志风格与 backup.sh 保持一致：[R2] 前缀 + 中文描述。
 * 未配置时自动降级，不报错。
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

async function existsOnR2(r2Key) {
  if (!isR2Enabled()) return false;
  try { await s3.send(new HeadCmd({Bucket:bucketName,Key:r2Key})); return true; } catch{ return false; }
}

async function deleteFromR2(r2Key) {
  if (!isR2Enabled()) return false;
  try { await s3.send(new DeleteCmd({Bucket:bucketName,Key:r2Key})); console.log(`[R2] 已删除: ${r2Key}`); return true; }
  catch(e) { console.error(`[R2] 删除失败 ${r2Key}:`,e.message); return false; }
}

module.exports = { isR2Enabled, getR2PublicUrl, uploadToR2, downloadFromR2, existsOnR2, deleteFromR2 };
