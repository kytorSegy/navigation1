/**
 * routes/r2sync.js - Cloudflare R2 同步核心模块
 *
 * 所有 R2 读写逻辑的唯一入口，其他文件一律 require 本模块。
 * 当 5 个环境变量 (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID /
 * R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_DOMAIN)
 * 任一缺失时，模块自动降级为 "仅本地存储"，不会报错。
 */

const fs   = require('fs');
const path = require('path');
const config = require('../config');

let s3         = null;
let PutCmd     = null;
let GetCmd     = null;
let HeadCmd    = null;
let DeleteCmd  = null;

// ---------- 初始化 ----------
const { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = config.r2;
const r2Ready = !!(accountId && accessKeyId && secretAccessKey && bucketName);

if (r2Ready) {
  try {
    const { S3Client, PutObjectCommand, GetObjectCommand,
            HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    PutCmd    = PutObjectCommand;
    GetCmd    = GetObjectCommand;
    HeadCmd   = HeadObjectCommand;
    DeleteCmd = DeleteObjectCommand;
    console.log('[R2] Cloudflare R2 已连接, Bucket:', bucketName);
  } catch (e) {
    console.warn('[R2] @aws-sdk/client-s3 未安装，R2 同步已禁用');
  }
}

function isR2Enabled() {
  return !!(s3 && r2Ready);
}

function getR2PublicUrl(r2Key) {
  if (!publicDomain) return null;
  let domain = publicDomain;
  if (domain.endsWith('/')) domain = domain.slice(0, -1);
  return `${domain}/${r2Key}`;
}

/**
 * 上传本地文件到R2
 * @param {string} localPath  本地绝对路径
 * @param {string} r2Key      R2 对象 Key, 如 "uploads/bg_xxx.jpg"
 * @param {string} mimeType   MIME 类型
 * @returns {string|null}     成功返回公网 URL, 失败或未启用返回 null
 */
async function uploadToR2(localPath, r2Key, mimeType) {
  if (!isR2Enabled()) return null;
  try {
    const buffer = fs.readFileSync(localPath);
    await s3.send(new PutCmd({
      Bucket: bucketName,
      Key:    r2Key,
      Body:   buffer,
      ContentType: mimeType || 'application/octet-stream',
    }));
    const url = getR2PublicUrl(r2Key);
    console.log(`[R2] UP 已上传: ${r2Key}`);
    return url;
  } catch (e) {
    console.error(`[R2] UP 上传失败 ${r2Key}:`, e.message);
    return null;
  }
}

/**
 * 从 R2 下载文件到本地缓存
 * @param {string} r2Key      R2 对象 Key
 * @param {string} localPath  本地保存路径
 * @returns {boolean}         是否成功
 */
async function downloadFromR2(r2Key, localPath) {
  if (!isR2Enabled()) return false;
  try {
    const resp = await s3.send(new GetCmd({
      Bucket: bucketName,
      Key:    r2Key,
    }));
    const chunks = [];
    for await (const chunk of resp.Body) {
      chunks.push(chunk);
    }
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localPath, Buffer.concat(chunks));
    console.log(`[R2] DOWN 已拉取: ${r2Key}`);
    return true;
  } catch (e) {
    if (e.name !== 'NoSuchKey') {
      console.error(`[R2] DOWN 拉取失败 ${r2Key}:`, e.message);
    }
    return false;
  }
}

/**
 * 检测 R2 上是否存在指定对象
 */
async function existsOnR2(r2Key) {
  if (!isR2Enabled()) return false;
  try {
    await s3.send(new HeadCmd({ Bucket: bucketName, Key: r2Key }));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 删除 R2 上的对象
 */
async function deleteFromR2(r2Key) {
  if (!isR2Enabled()) return false;
  try {
    await s3.send(new DeleteCmd({ Bucket: bucketName, Key: r2Key }));
    console.log(`[R2] DEL 已删除: ${r2Key}`);
    return true;
  } catch (e) {
    console.error(`[R2] DEL 删除失败 ${r2Key}:`, e.message);
    return false;
  }
}

module.exports = {
  isR2Enabled,
  getR2PublicUrl,
  uploadToR2,
  downloadFromR2,
  existsOnR2,
  deleteFromR2,
};
