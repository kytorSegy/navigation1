const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');

const dbPath = config.storage.dbPath;
const dbDir = path.dirname(dbPath);
const uploadDir = config.storage.uploadDir;
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS menus (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, "order" INTEGER DEFAULT 0)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_menus_order ON menus("order")`);
  db.run(`CREATE TABLE IF NOT EXISTS sub_menus (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER NOT NULL, name TEXT NOT NULL, "order" INTEGER DEFAULT 0, FOREIGN KEY(parent_id) REFERENCES menus(id) ON DELETE CASCADE)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sub_menus_parent_id ON sub_menus(parent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sub_menus_order ON sub_menus("order")`);
  db.run(`CREATE TABLE IF NOT EXISTS cards (id INTEGER PRIMARY KEY AUTOINCREMENT, menu_id INTEGER, sub_menu_id INTEGER, title TEXT NOT NULL, url TEXT NOT NULL, logo_url TEXT, custom_logo_path TEXT, desc TEXT, "order" INTEGER DEFAULT 0, FOREIGN KEY(menu_id) REFERENCES menus(id) ON DELETE CASCADE, FOREIGN KEY(sub_menu_id) REFERENCES sub_menus(id) ON DELETE CASCADE)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cards_menu_id ON cards(menu_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cards_sub_menu_id ON cards(sub_menu_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cards_order ON cards("order")`);
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  db.run(`CREATE TABLE IF NOT EXISTS ads (id INTEGER PRIMARY KEY AUTOINCREMENT, position TEXT NOT NULL, img TEXT NOT NULL, url TEXT NOT NULL)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ads_position ON ads(position)`);
  db.run(`CREATE TABLE IF NOT EXISTS friends (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, url TEXT NOT NULL, logo TEXT)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_friends_title ON friends(title)`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL)`);

  db.get('SELECT COUNT(*) as count FROM menus', (err, row) => {
    if (row && row.count === 0) {
      const defaultMenus = [['Home',1],['Ai Stuff',2],['Cloud',3],['Software',4],['Tools',5],['Other',6]];
      const stmt = db.prepare('INSERT INTO menus (name, "order") VALUES (?, ?)');
      defaultMenus.forEach(([n,o]) => stmt.run(n,o));
      stmt.finalize(() => { insertDefaultSubMenusAndCards(); });
    }
  });

  function insertDefaultSubMenusAndCards() {
    db.all('SELECT * FROM menus ORDER BY "order"', (err, menus) => {
      if (err||!menus||!menus.length) return;
      const menuMap = {}; menus.forEach(m => { menuMap[m.name]=m.id; });
      const subMenus = [{parentMenu:'Ai Stuff',name:'AI chat',order:1},{parentMenu:'Ai Stuff',name:'AI tools',order:2},{parentMenu:'Tools',name:'Dev Tools',order:1},{parentMenu:'Software',name:'Mac',order:1},{parentMenu:'Software',name:'iOS',order:2},{parentMenu:'Software',name:'Android',order:3},{parentMenu:'Software',name:'Windows',order:4}];
      const subMenuStmt = db.prepare('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)');
      const subMenuMap = {};
      subMenus.forEach(sub => { if(menuMap[sub.parentMenu]) subMenuStmt.run(menuMap[sub.parentMenu],sub.name,sub.order,function(err){if(!err)subMenuMap[`${sub.parentMenu}_${sub.name}`]=this.lastID;}); });
      subMenuStmt.finalize(() => {
        const cards = [{menu:'Home',title:'Baidu',url:'https://www.baidu.com',logo_url:'',desc:'全球最大的中文搜索引擎'},{menu:'Home',title:'Youtube',url:'https://www.youtube.com',logo_url:'https://img.icons8.com/ios-filled/100/ff1d06/youtube-play.png',desc:'全球最大的视频社区'},{menu:'Home',title:'GitHub',url:'https://github.com',logo_url:'',desc:'全球最大的代码托管平台'},{menu:'Home',title:'ChatGPT',url:'https://chat.openai.com',logo_url:'https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico',desc:'AI聊天机器人'},{menu:'Ai Stuff',title:'Deepseek',url:'https://www.deepseek.com',logo_url:'https://cdn.deepseek.com/chat/icon.png',desc:'Deepseek AI'},{subMenu:'AI chat',title:'ChatGPT',url:'https://chat.openai.com',logo_url:'https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico',desc:'OpenAI AI对话'}];
        const cardStmt = db.prepare('INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, desc) VALUES (?, ?, ?, ?, ?, ?)');
        cards.forEach(card => { if(card.subMenu){let sid=null;for(const[k,id]of Object.entries(subMenuMap)){if(k.endsWith(`_${card.subMenu}`)){sid=id;break;}}if(sid)cardStmt.run(null,sid,card.title,card.url,card.logo_url,card.desc);}else if(menuMap[card.menu]){cardStmt.run(menuMap[card.menu],null,card.title,card.url,card.logo_url,card.desc);} });
        cardStmt.finalize();
      });
    });
  }

  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (row && row.count === 0) { const h = bcrypt.hashSync(config.admin.password, 10); db.run('INSERT INTO users (username, password) VALUES (?, ?)', [config.admin.username, h]); }
  });
  db.get('SELECT COUNT(*) as count FROM friends', (err, row) => {
    if (row && row.count === 0) { const stmt = db.prepare('INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)'); stmt.run('Noodseek图床','https://www.nodeimage.com','https://www.nodeseek.com/static/image/favicon/favicon-32x32.png'); stmt.finalize(); }
  });
  db.run(`ALTER TABLE users ADD COLUMN last_login_time TEXT`, [], () => {});
  db.run(`ALTER TABLE users ADD COLUMN last_login_ip TEXT`, [], () => {});
});

module.exports = db;
