const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createUploadDir = (dir) => {
  const fullPath = path.join(process.env.UPLOAD_DIR || './uploads', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = req.uploadDir || 'general';
    const fullPath = createUploadDir(dir);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const setUploadDir = (dir) => (req, res, next) => {
  req.uploadDir = dir;
  next();
};

module.exports = { upload, setUploadDir };
