import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';

const INIT = { employee_id:'', name:'', nik:'', address:'', phone:'', emergency_contact:'', emergency_phone:'', birth_date:'', blood_type:'', unit_id:'', join_date:'', notes:'' };

export default function DriverList() {
  const [data, setData] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(INIT);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [dRes, uRes] = await Promise.all([api.get('/drivers'), api.get('/organizations/units')]);
    setData(dRes.data.data); setUnits(uRes.data.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(INIT); setEditing(null); setModal(true); };
  const openEdit = (r) => { setForm({ ...r }); setEditing(r.id); setModal(true); };
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => v !== undefined && v !== null && v !== '' && fd.append(k, v));
      if (editing) await api.put(`/drivers/${editing}`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      else await api.post('/drivers', fd, { headers:{'Content-Type':'multipart/form-data'} });
      setModal(false); load();
    } catch(err) { alert(err.response?.data?.message || 'Gagal'); }
    setSaving(false);
  };

  const columns = [
    { key:'employee_id', label:'NIP' },
    { key:'name', label:'Nama', primary:true },
    { key:'phone', label:'Telepon' },
    { key:'unit_name', label:'Unit' },
    { key:'blood_type', label:'Gol. Darah' },
    { key:'join_date', label:'Tgl Bergabung', render:v => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
    { key:'status', label:'Status', badge:true },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Data Driver</h1><p className="page-subtitle">Kelola data driver dan profil lengkap</p></div>
      </div>
      <DataTable columns={columns} data={data} loading={loading} onAdd={openAdd} addLabel="Tambah Driver"
        actions={row => (
          <div style={{display:'flex',gap:4}}>
            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>✏️</button>
            <button className="btn btn-ghost btn-sm" onClick={async () => { if(confirm('Nonaktifkan driver?')) { await api.delete(`/drivers/${row.id}`); load(); }}}>🗑️</button>
          </div>
        )}
      />
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Driver' : 'Tambah Driver'} size="lg"
        footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></>}>
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">NIP *</label><input className="form-input" value={form.employee_id} onChange={e=>set('employee_id',e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Nama Lengkap *</label><input className="form-input" value={form.name} onChange={e=>set('name',e.target.value)} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">NIK (KTP)</label><input className="form-input" value={form.nik} onChange={e=>set('nik',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">No. Telepon</label><input className="form-input" value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Tanggal Lahir</label><input className="form-input" type="date" value={form.birth_date} onChange={e=>set('birth_date',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Gol. Darah</label>
              <select className="form-select" value={form.blood_type} onChange={e=>set('blood_type',e.target.value)}><option value="">-</option>{['A','B','AB','O'].map(b=><option key={b}>{b}</option>)}</select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Unit</label>
              <select className="form-select" value={form.unit_id} onChange={e=>set('unit_id',e.target.value)}><option value="">-- Pilih --</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>
            </div>
            <div className="form-group"><label className="form-label">Tgl Bergabung</label><input className="form-input" type="date" value={form.join_date} onChange={e=>set('join_date',e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Alamat</label><textarea className="form-textarea" value={form.address} onChange={e=>set('address',e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Kontak Darurat</label><input className="form-input" value={form.emergency_contact} onChange={e=>set('emergency_contact',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Telp Darurat</label><input className="form-input" value={form.emergency_phone} onChange={e=>set('emergency_phone',e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Foto</label><input className="form-input" type="file" accept="image/*" onChange={e=>set('photo',e.target.files[0])} /></div>
          {editing && <div className="form-group"><label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e=>set('status',e.target.value)}><option value="available">Tersedia</option><option value="on_duty">Sedang Dinas</option><option value="off">Off</option><option value="inactive">Nonaktif</option></select></div>}
        </form>
      </Modal>
    </div>
  );
}
