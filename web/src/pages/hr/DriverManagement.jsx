import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';

export default function DriverManagement() {
  const [data, setData] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ driver_id:'', vehicle_id:'', notes:'' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [aRes, dRes, vRes] = await Promise.all([
      api.get('/driver-assignments', { params:{ status:'active' } }),
      api.get('/drivers'), api.get('/vehicles')
    ]);
    setData(aRes.data.data); setDrivers(dRes.data.data); setVehicles(vRes.data.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleAssign = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/driver-assignments', form); setModal(false); load(); }
    catch(err) { alert('Gagal'); }
    setSaving(false);
  };

  const columns = [
    { key:'driver_name', label:'Driver', primary:true },
    { key:'employee_id', label:'NIP' },
    { key:'nopol', label:'Kendaraan' },
    { key:'merk', label:'Merk', render:(v,r)=>`${v} ${r.model||''}` },
    { key:'assigned_date', label:'Tgl Assign', render:v=>new Date(v).toLocaleDateString('id-ID') },
    { key:'assigned_by_name', label:'Oleh' },
    { key:'status', label:'Status', badge:true },
  ];

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Manajemen Driver</h1><p className="page-subtitle">Assign driver ke kendaraan operasional</p></div></div>
      <DataTable columns={columns} data={data} loading={loading} onAdd={() => { setForm({ driver_id:'', vehicle_id:'', notes:'' }); setModal(true); }} addLabel="Assign Driver"
        actions={row => (
          <button className="btn btn-warning btn-sm" onClick={async () => { if(confirm('Akhiri penugasan?')) { await api.put(`/driver-assignments/${row.id}`, { status:'ended', end_date:new Date().toISOString().slice(0,10) }); load(); }}}>End</button>
        )}
      />
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Assign Driver ke Kendaraan"
        footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" onClick={handleAssign} disabled={saving}>{saving?'Menyimpan...':'Assign'}</button></>}>
        <form onSubmit={handleAssign}>
          <div className="form-group"><label className="form-label">Driver *</label>
            <select className="form-select" value={form.driver_id} onChange={e=>setForm(f=>({...f,driver_id:e.target.value}))} required>
              <option value="">-- Pilih Driver --</option>{drivers.filter(d=>d.status==='available').map(d=><option key={d.id} value={d.id}>{d.name} ({d.employee_id})</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Kendaraan *</label>
            <select className="form-select" value={form.vehicle_id} onChange={e=>setForm(f=>({...f,vehicle_id:e.target.value}))} required>
              <option value="">-- Pilih Kendaraan --</option>{vehicles.filter(v=>v.status==='available').map(v=><option key={v.id} value={v.id}>{v.nopol} - {v.merk} {v.model}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Catatan</label><textarea className="form-textarea" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
        </form>
      </Modal>
    </div>
  );
}
