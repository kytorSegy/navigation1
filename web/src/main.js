/* =====================================================
 * 文件: web/src/main.js
 * 说明: 入口文件，新增 import variables.css
 * 操作: 整体替换 web/src/main.js
 * ===================================================== */

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/variables.css';

createApp(App).use(router).mount('#app');
