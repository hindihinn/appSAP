import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { FaEdit, FaTrashAlt, FaIdCard, FaCheckCircle, FaClock, FaTimesCircle, FaSyncAlt, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';

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
    const [lRes, dRes] = await Promise.all([api.get('/driver-legality'), api.get('/drivers?exclude_photos=true')]);
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

  const activeCount = data.filter(d => d.status === 'active').length;
  const expiringCount = data.filter(d => d.status === 'expiring_soon').length;
  const expiredCount = data.filter(d => d.status === 'expired').length;

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
              <FaIdCard size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Legalitas Driver
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Monitor masa berlaku SIM driver, sertifikasi keahlian, dan riwayat medical checkup berkala
              </p>
            </div>
          </div>

          {/* Action Area & Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Add Legality Button */}
            <button onClick={() => { setForm(INIT); setEditing(null); setModal(true); }} style={{
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
            { label: 'Total Dokumen', val: data.length, icon: <FaIdCard size={20} /> },
            { label: 'Dokumen Aktif', val: activeCount, icon: <FaCheckCircle size={20} /> },
            { label: 'Segera Kadaluarsa', val: expiringCount, icon: <FaClock size={20} /> },
            { label: 'Kadaluarsa', val: expiredCount, icon: <FaTimesCircle size={20} /> },
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
      {/* ══ CRITICAL DRIVER DOCUMENTS BOARD ══ */}
      {data.filter(d => d.status === 'expired' || d.status === 'expiring_soon').length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaExclamationTriangle style={{ color: 'var(--danger)' }} /> Dokumen Driver Membutuhkan Perhatian Segera
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
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{doc.driver_name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                        background: isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color: isExpired ? 'var(--danger)' : 'var(--warning)'
                      }}>
                        {isExpired ? 'KADALUARSA' : 'SEGERA BERAKHIR'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Jenis SIM/Dok: <span style={{ textTransform: 'uppercase', color: 'var(--accent)' }}>{TYPES[doc.type] || doc.type}</span>
                    </div>
                    {doc.document_number && (
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 2 }}>
                        No: {doc.document_number}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FaCalendarAlt size={10} /> Berlaku s/d: {new Date(doc.expiry_date).toLocaleDateString('id-ID')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isExpired ? 'var(--danger)' : 'var(--warning)' }}>
                      {isExpired ? 'Sudah mati!' : `${daysLeft} hari tersisa`}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setForm({...doc}); setEditing(doc.id); setModal(true); }} style={{ padding: '4px 8px', fontSize: 11 }}>Perbarui</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <DataTable columns={columns} data={data} loading={loading} onAdd={() => { setForm(INIT); setEditing(null); setModal(true); }} addLabel="Tambah Dokumen"
        actions={row => (
          <div style={{display:'flex',gap:4}}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setForm({...row}); setEditing(row.id); setModal(true); }} title="Edit"><FaEdit size={13} /></button>
            <button className="btn btn-ghost btn-sm" onClick={async () => { if(confirm('Hapus?')) { await api.delete(`/driver-legality/${row.id}`); load(); }}} title="Hapus"><FaTrashAlt size={13} /></button>
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
