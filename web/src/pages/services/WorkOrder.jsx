import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';

const INIT = { vehicle_id:'', service_type:'preventive', category:'', description:'', workshop_name:'', mechanic_name:'', reported_date:'', km_at_service:'', estimated_cost:'', priority:'medium', notes:'' };

export default function WorkOrder() {
  const [data, setData] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    const [wRes, vRes] = await Promise.all([
      api.get('/services/work-orders', { params:{ status:filterStatus||undefined } }),
      api.get('/vehicles')
    ]);
    setData(wRes.data.data); setVehicles(vRes.data.data); setLoading(false);
  };
  useEffect(() => { load(); }, [filterStatus]);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => v!==undefined && v!==null && v!=='' && fd.append(k,v));
      await api.post('/services/work-orders', fd, { headers:{'Content-Type':'multipart/form-data'} });
      setModal(false); load();
    } catch(err) { alert('Gagal'); }
    setSaving(false);
  };

  const updateStatus = async (id, status) => {
    await api.put(`/services/work-orders/${id}/status`, { status });
    load();
  };

  const columns = [
    { key:'wo_number', label:'No WO', primary:true, render:v=><span style={{color:'var(--accent)',fontWeight:600,fontSize:12}}>{v}</span> },
    { key:'nopol', label:'Kendaraan' },
    { key:'service_type', label:'Tipe', render:v=>({preventive:'Preventive',corrective:'Corrective',emergency:'Emergency',bodywork:'Body'}[v]||v) },
    { key:'category', label:'Kategori' },
    { key:'description', label:'Deskripsi', render:v=><span style={{maxWidth:200,display:'inline-block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</span> },
    { key:'priority', label:'Prioritas', badge:true },
    { key:'estimated_cost', label:'Est. Biaya', render:v=>v?`Rp ${Number(v).toLocaleString('id-ID')}`:'-' },
    { key:'status', label:'Status', badge:true },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Work Order Service</h1><p className="page-subtitle">Kelola work order perbaikan dan perawatan</p></div>
        <select className="form-select" style={{width:160}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">Semua</option>
          <option value="draft">Draft</option><option value="pending">Pending</option><option value="approved">Approved</option>
          <option value="in_progress">In Progress</option><option value="completed">Completed</option>
        </select>
      </div>
      <DataTable columns={columns} data={data} loading={loading} onAdd={()=>{setForm(INIT);setModal(true);}} addLabel="Buat WO Baru"
        actions={row=>(
          <div style={{display:'flex',gap:4}}>
            {row.status==='draft' && <button className="btn btn-primary btn-sm" onClick={()=>updateStatus(row.id,'pending')}>Submit</button>}
            {row.status==='pending' && <button className="btn btn-success btn-sm" onClick={()=>updateStatus(row.id,'approved')}>Approve</button>}
            {row.status==='approved' && <button className="btn btn-warning btn-sm" onClick={()=>updateStatus(row.id,'in_progress')}>Mulai</button>}
            {row.status==='in_progress' && <button className="btn btn-success btn-sm" onClick={()=>updateStatus(row.id,'completed')}>Selesai</button>}
          </div>
        )}
      />
      <Modal isOpen={modal} onClose={()=>setModal(false)} title="Buat Work Order" size="lg"
        footer={<><button className="btn btn-ghost" onClick={()=>setModal(false)}>Batal</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></>}>
        <form onSubmit={handleSave}>
          <div className="form-group"><label className="form-label">Kendaraan *</label>
            <select className="form-select" value={form.vehicle_id} onChange={e=>set('vehicle_id',e.target.value)} required>
              <option value="">-- Pilih --</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.nopol} - {v.merk} {v.model}</option>)}
            </select></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Tipe Service *</label>
              <select className="form-select" value={form.service_type} onChange={e=>set('service_type',e.target.value)}>
                <option value="preventive">Preventive</option><option value="corrective">Corrective</option><option value="emergency">Emergency</option><option value="bodywork">Body/Cat</option>
              </select></div>
            <div className="form-group"><label className="form-label">Kategori</label>
              <select className="form-select" value={form.category} onChange={e=>set('category',e.target.value)}>
                <option value="">-- Pilih --</option>{['engine','brake','tire','electrical','suspension','body','ac','other'].map(c=><option key={c} value={c}>{c}</option>)}
              </select></div>
          </div>
          <div className="form-group"><label className="form-label">Deskripsi Kerusakan *</label><textarea className="form-textarea" value={form.description} onChange={e=>set('description',e.target.value)} required /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Bengkel</label><input className="form-input" value={form.workshop_name} onChange={e=>set('workshop_name',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Mekanik</label><input className="form-input" value={form.mechanic_name} onChange={e=>set('mechanic_name',e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Tgl Lapor</label><input className="form-input" type="date" value={form.reported_date} onChange={e=>set('reported_date',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">KM Saat Service</label><input className="form-input" type="number" value={form.km_at_service} onChange={e=>set('km_at_service',e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Estimasi Biaya</label><input className="form-input" type="number" value={form.estimated_cost} onChange={e=>set('estimated_cost',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Prioritas</label>
              <select className="form-select" value={form.priority} onChange={e=>set('priority',e.target.value)}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select></div>
          </div>
          <div className="form-group"><label className="form-label">Foto Kerusakan</label><input className="form-input" type="file" accept="image/*" onChange={e=>set('before_photo',e.target.files[0])} /></div>
        </form>
      </Modal>
    </div>
  );
}
