import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';

const TYPES = { sim_a:'SIM A', sim_b1:'SIM B1', sim_b2:'SIM B2', sim_c:'SIM C', medical_checkup:'Medical Checkup', training_cert:'Sertifikat Training' };
const INIT = { driver_id:'', type:'sim_b1', document_number:'', issued_date:'', expiry_date:'', reminder_days:30, notes:'' };

export default function DriverLegality() {
  const [data, setData] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(INIT);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [lRes, dRes] = await Promise.all([api.get('/driver-legality'), api.get('/drivers')]);
    setData(lRes.data.data); setDrivers(dRes.data.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => v !== undefined && v !== null && v !== '' && fd.append(k, v));
      if (editing) await api.put(`/driver-legality/${editing}`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      else await api.post('/driver-legality', fd, { headers:{'Content-Type':'multipart/form-data'} });
      setModal(false); load();
    } catch(err) { alert('Gagal'); }
    setSaving(false);
  };

  const columns = [
    { key:'driver_name', label:'Nama Driver', primary:true },
    { key:'employee_id', label:'NIP' },
    { key:'type', label:'Jenis', render: v => TYPES[v]||v },
    { key:'document_number', label:'No. Dokumen' },
    { key:'expiry_date', label:'Kadaluarsa', render: v => {
      const d = Math.ceil((new Date(v)-new Date())/86400000);
      const color = d<0?'var(--danger)':d<=30?'var(--warning)':'var(--text-secondary)';
      return <span style={{color,fontWeight:d<=30?600:400}}>{new Date(v).toLocaleDateString('id-ID')}</span>;
    }},
    { key:'status', label:'Status', badge:true },
  ];

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Legalitas Driver</h1><p className="page-subtitle">Monitor SIM, Medical Checkup, dan Sertifikat</p></div></div>
      <DataTable columns={columns} data={data} loading={loading} onAdd={() => { setForm(INIT); setEditing(null); setModal(true); }} addLabel="Tambah Dokumen"
        actions={row => (
          <div style={{display:'flex',gap:4}}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setForm({...row}); setEditing(row.id); setModal(true); }}>✏️</button>
            <button className="btn btn-ghost btn-sm" onClick={async () => { if(confirm('Hapus?')) { await api.delete(`/driver-legality/${row.id}`); load(); }}}>🗑️</button>
          </div>
        )}
      />
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing?'Edit':'Tambah Dokumen Driver'}
        footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></>}>
        <form onSubmit={handleSave}>
          <div className="form-group"><label className="form-label">Driver *</label>
            <select className="form-select" value={form.driver_id} onChange={e=>set('driver_id',e.target.value)} required>
              <option value="">-- Pilih --</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.employee_id} - {d.name}</option>)}
            </select></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Jenis *</label>
              <select className="form-select" value={form.type} onChange={e=>set('type',e.target.value)}>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">No. Dokumen</label><input className="form-input" value={form.document_number} onChange={e=>set('document_number',e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Tgl Terbit</label><input className="form-input" type="date" value={form.issued_date} onChange={e=>set('issued_date',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Kadaluarsa *</label><input className="form-input" type="date" value={form.expiry_date} onChange={e=>set('expiry_date',e.target.value)} required /></div>
          </div>
          <div className="form-group"><label className="form-label">Upload Dokumen</label><input className="form-input" type="file" accept=".pdf,image/*" onChange={e=>set('document_file',e.target.files[0])} /></div>
        </form>
      </Modal>
    </div>
  );
}
