import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
});

// 请求拦截器 - 添加 token
request.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
request.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/admin';
    }
    return Promise.reject(error);
  }
);

// ==================== 认证相关 ====================
export const login = (username, password) => {
  return request.post('/auth/login', { username, password });
};

export const changePassword = (oldPassword, newPassword) => {
  return request.post('/auth/change-password', { oldPassword, newPassword });
};

// ==================== 菜单相关 ====================
export const getMenus = () => {
  return request.get('/menus');
};

export const addMenu = (name) => {
  return request.post('/menus', { name });
};

export const updateMenu = (id, name) => {
  return request.put(`/menus/${id}`, { name });
};

export const deleteMenu = (id) => {
  return request.delete(`/menus/${id}`);
};

export const addSubMenu = (parentId, name) => {
  return request.post(`/menus/${parentId}/submenus`, { name });
};

export const updateSubMenu = (id, name) => {
  return request.put(`/menus/submenus/${id}`, { name });
};

export const deleteSubMenu = (id) => {
  return request.delete(`/menus/submenus/${id}`);
};

// ==================== 卡片相关 ====================
export const getCards = (menuId, subMenuId = null) => {
  let url = `/cards/${menuId}`;
  if (subMenuId) {
    url += `?subMenuId=${subMenuId}`;
  }
  return request.get(url);
};

export const addCard = (data) => {
  return request.post('/cards', data);
};

export const updateCard = (id, data) => {
  return request.put(`/cards/${id}`, data);
};

export const deleteCard = (id) => {
  return request.delete(`/cards/${id}`);
};

export const updateCardOrder = (data) => {
  return request.post('/cards/update-order', data);
};

// ✅ 搜索卡片
export const searchCards = (keyword) => {
  return request.get(`/cards/search?q=${encodeURIComponent(keyword)}`);
};

// ✅ 批量移动卡片
export const batchMoveCards = (card_ids, target_menu_id, target_sub_menu_id) => {
  return request.post('/cards/batch-move', { 
    card_ids, 
    target_menu_id, 
    target_sub_menu_id: target_sub_menu_id || null 
  });
};

// ✅ 批量删除卡片
export const batchDeleteCards = (card_ids) => {
  return request.post('/cards/batch-delete', { card_ids });
};

// ==================== 广告相关 ====================
export const getAds = () => {
  return request.get('/ads');
};

export const addAd = (data) => {
  return request.post('/ads', data);
};

export const updateAd = (id, data) => {
  return request.put(`/ads/${id}`, data);
};

export const deleteAd = (id) => {
  return request.delete(`/ads/${id}`);
};

// ==================== 友链相关 ====================
export const getFriends = () => {
  return request.get('/friends');
};

export const addFriend = (data) => {
  return request.post('/friends', data);
};

export const updateFriend = (id, data) => {
  return request.put(`/friends/${id}`, data);
};

export const deleteFriend = (id) => {
  return request.delete(`/friends/${id}`);
};

// ==================== 系统设置 ====================
export const getSettings = () => {
  return request.get('/settings');
};

export const updateSettings = (data) => {
  return request.post('/settings', data);
};

// ==================== 用户相关 ====================
export const getUserInfo = () => {
  return request.get('/user/info');
};

export const getLoginLogs = () => {
  return request.get('/user/login-logs');
};
