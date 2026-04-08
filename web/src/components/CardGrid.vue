<template>
  <div class="container card-grid animate-flipIn">
    <div v-for="(card, index) in cards" :key="card.id" class="link-item" :style="getCardStyle(index)">
      <a :href="card.url" target="_blank" :title="getTooltip(card)">
        <img class="link-icon" :src="getLogo(card)" alt="" @error="onImgError($event, card)" loading="lazy">
        <span class="link-text">{{ truncate(card.title) }}</span>
      </a>
    </div>
  </div>
</template>

<script setup>
import { watch, nextTick } from 'vue';
const props = defineProps({ cards: Array });

watch(() => props.cards, (n, o) => { 
  if (n && n.length > 0) { 
    const c = !o || o.length === 0 || JSON.stringify(n) !== JSON.stringify(o); 
    if (c) nextTick(() => {}); 
  } 
}, { deep: true, immediate: false });

function getCardStyle(index) {
  // 如果屏幕极小，直接取消动画延迟
  if (window.innerWidth <= 480) return { animationDelay: '0s' };
  
  // 【重要修改】这里把移动端（<=768px）的列数从 4 改成了 3
  // 这样动画的延迟计算才能和 CSS 里排版的 3 列保持一致
  const cols = window.innerWidth <= 768 ? 3 : (window.innerWidth <= 1200 ? 4 : 6);
  return { animationDelay: `${(Math.floor(index / cols) + index % cols) * 0.06}s` };
}

function getLogo(card) {
  if (card.custom_logo_path) return '/uploads/' + card.custom_logo_path;
  if (card.logo_url) return card.logo_url;
  try { return new URL(card.url).origin + '/favicon.ico'; } catch { return '/default-favicon.png'; }
}

function onImgError(e) { e.target.src = '/default-favicon.png'; }
function getTooltip(card) { return (card.desc ? card.desc + '\n' : '') + card.url; }
function truncate(str) { return !str ? '' : str.length > 20 ? str.slice(0, 20) + '...' : str; }
</script>

<style scoped>
/* 电脑端默认 6 列 */
.container { max-width: 55rem; margin: 0 auto; width: 100%; display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; padding: 0 12px; box-sizing: border-box; }

/* 平板端保持 4 列 */
@media (max-width: 1200px) { .container { grid-template-columns: repeat(4, 1fr); } }

/* 【修改点】手机端（竖屏/小屏幕）改为 3 列，并适当调大间距 */
@media (max-width: 768px) { .container { grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 10px; } }
@media (max-width: 480px) { .container { grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 8px; } }

.link-item { background-color: rgba(255,255,255,0.15); border-radius: 15px; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; min-height: 85px; height: 85px; display: flex; flex-direction: column; justify-content: center; align-items: center; -webkit-tap-highlight-color: transparent; }

/* 【修改点】由于变成了 3 列卡片变宽了，所以高度也要相应调高一点，看起来比例更好 */
@media (max-width: 768px) { .link-item { min-height: 75px; height: 75px; border-radius: 12px; } }
@media (max-width: 480px) { .link-item { min-height: 70px; height: 70px; border-radius: 10px; } }

.link-item:active { background-color: rgba(255,255,255,0.25); transform: scale(0.97); }
@media (pointer: fine) { .link-item:hover { background-color: rgba(255,255,255,0.3); transform: translateY(-2px); box-shadow: 0 3px 6px rgba(0,0,0,0.15); } }
.link-item a { text-decoration: none; color: #fff; font-weight: 500; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; box-sizing: border-box; }

.link-icon { width: 25px; height: 25px; margin: 4px auto; object-fit: contain; }

/* 【修改点】卡片变大，图标也适度放大一点，从 20/18 调成了 24/22 */
@media (max-width: 768px) { .link-icon { width: 24px; height: 24px; margin: 3px auto; } }
@media (max-width: 480px) { .link-icon { width: 22px; height: 22px; margin: 3px auto; } }

.link-text { padding: 0 4px; font-size: 14px; text-align: center; word-break: break-all; max-width: 100%; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; white-space: normal; line-height: 1.2; min-height: 1em; }

/* 【修改点】把手机端的文字也稍稍调大了一点点，方便阅读 */
@media (max-width: 768px) { .link-text { font-size: 12px; padding: 0 4px; -webkit-line-clamp: 1; line-height: 1.1; } }
@media (max-width: 480px) { .link-text { font-size: 11px; } }

.animate-flipIn .link-item { animation: flipIn 0.7s ease-out forwards; opacity: 0; transform: rotateY(-90deg); }
@keyframes flipIn { 0% { opacity: 0; transform: rotateY(-90deg); } 50% { opacity: 1; transform: rotateY(-45deg); } 100% { opacity: 1; transform: rotateY(0deg); } }
.container .link-item { opacity: 1; transform: rotateY(0deg); }
@media (max-width: 768px) { .animate-flipIn .link-item { animation-duration: 0.5s; } }
@media (max-width: 480px) { .animate-flipIn .link-item { animation-delay: 0s !important; } }
@media (prefers-reduced-motion: reduce) { .animate-flipIn .link-item { animation: none; opacity: 1; transform: none; } }
</style>
