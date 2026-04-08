<template>
  <div class="home-container">

    <div class="bg-placeholder"></div>

    <!-- ===== [改动] 视频背景：增加移动端自动播放修复 ===== -->
    <video
      v-if="shouldShowVideo"
      class="bg-video"
      :class="{ 'fade-in': isBgLoaded }"
      :src="customBackground"
      autoplay
      loop
      muted
      playsinline
      webkit-playsinline
      preload="auto"
      ref="bgVideoRef"
      @canplay="onVideoCanPlay"
      @error="onVideoError"
      :poster="transparentPixel"
      crossorigin="anonymous"
    ></video>

    <!-- 图片背景（含视频降级回退） -->
    <div
      v-if="shouldShowImage"
      class="bg-image"
      :class="{ 'fade-in': isBgLoaded }"
      :style="customBackground ? { backgroundImage: `url('${customBackground}')` } : {}"
    ></div>

    <!-- [改动] 移动端触屏播放提示 -->
    <div v-if="needsInteraction && isBgLoaded" class="tap-to-play-hint" @click="forcePlay">
      轻触屏幕播放动态壁纸
    </div>

    <div class="content-overlay">
      <button class="theme-toggle-btn" @click="showThemeSettings = true" title="自定义专属壁纸">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
        </svg>
      </button>

      <div class="menu-bar-fixed">
        <MenuBar
          :menus="menus"
          :activeId="activeMenu?.id"
          :activeSubMenuId="activeSubMenu?.id"
          @select="selectMenu"
        />
      </div>

      <div class="search-section">
        <div class="search-box-wrapper">
          <div class="search-engine-select">
            <button v-for="engine in searchEngines" :key="engine.name"
              :class="['engine-btn', {active: selectedEngine.name === engine.name}]"
              @click="selectEngine(engine)"
            >{{ engine.label }}</button>
          </div>
          <div class="search-container">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="selectedEngine.placeholder"
              class="search-input"
              @keyup.enter="handleSearch"
              enterkeyhint="search"
              autocomplete="off"
            />
            <button v-if="searchQuery" class="clear-btn" @click="clearSearch" aria-label="清空">
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
        <a v-for="ad in leftAds" :key="ad.id" :href="ad.url" target="_blank"><img :src="ad.img" alt="广告" /></a>
      </div>
      <div v-if="rightAds.length" class="ad-space-fixed right-ad-fixed">
        <a v-for="ad in rightAds" :key="ad.id" :href="ad.url" target="_blank"><img :src="ad.img" alt="广告" /></a>
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

    <!-- 友链弹窗 -->
    <div v-if="showFriendLinks" class="modal-overlay" @click="showFriendLinks = false">
      <div class="modal-content modal-bottom-sheet" @click.stop>
        <div class="modal-header">
          <h3>友情链接</h3>
          <button @click="showFriendLinks = false" class="close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="friend-links-grid">
            <a v-for="friend in friendLinks" :key="friend.id" :href="friend.url" target="_blank" class="friend-link-card">
              <div class="friend-link-logo">
                <img v-if="friend.logo" :src="friend.logo" :alt="friend.title" @error="handleLogoError" />
                <div v-else class="friend-link-placeholder">{{ friend.title.charAt(0) }}</div>
              </div>
              <div class="friend-link-info"><h4>{{ friend.title }}</h4></div>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- [改动] 壁纸设置弹窗：增加类型选择和检测 -->
    <div v-if="showThemeSettings" class="modal-overlay" @click="showThemeSettings = false">
      <div class="modal-content theme-modal modal-bottom-sheet" @click.stop>
        <div class="modal-header">
          <h3>个性化壁纸设置</h3>
          <button @click="showThemeSettings = false" class="close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="theme-desc">
            💡 支持动态壁纸！粘贴视频链接（.mp4）或图片链接。<br/>
            对于无后缀名的链接，点击「检测类型」自动识别，或手动选择类型。
          </p>
          <input v-model="visitorBgInput" type="text" placeholder="请输入视频或图片链接" class="theme-input" />

          <!-- 类型选择 -->
          <div class="type-selector">
            <button :class="['type-btn', { active: visitorBgType === 'auto' }]" @click="visitorBgType = 'auto'">🔄 自动</button>
            <button :class="['type-btn', { active: visitorBgType === 'video' }]" @click="visitorBgType = 'video'">🎬 视频</button>
            <button :class="['type-btn', { active: visitorBgType === 'image' }]" @click="visitorBgType = 'image'">🖼️ 图片</button>
          </div>

          <!-- 检测按钮 -->
          <button class="detect-btn" @click="handleDetect" :disabled="!visitorBgInput.trim() || detecting">
            {{ detecting ? '正在检测...' : '🔍 检测链接类型' }}
          </button>
          <p v-if="detectResult" :class="['detect-result', detectResult.type]">
            <template v-if="detectResult.type === 'video'">✅ 视频文件 — 将作为动态壁纸播放</template>
            <template v-else-if="detectResult.type === 'image'">✅ 图片文件</template>
            <template v-else>⚠️ 无法识别，请手动选择类型</template>
          </p>

          <div class="theme-actions">
            <button class="btn clear-theme-btn" @click="clearVisitorTheme">恢复默认</button>
            <button class="btn save-theme-btn" @click="saveVisitorTheme">保存并应用</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { getMenus, getCards, getAds, getFriends, getConfig, searchCards, detectMedia } from '../api';
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

const globalBackground = ref('');
const globalBgType = ref('auto');
const customBackground = ref('');
const customBgType = ref('auto');
const showThemeSettings = ref(false);
const visitorBgInput = ref('');
const visitorBgType = ref('auto');
const isBgLoaded = ref(false);
const bgVideoRef = ref(null);
const videoFailed = ref(false);
const needsInteraction = ref(false);
const detecting = ref(false);
const detectResult = ref(null);

const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// ===== [改动] 判断是否为视频：优先看 bg_type，再看后缀 =====
function isVideoType(url, bgType) {
  if (bgType === 'video') return true;
  if (bgType === 'image') return false;
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.ogg');
}

const isVideoBg = computed(() => isVideoType(customBackground.value, customBgType.value));
const shouldShowVideo = computed(() => isVideoBg.value && !videoFailed.value && !prefersReducedMotion());
const shouldShowImage = computed(() => customBackground.value && (!isVideoBg.value || videoFailed.value));

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ===== 视频播放逻辑（移动端修复） =====
function onVideoCanPlay() {
  isBgLoaded.value = true;
  attemptPlay();
}

function onVideoError() {
  console.warn('[VideoBackground] 视频加载失败，降级为静态背景');
  videoFailed.value = true;
  isBgLoaded.value = true;
}

function attemptPlay() {
  const video = bgVideoRef.value;
  if (!video) return;
  video.muted = true;
  const p = video.play();
  if (p && p.catch) {
    p.catch(err => {
      if (err.name === 'NotAllowedError') {
        needsInteraction.value = true;
      } else {
        videoFailed.value = true;
      }
    });
  }
}

function forcePlay() {
  const video = bgVideoRef.value;
  if (video) {
    video.muted = true;
    video.play().then(() => { needsInteraction.value = false; }).catch(() => { videoFailed.value = true; });
  }
  needsInteraction.value = false;
}

// 页面不可见时暂停视频（省电）
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const video = bgVideoRef.value;
    if (!video) return;
    if (document.hidden) { video.pause(); } else { video.play().catch(() => {}); }
  });
}

// 移动端首次触屏自动播放
function setupTouchPlay() {
  const handler = () => {
    forcePlay();
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('click', handler);
  };
  document.addEventListener('touchstart', handler, { once: true, passive: true });
  document.addEventListener('click', handler, { once: true });
}

watch(customBackground, (newUrl) => {
  videoFailed.value = false;
  needsInteraction.value = false;
  if (!newUrl) { isBgLoaded.value = true; return; }
  isBgLoaded.value = false;
  if (!isVideoBg.value) {
    const img = new Image();
    img.src = newUrl;
    img.onload = () => { isBgLoaded.value = true; };
    img.onerror = () => { isBgLoaded.value = true; };
  }
}, { immediate: true });

// ===== 检测媒体类型 =====
async function handleDetect() {
  if (!visitorBgInput.value.trim()) return;
  detecting.value = true;
  detectResult.value = null;
  try {
    const res = await detectMedia(visitorBgInput.value.trim());
    detectResult.value = res.data;
    if (res.data.type === 'video') visitorBgType.value = 'video';
    else if (res.data.type === 'image') visitorBgType.value = 'image';
  } catch { detectResult.value = { type: 'unknown' }; }
  finally { detecting.value = false; }
}

function saveVisitorTheme() {
  const url = visitorBgInput.value.trim();
  if (url) {
    localStorage.setItem('visitor_bg', url);
    localStorage.setItem('visitor_bg_type', visitorBgType.value);
    customBackground.value = url;
    customBgType.value = visitorBgType.value;
  } else { clearVisitorTheme(); }
  showThemeSettings.value = false;
}

function clearVisitorTheme() {
  localStorage.removeItem('visitor_bg');
  localStorage.removeItem('visitor_bg_type');
  visitorBgInput.value = '';
  visitorBgType.value = 'auto';
  customBackground.value = globalBackground.value;
  customBgType.value = globalBgType.value;
  showThemeSettings.value = false;
}

// ===== 搜索引擎 =====
const searchEngines = [
  { name: 'google', label: 'Google', placeholder: 'Google 搜索...', url: q => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { name: 'baidu', label: '百度', placeholder: '百度搜索...', url: q => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
  { name: 'bing', label: 'Bing', placeholder: 'Bing 搜索...', url: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { name: 'github', label: 'GitHub', placeholder: 'GitHub 搜索...', url: q => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories` },
  { name: 'site', label: '站内', placeholder: '站内搜索...', url: q => q }
];
const selectedEngine = ref(searchEngines[0]);
function selectEngine(engine) { selectedEngine.value = engine; }

function clearSearch() {
  searchQuery.value = '';
  if (!activeMenu.value && menus.value.length > 0) activeMenu.value = menus.value[0];
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
  if (newVal.trim() === '') { if (!activeMenu.value && menus.value.length > 0) activeMenu.value = menus.value[0]; loadCards(); return; }
  if (selectedEngine.value.name === 'site') {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try { const res = await searchCards(newVal.trim()); if (res.data.length > 0) { cards.value = res.data; activeMenu.value = null; activeSubMenu.value = null; } else { cards.value = []; } } catch (err) { console.error('站内搜索出错:', err); }
    }, 100);
  }
});

onMounted(async () => {
  try {
    const configRes = await getConfig();
    if (configRes.data.background) globalBackground.value = configRes.data.background;
    if (configRes.data.bg_type) globalBgType.value = configRes.data.bg_type;
    if (configRes.data.title) document.title = configRes.data.title;
  } catch (e) { console.error('Failed to load config:', e); }

  const localBg = localStorage.getItem('visitor_bg');
  const localBgType = localStorage.getItem('visitor_bg_type');
  if (localBg) {
    customBackground.value = localBg;
    customBgType.value = localBgType || 'auto';
    visitorBgInput.value = localBg;
    visitorBgType.value = localBgType || 'auto';
  } else {
    customBackground.value = globalBackground.value;
    customBgType.value = globalBgType.value;
  }

  setupTouchPlay();

  const res = await getMenus();
  menus.value = res.data;
  if (menus.value.length) { activeMenu.value = menus.value[0]; loadCards(); }
  const adRes = await getAds();
  leftAds.value = adRes.data.filter(ad => ad.position === 'left');
  rightAds.value = adRes.data.filter(ad => ad.position === 'right');
  const friendRes = await getFriends();
  friendLinks.value = friendRes.data;
});

async function selectMenu(menu, parentMenu = null) {
  if (parentMenu) { activeMenu.value = parentMenu; activeSubMenu.value = menu; }
  else { activeMenu.value = menu; activeSubMenu.value = null; }
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
    try { const res = await searchCards(searchQuery.value.trim()); if (res.data.length > 0) { cards.value = res.data; activeMenu.value = null; activeSubMenu.value = null; } else { alert('未找到相关内容'); } } catch { alert('搜索时发生错误'); }
  } else { window.open(selectedEngine.value.url(searchQuery.value), '_blank'); }
}

function handleLogoError(event) {
  event.target.style.display = 'none';
  if (event.target.nextElementSibling) event.target.nextElementSibling.style.display = 'flex';
}
</script>

<style scoped>
.home-container { min-height: 100vh; min-height: 100dvh; position: relative; display: flex; flex-direction: column; }
.bg-placeholder { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #1a1c29, #2a2d3e); z-index: -1; }
.bg-image, .bg-video { opacity: 0; transition: opacity 1.2s ease-in-out; }
.fade-in { opacity: 1 !important; }
.bg-image { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; height: 100dvh; background-size: cover; background-position: center; background-repeat: no-repeat; z-index: 0; }
.bg-video {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; height: 100dvh;
  object-fit: cover; z-index: 0;
  -webkit-transform: translateZ(0); transform: translateZ(0);
  -webkit-backface-visibility: hidden; backface-visibility: hidden;
}
.home-container::before { content: ''; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); z-index: 1; }
.content-overlay { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; padding-top: 50px; }

/* 触屏播放提示 */
.tap-to-play-hint {
  position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%); z-index: 3;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); color: #fff;
  font-size: 12px; padding: 8px 16px; border-radius: 20px;
  animation: pulse 2s ease-in-out infinite; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
@keyframes pulse { 0%,100% { opacity: 0.8; } 50% { opacity: 1; } }

.theme-toggle-btn {
  position: fixed; top: 16px; right: 16px; z-index: 101;
  background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.3); border-radius: 50%;
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  color: white; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  -webkit-tap-highlight-color: transparent;
}
.theme-toggle-btn:active { background: rgba(255,255,255,0.25); transform: scale(0.95); }
@media (pointer: fine) { .theme-toggle-btn:hover { background: rgba(255,255,255,0.25); transform: rotate(15deg) scale(1.1); } }

.menu-bar-fixed { position: fixed; top: .6rem; left: 0; width: 100vw; z-index: 100; }
@media (max-width: 767px) { .menu-bar-fixed { position: static; width: 100%; } .content-overlay { padding-top: 0; } }

.search-engine-select { display: flex; align-items: center; padding-bottom: .3rem; gap: 3px; z-index: 2; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.engine-btn { border: none; background: none; color: #fff; font-size: .8rem; padding: 4px 10px; border-radius: 4px; cursor: pointer; transition: color 0.2s, background 0.2s; white-space: nowrap; min-height: 32px; -webkit-tap-highlight-color: transparent; }
.engine-btn.active, .engine-btn:hover { color: #399dff; background: #ffffff1a; }
.search-container { display: flex; align-items: center; background: #b3b7b83b; border-radius: 20px; padding: 0.2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.1); backdrop-filter: blur(10px); max-width: 480px; width: 92%; position: relative; }
.search-input { flex: 1; border: none; background: transparent; padding: .1rem .5rem; font-size: 1rem; color: #fff; outline: none; min-width: 0; }
.search-input::placeholder { color: #999; }
.clear-btn { background: none; border: none; cursor: pointer; margin-right: 0.2rem; display: flex; align-items: center; padding: 4px; min-width: 36px; min-height: 36px; justify-content: center; -webkit-tap-highlight-color: transparent; }
.search-btn { background: transparent; color: #fff; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; -webkit-tap-highlight-color: transparent; }
.search-btn:active { background: #3367d6; }
.search-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem 0 2rem; position: relative; z-index: 2; }
@media (min-width: 768px) { .search-section { padding: 2.8rem 0; } }
.search-box-wrapper { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 480px; padding: 0 12px; box-sizing: border-box; }

/* 广告 - 移动端隐藏 */
.ad-space-fixed { position: fixed; top: 13rem; z-index: 10; width: 90px; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.left-ad-fixed { left: 0; } .right-ad-fixed { right: 0; }
.ad-space-fixed a { width: 100%; display: block; } .ad-space-fixed img { width: 100%; max-width: 90px; max-height: 160px; box-shadow: 0 2px 12px rgba(0,0,0,0.12); background: #fff; margin: 0 auto; }
@media (max-width: 1024px) { .ad-space-fixed { display: none; } }

/* 页脚 */
.footer { margin-top: auto; text-align: center; padding: 1rem 0 1.5rem; padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px)); position: relative; z-index: 2; }
.footer-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
@media (min-width: 768px) { .footer-content { flex-direction: row; justify-content: center; gap: 50px; } }
.friend-link-btn { display: flex; align-items: center; gap: 8px; background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; transition: all 0.3s; font-size: 12px; padding: 4px; min-height: 36px; -webkit-tap-highlight-color: transparent; }
@media (min-width: 768px) { .friend-link-btn { font-size: 14px; } }
.friend-link-btn:active { color: #1976d2; }
.copyright { color: rgba(255,255,255,0.6); font-size: 10px; margin: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
@media (min-width: 768px) { .copyright { font-size: 14px; color: rgba(255,255,255,0.8); } }
.footer-link { color: inherit; text-decoration: none; }

/* 弹窗 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(5px); }
@media (max-width: 767px) { .modal-overlay { align-items: flex-end; } }
.modal-content { background: #f8fafc; border-radius: 16px; width: 55rem; height: 30rem; max-width: 95vw; max-height: 95vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
@media (max-width: 767px) { .modal-content.modal-bottom-sheet { width: 100%; max-width: 100%; height: auto; max-height: 80vh; border-radius: 16px 16px 0 0; } }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #e5e7eb; background: #fff; flex-shrink: 0; }
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #111827; }
@media (min-width: 768px) { .modal-header h3 { font-size: 20px; } }
.close-btn { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; color: #6b7280; min-width: 40px; min-height: 40px; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; }
.close-btn:active { background: #fee2e2; color: #ef4444; }
.modal-body { flex: 1; padding: 16px; overflow-y: auto; overscroll-behavior: contain; padding-bottom: max(16px, env(safe-area-inset-bottom, 0px)); }
@media (min-width: 768px) { .modal-body { padding: 24px; } }

.friend-links-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (min-width: 768px) { .friend-links-grid { grid-template-columns: repeat(6, 1fr); gap: 12px; } }
.friend-link-card { display: flex; flex-direction: column; align-items: center; padding: 10px; background: #fff; border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s; border: 1px solid #e2e8f0; min-height: 72px; -webkit-tap-highlight-color: transparent; }
.friend-link-card:active { transform: scale(0.97); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.friend-link-logo { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
@media (min-width: 768px) { .friend-link-logo { width: 48px; height: 48px; margin-bottom: 8px; } }
.friend-link-logo img { width: 100%; height: 100%; object-fit: contain; }
.friend-link-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 18px; font-weight: 600; }
.friend-link-info h4 { margin: 0; font-size: 11px; font-weight: 500; color: #334155; text-align: center; line-height: 1.3; word-break: break-all; }
@media (min-width: 768px) { .friend-link-info h4 { font-size: 13px; } }

/* 壁纸弹窗 */
.theme-modal { width: 420px !important; height: auto !important; min-height: 220px; }
@media (max-width: 767px) { .theme-modal { width: 100% !important; } }
.theme-desc { font-size: 12px; color: #555; margin-bottom: 12px; line-height: 1.6; background: #f0f4f8; padding: 10px; border-radius: 6px; border-left: 3px solid #2566d8; }
.theme-input { width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px; background: #fff; margin-bottom: 12px; box-sizing: border-box; }
.theme-input:focus { outline: none; border-color: #2566d8; box-shadow: 0 0 0 2px rgba(37,102,216,0.1); }

.type-selector { display: flex; gap: 8px; margin-bottom: 10px; }
.type-btn { flex: 1; padding: 10px 8px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; color: #555; font-size: 12px; cursor: pointer; text-align: center; min-height: 40px; transition: all 0.2s; -webkit-tap-highlight-color: transparent; }
.type-btn.active { background: #2566d8; color: #fff; border-color: #2566d8; }
.type-btn:active { opacity: 0.8; }

.detect-btn { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8f9fa; color: #555; font-size: 12px; cursor: pointer; margin-bottom: 8px; min-height: 40px; -webkit-tap-highlight-color: transparent; }
.detect-btn:disabled { opacity: 0.5; }
.detect-btn:active { background: #e2e8f0; }

.detect-result { font-size: 12px; padding: 8px 10px; border-radius: 6px; margin-bottom: 12px; }
.detect-result.video { background: #d1fae5; color: #065f46; }
.detect-result.image { background: #dbeafe; color: #1e40af; }
.detect-result.unknown { background: #fef3c7; color: #92400e; }

.theme-actions { display: flex; gap: 10px; }
.save-theme-btn { flex: 1; background: #2566d8; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 500; min-height: 48px; -webkit-tap-highlight-color: transparent; }
.save-theme-btn:active { background: #1a4ba3; }
.clear-theme-btn { flex: 1; background: #fff; color: #64748b; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 500; min-height: 48px; -webkit-tap-highlight-color: transparent; }
.clear-theme-btn:active { color: #ef4444; border-color: #ef4444; }
</style>
