import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploads.dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  if (!allowed.includes(file.mimetype)) {
    return cb(AppError.badRequest('El logo debe ser una imagen (png, jpg, webp o svg)'));
  }
  cb(null, true);
};

export const uploadLogo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.uploads.maxLogoSizeMb * 1024 * 1024
  }
}).single('logo');

// Subida de la firma en memoria (buffer), para poder procesarla con Sharp
// antes de subirla a la nube (T13).
export const uploadSignature = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: config.uploads.maxLogoSizeMb * 1024 * 1024
  }
}).single('signature');
