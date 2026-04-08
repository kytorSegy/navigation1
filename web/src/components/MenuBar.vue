<template>
  <!-- ===== 桌面端：原始水平菜单栏 ===== -->
  <nav class="menu-bar" v-if="!isMobileView">
    <div 
      v-for="menu in menus" 
      :key="menu.id" 
      class="menu-item"
      @mouseenter="showSubMenu(menu.id)"
      @mouseleave="hideSubMenu(menu.id)"
    >
      <button 
        @click="$emit('select', menu)" 
        :class="{active: menu.id === activeId}"
      >
        {{ menu.name }}
      </button>
      <div 
        v-if="menu.subMenus && menu.subMenus.length > 0" 
        class="sub-menu"
        :class="{ 'show': hoveredMenuId === menu.id }"
      >
        <button 
          v-for="subMenu in menu.subMenus" 
          :key="subMenu.id"
          @click="$emit('select', subMenu, menu)"
          :class="{active: subMenu.id === activeSubMenuId}"
          class="sub-menu-item"
        >
          {{ subMenu.name }}
        </button>
      </div>
    </div>
  </nav>

  <!-- ===== 移动端：汉堡按钮 + 当前菜单名 ===== -->
  <div class="mobile-menu-header" v-if="isMobileView">
    <button class="hamburger-btn" @click="drawerOpen = true" aria-label="打开菜单">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    <div class="mobile-breadcrumb">
      <span class="mobile-breadcrumb-main" v-if="activeMenuObj">{{ activeMenuObj.name }}</span>
      <template v-if="activeSubMenuObj">
        <span class="mobile-breadcrumb-sep">/</span>
        <span class="mobile-breadcrumb-sub">{{ activeSubMenuObj.name }}</span>
      </template>
    </div>
    <div class="hamburger-spacer"></div>
  </div>

  <!-- ===== 移动端侧边抽屉 ===== -->
  <Teleport to="body">
    <div v-if="drawerVisible" class="drawer-backdrop" :class="drawerOpen ? 'backdrop-enter' : 'backdrop-exit'" @click="closeDrawer"></div>
    <div
      v-if="drawerVisible"
      class="drawer-panel"
      :class="drawerOpen ? 'drawer-enter' : 'drawer-exit'"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      ref="drawerRef"
    >
      <div class="drawer-header">
        <span class="drawer-title">导航菜单</span>
        <button class="drawer-close-btn" @click="closeDrawer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="drawer-body">
        <div v-for="menu in menus" :key="menu.id" class="drawer-menu-group">
          <button
            class="drawer-menu-item"
            :class="{ active: menu.id === activeId }"
            @click="handleDrawerMenuClick(menu)"
          >
            <span>{{ menu.name }}</span>
            <svg v-if="menu.subMenus && menu.subMenus.length" class="drawer-chevron" :class="{ expanded: expandedId === menu.id }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <div v-if="menu.subMenus && menu.subMenus.length && expandedId === menu.id" class="drawer-sub-list">
            <button
              v-for="sub in menu.subMenus"
              :key="sub.id"
              class="drawer-sub-item"
              :class="{ active: sub.id === activeSubMenuId }"
              @click="handleDrawerSubClick(menu, sub)"
            >{{ sub.name }}</button>
          </div>
        </div>
      </div>
      <div class="drawer-footer">
        <span>← 向左滑动关闭</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  menus: Array,
  activeId: Number,
  activeSubMenuId: Number
});
const emit = defineEmits(['select']);

// ---- 桌面端逻辑 ----
const hoveredMenuId = ref(null);
function showSubMenu(menuId) { hoveredMenuId.value = menuId; }
function hideSubMenu(menuId) {
  setTimeout(() => { if (hoveredMenuId.value === menuId) hoveredMenuId.value = null; }, 100);
}

// ---- 响应式判断 ----
const isMobileView = ref(false);
function checkMobile() { isMobileView.value = window.innerWidth < 768; }
onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile); });
onUnmounted(() => { window.removeEventListener('resize', checkMobile); });

// ---- 面包屑 ----
const activeMenuObj = computed(() => props.menus?.find(m => m.id === props.activeId) || null);
const activeSubMenuObj = computed(() => {
  if (!props.activeSubMenuId || !activeMenuObj.value) return null;
  return activeMenuObj.value.subMenus?.find(s => s.id === props.activeSubMenuId) || null;
});

// ---- 抽屉逻辑 ----
const drawerOpen = ref(false);
const drawerVisible = ref(false);
const expandedId = ref(null);
const drawerRef = ref(null);
let touchStartX = 0, touchCurrentX = 0;

watch(() => props.activeId, (id) => { if (id) expandedId.value = id; }, { immediate: true });

watch(drawerOpen, (val) => {
  if (val) {
    drawerVisible.value = true;
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
    setTimeout(() => { drawerVisible.value = false; }, 250);
  }
});

function closeDrawer() { drawerOpen.value = false; }

function handleDrawerMenuClick(menu) {
  const hasSubs = menu.subMenus && menu.subMenus.length > 0;
  if (hasSubs) {
    expandedId.value = expandedId.value === menu.id ? null : menu.id;
  }
  emit('select', menu);
  if (!hasSubs) closeDrawer();
}

function handleDrawerSubClick(menu, sub) {
  emit('select', sub, menu);
  closeDrawer();
}

// 滑动关闭
function onTouchStart(e) { touchStartX = e.touches[0].clientX; touchCurrentX = touchStartX; }
function onTouchMove(e) {
  touchCurrentX = e.touches[0].clientX;
  const delta = touchCurrentX - touchStartX;
  if (delta < 0 && drawerRef.value) {
    drawerRef.value.style.transform = `translateX(${delta}px)`;
    drawerRef.value.style.transition = 'none';
  }
}
function onTouchEnd() {
  if (drawerRef.value) { drawerRef.value.style.transform = ''; drawerRef.value.style.transition = ''; }
  if (touchCurrentX - touchStartX < -80) closeDrawer();
}
</script>

<style scoped>
/* ===== 桌面端菜单（原样保留） ===== */
.menu-bar {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  padding: 0 1rem;
  position: relative;
}
.menu-item { position: relative; }
.menu-bar button {
  background: transparent; border: none; color: #fff; font-size: 16px; font-weight: 500;
  padding: 0.8rem 2rem; cursor: pointer; transition: all 0.3s ease;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3); border-radius: 8px; position: relative; overflow: hidden;
}
.menu-bar button::before {
  content: ''; position: absolute; bottom: 0; left: 50%; width: 0; height: 2px;
  background: #399dff; transition: all 0.3s ease; transform: translateX(-50%);
}
.menu-bar button:hover { color: #399dff; transform: translateY(-1px); }
.menu-bar button.active { color: #399dff; }
.menu-bar button.active::before { width: 60%; }
.sub-menu {
  position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  backdrop-filter: blur(8px); border-radius: 6px; min-width: 120px;
  opacity: 0; visibility: hidden; transition: all 0.2s ease; z-index: 1000;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); margin-top: -2px;
}
.sub-menu.show { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(2px); }
.sub-menu-item {
  display: block !important; width: 100% !important; text-align: center !important;
  padding: 0.4rem 1rem !important; border: none !important; background: transparent !important;
  color: #fff !important; font-size: 14px !important; font-weight: 400 !important;
  cursor: pointer !important; transition: all 0.2s ease !important; border-radius: 0 !important;
  text-shadow: none !important; line-height: 1.5 !important;
}
.sub-menu-item:hover { background: rgba(57,157,255,0.25) !important; color: #399dff !important; transform: none !important; }
.sub-menu-item.active { background: rgba(57,157,255,0.35) !important; color: #399dff !important; font-weight: 500 !important; }
.sub-menu-item::before { display: none; }

/* ===== 移动端顶栏 ===== */
.mobile-menu-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; width: 100%; box-sizing: border-box;
}
.hamburger-btn {
  width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); color: #fff;
  border: none; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.hamburger-btn:active { background: rgba(255,255,255,0.2); }
.hamburger-spacer { width: 40px; }
.mobile-breadcrumb { display: flex; align-items: center; gap: 5px; color: rgba(255,255,255,0.8); }
.mobile-breadcrumb-main { font-size: 14px; font-weight: 500; }
.mobile-breadcrumb-sep { font-size: 11px; color: rgba(255,255,255,0.3); }
.mobile-breadcrumb-sub { font-size: 12px; color: rgba(255,255,255,0.6); }

/* ===== 抽屉蒙层 ===== */
.drawer-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999;
  -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);
}
.backdrop-enter { animation: fadeInBg 0.25s ease forwards; }
.backdrop-exit { animation: fadeOutBg 0.2s ease forwards; }
@keyframes fadeInBg { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeOutBg { from { opacity: 1; } to { opacity: 0; } }

/* ===== 抽屉面板 ===== */
.drawer-panel {
  position: fixed; left: 0; z-index: 1000;
  width: 72vw; max-width: 280px;
  /* 关键：不占满全屏，上下留安全区 */
  top: 56px;
  bottom: max(80px, calc(60px + env(safe-area-inset-bottom, 20px)));
  background: rgba(15,17,26,0.96); backdrop-filter: blur(20px);
  box-shadow: 4px 0 24px rgba(0,0,0,0.4);
  display: flex; flex-direction: column; overflow: hidden;
  border-top-right-radius: 16px; border-bottom-right-radius: 16px;
  border-right: 1px solid rgba(255,255,255,0.05);
}
.drawer-enter { animation: slideInL 0.28s cubic-bezier(0.32,0.72,0,1) forwards; }
.drawer-exit { animation: slideOutL 0.22s cubic-bezier(0.32,0.72,0,1) forwards; }
@keyframes slideInL { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes slideOutL { from { transform: translateX(0); } to { transform: translateX(-100%); } }

.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
}
.drawer-title { color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; letter-spacing: 0.5px; }
.drawer-close-btn {
  width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.5); background: transparent; border: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.drawer-close-btn:active { background: rgba(255,255,255,0.1); }

.drawer-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 8px; }

.drawer-menu-group { margin-bottom: 2px; }
.drawer-menu-item {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 12px; border-radius: 12px; border: none; background: transparent;
  color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 500; cursor: pointer;
  min-height: 44px; box-sizing: border-box; text-align: left;
  -webkit-tap-highlight-color: transparent; transition: background 0.15s;
}
.drawer-menu-item:active { background: rgba(255,255,255,0.08); }
.drawer-menu-item.active { background: rgba(37,102,216,0.2); color: #fff; }
.drawer-chevron { transition: transform 0.2s; color: rgba(255,255,255,0.3); flex-shrink: 0; }
.drawer-chevron.expanded { transform: rotate(90deg); }

.drawer-sub-list { margin-left: 12px; padding-left: 12px; border-left: 1px solid rgba(255,255,255,0.08); margin-top: 2px; margin-bottom: 4px; }
.drawer-sub-item {
  width: 100%; padding: 10px 12px; border-radius: 8px; border: none; background: transparent;
  color: rgba(255,255,255,0.5); font-size: 12px; cursor: pointer; text-align: left;
  min-height: 40px; display: flex; align-items: center; box-sizing: border-box;
  -webkit-tap-highlight-color: transparent; transition: background 0.15s;
}
.drawer-sub-item:active { background: rgba(255,255,255,0.05); }
.drawer-sub-item.active { background: rgba(37,102,216,0.15); color: #fff; }

.drawer-footer {
  padding: 8px 16px; border-top: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;
  text-align: center; color: rgba(255,255,255,0.2); font-size: 10px;
}

/* ===== 桌面端隐藏移动组件 ===== */
@media (min-width: 768px) {
  .mobile-menu-header { display: none; }
}
@media (max-width: 767px) {
  .menu-bar { display: none; }
}
</style>
