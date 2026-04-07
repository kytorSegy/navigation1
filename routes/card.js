const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// ✅ [新增] 全站搜索接口 —— 必须放在 /:menuId 路由之前
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json([]);

  const keyword = `%${q.trim()}%`;
  const query = `
    SELECT * FROM cards 
    WHERE title LIKE ? OR url LIKE ? OR desc LIKE ? 
    ORDER BY "order"
  `;

  db.all(query, [keyword, keyword, keyword], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows.forEach(card => {
      if (!card.custom_logo_path) {
        card.display_logo = card.logo_url || (card.url.replace(/\/+$/, '') + '/favicon.ico');
      } else {
        card.display_logo = '/uploads/' + card.custom_logo_path;
      }
    });
    res.json(rows);
  });
});

// 获取指定菜单的卡片
router.get('/:menuId', (req, res) => {
  const { subMenuId } = req.query;
  let query, params;
  
  if (subMenuId) {
    query = 'SELECT * FROM cards WHERE sub_menu_id = ? ORDER BY "order"';
    params = [subMenuId];
  } else {
    query = 'SELECT * FROM cards WHERE menu_id = ? AND sub_menu_id IS NULL ORDER BY "order"';
    params = [req.params.menuId];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    rows.forEach(card => {
      if (!card.custom_logo_path) {
        card.display_logo = card.logo_url || (card.url.replace(/\/+$/, '') + '/favicon.ico');
      } else {
        card.display_logo = '/uploads/' + card.custom_logo_path;
      }
    });
    res.json(rows);
  });
});

// 新增卡片
router.post('/', auth, (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  db.run('INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [menu_id, sub_menu_id || null, title, url, logo_url, custom_logo_path, desc, order || 0], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});

// 修改卡片
router.put('/:id', auth, (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  db.run('UPDATE cards SET menu_id=?, sub_menu_id=?, title=?, url=?, logo_url=?, custom_logo_path=?, desc=?, "order"=? WHERE id=?', 
    [menu_id, sub_menu_id || null, title, url, logo_url, custom_logo_path, desc, order || 0, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changed: this.changes });
  });
});

// 删除卡片
router.delete('/:id', auth, (req, res) => {
  db.run('DELETE FROM cards WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ deleted: this.changes });
  });
});

// ✅ [核心新增] 批量更新卡片排序接口
// 前端拖拽完成后，会将重新排好序的卡片ID数组发送到这里
router.post('/update-order', auth, (req, res) => {
  const { sortedIds } = req.body; // 接收包含 ID 的数组
  
  // 检查前端传来的数据是否为数组
  if (!Array.isArray(sortedIds)) {
    return res.status(400).json({ message: '参数错误，需要数组格式' });
  }

  // 开启数据库事务，确保批量更新要么全部成功，要么全部失败
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    // 准备更新语句：根据卡片ID更新它的 order 值
    const stmt = db.prepare('UPDATE cards SET "order" = ? WHERE id = ?');
    
    // 遍历数组，数组的索引(index)就是它新的排序值（越小越靠前）
    sortedIds.forEach((id, index) => {
      stmt.run(index, id);
    });
    
    stmt.finalize();
    db.run('COMMIT', (err) => {
      if (err) {
        return res.status(500).json({ error: '保存排序失败' });
      }
      res.json({ message: '排序更新成功' });
    });
  });
});

module.exports = router;
