<template>
  <div class="system-manage">
    <div class="system-header">
      <h2 class="section-title">系统全局设置</h2>
      <span v-if="r2Status !== null" class="r2-badge" :class="r2Status ? 'on' : 'off'">{{ r2Status ? 'R2 同步已启用' : 'R2 未配置' }}</span>
    </div>
    <div class="system-card">
      <div class="form-group">
        <label>网站标题</label>
        <input v-model="siteTitle" class="input" placeholder="你的导航网站标题" />
      </div>

      <div class="form-group">
        <label>壁纸链接</label>
        <input v-model="bgUrl" class="input" :class="{'r2-url': isR2Url}" placeholder="视频(.mp4/.webm) 或 图片链接，留空恢复默认" readonly />
        <p v-if="isR2Url" class="r2-url-hint">R2 公网地址，所有容器自动同步</p>
      </div>

      <div class="form-group">
        <label>壁纸类型</label>
        <div class="type-selector">
          <button :class="['type-btn', { active: bgType === 'auto' }]" @click="bgType = 'auto'">自动</button>
          <button :class="['type-btn', { active: bgType === 'video' }]" @click="bgType = 'video'">视频</button>
          <button :class="['type-btn', { active: bgType === 'image' }]" @click="bgType = 'image'">图片</button>
        </div>
      </div>

      <button class="btn save-btn" @click="handleSave" :disabled="loading">{{ loading ? '保存中...' : '保存设置' }}</button>

      <details class="advanced-section">
        <summary>上传本地壁纸</summary>
        <div class="advanced-body">
          <p class="hint">上传图片或视频到服务器{{ r2Status ? '，自动同步到 R2 并更新壁纸链接' : '' }}。</p>
          <input type="file" @change="handleFileUpload" accept="image/*,video/*" />
          <div v-if="uploading" class="status-text loading">正在上传...</div>
          <div v-if="uploadResult" class="status-text success">
            上传成功{{ uploadResult.r2_synced ? ', R2 已同步' : '' }}，壁纸链接已更新
          </div>
        </div>
      </details>

      <details class="advanced-section">
        <summary>缓存网络资源到服务器</summary>
        <div class="advanced-body">
          <p class="hint">下载网络图片/视频到{{ r2Status ? ' R2' : '本地' }}，避免每次访问都走外网。</p>
          <input v-model="cacheUrl" class="input" placeholder="输入网络链接" />
          <button class="cache-btn" @click="handleCache" :disabled="!cacheUrl.trim()||caching">{{ caching ? '缓存中...' : '下载并缓存' }}</button>
          <div v-if="cacheResult" class="status-text success">缓存成功{{ cacheResult.r2_synced ? ', R2 已同步' : '' }}</div>
        </div>
      </details>

      <p v-if="message" :class="['message', messageType]">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getConfig, updateConfig } from '../../api';

const siteTitle = ref(''); const bgUrl = ref(''); const bgType = ref('auto');
const loading = ref(false); const message = ref(''); const messageType = ref('success');
const uploading = ref(false); const uploadResult = ref(null);
const cacheUrl = ref(''); const caching = ref(false); const cacheResult = ref(null);
const r2Status = ref(null); const r2Domain = ref('');

const isR2Url = computed(() => r2Domain.value && bgUrl.value && bgUrl.value.startsWith(r2Domain.value));

onMounted(async () => {
  try {
    const res = await getConfig();
    siteTitle.value = res.data.title || '';
    bgType.value = res.data.bg_type || 'auto';
    r2Status.value = res.data.r2_enabled || false;
    let url = res.data.background || '';
    // 还原代理 URL
    if (url.includes('/api/background?url=')) url = decodeURIComponent(url.split('url=')[1]);
    bgUrl.value = url;
    // 获取 R2 域名用于判断
    if (r2Status.value) {
      try {
        const r2Res = await fetch('/api/r2/status', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        const r2Data = await r2Res.json();
        r2Domain.value = r2Data.publicDomain || '';
      } catch(e) {}
    }
  } catch (err) { console.error('获取配置失败:', err); }
});

async function handleFileUpload(event) {
  const file = event.target.files[0]; if (!file) return;
  uploading.value = true; uploadResult.value = null;
  const formData = new FormData(); formData.append('file', file);
  try {
    const resp = await fetch('/api/upload?type=wallpaper', { method:'POST', body:formData, headers:{'Authorization':'Bearer '+localStorage.getItem('token')} });
    const result = await resp.json();
    if (result.url) {
      // url 已经是 R2 公网地址 (或本地路径)
      bgUrl.value = result.url;
      bgType.value = result.type || (file.type.includes('video')?'video':'image');
      uploadResult.value = result;
      message.value = '上传成功，壁纸已更新！请点击保存设置确认标题和类型。';
      messageType.value = 'success';
    } else throw new Error(result.error||'上传失败');
  } catch(e) { message.value = '上传失败: '+e.message; messageType.value = 'error'; }
  finally { uploading.value = false; }
}

async function handleCache() {
  if (!cacheUrl.value.trim()) return;
  caching.value = true; cacheResult.value = null;
  try {
    const resp = await fetch('/api/upload/fetch-and-cache', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token')}, body:JSON.stringify({url:cacheUrl.value}) });
    const result = await resp.json();
    if (result.success) {
      bgUrl.value = result.url; // R2 公网 URL 或本地路径
      bgType.value = result.recommended_type||result.type||'auto';
      cacheResult.value = result;
      message.value = '缓存成功，请保存设置'; messageType.value = 'success';
    } else throw new Error(result.error);
  } catch(e) { message.value = '缓存失败: '+e.message; messageType.value = 'error'; }
  finally { caching.value = false; }
}

async function handleSave() {
  loading.value = true; message.value = '';
  try {
    await updateConfig({ title: siteTitle.value, background: bgUrl.value, bg_type: bgType.value });
    message.value = '保存成功！'; messageType.value = 'success';
    if (siteTitle.value) document.title = siteTitle.value;
  } catch(err) { message.value = '保存失败: '+(err.response?.data?.error||err.message); messageType.value = 'error'; }
  finally { loading.value = false; setTimeout(()=>message.value='', 5000); }
}
</script>

<style scoped>
.system-manage { max-width: 1400px; width: 90%; margin: 0 auto; }
.system-header { margin-bottom: 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.section-title { font-size: 1.5rem; font-weight: bold; color: #2566d8; margin-top: 2rem; }
.r2-badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; margin-top: 2rem; }
.r2-badge.on { background: #d1fae5; color: #065f46; } .r2-badge.off { background: #f3f4f6; color: #6b7280; }
.system-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); padding: 30px; max-width: 700px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: #222; font-size: 0.95rem; }
.input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #d0d7e2; font-size: 0.95rem; box-sizing: border-box; }
.input:focus { outline: 2px solid #2566d8; border-color: #2566d8; }
.input.r2-url { background: #f0fdf4; border-color: #86efac; color: #166534; }
.r2-url-hint { font-size: 0.78rem; color: #059669; margin-top: 4px; }
.type-selector { display: flex; gap: 8px; }
.type-btn { flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #d0d7e2; background: #fff; color: #555; font-size: 13px; cursor: pointer; text-align: center; transition: 0.2s; }
.type-btn.active { background: #2566d8; color: #fff; border-color: #2566d8; }
.type-btn:hover:not(.active) { border-color: #2566d8; color: #2566d8; }
.save-btn { width: 100%; background: #2566d8; color: #fff; border: none; border-radius: 8px; padding: 12px; cursor: pointer; font-size: 1rem; font-weight: 600; margin-top: 4px; margin-bottom: 16px; }
.save-btn:hover:not(:disabled) { background: #174ea6; }
.advanced-section { margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.advanced-section summary { padding: 10px 14px; cursor: pointer; font-size: 0.9rem; color: #6b7280; font-weight: 500; }
.advanced-section summary:hover { color: #2566d8; }
.advanced-body { padding: 12px 14px 14px; border-top: 1px solid #f3f4f6; }
.hint { font-size: 0.82rem; color: #888; margin-bottom: 8px; }
.cache-btn { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #d0d7e2; background: #f8f9fa; color: #555; font-size: 13px; cursor: pointer; margin-top: 6px; }
.cache-btn:hover:not(:disabled) { background: #e2e8f0; } .cache-btn:disabled { opacity: 0.5; }
.status-text { font-size: 0.82rem; margin-top: 6px; } .status-text.loading { color: #e67e22; } .status-text.success { color: #059669; }
.message { margin-top: 12px; padding: 10px; border-radius: 8px; font-size: 0.9rem; text-align: center; }
.message.success { background: #d4edda; color: #155724; } .message.error { background: #f8d7da; color: #721c24; }
@media (max-width: 768px) { .system-manage { width: 100%; padding: 0 4vw; } }
</style>
