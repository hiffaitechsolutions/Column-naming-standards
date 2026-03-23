import express from 'express';
import Standard from '../models/Standard.js';
import fileParserService from '../services/fileParserService.js';
import { authenticate } from '../middleware/auth.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import { trackIP } from '../middleware/ipTracker.js';
import { uploadSingleFile, deleteFile } from '../utils/fileUpload.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateMongoId } from '../middleware/validator.js';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '../utils/constants.js';
import { NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

router.post('/upload', authenticate, uploadRateLimiter, trackIP, uploadSingleFile('file'), asyncHandler(async (req, res) => {
  const file = req.file;
  try {
    const parsedData = await fileParserService.parseStandardsFile(file.path);
    const standard = await Standard.create({ userId: req.user.userId, filename: file.filename, originalFilename: file.originalname, filepath: file.path, fileSize: file.size, mimeType: file.mimetype, standardsName: req.body.name || file.originalname, version: req.body.version || '1.0', description: req.body.description || null, columns: parsedData.columns, totalColumns: parsedData.totalColumns, sheetName: parsedData.sheetName, sheetIndex: parsedData.sheetIndex, headerRow: parsedData.headerRow, isParsed: true });
    res.status(HTTP_STATUS.CREATED).json({ success: true, message: SUCCESS_MESSAGES.STANDARDS_UPLOADED, data: { standard: { id: standard._id, filename: standard.originalFilename, standardsName: standard.standardsName, totalColumns: standard.totalColumns, columns: standard.columns, createdAt: standard.createdAt } } });
  } catch (error) {
    await deleteFile(file.path);
    if (error.message.includes('parse')) {
      const standard = await Standard.create({ userId: req.user.userId, filename: file.filename, originalFilename: file.originalname, filepath: file.path, fileSize: file.size, mimeType: file.mimetype, isParsed: false, parseError: error.message });
      return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({ success: false, error: 'PARSE_ERROR', message: error.message, data: { standardId: standard._id } });
    }
    throw error;
  }
}));

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const standards = await Standard.findByUser(req.user.userId);
  res.status(HTTP_STATUS.OK).json({ success: true, data: { standards: standards.map(s => s.getSummary()), total: standards.length } });
}));


router.get('/parsed', authenticate, asyncHandler(async (req, res) => {
  const standards = await Standard.find({ 
    userId: req.user.userId,
    isParsed: true,
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: -1 })
    .select('_id filename originalFilename standardsName columns totalColumns createdAt');

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { 
      standards: standards.map(s => ({
        _id: s._id,
        filename: s.originalFilename || s.filename,
        standardsName: s.standardsName,
        columns: s.columns,
        totalColumns: s.totalColumns,
        createdAt: s.createdAt
      }))
    }
  });
}));

router.get('/:id', authenticate, validateMongoId('id'), asyncHandler(async (req, res) => {
  const standard = await Standard.findById(req.params.id);
  if (!standard) throw new NotFoundError('Standard');
  if (standard.userId.toString() !== req.user.userId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: 'FORBIDDEN', message: 'No permission' });
  }
  res.status(HTTP_STATUS.OK).json({ success: true, data: { standard } });
}));

router.delete('/:id', authenticate, validateMongoId('id'), asyncHandler(async (req, res) => {
  const standard = await Standard.findById(req.params.id);
  if (!standard) throw new NotFoundError('Standard');
  if (standard.userId.toString() !== req.user.userId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: 'FORBIDDEN', message: 'No permission' });
  }
  await standard.softDelete();
  if (req.query.deleteFile === 'true') await deleteFile(standard.filepath);
  res.status(HTTP_STATUS.OK).json({ success: true, message: 'Standard deleted' });
}));

export default router;