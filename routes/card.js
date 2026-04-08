const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// ✅ 全站搜索接口 —— 必须放在 /:menuId 路由之前
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json([]);

  const keyword = `%${q.trim()}%`;
  const query = `
    SELECT 
      c.*,
      m.name as menu_name,
      sm.name as sub_menu_name,
      sm.parent_id as sub_menu_parent_id
    FROM cards c
    LEFT JOIN menus m ON c.menu_id = m.id
    LEFT JOIN sub_menus sm ON c.sub_menu_id = sm.id
    WHERE c.title LIKE ? OR c.url LIKE ? OR c.desc LIKE ? 
    ORDER BY c."order"
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

// ✅ 批量更新卡片排序接口
router.post('/update-order', auth, (req, res) => {
  const { sortedIds } = req.body;
  
  if (!Array.isArray(sortedIds)) {
    return res.status(400).json({ message: '参数错误，需要数组格式' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const stmt = db.prepare('UPDATE cards SET "order" = ? WHERE id = ?');
    
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

// ✅ 批量移动卡片到其他菜单
router.post('/batch-move', auth, (req, res) => {
  const { card_ids, target_menu_id, target_sub_menu_id } = req.body;
  
  if (!card_ids || !Array.isArray(card_ids) || card_ids.length === 0) {
    return res.status(400).json({ error: '请选择要移动的卡片' });
  }

  const placeholders = card_ids.map(() => '?').join(',');
  
  const query = `
    UPDATE cards 
    SET menu_id = ?, sub_menu_id = ? 
    WHERE id IN (${placeholders})
  `;
  
  const params = [
    target_sub_menu_id ? null : target_menu_id,
    target_sub_menu_id || null,
    ...card_ids
  ];

  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ 
      success: true, 
      moved_count: this.changes,
      message: `成功移动 ${this.changes} 张卡片` 
    });
  });
});

// ✅ 批量删除卡片
router.post('/batch-delete', auth, (req, res) => {
  const { card_ids } = req.body;
  
  if (!card_ids || !Array.isArray(card_ids) || card_ids.length === 0) {
    return res.status(400).json({ error: '请选择要删除的卡片' });
  }

  const placeholders = card_ids.map(() => '?').join(',');
  const query = `DELETE FROM cards WHERE id IN (${placeholders})`;

  db.run(query, card_ids, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ 
      success: true, 
      message: `成功删除 ${this.changes} 张卡片` 
    });
  });
});

module.exports = router;
