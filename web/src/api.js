import axios from 'axios';
const BASE = '/api';

// 登录接口
export const login = (username, password) => axios.post(`${BASE}/login`, { username, password });

// 这是一个用于生成请求头的函数，如果本地存储(localStorage)中有 token，就会把它加到请求头里
// 这样后端就能认出你是管理员了
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ==================== 菜单相关API ====================
export const getMenus = () => axios.get(`${BASE}/menus`);
export const addMenu = (data) => axios.post(`${BASE}/menus`, data, { headers: authHeaders() });
export const updateMenu = (id, data) => axios.put(`${BASE}/menus/${id}`, data, { headers: authHeaders() });
export const deleteMenu = (id) => axios.delete(`${BASE}/menus/${id}`, { headers: authHeaders() });

// ==================== 子菜单相关API ====================
export const getSubMenus = (menuId) => axios.get(`${BASE}/menus/${menuId}/submenus`);
export const addSubMenu = (menuId, data) => axios.post(`${BASE}/menus/${menuId}/submenus`, data, { headers: authHeaders() });
export const updateSubMenu = (id, data) => axios.put(`${BASE}/menus/submenus/${id}`, data, { headers: authHeaders() });
export const deleteSubMenu = (id) => axios.delete(`${BASE}/menus/submenus/${id}`, { headers: authHeaders() });

// ==================== 卡片相关API ====================
export const getCards = (menuId, subMenuId = null) => {
  const params = subMenuId ? { subMenuId } : {};
  return axios.get(`${BASE}/cards/${menuId}`, { params });
};
export const addCard = (data) => axios.post(`${BASE}/cards`, data, { headers: authHeaders() });
export const updateCard = (id, data) => axios.put(`${BASE}/cards/${id}`, data, { headers: authHeaders() });
export const deleteCard = (id) => axios.delete(`${BASE}/cards/${id}`, { headers: authHeaders() });

// ✅ [核心新增] 批量更新卡片排序的接口请求
// 这里的 axios.post 用于发送 POST 请求到后端的 /cards/update-order 路由
// 并且传入了 { headers: authHeaders() } 来证明你是管理员，否则后端会拦截这个请求
export const updateCardOrder = (data) => axios.post(`${BASE}/cards/update-order`, data, { headers: authHeaders() });

// 全站搜索API —— 一次请求搜遍所有菜单和子菜单
export const searchCards = (q) => axios.get(`${BASE}/cards/search`, { params: { q } });

// ==================== 文件上传API ====================
export const uploadLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  // 上传文件除了需要 token，还需要指定数据类型为 multipart/form-data
  return axios.post(`${BASE}/upload`, formData, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
};

// ==================== 广告API ====================
export const getAds = () => axios.get(`${BASE}/ads`);
export const addAd = (data) => axios.post(`${BASE}/ads`, data, { headers: authHeaders() });
export const updateAd = (id, data) => axios.put(`${BASE}/ads/${id}`, data, { headers: authHeaders() });
export const deleteAd = (id) => axios.delete(`${BASE}/ads/${id}`, { headers: authHeaders() });

// ==================== 友链API ====================
export const getFriends = () => axios.get(`${BASE}/friends`);
export const addFriend = (data) => axios.post(`${BASE}/friends`, data, { headers: authHeaders() });
export const updateFriend = (id, data) => axios.put(`${BASE}/friends/${id}`, data, { headers: authHeaders() });
export const deleteFriend = (id) => axios.delete(`${BASE}/friends/${id}`, { headers: authHeaders() });

// ==================== 用户/设置 API ====================
export const getUserProfile = () => axios.get(`${BASE}/users/profile`, { headers: authHeaders() });
export const changePassword = (oldPassword, newPassword) => axios.put(`${BASE}/users/password`, { oldPassword, newPassword }, { headers: authHeaders() });

export const getUsers = () => axios.get(`${BASE}/users`, { headers: authHeaders() }); 
export const getConfig = () => axios.get(`${BASE}/config`);
// [核心新增] 保存系统全局壁纸设置
export const updateConfig = (data) => axios.post(`${BASE}/config/background`, data, { headers: authHeaders() });
