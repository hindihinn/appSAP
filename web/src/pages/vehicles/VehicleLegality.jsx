import { useEffect, useState } from 'react';
import { FaTimesCircle, FaExclamationTriangle, FaFileAlt, FaEdit, FaTrashAlt, FaCheckCircle, FaClock, FaSyncAlt } from 'react-icons/fa';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';

const INIT = { vehicle_id: '', type: 'stnk', document_number: '', issued_date: '', expiry_date: '', reminder_days: 30, notes: '' };
const TYPES = { stnk: 'STNK', kir: 'KIR', pajak_tahunan: 'Pajak Tahunan', asuransi: 'Asuransi', izin_trayek: 'Izin Trayek' };
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
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && fd.append(k, v));
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
    { key: 'nopol', label: 'No. Polisi', primary: true },
    { key: 'merk', label: 'Kendaraan', render: (v, r) => `${v} ${r.model || ''}` },
    { key: 'type', label: 'Jenis Dokumen', render: v => TYPES[v] || v },
    { key: 'document_number', label: 'No. Dokumen' },
    { key: 'issued_date', label: 'Tgl Terbit', render: v => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
    {
      key: 'expiry_date', label: 'Kadaluarsa', render: v => {
        const d = daysLeft(v);
        const color = d < 0 ? 'var(--danger)' : d <= 30 ? 'var(--warning)' : 'var(--text-secondary)';
        return <span style={{ color, fontWeight: d <= 30 ? 600 : 400 }}>{new Date(v).toLocaleDateString('id-ID')} {d < 0 ? `(${Math.abs(d)} hr lalu)` : d <= 30 ? `(${d} hr lagi)` : ''}</span>;
      }
    },
    { key: 'status', label: 'Status', badge: true },
  ];

  const expired = data.filter(d => d.status === 'expired').length;
  const expiring = data.filter(d => d.status === 'expiring_soon').length;
  const active = data.filter(d => d.status === 'active').length;

  return (
    <div>
      {/* ══ HERO HEADER BANNER (DINAS THEME STYLED) ══ */}
      <div style={{
        background: 'var(--gradient-vehicles)',
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
              <FaFileAlt size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Legalitas Kendaraan
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Monitor dokumen STNK, KIR, Pajak, dan Asuransi armada operasional secara real-time
              </p>
            </div>
          </div>

          {/* Action Area & Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Status Select Filter inside header */}
            <select
              className="form-select"
              style={{
                width: 160,
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                padding: '7px 12px',
                outline: 'none',
                cursor: 'pointer'
              }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="" style={{ color: 'var(--text-primary)' }}>Semua Status</option>
              <option value="active" style={{ color: 'var(--text-primary)' }}>Aktif</option>
              <option value="expiring_soon" style={{ color: 'var(--text-primary)' }}>Segera Kadaluarsa</option>
              <option value="expired" style={{ color: 'var(--text-primary)' }}>Kadaluarsa</option>
            </select>

            {/* Add Document Button */}
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
              + Tambah Dokumen
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
            { label: 'Total Dokumen', val: data.length, icon: <FaFileAlt size={20} /> },
            { label: 'Dokumen Aktif', val: active, icon: <FaCheckCircle size={20} /> },
            { label: 'Segera Kadaluarsa', val: expiring, icon: <FaClock size={20} /> },
            { label: 'Kadaluarsa', val: expired, icon: <FaTimesCircle size={20} /> },
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

      {/* ══ CRITICAL DOCUMENTS BOARD (ATTENTION REQUIRED) ══ */}
      {data.filter(d => d.status === 'expired' || d.status === 'expiring_soon').length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaExclamationTriangle style={{ color: 'var(--danger)' }} /> Dokumen Membutuhkan Perhatian Segera
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {data.filter(d => d.status === 'expired' || d.status === 'expiring_soon').map(doc => {
              const isExpired = doc.status === 'expired';
              const daysLeft = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div key={doc.id} style={{
                  background: isExpired ? 'rgba(239, 68, 68, 0.04)' : 'rgba(245, 158, 11, 0.04)',
                  border: `1.5px dashed ${isExpired ? 'var(--danger)' : 'var(--warning)'}`,
                  borderRadius: 14, padding: 16,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: 120
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{doc.nopol}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                        background: isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color: isExpired ? 'var(--danger)' : 'var(--warning)'
                      }}>
                        {isExpired ? 'KADALUARSA' : 'SEGERA BERAKHIR'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Tipe Dokumen: <span style={{ textTransform: 'uppercase', color: 'var(--accent)' }}>{doc.type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FaCalendarAlt size={10} /> Berlaku s/d: {new Date(doc.expiry_date).toLocaleDateString('id-ID')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isExpired ? 'var(--danger)' : 'var(--warning)' }}>
                      {isExpired ? 'Sudah mati!' : `${daysLeft} hari tersisa`}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(doc)} style={{ padding: '4px 8px', fontSize: 11 }}>Perbarui</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <DataTable columns={columns} data={data} loading={loading} onAdd={openAdd} addLabel="Tambah Dokumen"
        actions={(row) => (
          <div style={{ display: 'flex', gap: 4 }}>
            {row.document_file && <a className="btn btn-ghost btn-sm" href={row.document_file} target="_blank" rel="noreferrer" title="Lihat Dokumen"><FaFileAlt size={13} /></a>}
            <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(row)}><FaEdit size={13} /></button>
            <button className="btn btn-ghost btn-sm" title="Hapus" onClick={() => handleDelete(row.id)} style={{ color: 'var(--danger)' }}><FaTrashAlt size={13} /></button>
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
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
