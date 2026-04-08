<template>
  <div class="friend-manage">
    <div class="friend-header">
      <h2 class="page-title">友情链接管理</h2>
    </div>
    
    <div class="friend-card">
      <div class="friend-add">
        <input v-model="newTitle" placeholder="网站名 (留空可自动解析)" class="input" />
        <input v-model="newUrl" placeholder="网站链接" class="input wide" @blur="autoParseFriend" />
        <input v-model="newLogo" placeholder="Logo链接 (留空可自动解析)" class="input medium" />
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
      
      <table class="friend-table">
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">排序</th>
            <th style="width: 25%;">网站名</th>
            <th style="width: 30%;">链接</th>
            <th style="width: 30%;">Logo</th>
            <th style="width: 70px; text-align: center;">操作</th>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
                  <path d="M3 6h18M3 12h18M3 18h18"/>
                </svg>
              </td>
              <td><input v-model="element.title" @blur="updateFriend(element)" class="table-input" placeholder="输入网站名"/></td>
              <td><input v-model="element.url" @blur="updateFriend(element)" class="table-input" placeholder="输入链接"/></td>
              <td>
                <div class="logo-cell">
                  <img :src="element.logo || getDefaultLogo(element.url)" class="logo-preview" @error="handleLogoError" />
                  <input v-model="element.logo" @blur="updateFriend(element)" class="table-input logo-input" placeholder="Logo链接" />
                </div>
              </td>
              <td style="text-align: center;">
                <button class="btn btn-danger btn-icon" @click="deleteFriend(element.id)" title="删除">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    <path d="M10 11v6M14 11v6"/>
                  </svg>
                </button>
              </td>
            </tr>
          </template>
        </draggable>
      </table>
      <div v-if="friends.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <p>暂无友情链接</p>
      </div>
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

function getDefaultLogo(url) {
  try { const u = new URL(url); return u.origin + '/favicon.ico'; } catch { return '/default-favicon.png'; }
}
function handleLogoError(e) { e.target.src = '/default-favicon.png'; }

onMounted(loadFriends);
async function loadFriends() { const res = await getFriends(); friends.value = res.data; }

async function autoParseFriend() {
  if (!newUrl.value.trim()) return;
  if (newTitle.value.trim() && newLogo.value.trim()) return;
  isParsing.value = true; parseError.value = ''; parseSuccess.value = '';
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
  } catch (err) { parseError.value = '网络错误'; setTimeout(() => { parseError.value = ''; }, 5000); } finally { isParsing.value = false; }
}

async function addFriend() {
  if (!newUrl.value) return;
  await apiAddFriend({ title: newTitle.value || '', url: newUrl.value, logo: newLogo.value || '' });
  newTitle.value = ''; newUrl.value = ''; newLogo.value = ''; loadFriends();
}

async function updateFriend(f) { await apiUpdateFriend(f.id, { title: f.title, url: f.url, logo: f.logo }); }

async function onDragEnd() {
  const sortedIds = friends.value.map(f => f.id);
  try { await updateFriendsOrder({ sortedIds }); } catch (e) { console.error('排序保存失败', e); }
}

async function deleteFriend(id) { await apiDeleteFriend(id); loadFriends(); }
</script>

<style scoped>
/* 样式与 CardManage 完全对齐对标 */
.friend-manage { max-width: 1200px; width: 100%; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }
.friend-header { width: 100%; text-align: center; margin: 15px 0 25px 0; }
.page-title { font-size: 1.5rem; font-weight: 700; color: #222; }

.friend-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); padding: 24px; width: 100%; box-sizing: border-box; }
.friend-add { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }

.input { padding: 10px 12px; border-radius: 8px; border: 1px solid #d0d7e2; background: #fff; font-size: 0.9rem; transition: all 0.2s; box-sizing: border-box; }
.input:focus { outline: none; border-color: #399dff; box-shadow: 0 0 0 3px rgba(57, 157, 255, 0.1); }
.input.medium { width: 160px; }
.input.wide { flex: 1; min-width: 150px; }

/* 统一无感透明输入框 */
.table-input { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid transparent; background: transparent; color: #222; font-size: 0.9rem; transition: all 0.2s ease; box-sizing: border-box; }
.table-input:focus { outline: none; border-color: #399dff; background: white; box-shadow: 0 0 0 2px rgba(57, 157, 255, 0.1); }

.btn { padding: 10px 16px; background: #399dff; color: #fff; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; font-size: 0.9rem; transition: background 0.2s; }
.btn:hover { background: #2d7dd2; transform: translateY(-1px); }
.btn-icon { width: 32px; height: 32px; padding: 0; justify-content: center; }
.btn-danger { background: #ef4444; }
.btn-danger:hover { background: #dc2626; }

/* 表格对齐 CardManage */
.friend-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
.friend-table th, .friend-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
.friend-table th { background: #f9fafb; font-weight: 600; color: #374151; font-size: 0.85rem; }

/* 禁用拖拽文字选中 */
.drag-handle { 
  cursor: grab; 
  text-align: center; 
  color: #999;
  user-select: none;
  -webkit-user-select: none; 
}
.drag-handle:active { cursor: grabbing; }
.ghost, .sortable-drag, .sortable-chosen { 
  opacity: 0.5; 
  background-color: #f3f4f6; 
  user-select: none !important;
  -webkit-user-select: none !important;
}

.logo-cell { display: flex; align-items: center; gap: 8px; }
.logo-preview { width: 28px; height: 28px; border-radius: 6px; object-fit: contain; background: #f3f4f6; border: 1px solid #e5e7eb; flex-shrink: 0; }
.logo-input { flex: 1; min-width: 0; }

.parse-tip { font-size: 0.8rem; margin: 8px 0; padding: 6px 12px; border-radius: 6px; text-align: center; }
.parse-tip.success { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.parse-tip.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.empty-state { padding: 40px; text-align: center; color: #9ca3af; display: flex; flex-direction: column; align-items: center; }
.empty-state p { margin-top: 12px; }
</style>
