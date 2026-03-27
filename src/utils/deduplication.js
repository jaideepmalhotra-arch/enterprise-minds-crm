// Email-only deduplication — zero false positives
function normEmail(e) { return String(e||'').toLowerCase().trim(); }

function buildPairs(contacts) {
  const pairs=[]; const seen=new Set(); const emailMap=new Map();
  contacts.forEach((c,i) => {
    const e=normEmail(c.email);
    if (e&&e.length>5&&e.includes('@')) {
      if (emailMap.has(e)) {
        const key=`${Math.min(emailMap.get(e),i)}_${Math.max(emailMap.get(e),i)}`;
        if (!seen.has(key)) { seen.add(key); pairs.push({ type:'definite', reasons:['Same email'], score:100, contactA:contacts[emailMap.get(e)], contactB:c, indexA:emailMap.get(e), indexB:i }); }
      } else emailMap.set(e,i);
    }
  });
  return pairs;
}

export function scanDBForDuplicates(contacts) { return buildPairs(contacts); }
export function findDuplicatesInList(contacts) { return buildPairs(contacts); }
export function findDuplicatesAgainstDB(newC, existingC) {
  const emailMap=new Map(); const results=[]; const seen=new Set();
  existingC.forEach((c,i) => { const e=normEmail(c.email); if(e&&e.includes('@')) emailMap.set(e,i); });
  newC.forEach((c,ni) => {
    const e=normEmail(c.email);
    if(e&&emailMap.has(e)) {
      const key=`${ni}_${emailMap.get(e)}`;
      if(!seen.has(key)) { seen.add(key); results.push({ newIndex:ni, existingIdx:emailMap.get(e), newContact:c, existing:existingC[emailMap.get(e)], type:'definite', reasons:['Same email'], score:100 }); }
    }
  });
  return results;
}
export function mergeContacts(keep, incoming) {
  return { ...keep, contact:keep.contact||incoming.contact, role:keep.role||incoming.role, email:keep.email||incoming.email, phones:keep.phones?.length?keep.phones:incoming.phones, notes:[keep.notes,incoming.notes].filter(Boolean).join(' | '), lastUpdated:new Date().toISOString().slice(0,10) };
}
