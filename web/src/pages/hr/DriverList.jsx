import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { FaEdit, FaTrashAlt, FaUser, FaCheckCircle, FaBriefcase, FaUserTimes, FaSyncAlt } from 'react-icons/fa';

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
    const [dRes, uRes] = await Promise.all([api.get('/drivers?exclude_photos=true'), api.get('/organizations/units')]);
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
      {/* ══ HERO HEADER BANNER (DINAS THEME STYLED) ══ */}
      <div style={{
        background: 'var(--gradient-hr)',
        borderRadius: 20, 
        padding: '28px 32px', 
        marginBottom: 28,
        position: 'relative', 
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Background decorative translucent circles */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -70, left: '38%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
          {/* Title & Icon Section */}
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
              <FaUser size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Data Driver
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Kelola profil driver, data pribadi, unit tugas, dan riwayat keaktifan operasional
              </p>
            </div>
          </div>

          {/* Action Area & Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Add Driver Button */}
            <button onClick={openAdd} style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              background: 'rgba(255,255,255,0.2)', 
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', 
              padding: '9px 18px', 
              borderRadius: 10, 
              cursor: 'pointer',
              fontSize: 13, 
              fontWeight: 600, 
              backdropFilter: 'blur(10px)', 
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              + Tambah Driver
            </button>

            {/* Refresh Button */}
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
              <FaSyncAlt size={12} />
              Refresh
            </button>
          </div>
        </div>

        {/* Translucent Glassmorphic Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 22 }}>
          {[
            { label: 'Total Driver', val: data.length, icon: <FaUser size={20} /> },
            { label: 'Driver Tersedia', val: data.filter(d => d.status === 'available').length, icon: <FaCheckCircle size={20} /> },
            { label: 'Sedang Dinas', val: data.filter(d => d.status === 'on_duty').length, icon: <FaBriefcase size={20} /> },
            { label: 'Off / Nonaktif', val: data.filter(d => d.status === 'off' || d.status === 'inactive').length, icon: <FaUserTimes size={20} /> },
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
                <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{s.val}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <DataTable columns={columns} data={data} loading={loading} onAdd={openAdd} addLabel="Tambah Driver"
        actions={row => (
          <div style={{display:'flex',gap:4}}>
            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(row)} title="Edit"><FaEdit size={13} /></button>
            <button className="btn btn-ghost btn-sm" onClick={async () => { if(confirm('Nonaktifkan driver?')) { await api.delete(`/drivers/${row.id}`); load(); }}} title="Hapus"><FaTrashAlt size={13} /></button>
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
