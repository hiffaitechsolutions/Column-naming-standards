import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import Abbreviation from '../models/Abbreviation.js';
import fileParserService from '../services/fileParserService.js';

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * POST /api/v1/abbreviations/upload
 * Upload and parse an abbreviations Excel file.
 */
router.post('/upload', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'FILE_REQUIRED', message: 'Please upload an abbreviations file' });
  }

  const allowedExts = ['.xlsx', '.xls'];
  const ext = req.file.originalname.split('.').pop().toLowerCase();
  if (!allowedExts.includes('.' + ext)) {
    return res.status(400).json({ success: false, error: 'INVALID_FORMAT', message: 'Only .xlsx and .xls files are supported' });
  }

  // Parse the file
  const parsed = await fileParserService.parseAbbreviationsFile(req.file.path);

  if (!parsed.definitions || parsed.definitions.length === 0) {
    return res.status(400).json({
      success: false,
      error:   'EMPTY_FILE',
      message: 'No abbreviation definitions found. Make sure the file has "Full Word" and "Approved Abbreviation" columns.',
    });
  }

  // Save to DB (replace previous upload by same user with same filename, or just create new)
  const abbreviation = await Abbreviation.create({
    userId:      req.user.userId,
    filename:    req.file.originalname,
    filepath:    req.file.path,
    definitions: parsed.definitions,
    totalCount:  parsed.totalDefinitions,
  });

  res.status(201).json({
    success: true,
    message: `Abbreviations file uploaded — ${parsed.totalDefinitions} definitions loaded`,
    data: {
      id:         abbreviation._id,
      filename:   abbreviation.filename,
      totalCount: abbreviation.totalCount,
      categories: [...new Set(parsed.definitions.map(d => d.category))],
      sample:     parsed.definitions.slice(0, 5),
    },
  });
}));

/**
 * GET /api/v1/abbreviations
 * Get all abbreviation files uploaded by the user.
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const abbreviations = await Abbreviation.find({ userId: req.user.userId })
    .select('-definitions')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { abbreviations } });
}));

/**
 * GET /api/v1/abbreviations/latest
 * Get the most recently uploaded abbreviations file with full definitions.
 * Used by the validation route as default when no abbreviationsId is specified.
 */
router.get('/latest', authenticate, asyncHandler(async (req, res) => {
  const abbreviation = await Abbreviation.findOne({ userId: req.user.userId }).sort({ createdAt: -1 });
  if (!abbreviation) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'No abbreviations file uploaded yet' });
  }
  res.status(200).json({ success: true, data: { abbreviation } });
}));

/**
 * GET /api/v1/abbreviations/:id
 * Get a specific abbreviations file with all definitions.
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const abbreviation = await Abbreviation.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!abbreviation) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Abbreviations file not found' });
  }
  res.status(200).json({ success: true, data: { abbreviation } });
}));

/**
 * DELETE /api/v1/abbreviations/:id
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const abbreviation = await Abbreviation.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
  if (!abbreviation) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Abbreviations file not found' });
  }
  res.status(200).json({ success: true, message: 'Abbreviations file deleted' });
}));

export default router;