<template>
  <div class="container card-grid animate-flipIn">
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

// 监听 cards 变化，触发动画（仅翻转动画）
watch(() => props.cards, (newCards, oldCards) => {
  if (newCards && newCards.length > 0) {
    const isDataChanged = !oldCards || oldCards.length === 0 || JSON.stringify(newCards) !== JSON.stringify(oldCards);
    if (isDataChanged) {
      nextTick(() => {
        // 只使用翻转动画，无需切换
      });
    }
  }
}, { deep: true, immediate: false });

// 获取卡片样式（仅翻转动画延迟）
function getCardStyle(index) {
  // 在移动设备上不使用延迟动画
  const isMobile = window.innerWidth <= 480;
  if (isMobile) {
    return { animationDelay: '0s' };
  }
  
  // 翻转入场：按对角线延迟
  const cols = window.innerWidth <= 768 ? 3 : (window.innerWidth <= 1200 ? 4 : 6);
  const row = Math.floor(index / cols);
  const col = index % cols;
  return {
    animationDelay: `${(row + col) * 0.06}s`
  };
}

function getLogo(card) {
  if (card.custom_logo_path) return 'http://localhost:3000/uploads/' + card.custom_logo_path;
  if (card.logo_url) return card.logo_url;
  // 默认 favicon
  try {
    const url = new URL(card.url);
    return url.origin + '/favicon.ico';
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
.link-item {
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 15px;
  padding: 0;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-height: 85px;
  height: 85px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.link-item:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}
.link-item a {
  /* margin-top: 8px; */
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

/* ========== 只保留翻转入场动画 ========== */
.animate-flipIn .link-item {
  animation: flipIn 0.7s ease-out forwards;
  opacity: 0;
  transform: rotateY(-90deg);
}

@keyframes flipIn {
  0% {
    opacity: 0;
    transform: rotateY(-90deg);
  }
  50% {
    opacity: 1;
    transform: rotateY(-45deg);
  }
  100% {
    opacity: 1;
    transform: rotateY(0deg);
  }
}

/* 优化过渡效果 */
.container .link-item {
  opacity: 1;
  transform: rotateY(0deg);
}

/* 响应式动画调整 */
@media (max-width: 768px) {
  .animate-flipIn .link-item {
    animation-duration: 0.5s;
  }
}

/* 减少动画延迟在移动设备上 */
@media (max-width: 480px) {
  .animate-flipIn .link-item {
    animation-delay: 0s !important;
  }
}

/* 为移动设备提供更快的动画 */
@media (prefers-reduced-motion: reduce) {
  .animate-flipIn .link-item {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
