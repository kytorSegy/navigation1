/* =====================================================
 * 文件: routes/upload.js
 * 说明: 整体替换此文件
 * 改动: Logo 上传目录从 ../uploads 改为 ../database/uploads
 * ===================================================== */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// [改动] 上传目录改为 database/uploads
const uploadDir = path.join(__dirname, '../database/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage: storage });

router.post('/', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({error: 'No file uploaded'});
  res.json({ filename: req.file.filename, url: '/uploads/' + req.file.filename });
});

module.exports = router;
