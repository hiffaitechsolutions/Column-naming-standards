import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { FileUploadError } from '../middleware/errorHandler.js';
import { DATA_TYPES } from '../utils/constants.js';

class EnhancedFileParserService {

  // ─── TXT helper ────────────────────────────────────────────────────────────
  /**
   * Parses a .txt file into a 2-D array (same shape as sheet_to_json header:1).
   * Supports tab-delimited, comma-delimited, semicolon-delimited, and pipe-delimited.
   */
  _parseTxtFile(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const lines   = content.split(/\r?\n/).filter(l => l.trim() !== '');
    if (!lines.length) return [];

    // Auto-detect delimiter from the first line
    const sample    = lines[0];
    const delimiters = ['\t', ',', ';', '|'];
    const delimiter  = delimiters.reduce((best, d) =>
      (sample.split(d).length > sample.split(best).length ? d : best), '\t');

    return lines.map(line =>
      line.split(delimiter).map(cell => {
        const v = cell.trim().replace(/^"|"$/g, ''); // strip surrounding quotes
        return v === '' ? null : v;
      })
    );
  }

  /**
   * Converts a .txt file into a temporary in-memory XLSX workbook sheet
   * so the rest of the existing logic can work unchanged.
   */
  _txtToWorkbook(filepath) {
    const data      = this._parseTxtFile(filepath);
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    return workbook;
  }

  // ─── readWorkbook (centralised) ────────────────────────────────────────────
  _readWorkbook(filepath, options = {}) {
    const ext = path.extname(filepath).toLowerCase();
    if (ext === '.txt') return this._txtToWorkbook(filepath);
    return XLSX.readFile(filepath, options);
  }

  // ───────────────────────────────────────────────────────────────────────────

  async getSheets(filepath) {
    try {
      if (!fs.existsSync(filepath)) return { success: false, error: 'File not found' };
      const workbook = this._readWorkbook(filepath, { bookSheets: true });
      return { success: true, sheets: workbook.SheetNames };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getColumns(filepath, sheetName) {
    try {
      if (!fs.existsSync(filepath)) return { success: false, error: 'File not found' };
      const workbook  = this._readWorkbook(filepath);
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return { success: false, error: `Sheet "${sheetName}" not found` };

      const data    = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });
      const hIdx    = this.detectHeaderRowIndex(data);
      const columns = (data[hIdx] || []).map(h => this.cleanHeader(h)).filter(h => h && h !== 'Unnamed');

      console.log(`✅ getColumns: ${columns.length} columns at row ${hIdx}`);
      return { success: true, columns };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async parseDataFile(filepath, sheetName, columns = null) {
    try {
      if (!fs.existsSync(filepath)) throw new FileUploadError('File not found');

      const workbook  = this._readWorkbook(filepath, { cellDates: true, cellText: false, sheetStubs: true });
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) throw new FileUploadError(`Sheet "${sheetName}" not found`);

      const data         = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });
      const hIdx         = this.detectHeaderRowIndex(data);
      const cleanHeaders = (data[hIdx] || []).map(h => this.cleanHeader(h));
      const dataRows     = data.slice(hIdx + 1);

      console.log(`📊 parseDataFile: ${dataRows.length} rows, header at index ${hIdx}`);

      const dataObjects = dataRows.map(row => {
        const obj = {};
        cleanHeaders.forEach((h, i) => { obj[h] = this.cleanCell(row[i]); });
        return obj;
      });

      const filtered = (columns?.length)
        ? dataObjects.map(row => Object.fromEntries(columns.map(c => [c, row[c]])))
        : dataObjects;

      return {
        headers:        columns || cleanHeaders.filter(h => h && h !== 'Unnamed'),
        rows:           filtered,
        rowCount:       filtered.length,
        columnCount:    (columns || cleanHeaders).length,
        sheetName,
        headerRowIndex: hIdx,
      };
    } catch (error) {
      throw new FileUploadError(`Failed to parse data file: ${error.message}`);
    }
  }

  async parseClasswordsFile(filepath) {
    try {
      const workbook  = this._readWorkbook(filepath, { cellText: false, sheetStubs: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data      = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });

      let hIdx = 0;
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        if ((data[i] || []).some(v => v && String(v).trim().toLowerCase() === 'classwords')) {
          hIdx = i;
          break;
        }
      }

      const headers = (data[hIdx] || []).map(h => this.cleanHeader(h));
      const cwIdx   = headers.findIndex(h => h && h.toLowerCase() === 'classwords');
      const dtIdx   = headers.findIndex(h => h && h.toLowerCase().replace(/\s+/g, '').includes('datatype'));
      const defIdx  = headers.findIndex(h => h && h.toLowerCase().includes('definition'));

      console.log(`📋 Classwords file — header row: ${hIdx}, classwords col index: ${cwIdx}`);
      if (cwIdx === -1) throw new FileUploadError('Could not find "Classwords" column in the standards file.');

      const definitions = [];
      for (const row of data.slice(hIdx + 1)) {
        const raw = row[cwIdx];
        if (!raw) continue;
        for (const part of String(raw).split('\n')) {
          const classword = part.replace(/\s*\(.*?\)/g, '').trim();
          if (!classword) continue;
          definitions.push({
            classword,
            description:  defIdx >= 0 && row[defIdx] ? String(row[defIdx]).substring(0, 500) : null,
            baseDatatype: dtIdx  >= 0 && row[dtIdx]  ? this.normalizeDatatype(String(row[dtIdx])) : null,
          });
        }
      }

      console.log(`✅ Parsed ${definitions.length} classword definitions`);
      return { definitions, totalDefinitions: definitions.length, sheetName };

    } catch (error) {
      console.error('parseClasswordsFile error:', error.message);
      throw new FileUploadError(`Failed to parse classwords file: ${error.message}`);
    }
  }

  async parseStandardsFile(filepath) {
    console.log('ℹ️  parseStandardsFile → parseClasswordsFile');
    const result = await this.parseClasswordsFile(filepath);
    return {
      columns: result.definitions.map(def => ({
        columnName:      def.classword,
        classword:       def.classword,
        datatype:        def.baseDatatype,
        description:     def.description,
        nullable:        false,
        required:        true,
        isClasswordRule: true,
      })),
      totalColumns: result.definitions.length,
      sheetName:    result.sheetName,
    };
  }

  async parseAbbreviationsFile(filepath) {
    try {
      if (!fs.existsSync(filepath)) throw new FileUploadError('Abbreviations file not found');

      const workbook = this._readWorkbook(filepath, { cellText: false, sheetStubs: true });

      const sheetName = workbook.SheetNames.find(
        n => n.toLowerCase().includes('abbreviation')
      ) || workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) throw new FileUploadError(`Sheet "${sheetName}" not found`);

      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });

      let hIdx = 0;
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        const cells = (data[i] || []).map(v => String(v || '').toLowerCase());
        if (cells.some(c => c.includes('abbreviation') || c.includes('full word'))) {
          hIdx = i;
          break;
        }
      }

      const headers = (data[hIdx] || []).map(h => this.cleanHeader(h).toLowerCase());

      const fullWordIdx  = headers.findIndex(h => h.includes('full') && h.includes('word'));
      const abbrIdx      = headers.findIndex(h => h.includes('abbreviation') || h === 'abbr' || h === 'abbreviation');
      const categoryIdx  = headers.findIndex(h => h.includes('category'));
      const notesIdx     = headers.findIndex(h => h.includes('notes') || h.includes('source'));

      const colFullWord  = fullWordIdx  >= 0 ? fullWordIdx  : 0;
      const colAbbr      = abbrIdx      >= 0 ? abbrIdx      : 1;
      const colCategory  = categoryIdx  >= 0 ? categoryIdx  : 2;
      const colNotes     = notesIdx     >= 0 ? notesIdx     : 3;

      console.log(`📋 Abbreviations file — sheet: "${sheetName}", header row: ${hIdx}`);
      console.log(`   Columns → fullWord:${colFullWord} abbr:${colAbbr} category:${colCategory} notes:${colNotes}`);

      const definitions = [];

      for (const row of data.slice(hIdx + 1)) {
        const abbreviation = row[colAbbr]     ? String(row[colAbbr]).trim()     : null;
        const fullWord     = row[colFullWord] ? String(row[colFullWord]).trim() : null;

        if (!abbreviation || !fullWord) continue;
        if (abbreviation.toLowerCase() === 'abbreviation') continue;

        definitions.push({
          abbreviation,
          fullWord,
          category: row[colCategory] ? String(row[colCategory]).trim() : 'General',
          notes:    row[colNotes]    ? String(row[colNotes]).trim()    : '',
        });
      }

      console.log(`✅ Parsed ${definitions.length} abbreviation definitions`);
      console.log(`   Sample: ${definitions.slice(0, 5).map(d => `${d.abbreviation}→${d.fullWord}`).join(', ')}`);

      return { definitions, totalDefinitions: definitions.length, sheetName };

    } catch (error) {
      console.error('parseAbbreviationsFile error:', error.message);
      throw new FileUploadError(`Failed to parse abbreviations file: ${error.message}`);
    }
  }

  detectHeaderRowIndex(data) {
    const KEYWORDS = [
      'target column name', 'targetcolumnname',
      'source column', 'target table name',
      'data type', 'allow nulls', 'primary key',
      'classwords', 'classword',
      'comments', 'data type definition',
    ];

    let bestIdx = 0, bestScore = 0;

    for (let i = 0; i < Math.min(data.length, 5); i++) {
      const cells = (data[i] || [])
        .filter(v => v !== null && v !== undefined && v !== '' && v !== '\xa0')
        .map(v => String(v).toLowerCase().trim().replace(/\s+/g, ' '));

      const score = cells.filter(c => KEYWORDS.some(k => c === k || c.includes(k))).length;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }

    console.log(`📍 Header row index: ${bestIdx} (score ${bestScore})`);
    return bestIdx;
  }

  cleanHeader(value) {
    if (!value || value === '\xa0') return 'Unnamed';
    return String(value).trim().replace(/\s+/g, ' ').substring(0, 255);
  }

  cleanCell(value) {
    if (value === null || value === undefined || value === '' || value === '\xa0') return null;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    const s = String(value).trim();
    if (s !== '' && !isNaN(s)) return parseFloat(s);
    const l = s.toLowerCase();
    if (l === 'true'  || l === 'yes' || l === '1') return true;
    if (l === 'false' || l === 'no'  || l === '0') return false;
    return s;
  }

  normalizeDatatype(raw) {
    if (!raw) return DATA_TYPES.STRING;
    const first = raw.split(/[\n/]/)[0].trim().toLowerCase();
    const MAP = {
      boolean:   DATA_TYPES.BOOLEAN, bool:      DATA_TYPES.BOOLEAN,
      byte:      DATA_TYPES.STRING,
      date:      DATA_TYPES.DATE,
      decimal:   DATA_TYPES.DECIMAL, double:    DATA_TYPES.DECIMAL, float: DATA_TYPES.DECIMAL,
      integer:   DATA_TYPES.INTEGER, int:       DATA_TYPES.INTEGER, long:  DATA_TYPES.INTEGER,
      string:    DATA_TYPES.STRING,  varchar:   DATA_TYPES.STRING,  text:  DATA_TYPES.STRING,
      timestamp: DATA_TYPES.DATETIME, datetime: DATA_TYPES.DATETIME,
      time:      DATA_TYPES.STRING,
    };
    return MAP[first] || DATA_TYPES.STRING;
  }

  async getSheetNames(filepath) {
    try {
      if (!fs.existsSync(filepath)) throw new FileUploadError('File not found');
      return this._readWorkbook(filepath, { bookSheets: true }).SheetNames;
    } catch (error) {
      throw new FileUploadError(`Failed to get sheet names: ${error.message}`);
    }
  }

  validateFileFormat(filepath) {
    const ext     = path.extname(filepath).toLowerCase();
    const allowed = ['.xlsx', '.xls', '.csv', '.txt'];
    if (!allowed.includes(ext)) throw new FileUploadError(`Invalid format. Allowed: ${allowed.join(', ')}`);
    return true;
  }
}

export default new EnhancedFileParserService();