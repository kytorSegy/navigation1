<template>
  <div class="system-manage">
    <div class="system-header"><h2 class="section-title">系统全局设置</h2></div>
    <div class="system-card">
      <div class="form-group">
        <label>网站浏览器标题：</label>
        <input v-model="siteTitle" class="input" placeholder="请输入你的专属导航网站标题" />
      </div>
      <div class="form-group">
        <label>网站动态壁纸 / 背景图链接：</label>
        <input v-model="bgUrl" class="input" placeholder="请输入视频链接 (.mp4/.webm) 或图片链接" />
      </div>
      <div class="form-group">
        <label>壁纸类型：</label>
        <div class="type-selector">
          <button :class="['type-btn', { active: bgType === 'auto' }]" @click="bgType = 'auto'">🔄 自动</button>
          <button :class="['type-btn', { active: bgType === 'video' }]" @click="bgType = 'video'">🎬 视频</button>
          <button :class="['type-btn', { active: bgType === 'image' }]" @click="bgType = 'image'">🖼️ 图片</button>
        </div>
      </div>
      <button class="detect-btn" @click="handleDetect" :disabled="!bgUrl.trim() || detecting">{{ detecting ? '正在检测链接类型...' : '🔍 检测链接类型（适用于无后缀名的链接）' }}</button>
      <p v-if="detectResult" :class="['detect-result', detectResult.type]">
        <template v-if="detectResult.type === 'video'">✅ 检测结果：视频文件 — 将作为动态壁纸播放</template>
        <template v-else-if="detectResult.type === 'image'">✅ 检测结果：图片文件</template>
        <template v-else>⚠️ 无法自动识别，请手动选择「视频」或「图片」类型</template>
      </p>
      <p class="help-text">
        💡 <b>新手提示</b>：<br/>
        1. <b>动态壁纸</b>：支持 <code>.mp4</code>, <code>.webm</code> 格式视频链接，也支持<b>无后缀名</b>的视频链接（如好壁纸网站的链接）。<br/>
        2. <b>静态壁纸</b>：支持 <code>.jpg</code>, <code>.png</code>, <code>.webp</code> 图片链接。<br/>
        3. <b>无后缀链接</b>：点击「检测链接类型」自动识别，或手动选择壁纸类型为「视频」。<br/>
        4. <b>清空恢复</b>：清空链接将恢复默认星空背景。
      </p>
      <button class="btn" @click="handleSave" :disabled="loading">{{ loading ? '保存中...' : '保存全局设置' }}</button>
      <p v-if="message" :class="['message', messageType]">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getConfig, updateConfig, detectMedia } from '../../api';

const siteTitle = ref('');
const bgUrl = ref('');
const bgType = ref('auto');
const loading = ref(false);
const message = ref('');
const messageType = ref('success');
const detecting = ref(false);
const detectResult = ref(null);

onMounted(async () => {
  try {
    const res = await getConfig();
    siteTitle.value = res.data.title || '';
    bgType.value = res.data.bg_type || 'auto';
    let url = res.data.background || '';
    if (url.includes('/api/background?url=')) url = decodeURIComponent(url.split('url=')[1]);
    bgUrl.value = url;
  } catch (err) { console.error('获取配置失败:', err); }
});

async function handleDetect() {
  if (!bgUrl.value.trim()) return;
  detecting.value = true; detectResult.value = null;
  try {
    const res = await detectMedia(bgUrl.value.trim());
    detectResult.value = res.data;
    if (res.data.type === 'video') bgType.value = 'video';
    else if (res.data.type === 'image') bgType.value = 'image';
  } catch { detectResult.value = { type: 'unknown' }; }
  finally { detecting.value = false; }
}

async function handleSave() {
  loading.value = true; message.value = '';
  try {
    await updateConfig({ title: siteTitle.value, background: bgUrl.value, bg_type: bgType.value });
    message.value = '设置保存成功！快去首页刷新看看效果吧！';
    messageType.value = 'success';
    if (siteTitle.value) document.title = siteTitle.value;
  } catch (err) {
    message.value = '保存失败：' + (err.response?.data?.error || err.message);
    messageType.value = 'error';
  } finally { loading.value = false; setTimeout(() => message.value = '', 5000); }
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
.type-selector { display: flex; gap: 10px; }
.type-btn { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #d0d7e2; background: #fff; color: #555; font-size: 14px; cursor: pointer; text-align: center; transition: all 0.2s; }
.type-btn.active { background: #2566d8; color: #fff; border-color: #2566d8; }
.type-btn:hover:not(.active) { border-color: #2566d8; color: #2566d8; }
.detect-btn { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d0d7e2; background: #f8f9fa; color: #555; font-size: 14px; cursor: pointer; margin-bottom: 10px; }
.detect-btn:hover:not(:disabled) { background: #e2e8f0; }
.detect-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.detect-result { font-size: 14px; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; }
.detect-result.video { background: #d1fae5; color: #065f46; }
.detect-result.image { background: #dbeafe; color: #1e40af; }
.detect-result.unknown { background: #fef3c7; color: #92400e; }
.help-text { font-size: 0.95rem; color: #555; line-height: 1.8; background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #2566d8; margin-bottom: 20px; }
.btn { background: #2566d8; color: #fff; border: none; border-radius: 8px; padding: 12px 24px; cursor: pointer; font-size: 1rem; font-weight: 500; transition: background 0.2s; }
.btn:hover:not(:disabled) { background: #174ea6; }
.message { margin-top: 15px; padding: 12px; border-radius: 8px; }
.message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
@media (max-width: 768px) { .system-manage { width: 100%; padding: 0 4vw; } }
</style>
