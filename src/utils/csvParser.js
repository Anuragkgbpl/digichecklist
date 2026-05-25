/**
 * Rewritten CSV Parser for QR-Based Digital Checklist System
 */

export const parseCSV = (csvContent, options = {}) => {
  const { headerRow = 0, delimiter = ',' } = options;
  
  if (!csvContent || typeof csvContent !== 'string') {
    return { data: [], errors: ['Invalid CSV content provided.'] };
  }

  const rows = [];
  const errors = [];
  
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let quoteChar = '';
  
  const content = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if ((char === '"' || char === "'") && (!inQuotes || quoteChar === char)) {
      if (inQuotes && nextChar === char) {
        currentField += char;
        i++; 
      } else {
        inQuotes = !inQuotes;
        if (inQuotes) quoteChar = char;
      }
    } 
    else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } 
    else if (char === '\n' && !inQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.length > 1 || currentRow[0] !== '') {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } 
    else {
      currentField += char;
    }
  }
  
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1 || currentRow[0] !== '') rows.push(currentRow);
  }

  if (rows.length <= headerRow) return { data: [], errors: ['CSV contains no data rows.'] };

  const headers = rows[headerRow].map(h => h.trim().replace(/^["']|["']$/g, ''));
  const dataRows = rows.slice(headerRow + 1);
  
  const data = dataRows.map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      let value = row[index] !== undefined ? row[index] : '';
      obj[header] = value.replace(/^["']|["']$/g, '');
    });
    return obj;
  });

  return { data, headers, errors };
};

/**
 * Validates Employee Data based on new business rules
 * Fields: Employee ID, Employee Name, Designation, Department, Mobile Number, Status
 */
export const validateEmployees = (data) => {
  const errors = [];
  const warnings = [];
  const validData = [];
  
  const requiredColumns = ['Employee_ID', 'Employee_Name', 'Designation', 'Department', 'Mobile_Number'];

  data.forEach((row, index) => {
    const rowNum = index + 2; 
    const rowErrors = [];
    
    requiredColumns.forEach(col => {
      if (!row[col]) rowErrors.push(`Missing required field: ${col}`);
    });

    if (row.Mobile_Number && !/^\d{10}$/.test(String(row.Mobile_Number).replace(/\D/g, ''))) {
      rowErrors.push('Invalid mobile format (expected 10 digits)');
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, messages: rowErrors });
    } else {
      validData.push({
        ...row,
        Status: row.Status || 'Active', // Default to Active
        password: '1234', // default password rule
        firstLogin: true,
        Allowed_Activity: ['ALL']
      });
    }
  });

  return { validData, errors, warnings, totalRows: data.length };
};

/**
 * Validates Checklist Data based on new business rules
 * Fields: Type of Activity, Line / Equipment, Sub-Line / Sub-Equipment, Component, Activity Description, Frequency, Document Number, Revision, Last Revised Date, Status
 */
export const validateChecklist = (data) => {
  const errors = [];
  const warnings = [];
  const validData = [];
  
  const requiredColumns = ['Type_of_Activity', 'Line_Equipment', 'Sub_Line_Equipment', 'Component', 'Activity_Description', 'Frequency'];

  data.forEach((row, index) => {
    const rowNum = index + 2;
    const rowErrors = [];
    
    if (row.Type_of_Activity === 'Fire Safety') {
      const fsRequired = ['Type_of_Activity', 'Line_Equipment', 'Sub_Line_Equipment', 'Area_Zone', 'Equipment_Category', 'Asset_ID', 'Component', 'Activity_Description', 'Standard', 'Frequency'];
      fsRequired.forEach(col => {
        if (!row[col]) rowErrors.push(`Missing required field for Fire Safety: ${col}`);
      });
    } else {
      requiredColumns.forEach(col => {
        if (!row[col]) rowErrors.push(`Missing required field: ${col}`);
      });
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, messages: rowErrors });
    } else {
      validData.push({
        ...row,
        Status: row.Status || 'Active', // Default to Active
        id: `CHK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      });
    }
  });

  return { validData, errors, warnings, totalRows: data.length };
};
