
const TYPE_CHECKERS = {
  string: (v) => v === null || v === undefined || typeof v === 'string',
  text:   (v) => v === null || v === undefined || typeof v === 'string',
  number: (v) => v === null || v === undefined || typeof v === 'number',
  float:  (v) => v === null || v === undefined || typeof v === 'number',
  integer:(v) => v === null || v === undefined || (typeof v === 'number' && Number.isInteger(v)),
  int:    (v) => v === null || v === undefined || (typeof v === 'number' && Number.isInteger(v)),
  boolean:(v) => v === null || v === undefined || typeof v === 'boolean',
  bool:   (v) => v === null || v === undefined || typeof v === 'boolean',
  date:   (v) => v === null || v === undefined || v instanceof Date || (typeof v === 'string' && !isNaN(Date.parse(v))),
};


const runValidation = (uploadedHeaders, rows, classwordDefs) => {
  const issues      = [];
  const rowErrors   = [];

  const definedColumnNames = classwordDefs.map((d) => d.columnName);
  const cleanHeaders = uploadedHeaders.filter(Boolean);

  const missingColumns = [];
  for (const def of classwordDefs) {
    if (!cleanHeaders.includes(def.columnName)) {
      missingColumns.push(def.columnName);
      issues.push({
        type: 'MISSING_COLUMN',
        column: def.columnName,
        row: null,
        message: `Column "${def.columnName}" is missing from the uploaded file`,
      });
    }
  }

  const extraColumns = cleanHeaders.filter((h) => !definedColumnNames.includes(h));
  for (const col of extraColumns) {
    issues.push({
      type: 'EXTRA_COLUMN',
      column: col,
      row: null,
      message: `Column "${col}" is not defined in the classword schema`,
    });
  }

  const nameMismatches = [];
  for (const uploaded of cleanHeaders) {
    const match = definedColumnNames.find(
      (def) => def.toLowerCase() === uploaded.toLowerCase() && def !== uploaded
    );
    if (match) {
      nameMismatches.push({ uploaded, expected: match });
      issues.push({
        type: 'COLUMN_NAME_MISMATCH',
        column: uploaded,
        expected: match,
        row: null,
        message: `Column "${uploaded}" should be named "${match}" (case mismatch)`,
      });
    }
  }


  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 2; 

    for (const def of classwordDefs) {
      const { columnName, dataType, required } = def;

    
      if (!cleanHeaders.includes(columnName)) continue;

      const cellValue = row[columnName];
      const isEmpty   = cellValue === null || cellValue === undefined || cellValue === '';


      if (required && isEmpty) {
        const err = {
          type: 'REQUIRED_FIELD_EMPTY',
          column: columnName,
          row: rowNum,
          expected: null,
          actual: null,
          message: `Row ${rowNum}: "${columnName}" is required but is empty`,
        };
        rowErrors.push(err);
        issues.push(err);
        continue;
      }

   
      if (!isEmpty) {
        const checker = TYPE_CHECKERS[dataType] || TYPE_CHECKERS.string;
        if (!checker(cellValue)) {
          const err = {
            type: 'DATATYPE_MISMATCH',
            column: columnName,
            row: rowNum,
            expected: dataType,
            actual: typeof cellValue,
            message: `Row ${rowNum}: "${columnName}" expects type "${dataType}" but received "${typeof cellValue}"`,
          };
          rowErrors.push(err);
          issues.push(err);
        }
      }
    }
  }


  const columnLevelChecks = definedColumnNames.length + cleanHeaders.length;
  const cellLevelChecks   = rows.length * classwordDefs.length;
  const totalChecks       = columnLevelChecks + cellLevelChecks;
  const failedChecks      = issues.length;
  const passedChecks      = Math.max(0, totalChecks - failedChecks);
  const validationScore   = totalChecks > 0
    ? Math.round((passedChecks / totalChecks) * 100)
    : 100;

  const summary = {
    totalColumnsUploaded: cleanHeaders.length,
    totalColumnsExpected: definedColumnNames.length,
    missingColumnsCount: missingColumns.length,
    extraColumnsCount: extraColumns.length,
    columnNameMismatchCount: nameMismatches.length,
    totalRowsProcessed: rows.length,
    rowLevelErrorCount: rowErrors.length,
    totalIssues: issues.length,
    validationScore,
    passed: issues.length === 0,
  };

  return {
    summary,
    columnAnalysis: {
      missing: missingColumns,
      extra: extraColumns,
      nameMismatches,
    },
    issues,    
    rowErrors,
  };
};

module.exports = { runValidation };