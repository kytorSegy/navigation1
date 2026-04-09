<template>
  <div class="system-manage">
    <div class="system-header">
      <h2 class="section-title">系统全局设置</h2>
    </div>
    <div class="system-card">
      
      <div class="form-group">
        <label>网站浏览器标题：</label>
        <input v-model="siteTitle" class="input" placeholder="请输入你的专属导航网站标题" />
      </div>

      <div class="form-group">
        <label>壁纸设置方式：</label>
        <div class="upload-tabs">
          <button @click="uploadMode = 'local'" :class="{active: uploadMode === 'local'}">📁 本地视频或图片</button>
          <button @click="uploadMode = 'network'" :class="{active: uploadMode === 'network'}">🌐 网络壁纸</button>
        </div>
      </div>

      <!-- 本地上传模式 -->
      <div v-if="uploadMode === 'local'" class="tab-content local-upload-box">
        <p class="hint">选择本地图片或视频文件，上传并保存到服务器本地存储 (/app/database/uploads/)。</p>
        <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*,video/*" />
        <div v-if="uploading" class="loading-text">正在上传到服务器，请稍候...</div>
        <div v-if="uploadSuccess" class="success-text">✅ 文件上传成功！已自动填充到下方。</div>
      </div>

      <!-- 网络链接模式 -->
      <div v-if="uploadMode === 'network'" class="tab-content network-upload-box">
        <p class="hint">输入网络图片或视频链接。可直接保存链接，也可点击“下载并缓存”将资源存到服务器。</p>
        <input v-model="networkUrl" class="input" placeholder="请输入网络视频或图片链接" />
        <div class="network-actions">
          <button class="action-btn cache-btn" @click="handleCacheNetwork" :disabled="!networkUrl.trim() || caching">
            {{ caching ? '正在下载并缓存...' : '⬇️ 下载并缓存到服务器' }}
          </button>
          <button class="action-btn direct-btn" @click="useNetworkDirect" :disabled="!networkUrl.trim()">
            🔗 直接使用网络链接
          </button>
        </div>
        <div v-if="recommendedType" class="recommend-tip">
          💡 自动识别类型：<strong>{{ recommendedType === 'video' ? '视频' : '图片' }}</strong>（已自动选择，您可手动修改）
        </div>
      </div>

      <div class="form-group current-bg-info">
        <label>当前待保存的壁纸路径：</label>
        <input v-model="bgUrl" class="input" placeholder="上方操作后自动生成，也可手动编辑" />
      </div>

      <div class="form-group">
        <label>确认壁纸类型（管理员有最终决定权）：</label>
        <div class="type-selector">
          <button :class="['type-btn', { active: bgType === 'auto' }]" @click="bgType = 'auto'">🔄 自动判断</button>
          <button :class="['type-btn', { active: bgType === 'video' }]" @click="bgType = 'video'">🎬 视频</button>
          <button :class="['type-btn', { active: bgType === 'image' }]" @click="bgType = 'image'">🖼️ 图片</button>
        </div>
      </div>

      <button class="btn save-btn" @click="handleSave" :disabled="loading">{{ loading ? '保存中...' : '保存全局设置' }}</button>
      <p v-if="message" :class="['message', messageType]">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getConfig, updateConfig } from '../../api';

const siteTitle = ref('');
const bgUrl = ref('');
const bgType = ref('auto');
const loading = ref(false);
const message = ref('');
const messageType = ref('success');

const uploadMode = ref('local');
const fileInput = ref(null);
const uploading = ref(false);
const uploadSuccess = ref(false);
const networkUrl = ref('');
const caching = ref(false);
const recommendedType = ref('');

onMounted(async () => {
  try {
    const res = await getConfig();
    siteTitle.value = res.data.title || '';
    bgType.value = res.data.bg_type || 'auto';

    let url = res.data.background || '';
    if (url.includes('/api/background?url=')) {
      url = decodeURIComponent(url.split('url=')[1]);
    }
    bgUrl.value = url;
  } catch (err) {
    console.error('获取配置失败:', err);
  }
});

// 【功能 1】本地文件上传到服务器
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  uploading.value = true;
  uploadSuccess.value = false;
  
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload?type=wallpaper', {
      method: 'POST',
      body: formData,
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    });
    const result = await response.json();
    if (result.url) {
      bgUrl.value = result.url;
      bgType.value = result.type || (file.type.includes('video') ? 'video' : 'image');
      uploadSuccess.value = true;
      message.value = '文件上传成功！请点击【保存全局设置】应用。';
      messageType.value = 'success';
    } else {
      throw new Error(result.error || '上传失败');
    }
  } catch (error) {
    message.value = '上传报错: ' + error.message;
    messageType.value = 'error';
  } finally {
    uploading.value = false;
  }
}

// 【功能 2】网络资源下载并缓存到服务器
async function handleCacheNetwork() {
  if (!networkUrl.value.trim()) return;
  caching.value = true;
  message.value = '';
  recommendedType.value = '';
  try {
    const response = await fetch('/api/upload/fetch-and-cache', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({ url: networkUrl.value })
    });
    const result = await response.json();
    if (result.success) {
      bgUrl.value = result.url;
      recommendedType.value = result.recommended_type || result.type;
      bgType.value = result.recommended_type || result.type || 'auto';
      message.value = '网络资源已缓存到服务器！请点击【保存全局设置】应用。';
      messageType.value = 'success';
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    message.value = '缓存失败：' + error.message;
    messageType.value = 'error';
  } finally {
    caching.value = false;
  }
}

// 【功能 3】直接使用网络链接（不下载）
function useNetworkDirect() {
  if (!networkUrl.value.trim()) return;
  bgUrl.value = networkUrl.value.trim();
  // 自动判断类型并推荐
  const lower = networkUrl.value.toLowerCase();
  if (lower.match(/\.(mp4|webm|ogg)(\?|$)/)) {
    bgType.value = 'video';
    recommendedType.value = 'video';
  } else if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/)) {
    bgType.value = 'image';
    recommendedType.value = 'image';
  } else {
    recommendedType.value = '';
  }
  message.value = '已填充网络链接，请点击【保存全局设置】应用。';
  messageType.value = 'success';
}

// 保存到数据库
async function handleSave() {
  loading.value = true;
  message.value = '';
  try {
    await updateConfig({ 
      title: siteTitle.value,
      background: bgUrl.value,
      bg_type: bgType.value
    });
    message.value = '设置保存成功！快去首页刷新看看效果吧！';
    messageType.value = 'success';
    if (siteTitle.value) document.title = siteTitle.value;
  } catch (err) {
    message.value = '保存失败：' + (err.response?.data?.error || err.message);
    messageType.value = 'error';
  } finally {
    loading.value = false;
    setTimeout(() => message.value = '', 5000);
  }
}
</script>

<style scoped>
.system-manage { max-width: 1400px; width: 90%; margin: 0 auto; }
.system-header { margin-bottom: 20px; }
.section-title { font-size: 1.5rem; font-weight: bold; color: #2566d8; margin-top: 2rem; }
.system-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); padding: 30px; max-width: 800px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 10px; font-weight: bold; color: #222; font-size: 1.1rem; }
.input { width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid #d0d7e2; font-size: 1rem; box-sizing: border-box; margin-bottom: 10px; }
.input:focus { outline: 2px solid #2566d8; border-color: #2566d8; }
.upload-tabs { display: flex; gap: 10px; margin-bottom: 15px; }
.upload-tabs button { flex: 1; padding: 14px; border-radius: 8px; border: 1px solid #d0d7e2; background: #f8f9fa; cursor: pointer; font-weight: bold; font-size: 1rem; transition: 0.2s; }
.upload-tabs button.active { background: #2566d8; color: white; border-color: #2566d8; }
.tab-content { background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px dashed #d0d7e2; margin-bottom: 20px; }
.hint { font-size: 0.9rem; color: #666; margin-bottom: 12px; line-height: 1.6; }
.loading-text { color: #e67e22; font-weight: bold; margin-top: 10px; }
.success-text { color: #27ae60; font-weight: bold; margin-top: 10px; }
.network-actions { display: flex; gap: 10px; margin-top: 10px; }
.action-btn { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #d0d7e2; font-weight: bold; font-size: 13px; cursor: pointer; transition: 0.2s; }
.cache-btn { background: #e0f2fe; color: #0369a1; }
.cache-btn:hover { background: #bae6fd; }
.cache-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.direct-btn { background: #f0fdf4; color: #15803d; }
.direct-btn:hover { background: #dcfce7; }
.direct-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.recommend-tip { margin-top: 10px; padding: 8px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 0.85rem; color: #92400e; }
.type-selector { display: flex; gap: 10px; }
.type-btn { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #d0d7e2; background: #fff; color: #555; font-size: 14px; cursor: pointer; text-align: center; transition: all 0.2s; }
.type-btn.active { background: #2566d8; color: #fff; border-color: #2566d8; }
.save-btn { width: 100%; background: #2566d8; color: #fff; border: none; border-radius: 8px; padding: 14px 24px; cursor: pointer; font-size: 1.1rem; font-weight: bold; margin-top: 10px; }
.message { margin-top: 15px; padding: 12px; border-radius: 8px; font-weight: bold; text-align: center; }
.message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
</style>
