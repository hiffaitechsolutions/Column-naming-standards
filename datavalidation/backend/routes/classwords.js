import express from 'express';
import Classword from '../models/Classword.js';
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


router.post(
  '/upload',
  authenticate,
  uploadRateLimiter,
  trackIP,
  uploadSingleFile('file'),
  asyncHandler(async (req, res) => {
    const file = req.file;

    try {
      const parsedData = await fileParserService.parseClasswordsFile(file.path);

      const classword = await Classword.create({
        userId: req.user.userId,
        filename: file.filename,
        originalFilename: file.originalname,
        filepath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        classwordsName: req.body.name || file.originalname,
        version: req.body.version || '1.0',
        description: req.body.description || null,
        definitions: parsedData.definitions,
        totalDefinitions: parsedData.totalDefinitions,
        sheetName: parsedData.sheetName,
        sheetIndex: parsedData.sheetIndex,
        headerRow: parsedData.headerRow,
        isParsed: true
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: SUCCESS_MESSAGES.CLASSWORDS_UPLOADED,
        data: {
          classword: {
            id: classword._id,
            filename: classword.originalFilename,
            classwordsName: classword.classwordsName,
            totalDefinitions: classword.totalDefinitions,
            definitions: classword.definitions,
            createdAt: classword.createdAt
          }
        }
      });

    } catch (error) {
      await deleteFile(file.path);

      if (error.message.includes('parse')) {
        const classword = await Classword.create({
          userId: req.user.userId,
          filename: file.filename,
          originalFilename: file.originalname,
          filepath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          isParsed: false,
          parseError: error.message
        });

        return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
          success: false,
          error: 'PARSE_ERROR',
          message: error.message,
          data: { classwordId: classword._id }
        });
      }

      throw error;
    }
  })
);


router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const classwords = await Classword.findByUser(req.user.userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        classwords: classwords.map(c => c.getSummary()),
        total: classwords.length
      }
    });
  })
);


router.get(
  '/parsed',
  authenticate,
  asyncHandler(async (req, res) => {
    const classwords = await Classword.find({ 
      userId: req.user.userId,
      isParsed: true,
      isDeleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .select('_id filename originalFilename classwordsName definitions totalDefinitions createdAt');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { 
        classwords: classwords.map(c => ({
          _id: c._id,
          filename: c.originalFilename || c.filename,
          classwordsName: c.classwordsName,
          definitions: c.definitions,
          totalDefinitions: c.totalDefinitions,
          createdAt: c.createdAt
        }))
      }
    });
  })
);


router.get(
  '/:id',
  authenticate,
  validateMongoId('id'),
  asyncHandler(async (req, res) => {
    const classword = await Classword.findById(req.params.id);

    if (!classword) {
      throw new NotFoundError('Classword');
    }

    if (classword.userId.toString() !== req.user.userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this classword'
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { classword }
    });
  })
);


router.delete(
  '/:id',
  authenticate,
  validateMongoId('id'),
  asyncHandler(async (req, res) => {
    const classword = await Classword.findById(req.params.id);

    if (!classword) {
      throw new NotFoundError('Classword');
    }

    if (classword.userId.toString() !== req.user.userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to delete this classword'
      });
    }

    await classword.softDelete();

    if (req.query.deleteFile === 'true') {
      await deleteFile(classword.filepath);
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Classword deleted successfully'
    });
  })
);

export default router;