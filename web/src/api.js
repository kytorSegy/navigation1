import axios from 'axios';
const BASE = '/api';

export const login = (username, password) => axios.post(`${BASE}/login`, { username, password });

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getMenus = () => axios.get(`${BASE}/menus`);
export const addMenu = (data) => axios.post(`${BASE}/menus`, data, { headers: authHeaders() });
export const updateMenu = (id, data) => axios.put(`${BASE}/menus/${id}`, data, { headers: authHeaders() });
export const deleteMenu = (id) => axios.delete(`${BASE}/menus/${id}`, { headers: authHeaders() });

export const getSubMenus = (menuId) => axios.get(`${BASE}/menus/${menuId}/submenus`);
export const addSubMenu = (menuId, data) => axios.post(`${BASE}/menus/${menuId}/submenus`, data, { headers: authHeaders() });
export const updateSubMenu = (id, data) => axios.put(`${BASE}/menus/submenus/${id}`, data, { headers: authHeaders() });
export const deleteSubMenu = (id) => axios.delete(`${BASE}/menus/submenus/${id}`, { headers: authHeaders() });

export const getCards = (menuId, subMenuId = null) => {
  const params = subMenuId ? { subMenuId } : {};
  return axios.get(`${BASE}/cards/${menuId}`, { params });
};
export const addCard = (data) => axios.post(`${BASE}/cards`, data, { headers: authHeaders() });
export const updateCard = (id, data) => axios.put(`${BASE}/cards/${id}`, data, { headers: authHeaders() });
export const deleteCard = (id) => axios.delete(`${BASE}/cards/${id}`, { headers: authHeaders() });
export const updateCardOrder = (data) => axios.post(`${BASE}/cards/update-order`, data, { headers: authHeaders() });
export const searchCards = (q) => axios.get(`${BASE}/cards/search`, { params: { q } });

export const uploadLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return axios.post(`${BASE}/upload`, formData, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
};

export const getAds = () => axios.get(`${BASE}/ads`);
export const addAd = (data) => axios.post(`${BASE}/ads`, data, { headers: authHeaders() });
export const updateAd = (id, data) => axios.put(`${BASE}/ads/${id}`, data, { headers: authHeaders() });
export const deleteAd = (id) => axios.delete(`${BASE}/ads/${id}`, { headers: authHeaders() });

export const getFriends = () => axios.get(`${BASE}/friends`);
export const addFriend = (data) => axios.post(`${BASE}/friends`, data, { headers: authHeaders() });
export const updateFriend = (id, data) => axios.put(`${BASE}/friends/${id}`, data, { headers: authHeaders() });
export const deleteFriend = (id) => axios.delete(`${BASE}/friends/${id}`, { headers: authHeaders() });

export const getUserProfile = () => axios.get(`${BASE}/users/profile`, { headers: authHeaders() });
export const changePassword = (oldPassword, newPassword) => axios.put(`${BASE}/users/password`, { oldPassword, newPassword }, { headers: authHeaders() });
export const getUsers = () => axios.get(`${BASE}/users`, { headers: authHeaders() }); 

export const getConfig = () => axios.get(`${BASE}/config`);

// [核心修改] 接口地址修改为 /config/settings，用于提交包裹着多种配置的对象
export const updateConfig = (data) => axios.post(`${BASE}/config/settings`, data, { headers: authHeaders() });
