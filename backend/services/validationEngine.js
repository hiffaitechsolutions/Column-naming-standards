import fileParserService from './fileParserService.js';
import fs from 'fs/promises';

/**
 * ValidationEngine
 * -----------------
 * Runs 3 validations on every unique Target Column Name:
 *
 *   1. DUPLICATE_CLASSWORD     - classword appears twice at end (IdId, Idid, NameName)
 *   2. CLASSWORD_VIOLATION     - column does not end with a valid classword
 *   3. ABBREVIATION_VIOLATION  - a CamelCase word segment is an unapproved abbreviation
 *
 * Checks 1 and 2 are mutually exclusive (duplicate skips violation check).
 * Check 3 ALWAYS runs independently - fires even when check 1 or 2 fired.
 *
 * DDL Support (.txt files)
 * -----------------
 * When dataFilepath ends in .txt, the engine parses the file for CREATE TABLE DDL
 * statements and extracts column names. snake_case names are converted to CamelCase
 * before validation so that all existing classword/abbreviation rules apply normally.
 *
 * Supported DDL dialects: standard SQL, Oracle, PostgreSQL, MySQL, SQL Server.
 * Column names may be bare, quoted ("col"), backtick-quoted (`col`), or [bracketed].
 */
class ValidationEngine {

  static ALIASES = {
    'Percentage':  'Percent',
    'Identifier':  'Id',
    'Identifiers': 'Id',
  };

  static SHORT_FULL_WORDS = new Set([
    'At', 'By', 'Do', 'Go', 'In', 'Is', 'It', 'No', 'Of', 'On', 'Or',
    'To', 'Up', 'We', 'An', 'As', 'Be',
    'Tax', 'Age', 'Key', 'Map', 'Set', 'Sum', 'Max', 'Min', 'Low', 'High',
    'Net', 'Pay', 'Fee', 'Due', 'End', 'Raw', 'Run', 'Log', 'New', 'Old',
    'Tag', 'Url', 'Uri', 'Xml', 'Api', 'Row', 'Col', 'Int',
    'Id', 'Code', 'Name', 'Flag', 'Rate', 'Text', 'Date', 'Time',
    'Count', 'Value', 'Type', 'List', 'Fact', 'Data', 'Info',
    'System', 'Market', 'Price', 'Order', 'Level', 'Group', 'Class',
    'State', 'Store', 'Brand', 'Chain', 'Batch', 'Block', 'Cycle',
    'Event', 'Index', 'Input', 'Label', 'Layer', 'Limit', 'Model',
    'Month', 'Owner', 'Panel', 'Phase', 'Point', 'Range', 'Ratio',
    'Scope', 'Score', 'Share', 'Sheet', 'Stage', 'Start', 'Stock',
    'Token', 'Topic', 'Total', 'Track', 'Trade', 'Union', 'Usage',
    'Valid', 'Vendor', 'Weight', 'World', 'Year', 'Zone', 'Stats',
    'Debit', 'Credit', 'Yield', 'Gross', 'Quote', 'Tenor', 'Basis',
    'Cache', 'Error', 'Field', 'Graph', 'Image', 'Query', 'Route',
    'Provider', 'Product', 'Period', 'Channel', 'Region', 'Source',
    'Target', 'Report', 'Detail', 'Header', 'Master', 'Active',
    'Parent', 'Child', 'Global', 'Local', 'Public', 'Static',
  ]);

  // ── DDL constraint keywords that start a non-column line inside CREATE TABLE ──
  static DDL_CONSTRAINT_KEYWORDS = new Set([
    'PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK', 'CONSTRAINT', 'INDEX',
    'KEY', 'FULLTEXT', 'SPATIAL', 'PERIOD', 'EXCLUDE',
  ]);

  // ── SQL data types used to confirm a token is really a column definition ──
  static SQL_TYPES = new Set([
    'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT',
    'NUMBER', 'NUMERIC', 'DECIMAL', 'FLOAT', 'DOUBLE', 'REAL',
    'VARCHAR', 'VARCHAR2', 'NVARCHAR', 'NVARCHAR2', 'CHAR', 'NCHAR',
    'TEXT', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT', 'CLOB', 'NCLOB',
    'DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR', 'INTERVAL',
    'BOOLEAN', 'BOOL', 'BIT',
    'BLOB', 'TINYBLOB', 'MEDIUMBLOB', 'LONGBLOB', 'BINARY', 'VARBINARY',
    'JSON', 'JSONB', 'XML', 'UUID', 'OID', 'ROWID',
    'SERIAL', 'BIGSERIAL', 'SMALLSERIAL',
    'MONEY', 'SMALLMONEY', 'UNIQUEIDENTIFIER',
    'ARRAY', 'BYTEA', 'ENUM', 'SET', 'GEOMETRY', 'GEOGRAPHY',
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  Main entry point
  // ═══════════════════════════════════════════════════════════════════════════

  async validate({ standardColumns, classwordDefinitions, abbreviationDefinitions, dataFilepath, sheetName, selectedColumns, isDDL = false }) {
    console.log('ValidationEngine.validate');
    console.log(`  classwordDefinitions:    ${classwordDefinitions?.length ?? 0}`);
    console.log(`  abbreviationDefinitions: ${abbreviationDefinitions?.length ?? 0}`);
    console.log(`  File: ${dataFilepath}  |  Sheet: ${sheetName}  |  DDL: ${isDDL}`);

    const validClasswords   = this.buildClasswordSet(classwordDefinitions);
    const approvedAbbrevSet = this.buildAbbreviationSet(abbreviationDefinitions);

    console.log(`Classwords (${validClasswords.size}): ${[...validClasswords].sort().join(', ')}`);
    console.log(`Approved abbreviations loaded: ${approvedAbbrevSet.size} entries`);

    // ── Branch: .txt DDL file ──────────────────────────────────────────────
    // isDDL is passed explicitly from the route because multer strips file
    // extensions, so we cannot rely on dataFilepath.endsWith('.txt').
    if (isDDL) {
      return this.validateDDLFile(dataFilepath, validClasswords, approvedAbbrevSet);
    }

    // ── Branch: spreadsheet (original flow) ───────────────────────────────
    const data = await fileParserService.parseDataFile(dataFilepath, sheetName, null);
    console.log(`Data parsed: ${data.rowCount} rows`);

    const targetCol = this.findTargetColumnHeader(data.headers);
    if (!targetCol) {
      throw new Error(`Could not find "Target Column Name" column. Available headers: ${data.headers.slice(0, 10).join(', ')}`);
    }

    const allColumnNames = data.rows
      .map(row => row[targetCol])
      .filter(v => v && v !== '\xa0' && String(v).trim() !== '')
      .map(v => String(v).trim());

    return this.validateColumnNames(allColumnNames, validClasswords, approvedAbbrevSet, data.rows, targetCol);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DDL validation flow
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Read a .txt file, locate every CREATE TABLE block, extract column names,
   * convert them to CamelCase, then run standard validation.
   */
  async validateDDLFile(filepath, validClasswords, approvedAbbrevSet) {
    console.log(`DDL mode: reading ${filepath}`);

    let rawText;
    try {
      rawText = await fs.readFile(filepath, 'utf8');
    } catch (err) {
      throw new Error(`Failed to read DDL file "${filepath}": ${err.message}`);
    }

    const { columns: ddlColumns, tableNames } = this.extractColumnsFromDDL(rawText);

    if (!ddlColumns.length) {
      throw new Error(
        'No CREATE TABLE columns found in the provided .txt file. ' +
        'Ensure the file contains a valid CREATE TABLE ... ( ... ) statement.'
      );
    }

    console.log(`DDL tables found: ${tableNames.join(', ')}`);
    console.log(`DDL columns extracted: ${ddlColumns.length}`);

    // Build synthetic row objects so validateColumnNames can record row numbers.
    // We use the line number from the DDL as a meaningful row reference.
    const syntheticRows = ddlColumns.map(({ camelName, lineNumber, rawName, tableName }) => ({
      __TARGET__:  camelName,
      __LINE__:    lineNumber,
      __RAW__:     rawName,
      __TABLE__:   tableName,
    }));

    const result = this.validateColumnNames(
      ddlColumns.map(c => c.camelName),
      validClasswords,
      approvedAbbrevSet,
      syntheticRows,
      '__TARGET__'
    );

    // Enrich errors with DDL-specific metadata (raw snake_case name, table, line)
    const colMeta = {};
    for (const c of ddlColumns) {
      colMeta[c.camelName] = colMeta[c.camelName] || c; // first occurrence wins
    }

    result.errors = result.errors.map(err => ({
      ...err,
      ddlRawColumnName: colMeta[err.columnName]?.rawName   ?? err.columnName,
      ddlTableName:     colMeta[err.columnName]?.tableName ?? null,
      ddlLineNumber:    colMeta[err.columnName]?.lineNumber ?? err.rowNumber,
    }));

    result.columnSummaries = result.columnSummaries.map(s => ({
      ...s,
      ddlRawColumnName: colMeta[s.columnName]?.rawName   ?? s.columnName,
      ddlTableName:     colMeta[s.columnName]?.tableName ?? null,
    }));

    result.ddlMode    = true;
    result.tableNames = tableNames;

    return result;
  }

  /**
   * Parse raw DDL text and return every column definition found inside
   * CREATE TABLE blocks.
   *
   * Returns:
   *   {
   *     columns:    [{ rawName, camelName, tableName, lineNumber }],
   *     tableNames: string[]
   *   }
   */
  extractColumnsFromDDL(ddlText) {
    const columns    = [];
    const tableNames = [];

    // Normalise line endings and remove block comments first
    const normalized = ddlText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');  // strip /* ... */ block comments

    const lines = normalized.split('\n');

    let insideTable   = false;
    let parenDepth    = 0;
    let currentTable  = '';
    let lineNumber    = 0;
    let pendingTable  = null; // table name found but '(' not yet seen

    for (const rawLine of lines) {
      lineNumber++;
      const line = rawLine.trim();

      // ── Detect CREATE TABLE start ────────────────────────────────────────
      // Handles both:  CREATE TABLE foo (        <- opening paren same line
      //                CREATE TABLE foo           <- opening paren next line
      if (!insideTable) {

        // Case 1: still waiting for the opening '(' from a previous CREATE TABLE line
        if (pendingTable !== null) {
          if (line.startsWith('(') || line === '') {
            // consume the '('
            currentTable = pendingTable;
            tableNames.push(currentTable);
            insideTable  = true;
            parenDepth   = 0;
            pendingTable = null;
            // count parens on this line too
            for (const ch of line) {
              if (ch === '(') parenDepth++;
              if (ch === ')') parenDepth--;
            }
          } else {
            // something between CREATE TABLE and '(' — give up on this table
            pendingTable = null;
          }
          continue;
        }

        // Case 2: look for CREATE TABLE on this line
        // Pattern covers: CREATE TABLE, CREATE OR REPLACE TABLE,
        //   CREATE TEMP/TEMPORARY TABLE, schema.table, quoted names
        const ctMatch = line.match(
          /CREATE\s+(?:OR\s+REPLACE\s+)?(?:GLOBAL\s+TEMPORARY\s+|LOCAL\s+TEMPORARY\s+|TEMPORARY\s+|TEMP\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[\[]?[\w$.:"]+[`"\]]?)/i
        );
        if (ctMatch) {
          const tableName = this.unquoteIdentifier(ctMatch[1]);
          // Does the opening '(' appear on the same line?
          if (line.includes('(')) {
            currentTable = tableName;
            tableNames.push(currentTable);
            insideTable  = true;
            parenDepth   = 0;
            // count all parens from start of line
            for (const ch of line) {
              if (ch === '(') parenDepth++;
              if (ch === ')') parenDepth--;
            }
          } else {
            // Opening paren is on the next (non-blank) line
            pendingTable = tableName;
          }
        }
        continue;
      }

      // ── We are inside a CREATE TABLE block ──────────────────────────────
      // Count parens to know when the block ends.
      for (const ch of line) {
        if (ch === '(') parenDepth++;
        if (ch === ')') parenDepth--;
      }

      if (parenDepth <= 0) {
        insideTable = false;
        parenDepth  = 0;
        continue;
      }

      // Skip blank lines and pure comment lines
      if (!line || line.startsWith('--')) continue;

      // Strip inline trailing comments and trailing comma
      const cleanLine = line.replace(/--.*$/, '').trim();
      if (!cleanLine) continue;
      const defLine = cleanLine.replace(/,$/, '').trim();

      // ── Skip constraint / index / key lines ─────────────────────────────
      const firstToken = (defLine.match(/^(\w+)/) || [])[1]?.toUpperCase();
      if (!firstToken) continue;
      if (ValidationEngine.DDL_CONSTRAINT_KEYWORDS.has(firstToken)) continue;

      // ── Extract column name ───────────────────────────────────────────────
      // Supports:  col_name        VARCHAR(255)
      //            "col_name"      VARCHAR(255)
      //            `col_name`      VARCHAR(255)
      //            [col_name]      VARCHAR(255)
      const colMatch = defLine.match(
        /^([`"[\[]?[\w$#@]+[`"\]]?)\s+(\w+)/
      );
      if (!colMatch) continue;

      const rawColName = this.unquoteIdentifier(colMatch[1]);
      const typeToken  = colMatch[2].toUpperCase();

      // Skip lines where second token is a constraint keyword
      if (ValidationEngine.DDL_CONSTRAINT_KEYWORDS.has(typeToken)) continue;

      // Skip obviously non-column tokens (pure numbers, single chars that aren't real names)
      if (/^\d+$/.test(rawColName)) continue;

      const camelName = this.snakeToCamel(rawColName);

      columns.push({
        rawName:    rawColName,
        camelName,
        tableName:  currentTable,
        lineNumber,
      });
    }

    // ── Debug: log what was found ────────────────────────────────────────────
    console.log(`DDL parser: found ${tableNames.length} table(s): ${tableNames.join(', ')}`);
    console.log(`DDL parser: found ${columns.length} column(s): ${columns.slice(0,10).map(c=>c.rawName).join(', ')}${columns.length>10?'...':''}`);

    return { columns, tableNames };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Helpers for DDL parsing
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Remove surrounding quote characters from a SQL identifier.
   * Handles: "name"  `name`  [name]
   */
  unquoteIdentifier(str) {
    return str.replace(/^["`\[]|["`\]]$/g, '');
  }

  /**
   * Convert snake_case (or UPPER_SNAKE) to CamelCase.
   *
   * Examples:
   *   customer_id          → CustomerId
   *   ACCOUNT_BALANCE_AMT  → AccountBalanceAmt
   *   orderDate            → OrderDate  (already camel — just capitalise first)
   *   CustNm               → CustNm     (already CamelCase — untouched)
   */
  snakeToCamel(str) {
    if (!str) return str;

    // If the name contains underscores, split and capitalise each segment.
    if (str.includes('_')) {
      return str
        .split('_')
        .filter(Boolean)
        .map(seg => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
        .join('');
    }

    // No underscore: ensure the first letter is uppercase (preserves interior casing).
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Shared helpers (unchanged from original)
  // ═══════════════════════════════════════════════════════════════════════════

  buildClasswordSet(classwordDefinitions) {
    const set = new Set();
    if (classwordDefinitions?.length) {
      for (const def of classwordDefinitions) {
        if (def.classword?.trim()) set.add(def.classword.trim());
      }
    }
    return set;
  }

  buildAbbreviationSet(abbreviationDefinitions) {
    const set = new Set();
    if (abbreviationDefinitions?.length) {
      for (const def of abbreviationDefinitions) {
        const abbr = def.abbreviation?.trim();
        if (abbr) {
          set.add(abbr);
          set.add(abbr.toLowerCase());
          set.add(abbr.toUpperCase());
        }
      }
    }
    console.log(`abbreviationSet sample: ${[...set].slice(0, 10).join(', ')}`);
    return set;
  }

  findTargetColumnHeader(headers) {
    const PATTERNS = ['target column name', 'targetcolumnname', 'target_column_name', 'column name', 'columnname'];
    for (const p of PATTERNS) {
      const norm  = p.replace(/[_\s]/g, '').toLowerCase();
      const found = headers.find(h => h && h.replace(/[_\s]/g, '').toLowerCase() === norm);
      if (found) return found;
    }
    return null;
  }

  validateColumnNames(allColumnNames, validClasswords, approvedAbbrevSet, dataRows, targetColName) {
    const rowMap = {};
    dataRows.forEach((row, idx) => {
      const name = row[targetColName];
      if (!name || String(name).trim() === '' || name === '\xa0') return;
      const key = String(name).trim();
      if (!rowMap[key]) rowMap[key] = [];
      rowMap[key].push(idx + 3);
    });

    const uniqueNames = [...new Set(allColumnNames)];
    const errors      = [];
    let validCount    = 0;
    let invalidCount  = 0;
    const summaries   = [];

    for (const colName of uniqueNames) {
      const rowNumbers = rowMap[colName] || [];
      const colErrors  = [];

      // Check 1: Duplicate classword
      const dupClassword = this.findDuplicateClassword(colName, validClasswords);
      if (dupClassword) {
        colErrors.push({
          rowNumber:    rowNumbers[0],
          columnName:   colName,
          cellValue:    colName,
          errorType:    'DUPLICATE_CLASSWORD',
          errorMessage: `Column "${colName}" contains duplicate classword "${dupClassword}" - it appears more than once`,
          severity:     'error',
          suggestion:   `Remove one "${dupClassword}" - e.g. "${colName.slice(0, colName.lastIndexOf(dupClassword))}"`,
        });
      }

      // Check 2: Classword violation (skip if duplicate already found)
      if (colErrors.length === 0) {
        const matchedClassword = this.extractClassword(colName, validClasswords);
        if (!matchedClassword) {
          const suggestion = this.suggestClassword(colName, validClasswords);
          colErrors.push({
            rowNumber:    rowNumbers[0],
            columnName:   colName,
            cellValue:    colName,
            errorType:    'CLASSWORD_VIOLATION',
            errorMessage: `Column "${colName}" does not end with a valid classword`,
            severity:     'error',
            suggestion:   suggestion
              ? `Did you mean to end with "${suggestion}"?`
              : `Must end with one of: ${[...validClasswords].sort().join(', ')}`,
          });
        }
      }

      // Check 3: Abbreviation violation - ALWAYS runs independently
      if (approvedAbbrevSet.size > 0) {
        const badAbbrevs = this.findUnapprovedAbbreviations(colName, validClasswords, approvedAbbrevSet);
        console.log(`"${colName}" -> unapproved abbrevs: ${badAbbrevs.map(b => b.word).join(', ') || 'none'}`);
        for (const { word, position } of badAbbrevs) {
          colErrors.push({
            rowNumber:    rowNumbers[0],
            columnName:   colName,
            cellValue:    colName,
            errorType:    'ABBREVIATION_VIOLATION',
            errorMessage: `Column "${colName}" contains unapproved abbreviation "${word}" at word position ${position}`,
            severity:     'warning',
            suggestion:   `Replace "${word}" with its full word, or add it to the approved abbreviations file`,
          });
        }
      }

      if (colErrors.length > 0) {
        errors.push(...colErrors);
        invalidCount++;
      } else {
        validCount++;
      }

      summaries.push({
        columnName:       colName,
        isValid:          colErrors.length === 0,
        errorCount:       colErrors.length,
        occurrences:      rowNumbers.length,
        rowNumbers,
        matchedClassword: colErrors.length === 0 ? this.extractClassword(colName, validClasswords) : null,
        errors:           colErrors,
      });
    }

    const total = uniqueNames.length;
    return {
      isValid:             invalidCount === 0,
      totalRows:           total,
      totalColumns:        total,
      validColumnsCount:   validCount,
      invalidColumnsCount: invalidCount,
      totalErrorsCount:    errors.length,
      validationRate:      total > 0 ? ((validCount / total) * 100).toFixed(2) : '0.00',
      errors,
      columnSummaries: summaries,
    };
  }

  // ── Check 1: Duplicate classword ──────────────────────────────────────────

  findDuplicateClassword(columnName, validClasswords) {
    if (!columnName || !validClasswords.size) return null;

    const words = columnName.match(/[A-Z][a-z0-9]*/g) ?? [];
    if (words.length < 2) return null;

    const resolved = words.map(w => {
      if (validClasswords.has(w))                      return w;
      const alias = ValidationEngine.ALIASES[w];
      if (alias && validClasswords.has(alias))         return alias;
      return null;
    });

    const checkFrom = Math.max(0, resolved.length - 4);
    for (let i = checkFrom; i < resolved.length - 1; i++) {
      if (resolved[i] !== null && resolved[i] === resolved[i + 1]) return resolved[i];
    }

    for (let n = 1; n <= Math.min(3, Math.floor(words.length / 2)); n++) {
      const suffix = words.slice(-n).join('');
      const before = words.slice(-(n * 2), -n).join('');
      if (suffix === before && validClasswords.has(suffix)) return suffix;
    }

    const colLower = columnName.toLowerCase();
    for (const cw of validClasswords) {
      const cwLower = cw.toLowerCase();
      const doubled = cwLower + cwLower;
      if (colLower.endsWith(doubled)) {
        const suffixInOriginal = columnName.slice(columnName.length - doubled.length);
        if (suffixInOriginal.toLowerCase() === doubled) return cw;
      }
    }

    for (const [, canonical] of Object.entries(ValidationEngine.ALIASES)) {
      if (!validClasswords.has(canonical)) continue;
      const cwLower = canonical.toLowerCase();
      const doubled = cwLower + cwLower;
      if (colLower.endsWith(doubled)) return canonical;
    }

    return null;
  }

  // ── Check 2: Classword extraction ─────────────────────────────────────────

  extractClassword(columnName, validClasswords) {
    if (!columnName || !validClasswords.size) return null;
    const words = columnName.match(/[A-Z][a-z0-9]*/g) ?? [];
    if (!words.length) return null;

    for (let n = 1; n <= Math.min(3, words.length); n++) {
      const suffix = words.slice(-n).join('');
      if (validClasswords.has(suffix))                       return suffix;
      const aliasTarget = ValidationEngine.ALIASES[suffix];
      if (aliasTarget && validClasswords.has(aliasTarget))   return aliasTarget;
    }
    return null;
  }

  suggestClassword(columnName, validClasswords) {
    const words = columnName.match(/[A-Z][a-z0-9]*/g) ?? [];
    if (!words.length) return null;
    const lastWord = words[words.length - 1].toLowerCase();
    let best = null, bestScore = 0;
    for (const cw of validClasswords) {
      const score = this.similarity(lastWord, cw.toLowerCase());
      if (score > bestScore && score > 0.4) { bestScore = score; best = cw; }
    }
    return best;
  }

  // ── Check 3: Abbreviation detection ───────────────────────────────────────

  findUnapprovedAbbreviations(columnName, validClasswords, approvedAbbrevSet) {
    if (!columnName) return [];
    const words  = columnName.match(/[A-Z][a-z0-9]*/g) ?? [];
    const issues = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      if (validClasswords.has(word))                             continue;
      const alias = ValidationEngine.ALIASES[word];
      if (alias && validClasswords.has(alias))                   continue;
      if (ValidationEngine.SHORT_FULL_WORDS.has(word))           continue;
      if (word.length < 2 || word.length > 6)                    continue;
      if (approvedAbbrevSet.has(word))                           continue;
      if (approvedAbbrevSet.has(word.toLowerCase()))             continue;
      if (approvedAbbrevSet.has(word.toUpperCase()))             continue;

      if (this.looksLikeAbbreviation(word)) {
        issues.push({ word, position: i + 1 });
      }
    }
    return issues;
  }

  looksLikeAbbreviation(word) {
    if (!word || word.length < 2) return false;

    if (word === word.toUpperCase() && /^[A-Z]+$/.test(word)) return true;

    const lower = word.toLowerCase();

    if (/([bcdfghjklmnpqrstvwxyz])\1$/.test(lower)) return true;

    const vowels = (lower.match(/[aeiouy]/g) || []).length;
    if (vowels / lower.length < 0.3 && lower.length >= 3) return true;

    return false;
  }

  // ── String similarity (Levenshtein) ───────────────────────────────────────

  similarity(a, b) {
    const long  = a.length > b.length ? a : b;
    const short = a.length > b.length ? b : a;
    if (!long.length) return 1;
    return (long.length - this.levenshtein(long, short)) / long.length;
  }

  levenshtein(s, t) {
    const m = [];
    for (let i = 0; i <= t.length; i++) m[i] = [i];
    for (let j = 0; j <= s.length; j++) m[0][j] = j;
    for (let i = 1; i <= t.length; i++) {
      for (let j = 1; j <= s.length; j++) {
        m[i][j] = t[i - 1] === s[j - 1]
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
      }
    }
    return m[t.length][s.length];
  }
}

export default new ValidationEngine();