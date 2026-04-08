import axios from 'axios';
const request = axios.create({ baseURL: '/api', timeout: 10000 });
request.interceptors.request.use(config => { const token = localStorage.getItem('token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
request.interceptors.response.use(response => response, error => { if (error.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('token_timestamp'); if (window.location.pathname !== '/admin') { window.location.href = '/admin'; } else { window.location.reload(); } } return Promise.reject(error); });

export const login = (username, password) => request.post('/login', { username, password });
export const changePassword = (oldPassword, newPassword) => request.put('/users/password', { oldPassword, newPassword });

export const getMenus = () => request.get('/menus');
export const addMenu = (data) => request.post('/menus', data);
export const updateMenu = (id, data) => request.put(`/menus/${id}`, data);
export const deleteMenu = (id) => request.delete(`/menus/${id}`);
export const addSubMenu = (parentId, data) => request.post(`/menus/${parentId}/submenus`, data);
export const updateSubMenu = (id, data) => request.put(`/menus/submenus/${id}`, data);
export const deleteSubMenu = (id) => request.delete(`/menus/submenus/${id}`);

export const getCards = (menuId, subMenuId = null) => { let url = `/cards/${menuId}`; if (subMenuId) url += `?subMenuId=${subMenuId}`; return request.get(url); };
export const addCard = (data) => request.post('/cards', data);
export const updateCard = (id, data) => request.put(`/cards/${id}`, data);
export const deleteCard = (id) => request.delete(`/cards/${id}`);
export const updateCardOrder = (data) => request.post('/cards/update-order', data);
export const searchCards = (keyword) => request.get(`/cards/search?q=${encodeURIComponent(keyword)}`);
export const batchMoveCards = (card_ids, target_menu_id, target_sub_menu_id) => request.post('/cards/batch-move', { card_ids, target_menu_id, target_sub_menu_id: target_sub_menu_id || null });
export const batchDeleteCards = (card_ids) => request.post('/cards/batch-delete', { card_ids });

export const getAds = () => request.get('/ads');
export const addAd = (data) => request.post('/ads', data);
export const updateAd = (id, data) => request.put(`/ads/${id}`, data);
export const deleteAd = (id) => request.delete(`/ads/${id}`);

export const getFriends = () => request.get('/friends');
export const addFriend = (data) => request.post('/friends', data);
export const updateFriend = (id, data) => request.put(`/friends/${id}`, data);
export const deleteFriend = (id) => request.delete(`/friends/${id}`);
export const updateFriendsOrder = (data) => request.post('/friends/update-order', data);

export const getSettings = () => request.get('/config');
export const updateSettings = (data) => request.post('/config/settings', data);
export const getConfig = () => request.get('/config');
export const updateConfig = (data) => request.post('/config/settings', data);

export const getUserInfo = () => request.get('/users/profile');
export const getLoginLogs = () => request.get('/users/me');
export const getUserProfile = () => request.get('/users/profile');

export const parseLink = (url) => request.get(`/parse-link?url=${encodeURIComponent(url)}`);

export const updateMenusOrder = (data) => request.post('/menus/update-order', data);
export const updateSubMenusOrder = (menuId, data) => request.post(`/menus/${menuId}/submenus/update-order`, data);

// ============ 新增：检测媒体类型 ============
export const detectMedia = (url) => request.get(`/detect-media?url=${encodeURIComponent(url)}`);
