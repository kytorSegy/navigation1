<template>
  <div class="friend-manage">
    <div class="friend-header"></div>
    <!-- 添加友链 - 支持智能解析 -->
    <div class="friend-add">
      <input v-model="newTitle" placeholder="网站名 (留空可自动解析)" class="input" />
      <input v-model="newUrl" placeholder="网站链接" class="input" @blur="autoParseFriend" />
      <input v-model="newLogo" placeholder="Logo链接 (留空可自动解析)" class="input" />
      <button class="btn" @click="addFriend" :disabled="isParsing">
        <svg v-if="!isParsing" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        {{ isParsing ? '解析中...' : '添加友链' }}
      </button>
    </div>
    <p v-if="parseError" class="parse-tip error">{{ parseError }}</p>
    <p v-if="parseSuccess" class="parse-tip success">{{ parseSuccess }}</p>
    
    <div class="friend-card">
      <table class="friend-table">
        <thead>
          <tr>
            <th style="width: 50px;">排序</th>
            <th>网站名</th>
            <th>链接</th>
            <th style="width: 140px;">Logo</th>
            <th style="width: 70px;">操作</th>
          </tr>
        </thead>
        <draggable 
          v-model="friends" 
          tag="tbody" 
          item-key="id" 
          handle=".drag-handle"
          ghost-class="ghost"
          animation="200"
          :force-fallback="true"
          @end="onDragEnd"
        >
          <template #item="{ element }">
            <tr>
              <td class="drag-handle" title="按住拖动排序">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
                  <path d="M3 6h18M3 12h18M3 18h18"/>
                </svg>
              </td>
              <td><input v-model="element.title" @blur="updateFriend(element)" class="input" /></td>
              <td><input v-model="element.url" @blur="updateFriend(element)" class="input" /></td>
              <td>
                <div class="logo-cell">
                  <img :src="element.logo || getDefaultLogo(element.url)" class="logo-preview" @error="handleLogoError" />
                  <input v-model="element.logo" @blur="updateFriend(element)" class="input logo-input" placeholder="logo链接" />
                </div>
              </td>
              <td><button class="btn btn-danger" @click="deleteFriend(element.id)">删除</button></td>
            </tr>
          </template>
        </draggable>
      </table>
      <div v-if="friends.length === 0" class="empty-state">暂无友链</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import draggable from 'vuedraggable';
import { getFriends, addFriend as apiAddFriend, updateFriend as apiUpdateFriend, deleteFriend as apiDeleteFriend, updateFriendsOrder, parseLink } from '../../api';

const friends = ref([]);
const newTitle = ref('');
const newUrl = ref('');
const newLogo = ref('');
const isParsing = ref(false);
const parseError = ref('');
const parseSuccess = ref('');

// 获取默认 logo
function getDefaultLogo(url) {
  try {
    const u = new URL(url);
    return u.origin + '/favicon.ico';
  } catch { return '/default-favicon.png'; }
}
function handleLogoError(e) { e.target.src = '/default-favicon.png'; }

onMounted(loadFriends);

async function loadFriends() {
  const res = await getFriends();
  friends.value = res.data;
}

// 智能解析友链
async function autoParseFriend() {
  if (!newUrl.value.trim()) return;
  if (newTitle.value.trim() && newLogo.value.trim()) return;
  
  isParsing.value = true;
  parseError.value = '';
  parseSuccess.value = '';
  
  try {
    const res = await parseLink(newUrl.value.trim());
    if (res.data.success) {
      if (!newTitle.value.trim() && res.data.title) newTitle.value = res.data.title;
      if (!newLogo.value.trim() && res.data.icon) newLogo.value = res.data.icon;
      parseSuccess.value = res.data.message || '已自动填充';
      setTimeout(() => { parseSuccess.value = ''; }, 3000);
    } else {
      if (!newLogo.value.trim() && res.data.icon) newLogo.value = res.data.icon;
      parseError.value = res.data.message || '自动解析失败';
      setTimeout(() => { parseError.value = ''; }, 5000);
    }
  } catch (err) {
    parseError.value = '网络错误';
    setTimeout(() => { parseError.value = ''; }, 5000);
  } finally {
    isParsing.value = false;
  }
}

async function addFriend() {
  if (!newUrl.value) return;
  await apiAddFriend({ title: newTitle.value || '', url: newUrl.value, logo: newLogo.value || '' });
  newTitle.value = '';
  newUrl.value = '';
  newLogo.value = '';
  parseError.value = '';
  parseSuccess.value = '';
  loadFriends();
}

async function updateFriend(f) {
  await apiUpdateFriend(f.id, { title: f.title, url: f.url, logo: f.logo });
}

// 拖拽排序保存
async function onDragEnd() {
  const sortedIds = friends.value.map(f => f.id);
  try {
    await updateFriendsOrder({ sortedIds });
  } catch (e) {
    console.error('排序保存失败', e);
  }
}

async function deleteFriend(id) {
  await apiDeleteFriend(id);
  loadFriends();
}
</script>

<style scoped>
.friend-manage {
  max-width: 1400px;
  width: 90%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.page-title {
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  margin: 32px 0 32px 0;
  letter-spacing: 2px;
  color: #222;
}
.friend-header {
  height: 32px;
}
.friend-add {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.friend-card {
  width: 100%;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 32px 24px;
}
.input {
  width: 15rem;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  background: #fff;
  color: #222;
  margin-right: 8px;
  height: 25px;
  font-size: 1rem;
}
.input:focus {
  outline: 2px solid #2566d8;
}
.btn {
  background: #2566d8;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 18px;
  cursor: pointer;
  margin-right: 8px;
  transition: background 0.2s;
}
.btn:hover {
  background: #174ea6;
}
.btn-danger {
  background: #e74c3c;
  display: inline-block;
  margin: 0 auto;
}
.btn-danger:hover {
  background: #c0392b;
}
.friend-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  color: #222;
  border-radius: 8px;
  overflow: hidden;
}
.friend-table th, .friend-table td {
  padding: 10px 14px;
  border: 1px solid #e3e6ef;
  height: 30px;
}
.friend-table th {
  background: #f5f7fa;
  color: #222;
  font-weight: bold;
}
.friend-table td input {
  width: 97%;
  background: #f9f9f9;
  color: #222;
  border: 1px solid #d0d7e2;
  border-radius: 4px;
  padding: 4px 4px;
  height: 30px;
  font-size: 1rem;
}
.friend-table th:last-child,
.friend-table td:last-child {
  text-align: center;
  vertical-align: middle;
}

/* 拖拽排序样式 */
.drag-handle {
  cursor: grab;
  text-align: center;
  color: #999;
}
.drag-handle:active {
  cursor: grabbing;
}
.ghost {
  opacity: 0.4;
  background: #f3f4f6;
}

/* Logo 单元格 */
.logo-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}
.logo-preview {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: contain;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.logo-input {
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
}

/* 解析提示 */
.parse-tip {
  font-size: 0.8rem;
  margin: 8px 0;
  padding: 6px 12px;
  border-radius: 6px;
  text-align: center;
}
.parse-tip.success {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}
.parse-tip.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

/* 旋转动画 */
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}
@media (max-width: 768px) {
  .friend-manage {
    width: 92%;
    padding: 0 2vw;
  }
  .friend-add {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    width: 100%;
  }
  .friend-card {
    width: 100%;
    padding: 12px 2vw;
  }
  .friend-table {
    display: block;
    width: 100%;
    overflow-x: auto;
    font-size: 14px;
  }
  .friend-table thead, .friend-table tbody, .friend-table tr {
    display: table;
    width: 100%;
    table-layout: fixed;
  }
  .friend-table th, .friend-table td {
    padding: 8px 6px;
    font-size: 13px;
  }
  .input {
    width: 95%;
    min-width: 0;
    margin-right: 0;
    font-size: 14px;
    padding: 8px 8px;
    height: 32px !important;
  }
  .btn {
    width: 100%;
    margin-right: 0;
    padding: 8px 0;
    font-size: 14px;
  }
}
</style> 
