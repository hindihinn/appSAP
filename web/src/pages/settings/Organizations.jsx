import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';

export default function Organizations() {
  const [companies, setCompanies] = useState([]);
  const [units, setUnits] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {type:'company'|'unit'|'division', data:{}}
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c,u,d] = await Promise.all([api.get('/organizations/companies'),api.get('/organizations/units'),api.get('/organizations/divisions')]);
    setCompanies(c.data.data); setUnits(u.data.data); setDivisions(d.data.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const t = modal.type;
      const url = t==='company'?'/organizations/companies':t==='unit'?'/organizations/units':'/organizations/divisions';
      if (modal.editing) await api.put(`${url}/${modal.editing}`, form);
      else await api.post(url, form);
      setModal(null); load();
    } catch(err) { alert('Gagal'); }
    setSaving(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Manajemen Organisasi</h1><p className="page-subtitle">Kelola struktur PT, Unit, dan Divisi</p></div></div>

      {/* Companies */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header">
          <h3 className="card-title">🏢 Perusahaan (PT)</h3>
          <button className="btn btn-primary btn-sm" onClick={()=>{setForm({name:'',code:'',address:'',phone:'',email:''});setModal({type:'company'});}}>+ Tambah PT</button>
        </div>
        <div className="table-container"><table><thead><tr><th>Kode</th><th>Nama</th><th>Alamat</th><th>Telepon</th><th>Email</th><th>Aksi</th></tr></thead>
          <tbody>{companies.map(c=>(
            <tr key={c.id}><td style={{fontWeight:600,color:'var(--accent)'}}>{c.code}</td><td style={{color:'var(--text-primary)'}}>{c.name}</td><td>{c.address}</td><td>{c.phone}</td><td>{c.email}</td>
            <td><button className="btn btn-ghost btn-sm" onClick={()=>{setForm({...c});setModal({type:'company',editing:c.id});}}>✏️</button></td></tr>
          ))}</tbody></table></div>
      </div>

      {/* Units */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header">
          <h3 className="card-title">🏗️ Unit</h3>
          <button className="btn btn-primary btn-sm" onClick={()=>{setForm({company_id:'',name:'',code:'',description:''});setModal({type:'unit'});}}>+ Tambah Unit</button>
        </div>
        <div className="table-container"><table><thead><tr><th>Perusahaan</th><th>Kode</th><th>Nama Unit</th><th>Deskripsi</th><th>Aksi</th></tr></thead>
          <tbody>{units.map(u=>(
            <tr key={u.id}><td>{u.company_name}</td><td style={{fontWeight:600}}>{u.code}</td><td style={{color:'var(--text-primary)'}}>{u.name}</td><td>{u.description}</td>
            <td><button className="btn btn-ghost btn-sm" onClick={()=>{setForm({...u});setModal({type:'unit',editing:u.id});}}>✏️</button></td></tr>
          ))}</tbody></table></div>
      </div>

      {/* Divisions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📂 Divisi</h3>
          <button className="btn btn-primary btn-sm" onClick={()=>{setForm({unit_id:'',name:'',code:'',description:''});setModal({type:'division'});}}>+ Tambah Divisi</button>
        </div>
        <div className="table-container"><table><thead><tr><th>Unit</th><th>Kode</th><th>Nama Divisi</th><th>Aksi</th></tr></thead>
          <tbody>{divisions.map(d=>(
            <tr key={d.id}><td>{d.unit_name}</td><td style={{fontWeight:600}}>{d.code}</td><td style={{color:'var(--text-primary)'}}>{d.name}</td>
            <td><button className="btn btn-ghost btn-sm" onClick={()=>{setForm({...d});setModal({type:'division',editing:d.id});}}>✏️</button></td></tr>
          ))}</tbody></table></div>
      </div>

      <Modal isOpen={!!modal} onClose={()=>setModal(null)} title={modal ? `${modal.editing?'Edit':'Tambah'} ${modal.type==='company'?'Perusahaan':modal.type==='unit'?'Unit':'Divisi'}` : ''}
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
        </>}
        {modal?.type==='division' && <>
          <div className="form-group"><label className="form-label">Unit</label><select className="form-select" value={form.unit_id||''} onChange={e=>setForm(f=>({...f,unit_id:e.target.value}))}><option value="">--</option>{units.map(u=><option key={u.id} value={u.id}>{u.company_name} - {u.name}</option>)}</select></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Kode</label><input className="form-input" value={form.code||''} onChange={e=>setForm(f=>({...f,code:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Nama</label><input className="form-input" value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div></div>
        </>}
      </Modal>
    </div>
  );
}
