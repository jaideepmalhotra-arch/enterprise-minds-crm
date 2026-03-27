// ════════════════════════════════════════════════════════════
// ENTERPRISE MINDS CRM — Google Apps Script
// ════════════════════════════════════════════════════════════
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function handleRequest(action, params) {
  const tab      = params.tab      || '';
  const id       = String(params.id || '');
  const idColumn = parseInt(params.idColumn || '0');

  if (action === 'ping')        return { status:'ok', message:'Enterprise Minds CRM API running' };
  if (action === 'getContacts') return getRows(tab);
  if (action === 'deleteRow')   return deleteRow({ tab, idColumn, id });
  if (action === 'clearTab')    return clearTab(tab);

  if (action === 'appendRows') {
    // rows may arrive as JSON string (GET) or array (POST)
    var rows = params.rows;
    if (typeof rows === 'string') {
      try { rows = JSON.parse(rows); } catch(e) { return { error: 'Invalid rows JSON: ' + e.message }; }
    }
    if (!Array.isArray(rows)) return { error: 'rows must be an array' };
    return appendRows(tab, rows);
  }

  if (action === 'updateRow') {
    // updates may arrive as JSON string (GET) or object (POST)
    var updates = params.updates;
    if (typeof updates === 'string') {
      try { updates = JSON.parse(updates); } catch(e) { return { error: 'Invalid updates JSON: ' + e.message }; }
    }
    var columns = params.columns;
    if (typeof columns === 'string') columns = columns.split(',');
    return updateRow({ tab, idColumn, id, updates: updates||{}, columns: columns||[] });
  }

  return { error: 'Unknown action: ' + action };
}

function doGet(e) {
  try { return response(handleRequest(e.parameter.action || 'ping', e.parameter)); }
  catch(err) { return response({ error: err.message }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const payload = JSON.parse(e.postData.contents);
    return response(handleRequest(payload.action, payload));
  } catch(err) { return response({ error: err.message }); }
  finally { lock.releaseLock(); }
}

function getRows(tabName) {
  if (!tabName) return { error:'No tab specified', rows:[] };
  const sheet = getSheet(tabName);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return { rows:[] };
  return { rows: data.slice(1) };
}

function appendRows(tabName, rows) {
  const sheet = getSheet(tabName);
  rows.forEach(row => sheet.appendRow(row));
  return { appended: rows.length };
}

function updateRow(payload) {
  const { tab, idColumn, id, updates, columns } = payload;
  const sheet = getSheet(tab);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColumn]) === String(id)) {
      Object.keys(updates).forEach(key => {
        const colIdx = columns.indexOf(key);
        if (colIdx >= 0) sheet.getRange(i+1, colIdx+1).setValue(updates[key]);
      });
      return { updated: true };
    }
  }
  return { updated: false, error: 'Row not found: ' + id };
}

function deleteRow(payload) {
  const { tab, idColumn, id } = payload;
  if (!tab || !id) return { deleted:false, error:'Missing tab or id' };
  const sheet = getSheet(tab);
  const data  = sheet.getDataRange().getValues();
  // Pass 1: exact match in idColumn
  for (let i = data.length-1; i >= 1; i--) {
    if (String(data[i][idColumn]).trim() === String(id).trim()) {
      sheet.deleteRow(i+1);
      return { deleted:true, method:'id_match', row:i+1 };
    }
  }
  // Pass 2: full scan
  for (let i = data.length-1; i >= 1; i--) {
    for (let j = 0; j < data[i].length; j++) {
      if (String(data[i][j]).trim() === String(id).trim()) {
        sheet.deleteRow(i+1);
        return { deleted:true, method:'full_scan', col:j, row:i+1 };
      }
    }
  }
  const sample = data.slice(1,4).map(r => String(r[0]));
  return { deleted:false, id:id, tab:tab, sample_ids:sample };
}

function clearTab(tabName) {
  const sheet = getSheet(tabName);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) { sheet.deleteRows(2, lastRow-1); return { cleared:true, rowsDeleted:lastRow-1 }; }
  return { cleared:true, rowsDeleted:0 };
}

function getSheet(tabName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) { sheet = ss.insertSheet(tabName); addHeaders(sheet, tabName); }
  return sheet;
}

function addHeaders(sheet, tabName) {
  const headers = {
    'Contacts': ['id','company','contact','role','country','city','email','phones','linkedin','website','industry','companySize','services','dealStage','source','relevance','tier','notes','dateAdded','lastUpdated'],
    'Imports':  ['id','filename','records','status','date','importedBy'],
  };
  const h = headers[tabName];
  if (h) {
    const range = sheet.getRange(1,1,1,h.length);
    range.setValues([h]);
    range.setFontWeight('bold');
    range.setBackground('#1A56DB');
    range.setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
