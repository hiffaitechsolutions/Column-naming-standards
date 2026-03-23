import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import config from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '..', 'uploads');

try {
  await fs.mkdir(uploadsDir, { recursive: true });
} catch (error) {
  console.error('Failed to create uploads directory:', error);
}


const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${sanitizedBasename}-${uniqueSuffix}${ext}`);
  }
});


const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedTypes = config.upload.allowedTypes;

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};


const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize
  }
});


export const uploadSingleFile = (fieldName = 'file') => {
  return upload.single(fieldName);
};


export const uploadMultipleFiles = (fieldName = 'files', maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};


export const deleteFile = async (filepath) => {
  try {
    await fs.unlink(filepath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};


export const getFileInfo = async (filepath) => {
  try {
    const stats = await fs.stat(filepath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      exists: true
    };
  } catch (error) {
    return {
      exists: false
    };
  }
};


export const fileExists = async (filepath) => {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
};

export const cleanupOldFiles = async (daysOld = 7) => {
  try {
    const files = await fs.readdir(uploadsDir);
    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      const filepath = path.join(uploadsDir, file);
      const stats = await fs.stat(filepath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        await fs.unlink(filepath);
        deletedCount++;
      }
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error cleaning up old files:', error);
    return { success: false, error: error.message };
  }
};

export default {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteFile,
  getFileInfo,
  fileExists,
  cleanupOldFiles
};