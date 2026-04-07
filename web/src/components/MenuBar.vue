<!-- =====================================================
  文件: web/src/components/MenuBar.vue
  说明: 整体替换此文件
  改动:
    1. [代码] .menu-bar button 改为 .menu-bar > .menu-item > button，消除 12 处 !important
    2. [动画] 菜单指示器增加渐变色 + hover 半透明预览
    3. [动画] 二级菜单弹出增加 scale 缩放动画
    4. [移动端] 二级菜单字号从 8px 修复为 13px
    5. [代码] 移除 .sub-menu-item::before { display: none } hack
===================================================== -->
<template>
  <nav class="menu-bar">
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
      
      <!-- 二级菜单 -->
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
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({ 
  menus: Array, 
  activeId: Number,
  activeSubMenuId: Number 
});

const hoveredMenuId = ref(null);

function showSubMenu(menuId) {
  hoveredMenuId.value = menuId;
}

function hideSubMenu(menuId) {
  setTimeout(() => {
    if (hoveredMenuId.value === menuId) {
      hoveredMenuId.value = null;
    }
  }, 100);
}
</script>

<style scoped>
.menu-bar {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  padding: 0 1rem;
  position: relative;
}

.menu-item {
  position: relative;
}

/* [改动1] 改为直接子元素选择器，不再污染子菜单按钮 */
.menu-bar > .menu-item > button {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  padding: 0.8rem 2rem;
  cursor: pointer;
  transition: color var(--transition-smooth, 0.3s cubic-bezier(0.23, 1, 0.32, 1)),
              transform var(--transition-fast, 0.2s ease);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: none;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

/* [改动2] 菜单指示器增加渐变色 + 透明度过渡 */
.menu-bar > .menu-item > button::before {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  width: 0;
  height: 2.5px;
  background: linear-gradient(90deg, #399dff, #60c0ff);
  border-radius: 2px;
  transition: width 0.3s cubic-bezier(0.23, 1, 0.32, 1),
              opacity 0.3s ease;
  transform: translateX(-50%);
  opacity: 0;
}

.menu-bar > .menu-item > button:hover {
  color: #399dff;
  transform: translateY(-1px);
}

/* [改动2] hover 时显示半透明指示器预览 */
.menu-bar > .menu-item > button:hover::before {
  width: 40%;
  opacity: 0.5;
}

.menu-bar > .menu-item > button.active {
  color: #399dff;
}

.menu-bar > .menu-item > button.active::before {
  width: 60%;
  opacity: 1;
}

/* [改动3] 二级菜单弹出增加 scale 缩放动画 */
.sub-menu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-8px) scale(0.95);
  background: rgba(20, 20, 30, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  min-width: 130px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease,
              transform 0.2s cubic-bezier(0.23, 1, 0.32, 1),
              visibility 0.2s;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.08);
  padding: 4px 0;
  margin-top: 2px;
}

.sub-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0) scale(1);
}

/* [改动1] 子菜单样式 —— 不再需要任何 !important */
.sub-menu-item {
  display: block;
  width: 100%;
  text-align: center;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  border-radius: 6px;
  margin: 0 4px;
  line-height: 1.5;
  box-sizing: border-box;
  width: calc(100% - 8px);
}

.sub-menu-item:hover {
  background: rgba(57, 157, 255, 0.2);
  color: #399dff;
}

.sub-menu-item.active {
  background: rgba(57, 157, 255, 0.25);
  color: #399dff;
  font-weight: 500;
}

/* [改动5] 不再需要这个 hack，已删除:
   .sub-menu-item::before { display: none; } */

/* [改动4] 移动端：字号从 8px 修复为 13px */
@media (max-width: 768px) {
  .menu-bar {
    gap: 0.15rem;
  }
  
  .menu-bar > .menu-item > button {
    font-size: 14px;
    padding: .4rem .8rem;
  }
  
  .sub-menu {
    min-width: 110px;
  }
  
  .sub-menu-item {
    font-size: 13px;
    padding: 0.5rem 1rem;
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
