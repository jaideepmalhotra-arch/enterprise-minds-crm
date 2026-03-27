import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { fetchContacts, appendContacts, updateContact, deleteContact, checkConnection } from './sheetsApi.js';
import { SHEETS_CONNECTED } from './sheetsConfig.js';
import { calcTier } from './constants.js';

const ContactsContext = createContext(null);
export const useContacts = () => useContext(ContactsContext);

export default function ContactsProvider({ children }) {
  const [allContacts,  setAllContacts]  = useState([]);
  const [syncStatus,   setSyncStatus]   = useState('local');

  useEffect(() => {
    async function load() {
      // Show cache instantly
      try {
        const cached = sessionStorage.getItem('em_contacts_cache');
        if (cached) {
          const { data } = JSON.parse(cached);
          if (data?.length) { setAllContacts(data); setSyncStatus('synced'); }
        }
      } catch(e) {}

      if (SHEETS_CONNECTED) {
        setSyncStatus('syncing');
        try {
          const contacts = await fetchContacts();
          if (contacts?.length) {
            setAllContacts(contacts);
            setSyncStatus('synced');
            try { sessionStorage.setItem('em_contacts_cache', JSON.stringify({ data:contacts, ts:Date.now() })); } catch(e) {}
          } else { setSyncStatus('local'); }
        } catch(e) { setSyncStatus('error'); }
      } else { setSyncStatus('local'); }
    }
    load();
  }, []);

  const stats = useMemo(() => ({
    total:    allContacts.length,
    complete: allContacts.filter(c=>c.tier==='complete').length,
    partial:  allContacts.filter(c=>c.tier==='partial').length,
    minimal:  allContacts.filter(c=>c.tier==='minimal').length,
    empty:    allContacts.filter(c=>c.tier==='empty').length,
  }), [allContacts]);

  async function addContacts(newContacts) {
    setAllContacts(prev => {
      const updated = [...prev, ...newContacts];
      try { sessionStorage.removeItem('em_contacts_cache'); } catch(e) {}
      return updated;
    });
    if (SHEETS_CONNECTED) { setSyncStatus('syncing'); await appendContacts(newContacts); setSyncStatus('synced'); }
  }

  async function updateOneContact(id, updates) {
    setAllContacts(prev => prev.map(c =>
      String(c.id)===String(id) ? { ...c, ...updates, tier:calcTier({...c,...updates}) } : c
    ));
    if (SHEETS_CONNECTED) await updateContact(id, updates);
  }

  async function deleteOneContact(id) {
    setAllContacts(prev => prev.filter(c => String(c.id)!==String(id)));
    if (SHEETS_CONNECTED) {
      const result = await deleteContact(id);
      return result;
    }
    return { ok:true, source:'local' };
  }

  return (
    <ContactsContext.Provider value={{ allContacts, stats, syncStatus, addContacts, updateOneContact, deleteOneContact }}>
      {children}
    </ContactsContext.Provider>
  );
}
