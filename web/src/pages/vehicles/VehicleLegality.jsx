import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';

const INIT = { vehicle_id:'', type:'stnk', document_number:'', issued_date:'', expiry_date:'', reminder_days:30, notes:'' };
const TYPES = { stnk:'STNK', kir:'KIR', pajak_tahunan:'Pajak Tahunan', asuransi:'Asuransi', izin_trayek:'Izin Trayek' };
const daysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

export default function VehicleLegality() {
  const [data, setData] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(INIT);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    const [lRes, vRes] = await Promise.all([
      api.get('/vehicle-legality', { params: { status: filterStatus || undefined } }),
      api.get('/vehicles')
    ]);
    setData(lRes.data.data); setVehicles(vRes.data.data); setLoading(false);
  };
  useEffect(() => { load(); }, [filterStatus]);

  const openAdd = () => { setForm(INIT); setEditing(null); setModal(true); };
  const openEdit = (r) => { setForm({ ...r, vehicle_id: r.vehicle_id || '' }); setEditing(r.id); setModal(true); };
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => v !== undefined && v !== null && v !== '' && fd.append(k, v));
      if (editing) await api.put(`/vehicle-legality/${editing}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/vehicle-legality', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.message || 'Gagal'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus dokumen ini?')) return;
    await api.delete(`/vehicle-legality/${id}`); load();
  };

  const columns = [
    { key:'nopol', label:'No. Polisi', primary:true },
    { key:'merk', label:'Kendaraan', render:(v,r) => `${v} ${r.model||''}` },
    { key:'type', label:'Jenis Dokumen', render: v => TYPES[v] || v },
    { key:'document_number', label:'No. Dokumen' },
    { key:'issued_date', label:'Tgl Terbit', render: v => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
    { key:'expiry_date', label:'Kadaluarsa', render: v => {
      const d = daysLeft(v);
      const color = d < 0 ? 'var(--danger)' : d <= 30 ? 'var(--warning)' : 'var(--text-secondary)';
      return <span style={{ color, fontWeight: d <= 30 ? 600 : 400 }}>{new Date(v).toLocaleDateString('id-ID')} {d < 0 ? `(${Math.abs(d)} hr lalu)` : d <= 30 ? `(${d} hr lagi)` : ''}</span>;
    }},
    { key:'status', label:'Status', badge: true },
  ];

  const expired = data.filter(d => d.status === 'expired').length;
  const expiring = data.filter(d => d.status === 'expiring_soon').length;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Legalitas Kendaraan</h1><p className="page-subtitle">Monitor dokumen STNK, KIR, Pajak, dan Asuransi</p></div>
        <select className="form-select" style={{ width:180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="expiring_soon">Segera Kadaluarsa</option>
          <option value="expired">Kadaluarsa</option>
        </select>
      </div>

      {(expired > 0 || expiring > 0) && (
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {expired > 0 && <div className="alert alert-danger" style={{ flex:1, marginBottom:0 }}>⛔ {expired} dokumen sudah kadaluarsa - segera perpanjang!</div>}
          {expiring > 0 && <div className="alert alert-warning" style={{ flex:1, marginBottom:0 }}>⚠️ {expiring} dokumen akan segera kadaluarsa dalam 30 hari</div>}
        </div>
      )}

      <DataTable columns={columns} data={data} loading={loading} onAdd={openAdd} addLabel="Tambah Dokumen"
        actions={(row) => (
          <div style={{ display:'flex', gap:4 }}>
            {row.document_file && <a className="btn btn-ghost btn-sm" href={row.document_file} target="_blank" rel="noreferrer">📄</a>}
            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>✏️</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(row.id)}>🗑️</button>
          </div>
        )}
      />

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Dokumen' : 'Tambah Dokumen Legalitas'} size="md"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </>}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Kendaraan *</label>
            <select className="form-select" value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} required>
              <option value="">-- Pilih Kendaraan --</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.nopol} - {v.merk} {v.model}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Jenis Dokumen *</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)} required>
                {Object.entries(TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">No. Dokumen</label>
              <input className="form-input" value={form.document_number} onChange={e => set('document_number', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tgl Terbit</label>
              <input className="form-input" type="date" value={form.issued_date} onChange={e => set('issued_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tgl Kadaluarsa *</label>
              <input className="form-input" type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Upload Dokumen (PDF/Foto)</label>
            <input className="form-input" type="file" accept=".pdf,image/*" onChange={e => set('document_file', e.target.files[0])} />
          </div>
          {editing && (
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Aktif</option>
                <option value="expiring_soon">Segera Kadaluarsa</option>
                <option value="expired">Kadaluarsa</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Catatan</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
