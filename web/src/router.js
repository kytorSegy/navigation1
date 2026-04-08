import { createRouter, createWebHistory } from 'vue-router';

const Home = () => import('./views/Home.vue');
const Admin = () => import('./views/Admin.vue');

const routes = [
  { path: '/', component: Home },
  { path: '/admin', component: Admin }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫：未登录时访问 /admin 自动跳转到登录页面
router.beforeEach((to, from, next) => {
  if (to.path === '/admin') {
    const token = localStorage.getItem('token');
    const tokenTimestamp = localStorage.getItem('token_timestamp');
    
    // 检查 token 是否有效（3天有效期 = 259200000 毫秒）
    if (token && tokenTimestamp) {
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(tokenTimestamp) > threeDays) {
        // Token 过期，清除并允许进入登录页面
        localStorage.removeItem('token');
        localStorage.removeItem('token_timestamp');
        next();
        return;
      }
      next();
      return;
    } else if (token) {
      // 兼容旧版 token，设置时间戳
      localStorage.setItem('token_timestamp', Date.now().toString());
      next();
      return;
    }
    // 未登录，进入 Admin 组件会显示登录表单（自动跳转到登录页面）
    next();
  } else {
    next();
  }
});

export default router; 
