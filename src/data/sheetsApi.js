import { SHEETS_CONFIG, SHEETS_CONNECTED } from './sheetsConfig.js';
import { calcTier } from './constants.js';

export const CONTACT_COLUMNS = [
  'id','company','contact','role','country','city','email','phones',
  'linkedin','website','industry','companySize','services','dealStage',
  'source','relevance','tier','notes','dateAdded','lastUpdated',
];

async function getFromScript(action, params={}) {
  if (!SHEETS_CONNECTED) return null;
  try {
    const url = new URL(SHEETS_CONFIG.SCRIPT_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v)));
    const res  = await fetch(url.toString(), { redirect:'follow' });
    const text = await res.text();
    return JSON.parse(text);
  } catch(e) { console.error('[EM Sheets GET]', e.message); return null; }
}

async function postToScript(action, payload={}) {
  if (!SHEETS_CONNECTED) return true;
  try {
    await fetch(SHEETS_CONFIG.SCRIPT_URL, {
      method:'POST', mode:'no-cors',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action, ...payload }),
    });
    return true;
  } catch(e) { return false; }
}

async function appendRowsChunked(tab, rows, chunkSize=200) {
  if (!SHEETS_CONNECTED) return true;
  for (let i=0; i<rows.length; i+=chunkSize) {
    const chunk = rows.slice(i, i+chunkSize);
    try {
      // Use GET with JSON-encoded rows — same CORS-safe method as reads/deletes
      const url = new URL(SHEETS_CONFIG.SCRIPT_URL);
      url.searchParams.set('action', 'appendRows');
      url.searchParams.set('tab', tab);
      url.searchParams.set('rows', JSON.stringify(chunk));
      const res  = await fetch(url.toString(), { redirect:'follow' });
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.error) console.error('[EM Sheets] appendRows error:', data.error);
      else console.log('[EM Sheets] Appended', chunk.length, 'rows to', tab);
    } catch(e) {
      console.error('[EM Sheets] appendRows failed:', e.message);
    }
    if (i+chunkSize < rows.length) await new Promise(r => setTimeout(r, 300));
  }
  return true;
}

export async function fetchContacts() {
  if (!SHEETS_CONNECTED) return [];
  const data = await getFromScript('getContacts', { tab: SHEETS_CONFIG.TABS.CONTACTS });
  if (!data?.rows?.length) return [];
  return data.rows
    .filter(row => row[0] || row[1])
    .map(row => {
      const obj = {};
      CONTACT_COLUMNS.forEach((col,i) => { obj[col] = String(row[i]??'').trim(); });
      try { obj.phones = JSON.parse(obj.phones||'[]'); } catch { obj.phones=[]; }
      obj.tier = calcTier(obj);
      return obj;
    });
}

export async function appendContacts(contacts) {
  if (!SHEETS_CONNECTED) return true;
  const rows = contacts.map(c => CONTACT_COLUMNS.map(col => {
    if (col==='phones') return JSON.stringify(c.phones||[]);
    if (col==='lastUpdated') return new Date().toISOString().slice(0,10);
    return String(c[col]??'');
  }));
  return appendRowsChunked(SHEETS_CONFIG.TABS.CONTACTS, rows);
}

export async function deleteContact(id) {
  if (!SHEETS_CONNECTED) return { ok:true, source:'local' };
  try {
    const data = await getFromScript('deleteRow', {
      tab: SHEETS_CONFIG.TABS.CONTACTS, idColumn:'0', id: String(id),
    });
    if (!data) return { ok:false, error:'No response from Sheets' };
    if (data.error) return { ok:false, error:data.error };
    if (data.deleted===true) return { ok:true, source:'sheets' };
    return { ok:false, error:'Row not found (id: '+id+') — sample_ids: '+(data.sample_ids||[]).join(',') };
  } catch(e) { return { ok:false, error:e.message }; }
}

export async function updateContact(id, updates) {
  if (!SHEETS_CONNECTED) return true;
  try {
    const url = new URL(SHEETS_CONFIG.SCRIPT_URL);
    url.searchParams.set('action',  'updateRow');
    url.searchParams.set('tab',     SHEETS_CONFIG.TABS.CONTACTS);
    url.searchParams.set('idColumn','0');
    url.searchParams.set('id',      String(id));
    url.searchParams.set('updates', JSON.stringify({ ...updates, lastUpdated: new Date().toISOString().slice(0,10) }));
    url.searchParams.set('columns', CONTACT_COLUMNS.join(','));
    const res  = await fetch(url.toString(), { redirect:'follow' });
    const text = await res.text();
    const data = JSON.parse(text);
    if (data.error) console.error('[EM Sheets] updateRow error:', data.error);
    return data;
  } catch(e) { console.error('[EM Sheets] updateContact failed:', e.message); return false; }
}

export async function checkConnection() {
  const data = await getFromScript('ping');
  return data?.status === 'ok';
}
