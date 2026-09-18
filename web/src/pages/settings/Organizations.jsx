import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { FaBuilding, FaWarehouse, FaEdit, FaSitemap, FaSync } from 'react-icons/fa';

export default function Organizations() {
  const [companies, setCompanies] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {type:'company'|'unit', data:{}}
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, u] = await Promise.all([
        api.get('/organizations/companies'),
        api.get('/organizations/units'),
      ]);
      setCompanies(c.data.data || []);
      setUnits(u.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const t = modal.type;
      const url = t === 'company' ? '/organizations/companies' : '/organizations/units';
      
      // Convert company_id to number for unit type payload
      const payload = t === 'unit' ? {
        ...form,
        company_id: form.company_id ? Number(form.company_id) : null
      } : form;

      if (modal.editing) await api.put(`${url}/${modal.editing}`, payload);
      else await api.post(url, payload);
      setModal(null); load();
    } catch(err) { alert('Gagal menyimpan data'); }
    setSaving(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const totalCompanies = companies.length;
  const totalUnits = units.length;

  return (
    <div>
      {/* ══ HERO HEADER BANNER ══ */}
      <div style={{
        background: 'var(--gradient-settings)',
        borderRadius: 20, 
        padding: '28px 32px', 
        marginBottom: 28,
        position: 'relative', 
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -70, left: '38%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 50, 
              height: 50, 
              borderRadius: 14,
              background: 'rgba(255,255,255,0.15)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
            }}>
              <FaSitemap size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Company
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Kelola data Perusahaan (PT) dan Unit / Gudang operasional
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={load} style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              background: 'rgba(255,255,255,0.15)', 
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', 
              padding: '9px 18px', 
              borderRadius: 10, 
              cursor: 'pointer',
              fontSize: 13, 
              fontWeight: 600, 
              backdropFilter: 'blur(10px)', 
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              <FaSync size={12} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 22 }}>
          {[
            { label: 'Total Perusahaan (PT)', val: totalCompanies, icon: <FaBuilding size={20} /> },
            { label: 'Total Unit / Gudang', val: totalUnits, icon: <FaWarehouse size={20} /> },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.12)', 
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12, 
              padding: '14px 16px', 
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>{s.icon}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{s.val}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Companies Table */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header">
          <h3 className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}><FaBuilding size={15} style={{ color:'var(--accent)' }} /> Perusahaan (PT)</h3>
          <button className="btn btn-primary btn-sm" onClick={()=>{setForm({name:'',code:'',address:'',phone:'',email:''});setModal({type:'company'});}}>+ Tambah PT</button>
        </div>
        <div className="table-container"><table><thead><tr><th>Kode</th><th>Nama</th><th>Alamat</th><th>Telepon</th><th>Email</th><th>Aksi</th></tr></thead>
          <tbody>{companies.map(c=>(
            <tr key={c.id}><td style={{fontWeight:600,color:'var(--accent)'}}>{c.code}</td><td style={{color:'var(--text-primary)'}}>{c.name}</td><td>{c.address}</td><td>{c.phone}</td><td>{c.email}</td>
            <td><button className="btn btn-ghost btn-sm" onClick={()=>{setForm({...c});setModal({type:'company',editing:c.id});}} title="Edit"><FaEdit size={13} /></button></td></tr>
          ))}</tbody></table></div>
      </div>

      {/* Units Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}><FaWarehouse size={15} style={{ color:'var(--accent)' }} /> Unit / Gudang</h3>
          <button className="btn btn-primary btn-sm" onClick={()=>{setForm({company_id:'',name:'',code:'',description:''});setModal({type:'unit'});}}>+ Tambah Unit</button>
        </div>
        <div className="table-container"><table><thead><tr><th>Perusahaan</th><th>Kode</th><th>Nama Unit</th><th>Deskripsi</th><th>Aksi</th></tr></thead>
          <tbody>{units.map(u=>(
            <tr key={u.id}><td>{u.company_name}</td><td style={{fontWeight:600}}>{u.code}</td><td style={{color:'var(--text-primary)'}}>{u.name}</td><td>{u.description}</td>
            <td><button className="btn btn-ghost btn-sm" onClick={()=>{setForm({...u});setModal({type:'unit',editing:u.id});}} title="Edit"><FaEdit size={13} /></button></td></tr>
          ))}</tbody></table></div>
      </div>

      <Modal isOpen={!!modal} onClose={()=>setModal(null)} title={modal ? `${modal.editing?'Edit':'Tambah'} ${modal.type==='company'?'Perusahaan (PT)':'Unit / Gudang'}` : ''}
        footer={<><button className="btn btn-ghost" onClick={()=>setModal(null)}>Batal</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'...':'Simpan'}</button></>}>
        {modal?.type==='company' && <>
          <div className="form-row"><div className="form-group"><label className="form-label">Kode</label><input className="form-input" value={form.code||''} onChange={e=>setForm(f=>({...f,code:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Nama</label><input className="form-input" value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div></div>
          <div className="form-group"><label className="form-label">Alamat</label><textarea className="form-textarea" value={form.address||''} onChange={e=>setForm(f=>({...f,address:e.target.value}))} /></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Telepon</label><input className="form-input" value={form.phone||''} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div></div>
        </>}
        {modal?.type==='unit' && <>
          <div className="form-group"><label className="form-label">Perusahaan</label><select className="form-select" value={form.company_id||''} onChange={e=>setForm(f=>({...f,company_id:e.target.value}))}><option value="">--</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Kode</label><input className="form-input" value={form.code||''} onChange={e=>setForm(f=>({...f,code:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Nama</label><input className="form-input" value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div></div>
          <div className="form-group"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
        </>}
      </Modal>
    </div>
  );
}
