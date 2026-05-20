<template>
  <div v-if="!isLoggedIn" class="login-container">
    <div class="login-card">
      <h2 class="login-title">后台管理登录</h2>
      <div class="login-form">
        <input
          v-model="username"
          type="text"
          placeholder="用户名"
          class="login-input"
          @keyup.enter="handleLogin"
        />
        <div class="password-input-wrapper">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            class="login-input password-input"
            @keyup.enter="handleLogin"
          />
          <span class="toggle-password" @click="showPassword = !showPassword">
            <svg v-if="showPassword" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-6.06"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47"/></svg>
          </span>
        </div>
        <div class="login-buttons">
          <button @click="goHome" class="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            返回首页
          </button>
          <button @click="handleLogin" class="login-btn" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>
        <p v-if="loginError" class="login-error">{{ loginError }}</p>
      </div>
    </div>
  </div>

  <div v-else class="admin-layout" :class="{ 'light-theme': theme === 'light' }">
    <aside class="admin-sider" :class="{ open: siderOpen }" @click.self="closeSider">
      <div class="logo clickable" @click="openPage('welcome')">Admin</div>
      <ul class="menu-list">
        <li :class="{ active: page === 'menu' }" @click="openPage('menu')">栏目管理</li>
        <li :class="{ active: page === 'card' }" @click="openPage('card')">卡片管理</li>
        <li :class="{ active: page === 'ad' }" @click="openPage('ad')">广告管理</li>
        <li :class="{ active: page === 'friend' }" @click="openPage('friend')">友链管理</li>
        <li :class="{ active: page === 'system' }" @click="openPage('system')">系统设置</li>
        <li :class="{ active: page === 'user' }" @click="openPage('user')">用户管理</li>
      </ul>
    </aside>
    <main class="admin-main">
      <div class="admin-header">
        <button class="menu-toggle" @click="toggleSider">☰</button>
        <div class="header-title">{{ pageTitle }}</div>
        <div class="header-actions">
          <div class="theme-switch" aria-label="主题切换">
            <button
              class="theme-btn"
              :class="{ active: theme === 'dark' }"
              @click="setTheme('dark')"
            >
              深色
            </button>
            <button
              class="theme-btn"
              :class="{ active: theme === 'light' }"
              @click="setTheme('light')"
            >
              浅色
            </button>
          </div>
          <span class="home-icon" @click="goHome" title="进入首页">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4h-4v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <button class="btn logout-btn" @click="logout">退出登录</button>
        </div>
      </div>
      <div class="admin-content">
        <div v-if="page === 'welcome'" class="welcome-page">
          <h2 class="welcome-title">欢迎进入 Nav-Item 后台管理系统</h2>
          <div class="welcome-cards">
            <div class="welcome-card">
              <div class="welcome-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="welcome-label">上次登录时间</div>
              <div class="welcome-value">{{ lastLoginTime || '--' }}</div>
            </div>
            <div class="welcome-card">
              <div class="welcome-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="12" r="2" fill="currentColor"/>
                </svg>
              </div>
              <div class="welcome-label">上次登录 IP</div>
              <div class="welcome-value">{{ lastLoginIp || '--' }}</div>
            </div>
          </div>
        </div>
        <MenuManage v-if="page === 'menu'" />
        <CardManage v-if="page === 'card'" />
        <AdManage v-if="page === 'ad'" />
        <FriendLinkManage v-if="page === 'friend'" />
        <SystemManage v-if="page === 'system'" />
        <UserManage v-if="page === 'user'" />
      </div>
      <footer class="admin-footer">
        <p class="admin-copyright">
          Copyright © 2025 Nav-Item |
          <a href="https://github.com/eooce/Nav-Item" target="_blank" class="footer-link">Powered by eooce</a>
        </p>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { login } from '../api';
import AdManage from './admin/AdManage.vue';
import CardManage from './admin/CardManage.vue';
import FriendLinkManage from './admin/FriendLinkManage.vue';
import MenuManage from './admin/MenuManage.vue';
import SystemManage from './admin/SystemManage.vue';
import UserManage from './admin/UserManage.vue';

const page = ref('welcome');
const lastLoginTime = ref(localStorage.getItem('admin_last_login_time') || '');
const lastLoginIp = ref(localStorage.getItem('admin_last_login_ip') || '');
const isLoggedIn = ref(false);
const username = ref('');
const password = ref('');
const loading = ref(false);
const loginError = ref('');
const showPassword = ref(false);
const siderOpen = ref(false);
const theme = ref(localStorage.getItem('admin_theme') || 'dark');

const pageTitle = computed(() => {
  switch (page.value) {
    case 'menu':
      return '栏目管理';
    case 'card':
      return '卡片管理';
    case 'ad':
      return '广告管理';
    case 'friend':
      return '友链管理';
    case 'system':
      return '系统设置';
    case 'user':
      return '用户管理';
    default:
      return '';
  }
});

function checkLoginStatus() {
  const token = localStorage.getItem('token');
  const tokenTimestamp = localStorage.getItem('token_timestamp');

  if (token && tokenTimestamp) {
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (now - Number.parseInt(tokenTimestamp, 10) > threeDays) {
      logout();
      return false;
    }
    isLoggedIn.value = true;
    return true;
  }

  if (token) {
    localStorage.setItem('token_timestamp', Date.now().toString());
    isLoggedIn.value = true;
    return true;
  }

  isLoggedIn.value = false;
  return false;
}

function redirectToLogin() {
  if (!isLoggedIn.value) {
    page.value = 'welcome';
  }
}

onMounted(() => {
  const loggedIn = checkLoginStatus();
  if (loggedIn) {
    fetchLastLoginInfo();
  } else {
    redirectToLogin();
  }
});

watch(isLoggedIn, (nextValue) => {
  if (!nextValue) {
    redirectToLogin();
  }
});

async function fetchLastLoginInfo() {
  try {
    const res = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    if (data.last_login_time) {
      lastLoginTime.value = data.last_login_time;
      localStorage.setItem('admin_last_login_time', data.last_login_time);
    }

    const ip = data.lastLoginIp || data.last_login_ip;
    if (ip) {
      lastLoginIp.value = ip;
      localStorage.setItem('admin_last_login_ip', ip);
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
}

async function handleLogin() {
  if (!username.value || !password.value) {
    loginError.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;
  loginError.value = '';

  try {
    const response = await login(username.value, password.value);
    if (!response.data.token) return;

    localStorage.setItem('token', response.data.token);
    localStorage.setItem('token_timestamp', Date.now().toString());
    isLoggedIn.value = true;

    const time = response.data.lastLoginTime || response.data.last_login_time || '';
    const ip = response.data.lastLoginIp || response.data.last_login_ip || '';

    lastLoginTime.value = time;
    lastLoginIp.value = ip;

    if (time) localStorage.setItem('admin_last_login_time', time);
    if (ip) localStorage.setItem('admin_last_login_ip', ip);
  } catch (error) {
    loginError.value = error.response?.data?.message || '登录失败，请检查用户名和密码';
  } finally {
    loading.value = false;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('token_timestamp');
  localStorage.removeItem('admin_last_login_time');
  localStorage.removeItem('admin_last_login_ip');

  lastLoginTime.value = '';
  lastLoginIp.value = '';
  isLoggedIn.value = false;
  username.value = '';
  password.value = '';
  loginError.value = '';
  page.value = 'welcome';

  redirectToLogin();
}

function goHome() {
  window.open('/', '_blank');
}

function toggleSider() {
  siderOpen.value = !siderOpen.value;
}

function closeSider() {
  siderOpen.value = false;
}

function openPage(nextPage) {
  page.value = nextPage;
  closeSider();
}

function setTheme(nextTheme) {
  theme.value = nextTheme;
  localStorage.setItem('admin_theme', nextTheme);
}
</script>

<style scoped>
.login-container {
  --admin-bg: #07111f;
  --admin-bg-soft: #0c1729;
  --admin-panel: rgba(11, 22, 39, 0.88);
  --admin-panel-strong: #101d32;
  --admin-panel-muted: #16253d;
  --admin-border: rgba(143, 168, 208, 0.18);
  --admin-border-strong: rgba(108, 140, 196, 0.32);
  --admin-text: #e8eefc;
  --admin-text-soft: #9baccc;
  --admin-primary: #69a8ff;
  --admin-primary-strong: #3e7bff;
  --admin-danger: #ff7b8f;
  --admin-success: #4ed6b8;
  --admin-shadow: 0 22px 60px rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(62, 123, 255, 0.22), transparent 30%),
    radial-gradient(circle at top right, rgba(78, 214, 184, 0.14), transparent 28%),
    linear-gradient(160deg, #050b15 0%, #08111e 45%, #0b1523 100%);
  font-family: 'Segoe UI', Arial, sans-serif;
  color: var(--admin-text);
}

.login-card {
  background: var(--admin-panel);
  backdrop-filter: blur(18px);
  border: 1px solid var(--admin-border);
  border-radius: 24px;
  box-shadow: var(--admin-shadow);
  padding: 0 40px 40px;
  width: 400px;
  max-width: 90%;
}

.login-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  color: var(--admin-text);
  margin-bottom: 32px;
  letter-spacing: 2px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-input {
  padding: 12px 16px;
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  font-size: 16px;
  background: rgba(10, 20, 35, 0.9);
  color: var(--admin-text);
  height: 48px;
  line-height: 48px;
  box-sizing: border-box;
}

.login-input::placeholder {
  color: var(--admin-text-soft);
}

.login-input:focus {
  outline: none;
  border-color: var(--admin-primary);
  box-shadow: 0 0 0 4px rgba(105, 168, 255, 0.16);
}

.login-btn {
  flex: 2;
  background: linear-gradient(135deg, var(--admin-primary-strong), var(--admin-primary));
  color: #06111f;
  border: none;
  border-radius: 14px;
  padding: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px rgba(62, 123, 255, 0.28);
  filter: brightness(1.05);
}

.login-btn:disabled {
  background: rgba(93, 111, 144, 0.45);
  color: rgba(232, 238, 252, 0.5);
  cursor: not-allowed;
}

.login-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.back-btn {
  background: rgba(18, 33, 56, 0.85);
  color: var(--admin-text);
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.back-btn:hover {
  background: rgba(25, 44, 73, 0.95);
  color: var(--admin-primary);
  border-color: var(--admin-border-strong);
}

.login-error {
  color: #ff97a6;
  text-align: center;
  margin: 0;
  font-size: 14px;
}

.admin-layout {
  --admin-bg: #07111f;
  --admin-bg-soft: #0c1729;
  --admin-panel: rgba(12, 22, 38, 0.92);
  --admin-panel-strong: #111d30;
  --admin-panel-muted: #16243a;
  --admin-border: rgba(143, 168, 208, 0.14);
  --admin-border-strong: rgba(105, 168, 255, 0.26);
  --admin-text: #e7eefc;
  --admin-text-soft: #97aacb;
  --admin-primary: #69a8ff;
  --admin-primary-strong: #3d7cff;
  --admin-danger: #ff7f92;
  --admin-success: #52d3ba;
  --admin-shadow: 0 22px 60px rgba(0, 0, 0, 0.36);
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(62, 123, 255, 0.14), transparent 24%),
    radial-gradient(circle at 85% 15%, rgba(82, 211, 186, 0.12), transparent 22%),
    linear-gradient(180deg, var(--admin-bg) 0%, #09111d 100%);
  font-family: 'Segoe UI', Arial, sans-serif;
}

.admin-sider {
  width: 180px;
  background: rgba(7, 14, 26, 0.88);
  backdrop-filter: blur(20px);
  color: var(--admin-text);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding-top: 32px;
  border-right: 1px solid var(--admin-border);
  box-shadow: 8px 0 30px rgba(0, 0, 0, 0.25);
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
}

.logo {
  font-size: 2rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 32px;
  letter-spacing: 2px;
  color: var(--admin-text);
  cursor: pointer;
  user-select: none;
  transition: color 0.2s, text-shadow 0.2s;
}

.logo.clickable:hover {
  color: var(--admin-primary);
  text-shadow: 0 0 18px rgba(105, 168, 255, 0.35);
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
}

.menu-list li {
  padding: 16px 28px;
  margin: 4px 10px;
  cursor: pointer;
  font-size: 16px;
  border-left: 4px solid transparent;
  border-radius: 14px;
  transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s;
  color: var(--admin-text-soft);
}

.menu-list li:hover {
  background: rgba(105, 168, 255, 0.08);
  color: var(--admin-text);
  transform: translateX(2px);
}

.menu-list li.active {
  background: linear-gradient(135deg, rgba(61, 124, 255, 0.16), rgba(82, 211, 186, 0.1));
  border-left: 4px solid var(--admin-primary);
  color: var(--admin-primary);
  font-weight: 700;
}

.admin-main {
  flex: 1;
  background: transparent;
  padding: 64px 0 0 180px;
  min-width: 0;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.admin-header {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 64px;
  padding: 0 48px 0 0;
  background: rgba(7, 14, 26, 0.72);
  backdrop-filter: blur(18px);
  position: fixed;
  top: 0;
  left: 180px;
  right: 0;
  z-index: 101;
  border-bottom: 1px solid var(--admin-border);
}

.header-title {
  flex: 1;
  text-align: center;
  margin-left: 180px;
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--admin-text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--admin-border);
}

.theme-btn {
  border: 1px solid transparent;
  background: transparent;
  color: var(--admin-text-soft);
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-btn:hover {
  color: var(--admin-text);
  background: rgba(105, 168, 255, 0.08);
}

.theme-btn.active {
  background: linear-gradient(135deg, var(--admin-primary-strong), var(--admin-primary));
  color: #08111d;
  box-shadow: 0 10px 24px rgba(61, 124, 255, 0.18);
}

.home-icon {
  display: flex;
  align-items: center;
  margin-right: 18px;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s, transform 0.2s;
  padding: 4px;
  color: var(--admin-primary);
}

.home-icon:hover {
  background: rgba(105, 168, 255, 0.12);
  transform: translateY(-1px);
}

.btn.logout-btn {
  background: rgba(255, 127, 146, 0.14);
  color: #ff9dac;
  border: 1px solid rgba(255, 127, 146, 0.28);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  transition: background 0.2s, color 0.2s, transform 0.2s;
}

.btn.logout-btn:hover {
  background: rgba(255, 127, 146, 0.24);
  color: #ffd8de;
  transform: translateY(-1px);
}

.admin-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 22px 0;
  margin-top: 0;
}

.admin-footer {
  margin-top: auto;
  text-align: center;
  padding: 2rem 0 1rem;
  background: transparent;
}

.admin-copyright {
  color: var(--admin-text-soft);
  font-size: 14px;
  margin: 0;
}

.footer-link {
  color: var(--admin-primary);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #9ed0ff;
}

.password-input-wrapper {
  position: relative;
  width: 100%;
}

.password-input {
  width: 100%;
  padding-right: 48px;
  border-radius: 14px;
  box-sizing: border-box;
}

.toggle-password {
  position: absolute;
  top: 0;
  right: 0;
  height: 48px;
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--admin-primary);
  margin: 0;
  padding: 0;
  z-index: 2;
  transition: color 0.2s;
}

.toggle-password:hover {
  color: #9ed0ff;
  background: none;
}

.toggle-password svg {
  display: block;
  width: 22px;
  height: 22px;
  pointer-events: none;
}

.welcome-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 48px;
  width: min(1100px, 100%);
}

.welcome-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 600;
  color: var(--admin-text);
  margin-bottom: 32px;
}

.welcome-cards {
  display: flex;
  gap: 32px;
}

.welcome-card {
  background: linear-gradient(180deg, rgba(16, 29, 50, 0.94), rgba(12, 24, 40, 0.94));
  border-radius: 22px;
  box-shadow: var(--admin-shadow);
  padding: 32px 40px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 1px solid var(--admin-border);
}

.welcome-icon {
  width: 48px;
  height: 48px;
  background: rgba(105, 168, 255, 0.08);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  color: var(--admin-success);
}

.welcome-label {
  font-size: 1.1rem;
  color: var(--admin-text-soft);
  margin-bottom: 8px;
}

.welcome-value {
  font-size: 2rem;
  color: var(--admin-success);
  font-weight: 600;
  letter-spacing: 1px;
}

.menu-toggle {
  display: none;
}

.light-theme {
  --admin-bg: #eef4fb;
  --admin-bg-soft: #f7faff;
  --admin-panel: rgba(255, 255, 255, 0.86);
  --admin-panel-strong: #ffffff;
  --admin-panel-muted: #f2f6fc;
  --admin-border: rgba(92, 120, 163, 0.18);
  --admin-border-strong: rgba(75, 119, 201, 0.28);
  --admin-text: #18263b;
  --admin-text-soft: #5f7291;
  --admin-primary: #4d8dff;
  --admin-primary-strong: #2f6df1;
  --admin-danger: #e46a7d;
  --admin-success: #18a97f;
  --admin-shadow: 0 18px 45px rgba(74, 101, 145, 0.16);
  background:
    radial-gradient(circle at top left, rgba(77, 141, 255, 0.14), transparent 24%),
    radial-gradient(circle at 85% 15%, rgba(24, 169, 127, 0.08), transparent 20%),
    linear-gradient(180deg, #eef4fb 0%, #f7faff 100%);
}

.light-theme .admin-sider {
  background: rgba(248, 251, 255, 0.88);
  box-shadow: 10px 0 30px rgba(122, 146, 185, 0.12);
}

.light-theme .admin-header {
  background: rgba(245, 249, 255, 0.86);
}

.light-theme .welcome-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(242, 247, 255, 0.96));
}

.light-theme .theme-switch {
  background: rgba(77, 141, 255, 0.05);
}

.light-theme .theme-btn:hover {
  background: rgba(77, 141, 255, 0.12);
}

@media (max-width: 900px) {
  .welcome-cards {
    flex-direction: column;
    gap: 18px;
    align-items: center;
  }

  .welcome-card {
    min-width: 220px;
    width: 90vw;
    padding: 24px 18px;
  }
}

@media (max-width: 768px) {
  .admin-sider {
    position: fixed;
    left: 0;
    top: 0;
    width: 70vw;
    max-width: 260px;
    height: 100vh;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.3s;
    box-shadow: 16px 0 50px rgba(0, 0, 0, 0.45);
    background: rgba(7, 14, 26, 0.96);
  }

  .admin-sider.open {
    transform: translateX(0);
  }

  .admin-main {
    padding: 64px 0 0 !important;
  }

  .admin-header {
    left: 0 !important;
    width: 100vw !important;
    min-width: 0 !important;
    padding: 0 8px !important;
    box-sizing: border-box;
    flex-wrap: nowrap;
    height: 56px;
  }

  .header-title {
    font-size: 1.1rem !important;
    margin-left: 0 !important;
    text-align: left !important;
    width: auto !important;
    flex: 1 1 auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 1px;
  }

  .header-actions {
    gap: 4px;
    margin-left: 0;
  }

  .btn.logout-btn {
    padding: 4px 8px;
    font-size: 13px;
    border-radius: 8px;
  }

  .menu-toggle {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-right: 4px !important;
    background: rgba(105, 168, 255, 0.08);
    border: 1px solid var(--admin-border);
    border-radius: 12px;
    font-size: 2rem;
    cursor: pointer;
    color: var(--admin-primary);
    z-index: 300;
  }

  .admin-content {
    padding: 16px 10px 0;
  }
}

.admin-layout :deep(.menu-header),
.admin-layout :deep(.card-header),
.admin-layout :deep(.ad-add-row) {
  background: linear-gradient(135deg, rgba(34, 56, 94, 0.95), rgba(16, 28, 48, 0.96)) !important;
  border: 1px solid var(--admin-border) !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28) !important;
}

.admin-layout :deep(.menu-content),
.admin-layout :deep(.card-card),
.admin-layout :deep(.friend-card),
.admin-layout :deep(.system-card),
.admin-layout :deep(.user-card),
.admin-layout :deep(.ad-card),
.admin-layout :deep(.batch-operations),
.admin-layout :deep(.card-filter-add),
.admin-layout :deep(.advanced-section),
.admin-layout :deep(.modal) {
  background: rgba(13, 23, 39, 0.92) !important;
  border: 1px solid var(--admin-border) !important;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.24) !important;
  color: var(--admin-text) !important;
}

.admin-layout :deep(.menu-item),
.admin-layout :deep(.main-menu),
.admin-layout :deep(.sub-menu-item),
.admin-layout :deep(.sub-menu-section),
.admin-layout :deep(.sub-menu-header),
.admin-layout :deep(.batch-operations),
.admin-layout :deep(.move-preview),
.admin-layout :deep(.drop-zone),
.admin-layout :deep(.empty-state),
.admin-layout :deep(.empty-sub-menu) {
  background: transparent !important;
  color: var(--admin-text) !important;
}

.admin-layout :deep(.menu-item),
.admin-layout :deep(.sub-menu-section),
.admin-layout :deep(.sub-menu-header),
.admin-layout :deep(.sub-menu-item),
.admin-layout :deep(.card-table th),
.admin-layout :deep(.card-table td),
.admin-layout :deep(.friend-table th),
.admin-layout :deep(.friend-table td),
.admin-layout :deep(.ad-table th),
.admin-layout :deep(.ad-table td),
.admin-layout :deep(.modal-header),
.admin-layout :deep(.modal-footer),
.admin-layout :deep(.advanced-body) {
  border-color: var(--admin-border) !important;
}

.admin-layout :deep(.page-title),
.admin-layout :deep(.section-title),
.admin-layout :deep(.sub-menu-title),
.admin-layout :deep(.form-group label),
.admin-layout :deep(.welcome-label),
.admin-layout :deep(.hint),
.admin-layout :deep(.move-preview p),
.admin-layout :deep(.drop-main-text),
.admin-layout :deep(.drop-sub-text),
.admin-layout :deep(.empty-state p),
.admin-layout :deep(.empty-sub-menu p),
.admin-layout :deep(.menu-tag) {
  color: var(--admin-text-soft) !important;
}

.admin-layout :deep(.welcome-value),
.admin-layout :deep(.target-preview),
.admin-layout :deep(.status-text.success),
.admin-layout :deep(.r2-url-hint),
.admin-layout :deep(.parse-tip.success),
.admin-layout :deep(.message.success) {
  color: var(--admin-success) !important;
}

.admin-layout :deep(.parse-tip.error),
.admin-layout :deep(.message.error),
.admin-layout :deep(.format-error),
.admin-layout :deep(.login-error) {
  color: #ff97a6 !important;
}

.admin-layout :deep(.input),
.admin-layout :deep(.table-input),
.admin-layout :deep(.menu-name-input),
.admin-layout :deep(.sub-menu-name-input),
.admin-layout :deep(.order-input),
.admin-layout :deep(select),
.admin-layout :deep(input[type='text']),
.admin-layout :deep(input[type='password']),
.admin-layout :deep(input[type='url']) {
  background: rgba(9, 18, 31, 0.92) !important;
  color: var(--admin-text) !important;
  border-color: var(--admin-border) !important;
}

.admin-layout :deep(.input::placeholder),
.admin-layout :deep(.table-input::placeholder),
.admin-layout :deep(.menu-name-input::placeholder),
.admin-layout :deep(.sub-menu-name-input::placeholder) {
  color: var(--admin-text-soft) !important;
}

.admin-layout :deep(.input:focus),
.admin-layout :deep(.table-input:focus),
.admin-layout :deep(.menu-name-input:focus),
.admin-layout :deep(.sub-menu-name-input:focus),
.admin-layout :deep(.order-input:focus),
.admin-layout :deep(select:focus),
.admin-layout :deep(input:focus) {
  border-color: var(--admin-primary) !important;
  box-shadow: 0 0 0 4px rgba(105, 168, 255, 0.14) !important;
  outline: none !important;
}

.admin-layout :deep(.card-table),
.admin-layout :deep(.friend-table),
.admin-layout :deep(.ad-table) {
  background: transparent !important;
  color: var(--admin-text) !important;
}

.admin-layout :deep(.card-table th),
.admin-layout :deep(.friend-table th),
.admin-layout :deep(.ad-table th) {
  background: rgba(18, 32, 52, 0.92) !important;
  color: var(--admin-text-soft) !important;
}

.admin-layout :deep(.card-table tr:hover td),
.admin-layout :deep(.friend-table tr:hover td),
.admin-layout :deep(.ad-table tr:hover td),
.admin-layout :deep(.menu-item:hover),
.admin-layout :deep(.sub-menu-item:hover) {
  background: rgba(105, 168, 255, 0.05) !important;
}

.admin-layout :deep(.logo-preview) {
  background: rgba(255, 255, 255, 0.04) !important;
  border-color: var(--admin-border) !important;
}

.admin-layout :deep(.btn),
.admin-layout :deep(.save-btn),
.admin-layout :deep(.cache-btn),
.admin-layout :deep(.search-btn),
.admin-layout :deep(.btn-move),
.admin-layout :deep(.type-btn.active) {
  background: linear-gradient(135deg, var(--admin-primary-strong), var(--admin-primary)) !important;
  color: #08111d !important;
  border: 1px solid transparent !important;
}

.admin-layout :deep(.btn-outline),
.admin-layout :deep(.btn-secondary),
.admin-layout :deep(.type-btn),
.admin-layout :deep(.clear-search-btn),
.admin-layout :deep(.btn-cancel-select),
.admin-layout :deep(.retry-btn) {
  background: rgba(18, 33, 56, 0.82) !important;
  color: var(--admin-text) !important;
  border-color: var(--admin-border) !important;
}

.admin-layout :deep(.btn-danger),
.admin-layout :deep(.logout-btn) {
  background: rgba(255, 127, 146, 0.16) !important;
  color: #ffb0bb !important;
  border-color: rgba(255, 127, 146, 0.24) !important;
}

.admin-layout :deep(.selected-row) {
  background: rgba(61, 124, 255, 0.12) !important;
}

.admin-layout.light-theme :deep(.menu-header),
.admin-layout.light-theme :deep(.card-header),
.admin-layout.light-theme :deep(.ad-add-row) {
  background: linear-gradient(135deg, rgba(228, 238, 255, 0.96), rgba(241, 247, 255, 0.98)) !important;
}

.admin-layout.light-theme :deep(.menu-content),
.admin-layout.light-theme :deep(.card-card),
.admin-layout.light-theme :deep(.friend-card),
.admin-layout.light-theme :deep(.system-card),
.admin-layout.light-theme :deep(.user-card),
.admin-layout.light-theme :deep(.ad-card),
.admin-layout.light-theme :deep(.batch-operations),
.admin-layout.light-theme :deep(.card-filter-add),
.admin-layout.light-theme :deep(.advanced-section),
.admin-layout.light-theme :deep(.modal) {
  background: rgba(255, 255, 255, 0.9) !important;
}

.admin-layout.light-theme :deep(.card-table th),
.admin-layout.light-theme :deep(.friend-table th),
.admin-layout.light-theme :deep(.ad-table th) {
  background: rgba(239, 245, 255, 0.96) !important;
}

.admin-layout.light-theme :deep(.input),
.admin-layout.light-theme :deep(.table-input),
.admin-layout.light-theme :deep(.menu-name-input),
.admin-layout.light-theme :deep(.sub-menu-name-input),
.admin-layout.light-theme :deep(.order-input),
.admin-layout.light-theme :deep(select),
.admin-layout.light-theme :deep(input[type='text']),
.admin-layout.light-theme :deep(input[type='password']),
.admin-layout.light-theme :deep(input[type='url']) {
  background: rgba(248, 251, 255, 0.96) !important;
}

.admin-layout.light-theme :deep(.btn-outline),
.admin-layout.light-theme :deep(.btn-secondary),
.admin-layout.light-theme :deep(.type-btn),
.admin-layout.light-theme :deep(.clear-search-btn),
.admin-layout.light-theme :deep(.btn-cancel-select),
.admin-layout.light-theme :deep(.retry-btn) {
  background: rgba(241, 246, 255, 0.96) !important;
}
</style>
