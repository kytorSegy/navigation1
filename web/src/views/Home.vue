<!-- =====================================================
  文件: web/src/views/Home.vue
  说明: 整体替换此文件
  改动:
    1. [移动端] 新增侧边抽屉 Drawer + 汉堡按钮（不占满全屏高度，底部留出空间）
    2. [移动端] 搜索引擎按钮改为横向可滚动
    3. [移动端] 弹窗改为底部弹出式
    4. [移动端] 减少移动端顶部空白
    5. [动画] 弹窗增加缩放入场动画
    6. [代码] transition 统一使用 CSS 变量
===================================================== -->
<template>
  <div class="home-container">
    
    <div class="bg-placeholder"></div>

    <video
      v-if="isVideoBg"
      class="bg-video"
      :class="{ 'fade-in': isBgLoaded }"
      :src="customBackground"
      autoplay
      loop
      muted
      playsinline
      ref="bgVideoRef"
      @ended="handleVideoEnded"
      @canplay="isBgLoaded = true"
    ></video>
    
    <div 
      v-else
      class="bg-image"
      :class="{ 'fade-in': isBgLoaded }"
      :style="customBackground ? { backgroundImage: `url('${customBackground}')` } : {}"
    ></div>

    <div class="content-overlay">
      <button class="theme-toggle-btn" @click="showThemeSettings = true" title="自定义专属壁纸">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
        </svg>
      </button>

      <!-- 桌面端：保持原有水平菜单 -->
      <div class="menu-bar-fixed desktop-only">
        <MenuBar 
          :menus="menus" 
          :activeId="activeMenu?.id" 
          :activeSubMenuId="activeSubMenu?.id"
          @select="selectMenu"
        />
      </div>

      <!-- 移动端：汉堡按钮 -->
      <button class="mobile-menu-btn mobile-only" @click="mobileDrawer = true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      <!-- [改动1] 移动端侧边抽屉 —— 不占满全屏，底部留空 -->
      <Transition name="drawer">
        <div v-if="mobileDrawer" class="drawer-overlay" @click="mobileDrawer = false">
          <div class="drawer-content" @click.stop>
            <div class="drawer-header">
              <span>导航分类</span>
              <button @click="mobileDrawer = false" class="drawer-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="drawer-body">
              <div v-for="menu in menus" :key="menu.id" class="drawer-menu-group">
                <button 
                  @click="selectMenu(menu); mobileDrawer = false"
                  :class="['drawer-menu-item', { active: menu.id === activeMenu?.id }]"
                >
                  {{ menu.name }}
                </button>
                <button 
                  v-for="sub in (menu.subMenus || [])" 
                  :key="sub.id"
                  @click="selectMenu(sub, menu); mobileDrawer = false"
                  :class="['drawer-sub-item', { active: sub.id === activeSubMenu?.id }]"
                >
                  {{ sub.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
      
      <div class="search-section">
        <div class="search-box-wrapper">
          <div class="search-engine-select">
            <button v-for="engine in searchEngines" :key="engine.name"
              :class="['engine-btn', {active: selectedEngine.name === engine.name}]"
              @click="selectEngine(engine)"
            >
              {{ engine.label }}
            </button>
          </div>
          <div class="search-container">
            <input 
              v-model="searchQuery" 
              type="text" 
              :placeholder="selectedEngine.placeholder" 
              class="search-input"
              @keyup.enter="handleSearch"
            />
            <button v-if="searchQuery" class="clear-btn" @click="clearSearch" aria-label="清空" title="clear">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
            </button>
            <button @click="handleSearch" class="search-btn" title="search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="leftAds.length" class="ad-space-fixed left-ad-fixed">
        <a v-for="ad in leftAds" :key="ad.id" :href="ad.url" target="_blank">
          <img :src="ad.img" alt="广告" />
        </a>
      </div>
      <div v-if="rightAds.length" class="ad-space-fixed right-ad-fixed">
        <a v-for="ad in rightAds" :key="ad.id" :href="ad.url" target="_blank">
          <img :src="ad.img" alt="广告" />
        </a>
      </div>
      
      <CardGrid :cards="filteredCards"/>
      
      <footer class="footer">
        <div class="footer-content">
          <button @click="showFriendLinks = true" class="friend-link-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            友情链接
          </button>
          <p class="copyright">Copyright © 2025 Nav-Item | <a href="https://github.com/eooce/Nav-Item" target="_blank" class="footer-link">Powered by eooce</a></p>
        </div>
      </footer>
    </div> 

    <div v-if="showFriendLinks" class="modal-overlay" @click="showFriendLinks = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>友情链接</h3>
          <button @click="showFriendLinks = false" class="close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="friend-links-grid">
            <a v-for="friend in friendLinks" :key="friend.id" :href="friend.url" target="_blank" class="friend-link-card">
              <div class="friend-link-logo">
                <img v-if="friend.logo" :src="friend.logo" :alt="friend.title" @error="handleLogoError" />
                <div v-else class="friend-link-placeholder">{{ friend.title.charAt(0) }}</div>
              </div>
              <div class="friend-link-info">
                <h4>{{ friend.title }}</h4>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showThemeSettings" class="modal-overlay" @click="showThemeSettings = false">
      <div class="modal-content theme-modal" @click.stop>
        <div class="modal-header">
          <h3>个性化壁纸设置</h3>
          <button @click="showThemeSettings = false" class="close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="theme-desc">您在这里设置的壁纸将保存在当前浏览器中，仅对您自己可见，互不干扰。</p>
          <input v-model="visitorBgInput" type="text" placeholder="请输入任意图片或视频 (.mp4) 的链接" class="theme-input" />
          <div class="theme-actions">
            <button class="btn clear-theme-btn" @click="clearVisitorTheme">恢复默认全局壁纸</button>
            <button class="btn save-theme-btn" @click="saveVisitorTheme">保存并应用</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { getMenus, getCards, getAds, getFriends, getConfig, searchCards } from '../api';
import MenuBar from '../components/MenuBar.vue';
import CardGrid from '../components/CardGrid.vue';

const menus = ref([]);
const activeMenu = ref(null);
const activeSubMenu = ref(null);
const cards = ref([]);
const searchQuery = ref('');
const leftAds = ref([]);
const rightAds = ref([]);
const showFriendLinks = ref(false);
const friendLinks = ref([]);
const mobileDrawer = ref(false);  // 移动端侧边抽屉状态

const globalBackground = ref(''); 
const customBackground = ref(''); 
const showThemeSettings = ref(false); 
const visitorBgInput = ref(''); 
const isBgLoaded = ref(false); 
const bgVideoRef = ref(null); 

function handleVideoEnded() {
  if (bgVideoRef.value) {
    bgVideoRef.value.currentTime = 0;
    bgVideoRef.value.play().catch(err => console.log('自动重新播放失败:', err));
  }
}

const isVideoBg = computed(() => {
  if (!customBackground.value) return false;
  const url = customBackground.value.toLowerCase();
  return url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg');
});

watch(customBackground, (newUrl) => {
  if (!newUrl) {
    isBgLoaded.value = true;
    return;
  }
  isBgLoaded.value = false; 
  
  if (!isVideoBg.value) {
    const img = new Image();
    img.src = newUrl;
    img.onload = () => { isBgLoaded.value = true; };
    img.onerror = () => { isBgLoaded.value = true; }; 
  }
}, { immediate: true });

function saveVisitorTheme() {
  const url = visitorBgInput.value.trim();
  if (url) {
    localStorage.setItem('visitor_bg', url); 
    customBackground.value = url;
  } else {
    clearVisitorTheme();
  }
  showThemeSettings.value = false;
}

function clearVisitorTheme() {
  localStorage.removeItem('visitor_bg');
  visitorBgInput.value = '';
  customBackground.value = globalBackground.value;
  showThemeSettings.value = false;
}

const searchEngines = [
  { name: 'google', label: 'Google', placeholder: 'Google 搜索...', url: q => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { name: 'baidu', label: '百度', placeholder: '百度搜索...', url: q => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
  { name: 'bing', label: 'Bing', placeholder: 'Bing 搜索...', url: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { name: 'github', label: 'github', placeholder: 'GitHub 搜索...', url: q => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories` },
  { name: 'site', label: '站内', placeholder: '站内搜索...', url: q => `/search?query=${encodeURIComponent(q)}` }
];
const selectedEngine = ref(searchEngines[0]);

function selectEngine(engine) {
  selectedEngine.value = engine;
}

function clearSearch() {
  searchQuery.value = '';
  if (!activeMenu.value && menus.value.length > 0) {
    activeMenu.value = menus.value[0];
  }
  loadCards();
}

const filteredCards = computed(() => {
  if (!searchQuery.value) return cards.value;
  return cards.value.filter(card => 
    card.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    card.url.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    (card.desc && card.desc.toLowerCase().includes(searchQuery.value.toLowerCase()))
  );
});

let searchTimer = null;
watch(searchQuery, (newVal) => {
  if (newVal.trim() === '') {
    if (!activeMenu.value && menus.value.length > 0) {
      activeMenu.value = menus.value[0];
    }
    loadCards();
    return;
  }
  if (selectedEngine.value.name === 'site') {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try {
        const res = await searchCards(newVal.trim());
        if (res.data.length > 0) {
          cards.value = res.data;
          activeMenu.value = null;
          activeSubMenu.value = null;
        } else {
          cards.value = [];
        }
      } catch (err) {
        console.error('站内搜索出错:', err);
      }
    }, 100);
  }
});

onMounted(async () => {
  try {
    const configRes = await getConfig();
    if (configRes.data.background) {
      globalBackground.value = configRes.data.background;
    }
    if (configRes.data.title) {
      document.title = configRes.data.title; 
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }

  const localBg = localStorage.getItem('visitor_bg');
  if (localBg) {
    customBackground.value = localBg;
    visitorBgInput.value = localBg; 
  } else {
    customBackground.value = globalBackground.value;
  }

  const res = await getMenus();
  menus.value = res.data;
  if (menus.value.length) {
    activeMenu.value = menus.value[0];
    loadCards();
  }
  const adRes = await getAds();
  leftAds.value = adRes.data.filter(ad => ad.position === 'left');
  rightAds.value = adRes.data.filter(ad => ad.position === 'right');
  
  const friendRes = await getFriends();
  friendLinks.value = friendRes.data;
});

async function selectMenu(menu, parentMenu = null) {
  if (parentMenu) {
    activeMenu.value = parentMenu;
    activeSubMenu.value = menu;
  } else {
    activeMenu.value = menu;
    activeSubMenu.value = null;
  }
  loadCards();
}

async function loadCards() {
  if (!activeMenu.value) return;
  const res = await getCards(activeMenu.value.id, activeSubMenu.value?.id);
  cards.value = res.data;
}

async function handleSearch() {
  if (!searchQuery.value.trim()) return;
  if (selectedEngine.value.name === 'site') {
    try {
      const res = await searchCards(searchQuery.value.trim());
      const matched = res.data;
      if (matched.length > 0) {
        cards.value = matched;
        activeMenu.value = null;
        activeSubMenu.value = null;
      } else {
        alert('未找到相关内容，请尝试换一个关键词');
      }
    } catch (err) {
      console.error('站内搜索出错:', err);
      alert('搜索时发生错误，请稍后再试');
    }
  } else {
    const url = selectedEngine.value.url(searchQuery.value);
    window.open(url, '_blank');
  }
}

function handleLogoError(event) {
  event.target.style.display = 'none';
  event.target.nextElementSibling.style.display = 'flex';
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
}

.bg-placeholder {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #1a1c29, #2a2d3e);
  z-index: -1; 
}

.bg-image, .bg-video {
  opacity: 0;
  transition: opacity 1.2s ease-in-out;
}
.fade-in {
  opacity: 1 !important;
}

.bg-image {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background-image: url('/background.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.bg-video {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  object-fit: cover;
  z-index: 0;
}

.home-container::before {
  content: '';
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1;
}

.content-overlay {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 50px; 
}

.theme-toggle-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 101;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 45px; height: 45px;
  display: flex; align-items: center; justify-content: center;
  color: white;
  cursor: pointer;
  transition: all var(--transition-smooth, 0.3s cubic-bezier(0.23, 1, 0.32, 1));
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.theme-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: rotate(15deg) scale(1.1);
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}

.theme-modal {
  width: 420px !important;
  height: auto !important;
  min-height: 220px;
}
.theme-desc {
  font-size: 13px;
  color: #555;
  margin-bottom: 15px;
  line-height: 1.5;
  background: #f0f4f8;
  padding: 10px;
  border-radius: 6px;
  border-left: 3px solid #2566d8;
}
.theme-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  background: #fff;
  margin-bottom: 20px;
  box-sizing: border-box;
}
.theme-input:focus {
  outline: none;
  border-color: #2566d8;
  box-shadow: 0 0 0 2px rgba(37,102,216,0.1);
}
.theme-actions {
  display: flex;
  gap: 12px;
}
.save-theme-btn {
  flex: 1;
  background: #2566d8;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background var(--transition-fast, 0.2s ease);
}
.save-theme-btn:hover { background: #1a4ba3; }
.clear-theme-btn {
  flex: 1;
  background: #fff;
  color: #64748b;
  border: 1px solid #cbd5e1;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-fast, 0.2s ease);
}
.clear-theme-btn:hover { background: #f8fafc; color: #ef4444; border-color: #ef4444; }

.menu-bar-fixed {
  position: fixed;
  top: .6rem;
  left: 0;
  width: 100vw;
  z-index: 100;
}

/* [改动2] 搜索引擎按钮横向可滚动 */
.search-engine-select {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-bottom: .3rem;
  gap: 5px;
  z-index: 2;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  flex-wrap: nowrap;
}
.search-engine-select::-webkit-scrollbar {
  display: none;
}
.engine-btn {
  border: none;
  background: none;
  color: #ffffff;
  font-size: .8rem;
  padding: 2px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: color var(--transition-fast, 0.2s ease), background var(--transition-fast, 0.2s ease);
  white-space: nowrap;
  flex-shrink: 0;
}
.engine-btn.active, .engine-btn:hover {
  color: #399dff;
  background: #ffffff1a;
}
.search-container {
  display: flex;
  align-items: center;
  background: #b3b7b83b;
  border-radius: 20px;
  padding: 0.3rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  max-width: 480px;
  width: 92%;
  position: relative;
}
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: .1rem .5rem;
  font-size: 1.2rem;
  color: #ffffff;
  outline: none;
}
.search-input::placeholder {
  color: #999;
}
.clear-btn {
  background: none;
  border: none;
  outline: none;
  cursor: pointer;
  margin-right: 0.2rem;
  display: flex;
  align-items: center;
  padding: 0;
}
.search-btn {
  background: #e9e9eb00;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast, 0.2s ease);
  margin-right: 0.1rem;
}
.search-btn:hover {
  background: #3367d6;
}
.search-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.8rem 0;
  position: relative;
  z-index: 2;
}
.search-box-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 480px;
}
.content-wrapper {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  gap: 2rem;
  position: relative;
  z-index: 2;
  flex: 1;
  justify-content: space-between;
}
.main-content {
  flex: 1;
  min-width: 0;
}
.ad-space {
  width: 90px;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 0;
  background: transparent;
  margin: 0;
}
.ad-space a {
  width: 100%;
  display: block;
}
.ad-space img {
  width: 100%;
  max-width: 90px;
  max-height: 160px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  background: #fff;
  object-fit: contain;
  margin: 0 auto;
}
.ad-placeholder {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.6);
  padding: 2rem 1rem;
  text-align: center;
  font-size: 14px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.footer {
  margin-top: auto;
  text-align: center;
  padding-top: 1rem;
  padding-bottom: 2rem;
  position: relative;
  z-index: 2;
}
.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 50px;
}
.friend-link-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all var(--transition-smooth, 0.3s ease);
  font-size: 14px;
  padding: 0;
}
.friend-link-btn:hover {
  color: #1976d2;
  transform: translateY(-1px);
}

/* [改动5] 弹窗增加缩放入场动画 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.6));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: overlayFadeIn 0.2s ease-out;
}

@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--modal-bg, rgba(248, 250, 252, 0.95));
  backdrop-filter: blur(20px);
  border-radius: var(--modal-radius, 16px);
  width: 55rem;
  height: 30rem;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: modalScaleIn 0.25s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes modalScaleIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}
.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}
.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  color: #6b7280;
  transition: all var(--transition-fast, 0.2s ease);
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}
.modal-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
.friend-links-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
.friend-link-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: #fff;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all var(--transition-smooth, 0.3s ease);
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.friend-link-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
  border-color: #cbd5e1;
}
.friend-link-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}
.friend-link-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.friend-link-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 20px;
  font-weight: 600;
  border-radius: 8px;
}
.friend-link-info h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  text-align: center;
  line-height: 1.3;
  word-break: break-all;
}
.copyright {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
.footer-link {
  color: #ffffffcc;
  text-decoration: none;
  transition: color var(--transition-fast, 0.2s ease);
}
.footer-link:hover {
  color: #1976d2;
}
:deep(.menu-bar) {
  position: relative;
  z-index: 2;
}
:deep(.card-grid) {
  position: relative;
  z-index: 2;
}
.ad-space-fixed {
  position: fixed;
  top: 13rem;
  z-index: 10;
  width: 90px;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 0;
  background: transparent;
  margin: 0;
}
.left-ad-fixed {
  left: 0;
}
.right-ad-fixed {
  right: 0;
}
.ad-space-fixed a {
  width: 100%;
  display: block;
}
.ad-space-fixed img {
  width: 100%;
  max-width: 90px;
  max-height: 160px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  background: #fff;
  margin: 0 auto;
}
@media (max-width: 1200px) {
  .content-wrapper {
    flex-direction: column;
    gap: 1rem;
  }
  .ad-space {
    width: 100%;
    height: 100px;
  }
  .ad-placeholder {
    height: 80px;
  }
}

/* ===== 移动端适配 ===== */
@media (max-width: 768px) {
  .content-overlay {
    padding-top: 20px;
  }
  .home-container {
    padding-top: 0;
  }
  .theme-toggle-btn {
    top: 12px;
    right: 12px;
    width: 38px;
    height: 38px;
  }
  .theme-modal {
    width: 90% !important;
  }
  .content-wrapper {
    gap: 0.5rem;
  }
  .ad-space {
    height: 60px;
  }
  .ad-placeholder {
    height: 50px;
    font-size: 12px;
    padding: 1rem 0.5rem;
  }
  .footer {
    padding-top: 2rem;
  }
  .friend-link-btn {
    font-size: 0.7rem;
  }
  .copyright {
    font-size: 0.7rem;
  }
  .footer-content {
    gap: 20px;
  }
  .container {
    width: 95%;
  }

  /* [改动3] 弹窗改为底部弹出式 */
  .modal-overlay {
    align-items: flex-end;
  }
  .modal-content {
    width: 100vw;
    height: auto;
    max-height: 80vh;
    border-radius: 16px 16px 0 0;
    margin-top: auto;
    animation: modalSlideUp 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .friend-links-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@keyframes modalSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* ===== [改动1] 移动端侧边抽屉 ===== */
.desktop-only { display: block; }
.mobile-only { display: none; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
}

.mobile-menu-btn {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 101;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  width: 42px;
  height: 42px;
  display: none;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: background var(--transition-fast, 0.2s ease);
}
.mobile-menu-btn:active {
  background: rgba(255, 255, 255, 0.25);
}

/* 抽屉遮罩 —— 不遮挡底部标签栏 */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: flex-start;
}

/* 抽屉主体 —— 不占满全屏高度，顶部留 12px，底部留 80px 给标签栏 */
.drawer-content {
  width: 280px;
  max-width: 80vw;
  max-height: calc(100vh - 92px);
  margin-top: 12px;
  margin-left: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.drawer-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast, 0.2s ease);
}
.drawer-close:hover { color: #fff; }

.drawer-body {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
}

.drawer-menu-group {
  margin-bottom: 2px;
}

.drawer-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 11px 20px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s ease);
  border-left: 3px solid transparent;
}
.drawer-menu-item:active,
.drawer-menu-item.active {
  background: rgba(57, 157, 255, 0.15);
  color: #399dff;
  border-left-color: #399dff;
}

.drawer-sub-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 9px 20px 9px 36px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s ease);
  border-left: 3px solid transparent;
}
.drawer-sub-item:active,
.drawer-sub-item.active {
  color: #399dff;
  background: rgba(57, 157, 255, 0.1);
  border-left-color: #399dff;
}

/* Vue Transition 动画 */
.drawer-enter-active { transition: opacity 0.25s ease; }
.drawer-leave-active { transition: opacity 0.2s ease; }
.drawer-enter-from,
.drawer-leave-to { opacity: 0; }
.drawer-enter-active .drawer-content {
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1),
              opacity 0.3s ease;
}
.drawer-leave-active .drawer-content {
  transition: transform 0.2s ease-in,
              opacity 0.2s ease;
}
.drawer-enter-from .drawer-content {
  transform: translateX(-20px) scale(0.95);
  opacity: 0;
}
.drawer-leave-to .drawer-content {
  transform: translateX(-20px) scale(0.95);
  opacity: 0;
}
</style>
