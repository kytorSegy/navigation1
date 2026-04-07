<!-- =====================================================
  文件: web/src/components/CardGrid.vue
  说明: 整体替换此文件
  改动:
    1. [动画] triggerAnimation 统一为 staggerFadeUp，移除 7 种随机动画
    2. [动画] getCardStyle 简化为统一交错延迟
    3. [动画] hover 效果增强 translateY(-4px) + scale(1.02)
    4. [动画] CSS 从 ~150 行精简到 ~25 行
    5. [代码] getLogo 修复 localhost:3000 硬编码 Bug
    6. [代码] getLogo 改用 Google Favicon API
    7. [代码] 卡片圆角使用 CSS 变量
===================================================== -->
<template>
  <div class="container card-grid" :class="animationClass">
    <div v-for="(card, index) in cards" :key="card.id" 
         class="link-item" 
         :style="getCardStyle(index)">
      <a :href="card.url" target="_blank" :title="getTooltip(card)">
        <img class="link-icon" :src="getLogo(card)" alt="" @error="onImgError($event, card)" loading="lazy">
        <span class="link-text">{{ truncate(card.title) }}</span>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({ cards: Array });

// 动画状态
const animationClass = ref('');
const animationType = ref('staggerFadeUp');

// 监听 cards 变化，触发动画
watch(() => props.cards, (newCards, oldCards) => {
  if (newCards && newCards.length > 0) {
    const isDataChanged = !oldCards || oldCards.length === 0 || JSON.stringify(newCards) !== JSON.stringify(oldCards);
    if (isDataChanged) {
      nextTick(() => {
        triggerAnimation();
      });
    }
  }
}, { deep: true, immediate: false });

// [改动1] 统一使用交错淡入动画，移除随机选择
function triggerAnimation() {
  animationType.value = 'staggerFadeUp';
  animationClass.value = 'animate-staggerFadeUp';
  setTimeout(() => {
    animationClass.value = '';
  }, 800);
}

// [改动2] 简化延迟计算：统一交错 30ms，最大 300ms
function getCardStyle(index) {
  if (!animationClass.value) return {};
  const isMobile = window.innerWidth <= 480;
  if (isMobile) {
    return { animationDelay: '0s' };
  }
  const delay = Math.min(index * 0.03, 0.3);
  return { animationDelay: `${delay}s` };
}

// [改动5+6] 修复 localhost 硬编码 + 改用 Google Favicon API
function getLogo(card) {
  if (card.custom_logo_path) return '/uploads/' + card.custom_logo_path;
  if (card.logo_url) return card.logo_url;
  try {
    const url = new URL(card.url);
    return 'https://www.google.com/s2/favicons?domain=' + url.hostname + '&sz=64';
  } catch {
    return '/default-favicon.png';
  }
}

function onImgError(e, card) {
  e.target.src = '/default-favicon.png';
}

function getTooltip(card) {
  let tip = '';
  if (card.desc) tip += card.desc + '\n';
  tip += card.url;
  return tip;
}

function truncate(str) {
  if (!str) return '';
  return str.length > 20 ? str.slice(0, 20) + '...' : str;
}
</script>

<style scoped>
.container {
  max-width: 55rem;
  margin: 0 auto;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 15px;
  opacity: 1;
  transition: opacity 0.2s ease;
}
@media (max-width: 1200px) {
  .container {
    grid-template-columns: repeat(4, 1fr);
  }
}
@media (max-width: 768px) {
  .container {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 480px) {
  .container {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* [改动7] 使用 CSS 变量 */
.link-item {
  background-color: var(--card-bg, rgba(255, 255, 255, 0.15));
  border-radius: var(--card-radius, 12px);
  padding: 0;
  /* [改动3] 增强 transition */
  transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1),
              box-shadow 0.25s ease,
              background-color 0.25s ease;
  box-shadow: var(--card-shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
  text-align: center;
  min-height: 85px;
  height: 85px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* [改动3] 增强 hover 效果 */
.link-item:hover {
  background-color: var(--card-bg-hover, rgba(255, 255, 255, 0.3));
  transform: translateY(-4px) scale(1.02);
  box-shadow: var(--card-shadow-hover, 0 8px 25px rgba(0, 0, 0, 0.2)),
              0 0 0 1px rgba(255, 255, 255, 0.1);
}

.link-item a {
  text-decoration: none;
  color: #ffffff;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
}
.link-icon {
  width: 25px;
  height: 25px;
  margin: 4px auto;
  object-fit: contain;
}
.link-text {
  padding-right: 4px;
  padding-left: 4px;
  font-size: 14px;
  text-align: center;
  word-break: break-all;
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1;
  min-height: 1.5em;
}

/* [改动4] 统一的交错淡入动画 —— 替代原来 7 种 ~150 行的动画 */
.animate-staggerFadeUp .link-item {
  animation: staggerFadeUp 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  opacity: 0;
  transform: translateY(16px);
}

@keyframes staggerFadeUp {
  0% {
    opacity: 0;
    transform: translateY(16px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 无动画时确保可见 */
.container:not(.animate-staggerFadeUp) .link-item {
  opacity: 1;
  transform: none;
}

/* 尊重用户的减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .animate-staggerFadeUp .link-item {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
