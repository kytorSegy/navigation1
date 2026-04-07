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
        <label>网站动态壁纸 / 背景图链接：</label>
        <input v-model="bgUrl" class="input" placeholder="请输入视频链接 (.mp4/.webm) 或图片链接" />
        <p class="help-text">
          💡 <b>新手提示</b>：<br/>
          1. <b>动态壁纸</b>：支持网络上的 <code>.mp4</code>, <code>.webm</code> 格式视频链接。你可以从 Wallpaper Engine 等工具中提取视频文件，存到 Github 或其他图床服务器，然后把链接粘到这里。<br/>
          2. <b>静态壁纸</b>：依然支持普通的 <code>.jpg</code>, <code>.png</code>, <code>.webp</code> 图片链接。<br/>
          3. <b>清空恢复</b>：如果将这里清空留白，首页将自动恢复为系统默认的星空背景。
        </p>
      </div>

      <button class="btn" @click="handleSave" :disabled="loading">
        {{ loading ? '保存中...' : '保存全局设置' }}
      </button>
      <p v-if="message" :class="['message', messageType]">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getConfig, updateConfig } from '../../api';

const siteTitle = ref(''); // 新增：用来绑定标题数据
const bgUrl = ref('');
const loading = ref(false);
const message = ref('');
const messageType = ref('success');

onMounted(async () => {
  try {
    const res = await getConfig();
    
    // 给标题框赋值
    siteTitle.value = res.data.title || '';

    // 把带有代理前缀的URL还原成肉眼能看懂的真实URL
    let url = res.data.background || '';
    if (url.includes('/api/background?url=')) {
      url = decodeURIComponent(url.split('url=')[1]);
    }
    bgUrl.value = url;
  } catch (err) {
    console.error('获取配置失败:', err);
  }
});

async function handleSave() {
  loading.value = true;
  message.value = '';
  try {
    // 核心：把标题（title）和壁纸（background）一起提交给后端保存
    await updateConfig({ 
      title: siteTitle.value,
      background: bgUrl.value 
    });
    message.value = '设置保存成功！快去首页刷新看看效果吧！';
    messageType.value = 'success';
    
    // 如果你在后台保存了标题，让当前后台页面的标题也跟着变一下
    if (siteTitle.value) {
      document.title = siteTitle.value;
    }
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
.system-manage {
  max-width: 1400px;
  width: 90%;
  margin: 0 auto;
}
.system-header {
  margin-bottom: 20px;
}
.section-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2566d8;
  margin-top: 2rem;
}
.system-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 30px;
  max-width: 800px;
}
.form-group {
  margin-bottom: 24px;
}
.form-group label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
  color: #222;
  font-size: 1.1rem;
}
.input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  font-size: 1rem;
  box-sizing: border-box;
  margin-bottom: 10px;
}
.input:focus {
  outline: 2px solid #2566d8;
  border-color: #2566d8;
}
.help-text {
  font-size: 0.95rem;
  color: #555;
  line-height: 1.8;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #2566d8;
}
.btn {
  background: #2566d8;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background 0.2s;
}
.btn:hover:not(:disabled) {
  background: #174ea6;
}
.message {
  margin-top: 15px;
  padding: 12px;
  border-radius: 8px;
}
.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}
.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
@media (max-width: 768px) {
  .system-manage {
    width: 100%;
    padding: 0 4vw;
  }
}
</style>
