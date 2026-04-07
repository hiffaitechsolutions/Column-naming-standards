import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import multer from 'multer';
import Validation from '../models/Validation.js';
import Standard from '../models/Standard.js';
import Classword from '../models/Classword.js';
import Abbreviation from '../models/Abbreviation.js';
import User from '../models/User.js';
import fileParserService from '../services/fileParserService.js';
import validationEngine from '../services/validationEngine.js';

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Upload data file ───────────────────────────────────────────────────────────

router.post('/upload-data', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'FILE_REQUIRED', message: 'Please upload a data file' });
  }

  const isTxt = req.file.originalname.toLowerCase().endsWith('.txt');

  // For .txt files, skip sheet parsing — return a synthetic "DDL" sheet so the
  // frontend can proceed through step 2 without breaking.
  if (isTxt) {
    return res.status(200).json({
      success: true,
      data: {
        filename:   req.file.originalname,
        filePath:   req.file.path,
        dataSheets: ['DDL'],   // synthetic single sheet
        isDDL:      true,
      },
    });
  }

  const sheetsResult = await fileParserService.getSheets(req.file.path);
  if (!sheetsResult.success) {
    return res.status(400).json({ success: false, error: 'PARSE_ERROR', message: sheetsResult.error || 'Failed to read sheets' });
  }

  res.status(200).json({
    success: true,
    data: {
      filename:   req.file.originalname,
      filePath:   req.file.path,
      dataSheets: sheetsResult.sheets,
      isDDL:      false,
    },
  });
}));

// ── Get columns ────────────────────────────────────────────────────────────────

router.post('/get-columns', authenticate, asyncHandler(async (req, res) => {
  const { filePath, sheetName } = req.body;
  if (!filePath || !sheetName) {
    return res.status(400).json({ success: false, error: 'MISSING_PARAMS', message: 'File path and sheet name are required' });
  }

  // For DDL files, columns are extracted at validation time — return a placeholder
  // so the frontend can skip column selection and use "All" automatically.
  if (filePath.toLowerCase().endsWith('.txt') || sheetName === 'DDL') {
    return res.status(200).json({
      success: true,
      data: {
        validColumns: ['ALL_DDL_COLUMNS'],  // sentinel value
        isDDL: true,
      },
    });
  }

  const columnsResult = await fileParserService.getColumns(filePath, sheetName);
  if (!columnsResult.success) {
    return res.status(400).json({ success: false, error: 'PARSE_ERROR', message: columnsResult.error || 'Failed to read columns' });
  }

  res.status(200).json({ success: true, data: { validColumns: columnsResult.columns } });
}));

// ── Validate ───────────────────────────────────────────────────────────────────

router.post('/validate', authenticate, asyncHandler(async (req, res) => {
  const { standardsId, classwordsId, abbreviationsId, filepath, dataFilename, sheetName, columns } = req.body;
  const userId = req.user.userId;

  const isTxt = dataFilename && dataFilename.toLowerCase().endsWith('.txt');

  // For .txt DDL files, sheetName will be 'DDL' and columns ['ALL_DDL_COLUMNS'] —
  // both are valid sentinels so we relax the guard accordingly.
  if (!standardsId || !filepath) {
    return res.status(400).json({ success: false, error: 'MISSING_PARAMS', message: 'Missing required parameters' });
  }
  if (!isTxt && (!sheetName || !columns || columns.length === 0)) {
    return res.status(400).json({ success: false, error: 'MISSING_PARAMS', message: 'Missing required parameters' });
  }

  // ── User & quota check ────────────────────────────────────────────────────
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found' });

  const role    = user.role?.toLowerCase();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'project owner';

  if (!isAdmin) {
    const remaining = user.freeValidationsLimit - user.freeValidationsUsed;
    if (remaining <= 0) {
      return res.status(402).json({
        success: false,
        error:   'PAYMENT_REQUIRED',
        message: 'No free validations remaining. Payment required.',
        data:    { freeValidationsRemaining: 0, paymentRequired: true, amount: 10000 },
      });
    }
  }

  // ── Load standard ─────────────────────────────────────────────────────────
  const standard = await Standard.findById(standardsId);
  if (!standard || standard.userId.toString() !== userId) {
    return res.status(404).json({ success: false, error: 'STANDARD_NOT_FOUND', message: 'Standard not found' });
  }

  // ── Resolve classword definitions (3-level fallback) ──────────────────────
  let classwordDefinitions = null;

  if (classwordsId && classwordsId !== 'none' && classwordsId !== 'null') {
    const classword = await Classword.findById(classwordsId);
    if (!classword) return res.status(404).json({ success: false, error: 'CLASSWORD_NOT_FOUND', message: 'Classword not found' });
    classwordDefinitions = classword.definitions;
    console.log(`✅ Classwords from Classword model (${classwordDefinitions.length})`);
  }

  if (!classwordDefinitions?.length) {
    const cwCols = standard.columns.filter(c => c.isClasswordRule && c.columnName?.trim());
    if (cwCols.length > 0) {
      classwordDefinitions = cwCols.map(c => ({ classword: c.columnName.trim() }));
      console.log(`✅ Classwords from standard.columns (${classwordDefinitions.length})`);
    }
  }

  if (!classwordDefinitions?.length) {
    console.log('⚠️  Re-parsing standards file from disk:', standard.filepath);
    try {
      const parsed = await fileParserService.parseClasswordsFile(standard.filepath);
      if (parsed.definitions?.length > 0) {
        classwordDefinitions  = parsed.definitions;
        standard.columns      = parsed.definitions.map(def => ({
          columnName:      def.classword,
          classword:       def.classword,
          datatype:        def.baseDatatype,
          description:     def.description,
          nullable:        false,
          required:        true,
          isClasswordRule: true,
        }));
        standard.totalColumns = standard.columns.length;
        await standard.save();
        console.log(`✅ Re-parsed ${classwordDefinitions.length} classwords and updated DB`);
      }
    } catch (parseErr) {
      console.error('Failed to re-parse standards file:', parseErr.message);
    }
  }

  if (!classwordDefinitions?.length) {
    return res.status(400).json({
      success: false,
      error:   'NO_CLASSWORDS',
      message: 'Could not load classword definitions. Please re-upload your standards file.',
    });
  }

  // ── Resolve abbreviation definitions ─────────────────────────────────────
  let abbreviationDefinitions = null;

  // Only load abbreviations if the user explicitly selected a file.
  // If they chose "None" (or sent nothing), skip the check entirely —
  // do NOT fall back to the latest uploaded file automatically.
  const userPickedAbbreviations = abbreviationsId && abbreviationsId !== 'none' && abbreviationsId !== 'null';

  if (userPickedAbbreviations) {
    const abbr = await Abbreviation.findOne({ _id: abbreviationsId, userId });
    if (!abbr) {
      return res.status(404).json({ success: false, error: 'ABBREVIATION_NOT_FOUND', message: 'Abbreviations file not found' });
    }
    abbreviationDefinitions = abbr.definitions;
    console.log(`✅ Abbreviations from specific file (${abbreviationDefinitions.length})`);
  } else {
    console.log('ℹ️  No abbreviations file selected — abbreviation check will be skipped');
  }

  // ── Create validation record ───────────────────────────────────────────────
  const validation = await Validation.create({
    userId,
    standardsId,
    classwordsId:     classwordsId || null,
    abbreviationsId:  abbreviationsId || null,
    dataFilename:     dataFilename || 'data.xlsx',
    dataFilepath:     filepath,
    sheetName:        sheetName || 'DDL',
    selectedColumns:  isTxt ? [] : columns,
    status:           'processing',
  });

  try {
    const validationResult = await validationEngine.validate({
      standardColumns:        standard.columns,
      classwordDefinitions,
      abbreviationDefinitions,
      dataFilepath:           filepath,
      sheetName:              isTxt ? 'DDL' : sheetName,
      selectedColumns:        isTxt ? [] : columns,
      isDDL:                  isTxt,   // explicit flag — multer strips extensions so we can't check the path
    });

    validation.status              = 'completed';
    validation.isValid             = validationResult.isValid;
    validation.totalRows           = validationResult.totalRows;
    validation.validColumnsCount   = validationResult.validColumnsCount;
    validation.invalidColumnsCount = validationResult.invalidColumnsCount;
    validation.totalErrorsCount    = validationResult.totalErrorsCount;
    validation.validationRate      = validationResult.validationRate;
    validation.errors              = validationResult.errors;
    validation.columnSummaries     = validationResult.columnSummaries;
    validation.completedAt         = new Date();
    await validation.save();

    if (!isAdmin) {
      user.freeValidationsUsed += 1;
      await user.save();
    }

    const freeValidationsRemaining = isAdmin ? 999 : user.freeValidationsLimit - user.freeValidationsUsed;

    res.status(200).json({
      success: true,
      message: 'Validation completed successfully',
      data: {
        validation: {
          id:                  validation._id,
          isValid:             validation.isValid,
          totalRows:           validation.totalRows,
          validColumnsCount:   validation.validColumnsCount,
          invalidColumnsCount: validation.invalidColumnsCount,
          totalErrorsCount:    validation.totalErrorsCount,
          validationRate:      validation.validationRate,
          status:              validation.status,
        },
        freeValidationsRemaining,
        abbreviationCheckPerformed: !!abbreviationDefinitions,
        ddlMode: validationResult.ddlMode || false,
        tableNames: validationResult.tableNames || [],
      },
    });

  } catch (error) {
    console.error('Validation error:', error);
    validation.status       = 'failed';
    validation.errorMessage = error.message;
    await validation.save();

    return res.status(500).json({
      success: false,
      error:   'VALIDATION_FAILED',
      message: 'Validation failed: ' + error.message,
    });
  }
}));

// ── Get validation ─────────────────────────────────────────────────────────────

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const validation = await Validation.findOne({ _id: req.params.id, userId: req.user.userId }).select('-errors');
  if (!validation) return res.status(404).json({ success: false, error: 'VALIDATION_NOT_FOUND', message: 'Validation not found' });
  res.status(200).json({ success: true, data: { validation } });
}));

router.get('/:id/errors', authenticate, asyncHandler(async (req, res) => {
  const validation = await Validation.findOne({ _id: req.params.id, userId: req.user.userId }).select('errors');
  if (!validation) return res.status(404).json({ success: false, error: 'VALIDATION_NOT_FOUND', message: 'Validation not found' });
  res.status(200).json({ success: true, data: { errors: validation.errors || [] } });
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const validation = await Validation.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
  if (!validation) return res.status(404).json({ success: false, error: 'VALIDATION_NOT_FOUND', message: 'Validation not found' });
  res.status(200).json({ success: true, message: 'Validation deleted successfully' });
}));

export default router;