import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase.js';
import { logAudit } from '../utils/audit.js';
import { Toast } from '../components/UI.jsx';
import { MOD, ModHeader, KpiStrip } from '../utils/moduleTheme.js';

const m = MOD.input;

const COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina","Brazil","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Honduras","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia","Malta","Mexico","Moldova","Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria","North Macedonia","Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Senegal","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey","UAE","Uganda","Ukraine","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"];

const IMPORTANCE_OPTIONS = [
  { value: '',             label: 'Not set' },
  { value: 'hot',         label: '🔴 Hot' },
  { value: 'warm',        label: '🟡 Warm' },
  { value: 'cold',        label: '🔵 Cold' },
];

const SOURCES = ['Apollo','LinkedIn','Conference','Referral','Website','Cold Outreach','Event','Other'];

function Field({ label, required, children }) {
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:700, color:m.textMid, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>
        {label} {required && <span style={{ color:'#DC2626' }}>*</span>}
      </div>
      {children}
    </div>
  );
}

const inp = { width:'100%', border:`1px solid ${m.border}`, borderRadius:7, padding:'8px 10px', fontSize:12, fontFamily:'inherit', boxSizing:'border-box', background:'#fff', outline:'none' };

function calcTier({ email, phone, contact, role, linkedin }) {
  let s = 0;
  if (email) s++; if (phone) s++; if (contact) s++; if (role) s++; if (linkedin) s++;
  if (s >= 4) return 'complete'; if (s >= 2) return 'partial'; if (s >= 1) return 'minimal'; return 'empty';
}

export default function AddContactPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);
  const [recentCount, setRecentCount] = useState(0);
  const [todayCount,  setTodayCount]  = useState(0);
  const [form, setForm] = useState({
    company:'', contact:'', role:'', email:'', phone:'',
    country:'', city:'', linkedin:'', website:'', industry:'',
    source:'', importance:'', notes:'',
  });
  const [errors, setErrors] = useState({});

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    const today = new Date().toISOString().slice(0,10);
    const week  = new Date(Date.now() - 7*86400000).toISOString();
    Promise.all([
      supabase.from('leads').select('id',{count:'exact',head:true}).gte('imported_at', week),
      supabase.from('leads').select('id',{count:'exact',head:true}).gte('imported_at', today),
    ]).then(([{count:r},{count:d}]) => { setRecentCount(r||0); setTodayCount(d||0); });
  }, []);

  const set = (k,v) => { setForm(f=>({...f,[k]:v})); if (errors[k]) setErrors(e=>({...e,[k]:''})); };

  function validate() {
    const e = {};
    if (!form.company.trim()) e.company = 'Company is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save(andAnother = false) {
    if (!validate()) return;
    setSaving(true);
    try {
      const clean = v => { const s = String(v||'').trim(); return s || null; };
      const email   = clean(form.email);
      const phone   = clean(form.phone);
      const contact = clean(form.contact);
      const role    = clean(form.role);
      const linkedin = clean(form.linkedin);

      const row = {
        company:     form.company.trim(),
        contact:     contact, role, email, phone, linkedin,
        country:     clean(form.country),
        city:        clean(form.city),
        website:     clean(form.website),
        industry:    clean(form.industry),
        source:      clean(form.source),
        importance:  form.importance || null,
        notes:       clean(form.notes),
        tier:        calcTier({ email, phone, contact, role, linkedin }),
        imported_at: new Date().toISOString(),
        last_synced: new Date().toISOString(),
      };

      const { error } = await supabase.from('leads').insert(row);
      if (error) throw error;

      logAudit('lead_enriched', `Contact added: ${row.company}${contact ? ' · '+contact : ''}`, { company: row.company, email });
      showToast(`${form.company} added ✓`);
      setTodayCount(c => c+1); setRecentCount(c => c+1);

      if (andAnother) {
        setForm({ company:'', contact:'', role:'', email:'', phone:'', country:'', city:'', linkedin:'', website:'', industry:'', source:'', importance:'', notes:'' });
        setErrors({});
      } else {
        setTimeout(() => navigate('/sales/contacts'), 800);
      }
    } catch(e) {
      if (e.message?.includes('unique') || e.code === '23505') showToast('A contact with this email already exists', 'error');
      else showToast('Error: ' + e.message, 'error');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ background:m.pageBg, minHeight:'100vh' }}>
      <ModHeader title="Add Contact" sub="Manually add a single lead to the database" mod="input" />
      <div style={{ padding:'16px 20px' }}>
        <KpiStrip mod="input" kpis={[
          { label:'Added today',    value:todayCount },
          { label:'Added this week', value:recentCount },
        ]} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:860 }}>
          {/* Left column */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:m.textMid, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Company & contact</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Field label="Company" required>
                  <input value={form.company} onChange={e=>set('company',e.target.value)} placeholder="e.g. Frutarom UK Ltd" style={{...inp, borderColor:errors.company?'#FCA5A5':m.border}} />
                  {errors.company && <div style={{fontSize:10,color:'#DC2626',marginTop:3}}>{errors.company}</div>}
                </Field>
                <Field label="Contact name">
                  <input value={form.contact} onChange={e=>set('contact',e.target.value)} placeholder="e.g. John Smith" style={inp} />
                </Field>
                <Field label="Job title / Role">
                  <input value={form.role} onChange={e=>set('role',e.target.value)} placeholder="e.g. Head of Procurement" style={inp} />
                </Field>
              </div>
            </div>

            <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:m.textMid, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Contact details</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Field label="Email">
                  <input value={form.email} onChange={e=>set('email',e.target.value)} placeholder="e.g. john@frutarom.com" type="email" style={{...inp, borderColor:errors.email?'#FCA5A5':m.border}} />
                  {errors.email && <div style={{fontSize:10,color:'#DC2626',marginTop:3}}>{errors.email}</div>}
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="e.g. +44 20 7946 0958" style={inp} />
                </Field>
                <Field label="LinkedIn URL">
                  <input value={form.linkedin} onChange={e=>set('linkedin',e.target.value)} placeholder="e.g. linkedin.com/in/johnsmith" style={inp} />
                </Field>
                <Field label="Website">
                  <input value={form.website} onChange={e=>set('website',e.target.value)} placeholder="e.g. frutarom.com" style={inp} />
                </Field>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:m.textMid, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Location & industry</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Field label="Country">
                  <select value={form.country} onChange={e=>set('country',e.target.value)} style={inp}>
                    <option value="">Select country...</option>
                    {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="City">
                  <input value={form.city} onChange={e=>set('city',e.target.value)} placeholder="e.g. London" style={inp} />
                </Field>
                <Field label="Industry">
                  <input value={form.industry} onChange={e=>set('industry',e.target.value)} placeholder="e.g. Food & Beverage" style={inp} />
                </Field>
              </div>
            </div>

            <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:m.textMid, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Classification</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Field label="Source">
                  <select value={form.source} onChange={e=>set('source',e.target.value)} style={inp}>
                    <option value="">Select source...</option>
                    {SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Importance">
                  <select value={form.importance} onChange={e=>set('importance',e.target.value)} style={inp}>
                    {IMPORTANCE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Notes">
                  <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any notes about this contact..." rows={3}
                    style={{...inp, resize:'vertical', lineHeight:1.5}} />
                </Field>
              </div>
            </div>

            {/* Data quality preview */}
            <div style={{ background:m.headerBg, border:`1px solid ${m.border}`, borderRadius:12, padding:'12px 16px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:m.textMid, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Data quality preview</div>
              {[
                ['Company',  form.company],
                ['Email',    form.email],
                ['Phone',    form.phone],
                ['Contact',  form.contact],
                ['LinkedIn', form.linkedin],
              ].map(([label, val]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background: val ? m.accent : '#E4E8F0', flexShrink:0 }} />
                  <span style={{ fontSize:11, flex:1, color: val ? m.textDark : '#94A3B8' }}>{label}</span>
                  <span style={{ fontSize:10, fontWeight:600, color: val ? m.accent : '#CBD5E1' }}>{val ? '✓' : '—'}</span>
                </div>
              ))}
              <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${m.border}` }}>
                <span style={{ fontSize:10, fontWeight:700, color:m.textMid }}>Tier: </span>
                <span style={{ fontSize:10, fontWeight:700, color:m.textDark }}>
                  {calcTier({ email:form.email, phone:form.phone, contact:form.contact, role:form.role, linkedin:form.linkedin }).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:8, marginTop:20, maxWidth:860 }}>
          <button onClick={() => navigate('/sales/contacts')}
            style={{ padding:'9px 18px', border:`1px solid ${m.border}`, borderRadius:8, fontSize:12, cursor:'pointer', background:'#fff', color:m.textMid, fontFamily:'inherit' }}>
            Cancel
          </button>
          <button onClick={() => save(true)} disabled={saving || !form.company.trim()}
            style={{ padding:'9px 18px', border:`1px solid ${m.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:saving||!form.company.trim()?'not-allowed':'pointer', background:m.headerBg, color:m.textDark, fontFamily:'inherit', opacity:saving||!form.company.trim()?.5:1 }}>
            Save & add another
          </button>
          <button onClick={() => save(false)} disabled={saving || !form.company.trim()}
            style={{ padding:'9px 22px', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:saving||!form.company.trim()?'not-allowed':'pointer', background:m.accent, color:'#fff', fontFamily:'inherit', opacity:saving||!form.company.trim()?.5:1 }}>
            {saving ? 'Saving...' : 'Save contact →'}
          </button>
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
