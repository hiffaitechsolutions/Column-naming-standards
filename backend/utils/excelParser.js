const ExcelJS = require('exceljs');
const ApiError = require('./ApiError');


const parseExcel = async (filePath) => {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(filePath);
  } catch (err) {
    throw new ApiError(400, `Failed to read Excel file: ${err.message}`);
  }

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new ApiError(400, 'The uploaded Excel file contains no worksheets');
  }

  const headers = [];
  const rows = [];

  let isFirstRow = true;

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const cellValues = row.values.slice(1);

    if (isFirstRow) {
      cellValues.forEach((val) => {
        headers.push(
          val !== null && val !== undefined ? String(val).trim() : ''
        );
      });
      isFirstRow = false;
      return;
    }

    const rowObj = {};
    cellValues.forEach((val, idx) => {
      const header = headers[idx];
      if (header) {
       
        if (val && typeof val === 'object' && val.richText) {
          rowObj[header] = val.richText.map((r) => r.text).join('');
        } else {
          rowObj[header] = val !== undefined ? val : null;
        }
      }
    });

    rows.push(rowObj);
  });

  if (headers.length === 0) {
    throw new ApiError(400, 'The Excel file appears to be empty or has no header row');
  }

  return { headers, rows };
};


const parseClassword = async (filePath) => {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(filePath);
  } catch (err) {
    throw new ApiError(500, `Failed to load classword schema: ${err.message}`);
  }

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new ApiError(500, 'Classword file contains no worksheets');
  }

  const definitions = [];
  let headerMap = null; 

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = row.values.slice(1).map((v) =>
      v !== null && v !== undefined ? String(v).trim() : ''
    );

    if (rowNumber === 1) {
     
      headerMap = {};
      values.forEach((v, i) => {
        headerMap[v.toLowerCase()] = i;
      });
      return;
    }

    if (!headerMap) return;

    const colNameIdx   = headerMap['column_name'];
    const dataTypeIdx  = headerMap['data_type'];
    const requiredIdx  = headerMap['required'];

    const columnName = colNameIdx !== undefined ? values[colNameIdx] : '';
    const dataType   = dataTypeIdx !== undefined ? (values[dataTypeIdx] || 'string').toLowerCase() : 'string';
    const requiredRaw = requiredIdx !== undefined ? values[requiredIdx] : '';
    const required   = ['true', '1', 'yes', 'y', 'required'].includes(requiredRaw.toLowerCase());

    if (columnName) {
      definitions.push({ columnName, dataType, required });
    }
  });

  if (definitions.length === 0) {
    throw new ApiError(500, 'Classword schema file has no column definitions');
  }

  return definitions;
};

module.exports = { parseExcel, parseClassword };