import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { FaUserCog, FaLink, FaCar, FaUserCheck, FaSyncAlt } from 'react-icons/fa';

export default function DriverManagement() {
  const [data, setData] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ driver_id: '', vehicle_id: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [aRes, dRes, vRes] = await Promise.all([
      api.get('/driver-assignments', { params: { status: 'active' } }),
      api.get('/drivers'), api.get('/vehicles')
    ]);
    setData(aRes.data.data); setDrivers(dRes.data.data); setVehicles(vRes.data.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleAssign = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/driver-assignments', form); setModal(false); load(); }
    catch (err) { alert('Gagal'); }
    setSaving(false);
  };

  const columns = [
    { key: 'driver_name', label: 'Driver', primary: true },
    { key: 'employee_id', label: 'NIP' },
    { key: 'nopol', label: 'Kendaraan' },
    { key: 'merk', label: 'Merk', render: (v, r) => `${v} ${r.model || ''}` },
    { key: 'assigned_date', label: 'Tgl Assign', render: v => new Date(v).toLocaleDateString('id-ID') },
    { key: 'assigned_by_name', label: 'Oleh' },
    { key: 'status', label: 'Status', badge: true },
  ];

  const totalAssignments = data.length;
  const activeAssignments = data.filter(a => a.status === 'active').length;
  const availableDrivers = drivers.filter(d => d.status === 'available').length;
  const availableVehicles = vehicles.filter(v => v.status === 'available').length;

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
              <FaUserCog size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Manajemen Driver (Assignment)
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Tugaskan driver ke kendaraan operasional serta kelola hak kepemilikan dan status penugasan aktif
              </p>
            </div>
          </div>

          {/* Action Area & Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Assign Driver Button */}
            <button onClick={() => { setForm({ driver_id: '', vehicle_id: '', notes: '' }); setModal(true); }} style={{
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
              + Assign Driver
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
            { label: 'Total Penugasan', val: totalAssignments, icon: <FaLink size={20} /> },
            { label: 'Penugasan Aktif', val: activeAssignments, icon: <FaUserCheck size={20} /> },
            { label: 'Driver Tersedia', val: availableDrivers, icon: <FaUserCheck size={20} /> },
            { label: 'Kendaraan Tersedia', val: availableVehicles, icon: <FaCar size={20} /> },
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

      <DataTable columns={columns} data={data} loading={loading} onAdd={() => { setForm({ driver_id: '', vehicle_id: '', notes: '' }); setModal(true); }} addLabel="Assign Driver"
        actions={row => (
          <button className="btn btn-warning btn-sm" onClick={async () => { if (confirm('Akhiri penugasan?')) { await api.put(`/driver-assignments/${row.id}`, { status: 'ended', end_date: new Date().toISOString().slice(0, 10) }); load(); } }}>End</button>
        )}
      />
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Assign Driver ke Kendaraan"
        footer={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" onClick={handleAssign} disabled={saving}>{saving ? 'Menyimpan...' : 'Assign'}</button></>}>
        <form onSubmit={handleAssign}>
          <div className="form-group"><label className="form-label">Driver *</label>
            <select className="form-select" value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))} required>
              <option value="">-- Pilih Driver --</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.employee_id}){d.status !== 'available' ? ` — ${d.status}` : ''}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Kendaraan *</label>
            <select className="form-select" value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} required>
              <option value="">-- Pilih Kendaraan --</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.nopol} - {v.merk} {v.model}{v.status !== 'available' ? ` (${v.status})` : ''}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Catatan</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </form>
      </Modal>
    </div>
  );
}
