const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

function processCardLogos(rows) {
  rows.forEach(card => {
    if (card.custom_logo_path) card.display_logo = '/uploads/' + card.custom_logo_path;
    else if (card.logo_url) {
      if (card.logo_url.startsWith('http')) card.display_logo = '/api/icon-proxy?url=' + encodeURIComponent(card.logo_url);
      else card.display_logo = card.logo_url;
    } else card.display_logo = card.url.replace(/\/+$/, '') + '/favicon.ico';
  });
  return rows;
}

router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json([]);
  const keyword = `%${q.trim()}%`;
  db.all(`SELECT c.*, m.name as menu_name, sm.name as sub_menu_name, sm.parent_id as sub_menu_parent_id FROM cards c LEFT JOIN menus m ON c.menu_id = m.id LEFT JOIN sub_menus sm ON c.sub_menu_id = sm.id WHERE c.title LIKE ? OR c.url LIKE ? OR c.desc LIKE ? ORDER BY c."order"`, [keyword,keyword,keyword], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(processCardLogos(rows));
  });
});

router.get('/:menuId', (req, res) => {
  const { subMenuId } = req.query;
  let query, params;
  if (subMenuId) { query='SELECT * FROM cards WHERE sub_menu_id = ? ORDER BY "order"'; params=[subMenuId]; }
  else { query='SELECT * FROM cards WHERE menu_id = ? AND sub_menu_id IS NULL ORDER BY "order"'; params=[req.params.menuId]; }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(processCardLogos(rows));
  });
});

router.post('/', auth, (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  db.run('INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [menu_id, sub_menu_id||null, title, url, logo_url, custom_logo_path, desc, order||0], function(err) {
    if (err) return res.status(500).json({error: err.message});
    // 🟢 触发数据库文件更新时间戳，确保 backup.sh 能检测到变化
    touchDatabase();
    res.json({ id: this.lastID });
  });
});

router.put('/:id', auth, (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  db.run('UPDATE cards SET menu_id=?, sub_menu_id=?, title=?, url=?, logo_url=?, custom_logo_path=?, desc=?, "order"=? WHERE id=?',
    [menu_id, sub_menu_id||null, title, url, logo_url, custom_logo_path, desc, order||0, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    // 🟢 触发数据库文件更新时间戳
    touchDatabase();
    res.json({ changed: this.changes });
  });
});

router.delete('/:id', auth, (req, res) => {
  db.run('DELETE FROM cards WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    // 🟢 触发数据库文件更新时间戳
    touchDatabase();
    res.json({ deleted: this.changes });
  });
});

// 🟢 【修复】卡片排序更新 - 确保触发数据库文件时间戳更新
router.post('/update-order', auth, (req, res) => {
  const { sortedIds } = req.body;
  if (!Array.isArray(sortedIds)) return res.status(400).json({ message: '参数错误' });
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const stmt = db.prepare('UPDATE cards SET "order" = ? WHERE id = ?');
    sortedIds.forEach((id, i) => stmt.run(i, id));
    stmt.finalize();
    db.run('COMMIT', (err) => {
      if (err) return res.status(500).json({ error: '保存排序失败' });
      // 🟢 【关键修复】排序更新后，强制触发数据库文件时间戳更新
      touchDatabase();
      res.json({ message: '排序更新成功' });
    });
  });
});

router.post('/batch-move', auth, (req, res) => {
  const { card_ids, target_menu_id, target_sub_menu_id } = req.body;
  if (!card_ids||!Array.isArray(card_ids)||card_ids.length===0) return res.status(400).json({error:'请选择要移动的卡片'});
  const ph = card_ids.map(()=>'?').join(',');
  db.run(`UPDATE cards SET menu_id = ?, sub_menu_id = ? WHERE id IN (${ph})`, [target_sub_menu_id?null:target_menu_id, target_sub_menu_id||null, ...card_ids], function(err) {
    if(err) return res.status(500).json({error:err.message});
    // 🟢 触发数据库文件更新时间戳
    touchDatabase();
    res.json({success:true, moved_count:this.changes, message:`成功移动 ${this.changes} 张卡片`});
  });
});

router.post('/batch-delete', auth, (req, res) => {
  const { card_ids } = req.body;
  if (!card_ids||!Array.isArray(card_ids)||card_ids.length===0) return res.status(400).json({error:'请选择要删除的卡片'});
  const ph = card_ids.map(()=>'?').join(',');
  db.run(`DELETE FROM cards WHERE id IN (${ph})`, card_ids, function(err) {
    if(err) return res.status(500).json({error:err.message});
    // 🟢 触发数据库文件更新时间戳
    touchDatabase();
    res.json({success:true, message:`成功删除 ${this.changes} 张卡片`});
  });
});

// 🟢 【新增】强制更新数据库文件时间戳的辅助函数
// SQLite 的 UPDATE 操作不一定会更新文件的 mtime，这个函数通过写入一个临时值来强制触发
function touchDatabase() {
  const timestamp = Date.now();
  db.run(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('_last_update', ?)",
    [timestamp.toString()],
    (err) => {
      if (err) {
        console.error('[Card] 触发数据库时间戳更新失败:', err.message);
      }
    }
  );
}

module.exports = router;
