<template>
  <Teleport to="body">
    <div 
      class="desktop-menu-wrapper" 
      v-if="!isMobileView"
      @mouseenter="handleWrapperMouseEnter"
      @mouseleave="handleWrapperMouseLeave"
      :class="{ 'is-expanded': isMenuExpanded }"
    >
      
      <div class="capsule-hint">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
          <line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        菜单栏
      </div>

      <nav class="menu-bar" ref="menuBarRef" @wheel="handleWheel">
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
          >{{ menu.name }}</button>
          
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
            >{{ subMenu.name }}</button>
          </div>
        </div>
      </nav>
    </div>
  </Teleport>

  <div class="mobile-menu-header" v-if="isMobileView">
    <button class="hamburger-btn" @click="drawerOpen = true" aria-label="打开菜单">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
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
          <button class="drawer-menu-item" :class="{ active: menu.id === activeId }" @click="handleDrawerMenuClick(menu)">
            <span>{{ menu.name }}</span>
            <svg v-if="menu.subMenus && menu.subMenus.length" class="drawer-chevron" :class="{ expanded: expandedId === menu.id }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <div v-if="menu.subMenus && menu.subMenus.length && expandedId === menu.id" class="drawer-sub-list">
            <button v-for="sub in menu.subMenus" :key="sub.id" class="drawer-sub-item" :class="{ active: sub.id === activeSubMenuId }" @click="handleDrawerSubClick(menu, sub)">
              {{ sub.name }}
            </button>
          </div>
        </div>
      </div>
      <div class="drawer-footer"><span>← 向左滑动关闭</span></div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({ menus: Array, activeId: Number, activeSubMenuId: Number });
const emit = defineEmits(['select']);

const hoveredMenuId = ref(null);
const menuBarRef = ref(null); 

// 主菜单外框的展开与收起防抖逻辑
const isMenuExpanded = ref(false); 
let expandTimeout = null; 

function handleWrapperMouseEnter() {
  clearTimeout(expandTimeout); 
  isMenuExpanded.value = true; 
}

function handleWrapperMouseLeave() {
  expandTimeout = setTimeout(() => {
    isMenuExpanded.value = false;
  }, 250); 
}

// =========================================================================
// 👇 这里是修复子菜单边缘疯狂闪烁 Bug 的核心代码 👇
// =========================================================================

// 新增：专门用来存放子菜单定时器的变量（就像一个用来装“关闭闹钟”的盒子）
let subMenuTimeout = null; 

function showSubMenu(menuId) { 
  // 【修复关键1】：只要鼠标进来了，就赶紧把之前准备关闭菜单的“闹钟”给停掉
  // 这样就算手抖了一下又回来了，菜单也不会突然消失
  clearTimeout(subMenuTimeout); 
  
  // 正常显示当前鼠标所在的子菜单
  hoveredMenuId.value = menuId; 
}

function hideSubMenu(menuId) { 
  // 【修复关键2】：不要立刻关闭菜单，而是设一个 150 毫秒后关闭的“闹钟”
  // 并且把这个闹钟存进 subMenuTimeout 变量里，以便随时可以被上面的 clearTimeout 撤销
  subMenuTimeout = setTimeout(() => { 
    if (hoveredMenuId.value === menuId) {
      hoveredMenuId.value = null; 
    }
  }, 150); // 150毫秒能给鼠标离开边缘时的一点点容错时间，提升用户体验
}
// =========================================================================
// 👆 修复结束 👆
// =========================================================================


function handleWheel(e) {
  if (menuBarRef.value) {
    const el = menuBarRef.value;
    if (el.scrollWidth > el.clientWidth) {
      e.preventDefault(); 
      el.scrollLeft += e.deltaY > 0 ? 50 : -50; 
    }
  }
}

const isMobileView = ref(false);
function checkMobile() { isMobileView.value = window.innerWidth < 768; }
onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile); });
onUnmounted(() => { window.removeEventListener('resize', checkMobile); });

const activeMenuObj = computed(() => props.menus?.find(m => m.id === props.activeId) || null);
const activeSubMenuObj = computed(() => {
  if (!props.activeSubMenuId || !activeMenuObj.value) return null;
  return activeMenuObj.value.subMenus?.find(s => s.id === props.activeSubMenuId) || null;
});

const drawerOpen = ref(false);
const drawerVisible = ref(false);
const expandedId = ref(null);
const drawerRef = ref(null);
let touchStartX = 0, touchCurrentX = 0;

watch(() => props.activeId, (id) => { if (id) expandedId.value = id; }, { immediate: true });
watch(drawerOpen, (val) => {
  if (val) { drawerVisible.value = true; document.body.style.overflow = 'hidden'; }
  else { document.body.style.overflow = ''; setTimeout(() => { drawerVisible.value = false; }, 250); }
});

function closeDrawer() { drawerOpen.value = false; }
function handleDrawerMenuClick(menu) {
  const hasSubs = menu.subMenus && menu.subMenus.length > 0;
  if (hasSubs) expandedId.value = expandedId.value === menu.id ? null : menu.id;
  emit('select', menu);
  if (!hasSubs) closeDrawer();
}
function handleDrawerSubClick(menu, sub) { emit('select', sub, menu); closeDrawer(); }

function onTouchStart(e) { touchStartX = e.touches[0].clientX; touchCurrentX = touchStartX; }
function onTouchMove(e) {
  touchCurrentX = e.touches[0].clientX;
  const delta = touchCurrentX - touchStartX;
  if (delta < 0 && drawerRef.value) { drawerRef.value.style.transform = `translateX(${delta}px)`; drawerRef.value.style.transition = 'none'; }
}
function onTouchEnd() {
  if (drawerRef.value) { drawerRef.value.style.transform = ''; drawerRef.value.style.transition = ''; }
  if (touchCurrentX - touchStartX < -80) closeDrawer();
}
</script>

<style scoped>
/* =========================================
   桌面端：悬浮菜单主框（原样保留）
   ========================================= */
.desktop-menu-wrapper {
  position: fixed; 
  top: 16px; 
  left: 50%;
  transform: translateX(-50%);
  height: 40px; 
  z-index: 9999; 
  border: 1px solid rgba(255, 255, 255, 0.15); 
  border-radius: 20px; 
  display: flex;
  align-items: center; 
  justify-content: center;
  max-width: 130px; 
  transition: max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.desktop-menu-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: rgba(15, 20, 30, 0.45); 
  backdrop-filter: blur(25px) saturate(130%); 
  -webkit-backdrop-filter: blur(25px) saturate(130%);
  transition: background 0.3s ease;
}

.desktop-menu-wrapper.is-expanded {
  max-width: calc(100vw - 120px); 
  border-radius: 12px; 
}

.desktop-menu-wrapper.is-expanded::before {
  background: rgba(15, 20, 30, 0.45); 
}

.capsule-hint {
  position: absolute;
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.desktop-menu-wrapper.is-expanded .capsule-hint {
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
}

.menu-bar {
  height: 40px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  padding: 0 1rem;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; 
  padding-bottom: 500px;
  margin-bottom: -500px;
  pointer-events: none; 
}
.menu-bar::-webkit-scrollbar { display: none; }

.desktop-menu-wrapper.is-expanded .menu-bar {
  opacity: 1;
  visibility: visible;
  transition-delay: 0.1s; 
}

.menu-item { 
  position: relative; 
  height: 40px; 
  display: flex;
  align-items: center;
  pointer-events: auto; 
}

.menu-bar button { background: transparent; border: none; color: #fff; font-size: 15px; font-weight: 500; padding: 0.4rem 1.2rem; cursor: pointer; transition: all 0.3s ease; border-radius: 8px; position: relative; }
.menu-bar button::before { content: ''; position: absolute; bottom: 2px; left: 50%; width: 0; height: 2px; background: #399dff; transition: all 0.3s ease; transform: translateX(-50%); }
.menu-bar button:hover { color: #399dff; }
.menu-bar button.active { color: #399dff; }
.menu-bar button.active::before { width: 40%; }

/* =========================================
   子菜单样式：瞬间模糊且带有位移
   ========================================= */
.sub-menu { 
  position: absolute; 
  top: 100%; 
  left: 50%; 
  transform: translateX(-50%); 
  
  backdrop-filter: blur(8px); 
  border-radius: 6px; 
  min-width: 120px; 
  opacity: 0; 
  visibility: hidden; 
  transition: all 0.2s ease; 
  z-index: 1000; 
  box-shadow: 0 4px 16px rgba(0,0,0,0.4); 
  border: 1px solid rgba(255,255,255,0.15); 
  margin-top: -2px; 
}

.sub-menu.show { 
  opacity: 1; 
  visibility: visible; 
  transform: translateX(-50%) translateY(2px); 
}

.sub-menu-item { 
  display: block !important; 
  width: 100% !important; 
  text-align: center !important; 
  padding: 0.4rem 1rem !important; 
  border: none !important; 
  background: transparent !important; 
  color: #fff !important; 
  font-size: 14px !important; 
  cursor: pointer !important; 
  transition: all 0.2s ease !important; 
  border-radius: 0 !important; 
  text-shadow: none !important; 
  line-height: 1.5 !important; 
}

.sub-menu-item:hover { 
  background: rgba(57,157,255,0.25) !important; 
  color: #399dff !important; 
  transform: none !important; 
}

.sub-menu-item.active { 
  background: rgba(57,157,255,0.35) !important; 
  color: #399dff !important; 
  font-weight: 500 !important; 
}

.sub-menu-item::before { 
  display: none; 
}

/* 这是一个隐形的防手抖桥梁，保留它能让你鼠标移向子菜单时更稳定 */
.sub-menu::before {
  content: '';
  position: absolute;
  top: -15px; 
  left: 0;
  width: 100%;
  height: 15px; 
  background: transparent; 
}

/* =========================================
   移动端：顶栏和极致毛玻璃抽屉（原样保留）
   ========================================= */
.mobile-menu-header { 
  position: fixed; 
  top: 16px; left: 0; width: 100%; z-index: 100;
  display: flex; align-items: center; justify-content: space-between; padding: 0 12px; box-sizing: border-box; 
}
.hamburger-btn { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); color: #fff; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; -webkit-tap-highlight-color: transparent; }
.mobile-breadcrumb { display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.9); }
.mobile-breadcrumb-main { font-size: 15px; font-weight: 600; }
.mobile-breadcrumb-sep { font-size: 12px; color: rgba(255,255,255,0.4); }
.mobile-breadcrumb-sub { font-size: 13px; color: rgba(255,255,255,0.7); }
.hamburger-spacer { width: 40px; }

.drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999; }
.backdrop-enter { animation: fadeInBg 0.3s ease forwards; }
.backdrop-exit { animation: fadeOutBg 0.3s ease forwards; }
@keyframes fadeInBg { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeOutBg { from { opacity: 1; } to { opacity: 0; } }

.drawer-panel { 
  position: fixed; left: 0; z-index: 1000; width: 75vw; max-width: 300px; 
  top: 56px; bottom: max(80px, calc(60px + env(safe-area-inset-bottom, 20px))); 
  border-top-right-radius: 16px; border-bottom-right-radius: 16px;
  background: rgba(15, 20, 30, 0.35); 
  backdrop-filter: blur(25px) saturate(130%); 
  -webkit-backdrop-filter: blur(25px) saturate(130%);
  border-right: 1px solid rgba(255, 255, 255, 0.15); 
  box-shadow: 10px 0 30px rgba(0,0,0,0.2); 
  display: flex; flex-direction: column; overflow: hidden; 
}
.drawer-enter { animation: slideInL 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
.drawer-exit { animation: slideOutL 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards; }
@keyframes slideInL { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes slideOutL { from { transform: translateX(0); } to { transform: translateX(-100%); } }

.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 16px 12px; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
.drawer-title { color: #fff; font-size: 16px; font-weight: 600; letter-spacing: 1px; }
.drawer-close-btn { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.05); border: none; cursor: pointer; }
.drawer-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 12px; }
.drawer-menu-item { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 14px; border-radius: 12px; border: none; background: transparent; color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 500; cursor: pointer; text-align: left; transition: all 0.2s; }
.drawer-menu-item:active { background: rgba(255,255,255,0.1); }
.drawer-menu-item.active { background: rgba(255,255,255,0.15); color: #fff; border-left: 3px solid #399dff; border-radius: 4px 12px 12px 4px; }
.drawer-chevron { transition: transform 0.2s; color: rgba(255,255,255,0.5); }
.drawer-chevron.expanded { transform: rotate(90deg); color: #fff; }
.drawer-sub-list { margin-left: 14px; padding-left: 14px; border-left: 1px solid rgba(255,255,255,0.15); margin-top: 4px; margin-bottom: 8px; }
.drawer-sub-item { width: 100%; padding: 12px 14px; border-radius: 10px; border: none; background: transparent; color: rgba(255,255,255,0.65); font-size: 13px; cursor: pointer; text-align: left; transition: all 0.2s; }
.drawer-sub-item.active { background: rgba(255,255,255,0.1); color: #fff; font-weight: 500; }
.drawer-footer { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; }

@media (min-width: 768px) { .mobile-menu-header { display: none; } }
@media (max-width: 767px) { .desktop-menu-wrapper { display: none; } }
</style>
