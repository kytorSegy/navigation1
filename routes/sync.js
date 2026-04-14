/**
 * routes/sync.js - 全能同步大管家 (R2 + Git + SSE 热更新)
 * 彻底修复了 Git diff 历史丢失和 SQLite 伪变更导致的无限回音墙 Bug
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const config = require('../config');
const EventEmitter = require('events');

const syncEvents = new EventEmitter();

// =================================================================
// [模块 1] R2 核心功能 (原封不动保留)
// =================================================================
let s3 = null, PutCmd = null, GetCmd = null, HeadCmd = null, DeleteCmd = null, ListCmd = null;
const { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = config.r2;
const r2Ready = !!(accountId && accessKeyId && secretAccessKey && bucketName);

if (r2Ready) {
  try {
    const sdk = require('@aws-sdk/client-s3');
    s3 = new sdk.S3Client({ region:'auto', endpoint:`https://${accountId}.r2.cloudflarestorage.com`, credentials:{accessKeyId,secretAccessKey} });
    PutCmd = sdk.PutObjectCommand; GetCmd = sdk.GetObjectCommand; HeadCmd = sdk.HeadObjectCommand; DeleteCmd = sdk.DeleteObjectCommand; ListCmd = sdk.ListObjectsV2Command;
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
    const fileStream = fs.createReadStream(localPath);
    const fileSize = fs.statSync(localPath).size;
    await s3.send(new PutCmd({ Bucket: bucketName, Key: r2Key, Body: fileStream, ContentLength: fileSize, ContentType: mimeType || 'application/octet-stream' }));
    const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
    console.log(`[R2] 已上传: ${r2Key} (${sizeMB}MB)`);
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

async function getETag(r2Key) { if (!isR2Enabled()) return null; try { const resp = await s3.send(new HeadCmd({ Bucket:bucketName, Key:r2Key })); return resp.ETag || null; } catch(e) { return null; } }
async function existsOnR2(r2Key) { if (!isR2Enabled()) return false; try { await s3.send(new HeadCmd({Bucket:bucketName,Key:r2Key})); return true; } catch{ return false; } }
async function deleteFromR2(r2Key) { if (!isR2Enabled()) return false; try { await s3.send(new DeleteCmd({Bucket:bucketName,Key:r2Key})); console.log(`[R2] 已删除: ${r2Key}`); return true; } catch(e) { console.error(`[R2] 删除失败 ${r2Key}:`,e.message); return false; } }
async function listByPrefix(prefix) {
  if (!isR2Enabled() || !ListCmd) return [];
  try {
    const resp = await s3.send(new ListCmd({ Bucket:bucketName, Prefix:prefix }));
    const items = (resp.Contents || []).map(obj => ({ key: obj.Key, lastModified: obj.LastModified, size: obj.Size, etag: obj.ETag }));
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
    console.log(`[R2] 壁纸清理: 共 ${items.length} 个文件，删除 ${toDelete.length} 个旧文件...`);
    for (const obj of toDelete) await deleteFromR2(obj.key);
  } catch(e) { console.error('[R2] 壁纸清理异常:', e.message); }
}

// =================================================================
// [模块 2] Git & SQLite 同步逻辑
// =================================================================
const SOURCE_FILE = process.env.DB_PATH || path.join(__dirname, '../database/nav.db');
const BACKUP_DIR = path.join(__dirname, '../nav-backup-repo');
const SQL_FILE = 'nav_data.sql';
const WALLPAPER_URL_FILE = 'wallpaper_url.txt';

function runCmd(cmd, cwd = __dirname) { try { execSync(cmd, { cwd, stdio: 'inherit' }); return true; } catch (e) { return false; } }
function runCmdCapture(cmd, cwd = __dirname) { try { return execSync(cmd, { cwd, stdio: 'pipe' }).toString().trim(); } catch (e) { return ''; } }

// 核心功能：获取文件的真实 MD5 指纹，无视虚假的时间戳修改
function getFileMd5(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  } catch (e) { return null; }
}

function initGitRepo(db) {
  const token = process.env.GITHUB_TOKEN; const repoUrl = process.env.BACKUP_REPO_URL;
  if (!token || !repoUrl) return false;
  let githubUser = process.env.GITHUB_USER; let githubRepo = process.env.GITHUB_REPO;
  if (repoUrl && (!githubUser || !githubRepo)) {
    let tempUrl = repoUrl.replace(/https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    const parts = tempUrl.split('/');
    if(parts.length >= 2) { githubUser = parts[0]; githubRepo = parts[1]; }
  }
  if (!githubUser || !githubRepo) { console.error("[同步] 环境变量解析失败，无法启动 Git 同步。"); return false; }

  const GIT_URL = `https://${githubUser}:${token}@github.com/${githubUser}/${githubRepo}.git`;
  runCmd(`git config --global --add safe.directory ${BACKUP_DIR}`);

  if (!fs.existsSync(BACKUP_DIR)) {
    console.log("[同步] 正在克隆云端仓库...");
    const cloneSuccess = runCmd(`git clone -q "${GIT_URL}" "${BACKUP_DIR}"`);
    if (!cloneSuccess) return false;
    runCmd(`git config user.email "${process.env.GITHUB_EMAIL || 'bot@nav.backup'}"`, BACKUP_DIR);
    runCmd(`git config user.name "${process.env.GITHUB_NAME || 'NavBackupBot'}"`, BACKUP_DIR);

    if (fs.existsSync(path.join(BACKUP_DIR, SQL_FILE))) {
      console.log("[数据库同步] 检测到云端已有备份，执行初始恢复...");
      restoreDbFromSql();
    }
  }
  return true;
}

function restoreDbFromSql() {
  console.log("[数据库同步] 正在将云端 SQL 还原到本地数据库...");
  const tempDb = '/tmp/nav_restore.db';
  if (fs.existsSync(tempDb)) fs.unlinkSync(tempDb);
  
  runCmd(`sqlite3 "${tempDb}" < "${path.join(BACKUP_DIR, SQL_FILE)}"`);
  if (fs.existsSync(tempDb) && fs.statSync(tempDb).size > 0) {
    runCmd(`sqlite3 "${SOURCE_FILE}" ".restore '${tempDb}'"`);
    fs.unlinkSync(tempDb);
    runCmd(`chmod 666 "${SOURCE_FILE}"`);
    console.log("[数据库同步] ✅ 数据库还原完成！系统已平滑热加载新数据。");
    return true;
  } else {
    console.log("[数据库同步] ❌ SQL 转换失败，跳过还原。");
    return false;
  }
}

function exportDbToSql() { runCmd(`sqlite3 "${SOURCE_FILE}" .dump > "${path.join(BACKUP_DIR, SQL_FILE)}"`); }

// =================================================================
// [模块 3] 统一大轮询 (断绝无限循环)
// =================================================================
const CHECK_INTERVAL = parseInt(process.env.BACKUP_INTERVAL) || 30;
let lastSyncedBgUrl = null;
let lastDbMd5 = null; // 记录数据库的真实指纹

function startUnifiedSync(db) {
  const hasGit = initGitRepo(db);
  if (!hasGit && !isR2Enabled()) { console.log('[同步] Git 和 R2 均未配置，大管家进入休眠。'); return; }

  // 初始化时记录当前数据库指纹
  lastDbMd5 = getFileMd5(SOURCE_FILE);
  console.log(`[同步] 启动全能大管家 (每 ${CHECK_INTERVAL} 秒执行一次巡检)...`);

  setInterval(async () => {
    try {
      let dbRestored = false;

      // --- 阶段一：下行同步 (拉取别人的修改) ---
      if (hasGit) {
        runCmd(`git fetch origin main -q`, BACKUP_DIR);
        const behindCount = runCmdCapture(`git rev-list HEAD..origin/main --count`, BACKUP_DIR);
        
        if (parseInt(behindCount) > 0) {
          console.log("[同步] ↓ 发现云端数据有更新，正在拉取...");
          // 【修复点 1】：使用绝对哈希比对，再也不怕刚建的容器没有历史记录报错了！
          const oldHash = runCmdCapture(`git rev-parse HEAD`, BACKUP_DIR);
          runCmd(`git pull origin main --rebase -q`, BACKUP_DIR);
          const newHash = runCmdCapture(`git rev-parse HEAD`, BACKUP_DIR);
          
          const changedFiles = runCmdCapture(`git diff ${oldHash} ${newHash} --name-only`, BACKUP_DIR);
          
          if (changedFiles.includes(SQL_FILE)) {
            dbRestored = restoreDbFromSql();
            
            // 【修复点 2】：如果我们成功拉取了数据，立刻更新指纹缓存。
            // 告诉系统：“这是我刚拉下来的，别傻乎乎地又推上去！”
            if (dbRestored) {
              lastDbMd5 = getFileMd5(SOURCE_FILE);
            }
          }
        }
      }

      // --- 阶段二：R2 壁纸对齐 (填补时间差) ---
      const bgUrl = await new Promise(res => db.get("SELECT value FROM settings WHERE key='background'", (err, row) => res(row ? row.value : '')));
      
      if (bgUrl && bgUrl !== lastSyncedBgUrl && publicDomain && bgUrl.startsWith(publicDomain)) {
        const r2Key = bgUrl.replace(publicDomain + '/', '').replace(/^\//, '');
        const fileName = path.basename(r2Key);
        const localPath = path.join(__dirname, '../database/uploads', fileName);

        if (!fs.existsSync(localPath)) {
          console.log(`[R2] 发现新壁纸: ${fileName}, 正在拉取...`);
          const ok = await downloadFromR2(r2Key, localPath);
          if (ok) {
            console.log(`[R2] 壁纸同步完成: ${fileName}`);
            lastSyncedBgUrl = bgUrl;
            syncEvents.emit('update_needed'); 
          }
        } else { lastSyncedBgUrl = bgUrl; }
      } else if (dbRestored) {
        syncEvents.emit('update_needed');
      }

      // --- 阶段三：上行同步 (把本地真正的修改发给云端) ---
      if (hasGit && fs.existsSync(SOURCE_FILE)) {
        // 【修复点 3】：用真实的 MD5 指纹，无视 SQLite 偷偷修改的时间戳
        const currentMd5 = getFileMd5(SOURCE_FILE);
        
        if (currentMd5 && currentMd5 !== lastDbMd5) {
          await new Promise(r => setTimeout(r, 2000));
          
          exportDbToSql();
          const bgType = await new Promise(res => db.get("SELECT value FROM settings WHERE key='bg_type'", (err, row) => res(row ? row.value : 'auto')));
          fs.writeFileSync(path.join(BACKUP_DIR, WALLPAPER_URL_FILE), `url=${bgUrl}\ntype=${bgType}\n`);

          runCmd(`git add "${SQL_FILE}" "${WALLPAPER_URL_FILE}"`, BACKUP_DIR);
          
          // 【终极保险】：就算 MD5 因为 SQLite 内部碎片变了，只要生成的 SQL 文本完全一样，
          // Git Porcelain 检测不到实质内容改变，就会拦截这次推送，绝不死循环！
          const hasChanges = runCmdCapture(`git status --porcelain`, BACKUP_DIR);
          
          if (hasChanges) {
            console.log("[同步] ↑ 检测到本地数据库变化，准备备份...");
            const msg = `数据库更新: ${new Date().toLocaleString()}`;
            try {
              execSync(`git commit -q -m "${msg}"`, { cwd: BACKUP_DIR, stdio: 'inherit' });
              const pushResult = runCmd(`git push origin main -q`, BACKUP_DIR);
              if (pushResult) console.log("[同步] 🎉 推送成功！云端数据已是最新状态。");
            } catch (e) {}
          }
          // 不管有没有推送，既然处理完了，就更新指纹缓存
          lastDbMd5 = currentMd5;
        }
      }

    } catch (e) {
      console.error('[同步] 巡检异常:', e.message);
    }
  }, CHECK_INTERVAL * 1000);
}

module.exports = {
  isR2Enabled, getR2PublicUrl, uploadToR2, downloadFromR2,
  getETag, existsOnR2, deleteFromR2,
  listByPrefix, cleanupOldWallpapers, startUnifiedSync, syncEvents 
};
