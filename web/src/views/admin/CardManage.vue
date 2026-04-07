<template>
  <div class="card-manage">
    <div class="card-header">
      <div class="header-content">
        <h2 class="page-title">管理网站导航卡片，支持主菜单和子菜单分类</h2>
      </div>
      <div class="card-add">
        <select v-model="selectedMenuId" class="input narrow" @change="onMenuChange">
          <option v-for="menu in menus" :value="menu.id" :key="menu.id">{{ menu.name }}</option>
        </select>
        <select v-model="selectedSubMenuId" class="input narrow" @change="onSubMenuChange">
          <option value="">主菜单</option>
          <option v-for="subMenu in currentSubMenus" :value="subMenu.id" :key="subMenu.id">{{ subMenu.name }}</option>
        </select>
        <input v-model="newCardTitle" placeholder="卡片标题" class="input narrow" />
        <input v-model="newCardUrl" placeholder="卡片链接" class="input wide" />
        <input v-model="newCardLogo" placeholder="logo链接(可选)" class="input wide" />
        <button class="btn" @click="addCard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          添加卡片
        </button>
      </div>
    </div>
    <div class="card-card">
      <table class="card-table">
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">排序</th>
            <th>标题</th>
            <th>网址</th>
            <th>Logo链接</th>
            <th>描述</th>
            <th>操作</th>
          </tr>
        </thead>
        
        <draggable 
          v-model="cards" 
          tag="tbody" 
          item-key="id" 
          handle=".drag-handle"
          ghost-class="ghost"
          animation="200"
          :force-fallback="true" 
          :scroll="true"
          :scroll-sensitivity="100"
          :scroll-speed="20"
          @end="onDragEnd"
        >
          <template #item="{ element }">
            <tr>
              <td class="drag-handle" title="按住此处拖动进行排序">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
                  <path d="M3 6h18M3 12h18M3 18h18"/>
                </svg>
              </td>
              <td><input v-model="element.title" @blur="updateCard(element)" class="table-input" /></td>
              <td><input v-model="element.url" @blur="updateCard(element)" class="table-input" /></td>
              <td><input v-model="element.logo_url" @blur="updateCard(element)" class="table-input" placeholder="logo链接(可选)" /></td>
              <td><input v-model="element.desc" @blur="updateCard(element)" class="table-input" placeholder="描述（可选）" /></td>
              <td>
                <button class="btn btn-danger btn-icon" @click="deleteCard(element.id)" title="删除">
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import draggable from 'vuedraggable';
import { 
  getMenus, 
  getCards, 
  addCard as apiAddCard, 
  updateCard as apiUpdateCard, 
  deleteCard as apiDeleteCard,
  updateCardOrder
} from '../../api';

const menus = ref([]);
const cards = ref([]);
const selectedMenuId = ref();
const selectedSubMenuId = ref('');
const newCardTitle = ref('');
const newCardUrl = ref('');
const newCardLogo = ref('');

const currentSubMenus = computed(() => {
  if (!selectedMenuId.value) return [];
  const menu = menus.value.find(m => m.id === selectedMenuId.value);
  return menu?.subMenus || [];
});

onMounted(async () => {
  const res = await getMenus();
  menus.value = res.data;
  if (menus.value.length) {
    selectedMenuId.value = menus.value[0].id;
    selectedSubMenuId.value = '';
  }
});

watch(selectedMenuId, () => {
  selectedSubMenuId.value = '';
  loadCards();
});

watch(selectedSubMenuId, loadCards);

function onMenuChange() {
  selectedSubMenuId.value = '';
}

function onSubMenuChange() {
  loadCards();
}

async function loadCards() {
  if (!selectedMenuId.value) return;
  const res = await getCards(selectedMenuId.value, selectedSubMenuId.value || null);
  cards.value = res.data;
}

async function addCard() {
  if (!newCardTitle.value || !newCardUrl.value) return;
  await apiAddCard({ 
    menu_id: selectedMenuId.value, 
    sub_menu_id: selectedSubMenuId.value || null,
    title: newCardTitle.value, 
    url: newCardUrl.value, 
    logo_url: newCardLogo.value 
  });
  newCardTitle.value = '';
  newCardUrl.value = '';
  newCardLogo.value = '';
  loadCards();
}

async function updateCard(card) {
  await apiUpdateCard(card.id, {
    menu_id: selectedMenuId.value,
    sub_menu_id: selectedSubMenuId.value || null,
    title: card.title,
    url: card.url,
    logo_url: card.logo_url,
    desc: card.desc,
    order: card.order 
  });
  loadCards();
}

async function deleteCard(id) {
  await apiDeleteCard(id);
  loadCards();
}

async function onDragEnd() {
  const sortedIds = cards.value.map(card => card.id);
  
  try {
    await updateCardOrder({ sortedIds });
    console.log('排序已自动保存');
  } catch (error) {
    console.error('排序保存失败', error);
    alert('排序保存失败，请刷新页面重试');
  }
}
</script>

<style scoped>
/* =========== 拖拽相关 CSS =========== */
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
  background-color: #f3f4f6;
}
/* 💡 [核心修改区] 防止在拖拽时意外选中表格里的文字 */
.card-table {
  width: 100%;
  border-collapse: collapse;
  padding: 24px;
  user-select: none; 
}

/* =========== 原有 CSS 完全保留 =========== */
.card-manage {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  width: 95%;
  text-align: center;
}

.header-content {
  margin-bottom: 15px;
  text-align: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.card-add {
  margin: 0 auto;
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}

.card-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 100%;
}

.card-table th,
.card-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

.card-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  background: #fff;
  color: #222;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.input.narrow {
  width: 140px;
}

.input.medium {
  width: 140px;
}

.input.wide {
  width: 200px;
}

.table-input {
  width: 100%;
  padding: 8px 4px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #222;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.table-input:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 2px rgba(57, 157, 255, 0.1);
}

.input:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 3px rgba(57, 157, 255, 0.1);
}

.btn {
  padding: 10px 8px;
  border: none;
  border-radius: 8px;
  background: #399dff;
  color: white;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  justify-content: center;
  border-radius: 6px;
}

.btn:hover {
  background: #2d7dd2;
  transform: translateY(-1px);
}

.btn-danger {
  background: #ef4444;
}

.btn-danger:hover {
  background: #dc2626;
}

@media (max-width: 768px) {
  .card-manage {
    width: 94%;
    padding: 16px;
  }
  
  .card-card {
    padding: 16px 12px;
  }
  
  .card-add {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .input.narrow,
  .input.medium,
  .input.wide {
    width: 100%;
  }
}
</style>
