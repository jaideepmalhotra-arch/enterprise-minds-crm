import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { Btn, Toast, Modal } from '../components/UI.jsx';

const COLOR_PRESETS = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#FFFBEB', text: '#92600A' },
  { bg: '#FEF2F2', text: '#991B1B' },
  { bg: '#F0FDF4', text: '#166534' },
  { bg: '#F5F3FF', text: '#4C1D95' },
];

function RepModal({ rep, onClose, onSave }) {
  const isNew = !rep?.id;
  const [form, setForm] = useState(rep || {
    id: '', name: '', initials: '', focus: '',
    color_bg: '#E6F1FB', color_text: '#0C447C', active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.id.trim() || !form.name.trim()) { setError('ID and Name are required'); return; }
    setSaving(true);
    try {
      if (isNew) {
        const { error: e } = await supabase.from('reps').insert({
          id: form.id.toUpperCase().trim(),
          name: form.name.trim(),
          initials: form.initials.trim() || form.name.slice(0,2).toUpperCase(),
          focus: form.focus.trim() || null,
          color_bg: form.color_bg,
          color_text: form.color_text,
          active: true,
        });
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('reps').update({
          name: form.name.trim(),
          initials: form.initials.trim() || form.name.slice(0,2).toUpperCase(),
          focus: form.focus.trim() || null,
          color_bg: form.color_bg,
          color_text: form.color_text,
          active: form.active,
        }).eq('id', form.id);
        if (e) throw e;
      }
      onSave();
      onClose();
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  }

  const F = (label, key, placeholder = '') => (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{label}</div>
      <input
        value={form[key] || ''}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #D0D7E5', borderRadius: 7, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
      />
    </div>
  );

  return (
    <Modal title={isNew ? 'Add rep' : 'Edit rep'} onClose={onClose} width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Rep ID *</div>
            <input
              value={form.id || ''}
              onChange={e => set('id', e.target.value)}
              placeholder="e.g. R5"
              disabled={!isNew}
              style={{ width: '100%', border: '1px solid #D0D7E5', borderRadius: 7, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box', background: isNew ? '#fff' : '#F8FAFC', color: isNew ? '#0D1F3C' : '#94A3B8' }}
            />
            {isNew && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>Short unique ID — cannot be changed later</div>}
          </div>
          {F('Initials', 'initials', 'e.g. JM')}
        </div>
        {F('Full name *', 'name', 'e.g. Jaideep Malhotra')}
        {F('Focus / Region', 'focus', 'e.g. India · BFSI')}

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Badge colour</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_PRESETS.map((p, i) => (
              <div key={i} onClick={() => { set('color_bg', p.bg); set('color_text', p.text); }}
                style={{ width: 32, height: 32, borderRadius: 6, background: p.bg, border: form.color_bg === p.bg ? '2px solid #0F172A' : '1px solid #E4E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: p.text }}>
                Aa
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '7px 12px', borderRadius: 20, background: form.color_bg, color: form.color_text, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
            {form.initials || form.name.slice(0,2).toUpperCase() || 'AB'} · {form.name || 'Rep Name'}
          </div>
        </div>

        {!isNew && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
            Active rep (uncheck to deactivate without deleting)
          </label>
        )}

        {error && <div style={{ fontSize: 12, color: '#E24B4A' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={saving || !form.name.trim() || !form.id.trim()}>
            {saving ? 'Saving...' : isNew ? 'Add rep' : 'Save changes'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function SettingsPage() {
  const [reps,    setReps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('reps').select('*').order('id');
    setReps(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(rep) {
    await supabase.from('reps').update({ active: !rep.active }).eq('id', rep.id);
    showToast(rep.active ? rep.name + ' deactivated' : rep.name + ' activated');
    load();
  }

  async function deleteRep(rep) {
    if (!window.confirm(`Delete ${rep.name}? This cannot be undone. Any pipeline cards assigned to this rep will become unassigned.`)) return;
    const { error } = await supabase.from('reps').delete().eq('id', rep.id);
    if (error) { showToast('Cannot delete: ' + error.message, 'error'); return; }
    showToast(rep.name + ' deleted');
    load();
  }

  return (
    <div style={{ padding: '16px 20px', maxWidth: 700 }}>

      {/* Reps section */}
      <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E4E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Sales reps</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Manage who appears in the pipeline and assignment desk</div>
          </div>
          <Btn onClick={() => setModal('new')} size="sm">+ Add rep</Btn>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>Loading...</div>
        ) : reps.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>No reps yet — add one above</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Badge', 'Name', 'ID', 'Focus / Region', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '8px 14px', background: '#F8FAFC', borderBottom: '1px solid #E4E8F0', textAlign: 'left', fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reps.map(rep => (
                <tr key={rep.id} style={{ opacity: rep.active ? 1 : 0.5 }}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ padding: '3px 10px', borderRadius: 20, background: rep.color_bg, color: rep.color_text, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
                      {rep.initials}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A' }}>{rep.name}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', color: '#64748B', fontFamily: 'monospace' }}>{rep.id}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{rep.focus || '—'}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: rep.active ? '#ECFDF5' : '#F1F5F9', color: rep.active ? '#065F46' : '#64748B' }}>
                      {rep.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setModal(rep)} style={{ padding: '2px 8px', border: '1px solid #E4E8F0', borderRadius: 5, fontSize: 10, cursor: 'pointer', background: '#F8FAFC', fontFamily: 'inherit' }}>Edit</button>
                      <button onClick={() => toggleActive(rep)} style={{ padding: '2px 8px', border: '1px solid #E4E8F0', borderRadius: 5, fontSize: 10, cursor: 'pointer', background: '#F8FAFC', fontFamily: 'inherit' }}>
                        {rep.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => deleteRep(rep)} style={{ padding: '2px 8px', border: '1px solid #FCA5A5', borderRadius: 5, fontSize: 10, cursor: 'pointer', background: '#FEF2F2', color: '#991B1B', fontFamily: 'inherit' }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info box */}
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#1E40AF' }}>
        <strong>Note:</strong> Rep IDs (e.g. R1, R2) are permanent once created. You can change names, initials, focus and badge colour at any time. Deactivating a rep hides them from the assignment desk without losing their pipeline history.
      </div>

      {modal && (
        <RepModal
          rep={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { load(); showToast(modal === 'new' ? 'Rep added' : 'Rep updated'); }}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}
