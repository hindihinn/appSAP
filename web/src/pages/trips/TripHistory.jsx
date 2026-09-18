import { useEffect, useState } from 'react';
import api, { getImageUrl } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { FaHistory, FaClipboardList, FaCarSide, FaFlagCheckered, FaCheckCircle, FaSync } from 'react-icons/fa';

export default function TripHistory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const depKm = detail?.departure_km || detail?.checkpoints?.find(cp => cp.type === 'departure')?.km_reading;
  const arrKm = detail?.arrival_km || detail?.checkpoints?.find(cp => cp.type === 'unloading' || cp.type === 'arrival')?.km_reading;
  const retKm = detail?.return_km || detail?.checkpoints?.find(cp => cp.type === 'return_arrival')?.km_reading;

  const loadData = () => {
    setLoading(true);
    api.get('/trips')
      .then(r => { 
        setData(r.data.data || []); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { 
    loadData();
  }, []);

  const openDetail = async (id) => {
    try {
      const r = await api.get(`/trips/${id}`);
      setDetail(r.data.data);
    } catch { 
      alert('Gagal memuat detail'); 
    }
  };

  const columns = [
    { key: 'order_number', label: 'No Order', primary: true, render: v => <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}>{v}</span> },
    { key: 'requester_name', label: 'Pemohon' },
    { key: 'destination', label: 'Tujuan' },
    { key: 'driver_name', label: 'Driver' },
    { key: 'nopol', label: 'Kendaraan' },
    { key: 'planned_departure', label: 'Tgl Berangkat', render: v => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
    { key: 'status', label: 'Status', badge: true },
    { key: 'created_at', label: 'Dibuat', render: v => new Date(v).toLocaleDateString('id-ID') },
  ];

  // Calculate metrics
  const totalTrips = data.length;
  const activeTrips = data.filter(t => t.status === 'in_progress').length;
  const completedTrips = data.filter(t => t.status === 'completed').length;
  const approvedTrips = data.filter(t => t.status === 'approved').length;

  return (
    <div>
      {/* ══ HERO HEADER BANNER (TRIP HISTORY - INDIGO THEME) ══ */}
      <div style={{
        background: 'var(--gradient-trips)',
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
              <FaHistory size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                History Dinas
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Arsip dan riwayat seluruh data perjalanan dinas operasional perusahaan
              </p>
            </div>
          </div>

          {/* Action Area & Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={loadData} style={{
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
              <FaSync size={12} />
              Refresh
            </button>
          </div>
        </div>

        {/* Translucent Glassmorphic Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 22 }}>
          {[
            { label: 'Total Order', val: totalTrips, icon: <FaClipboardList size={20} /> },
            { label: 'Dinas Aktif', val: activeTrips, icon: <FaCarSide size={20} /> },
            { label: 'Selesai', val: completedTrips, icon: <FaFlagCheckered size={20} /> },
            { label: 'Disetujui', val: approvedTrips, icon: <FaCheckCircle size={20} /> },
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
                <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{s.val}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        loading={loading} 
        actions={(row) => (
          <button className="btn btn-ghost btn-sm" onClick={() => openDetail(row.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Detail
          </button>
        )}
      />

      {/* Detail Modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={`Detail Dinas ${detail?.order_number || ''}`} size="lg">
        {detail && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
              {[
                ['Tujuan', detail.destination, 'var(--text-primary)'],
                ['Status', <StatusBadge status={detail.status} />],
                ['Kendaraan', `${detail.nopol || '-'} ${detail.merk || ''}`],
                ['Driver', detail.driver_name || '-'],
                ['KM Berangkat', depKm ? `${depKm.toLocaleString()} km` : '-'],
                ['KM Sampai (Bongkar)', arrKm ? `${arrKm.toLocaleString()} km` : '-'],
                ['KM Pulang (Selesai)', retKm ? `${retKm.toLocaleString()} km` : '-'],
              ].map(([label, value, color], i) => (
                <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: color || 'var(--text-secondary)' }}>{value}</div>
                </div>
              ))}
            </div>
            {detail.checkpoints?.length > 0 && (
              <div>
                <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Checkpoint Perjalanan
                </h4>
                <div className="checkpoint-timeline">
                  {detail.checkpoints.map(cp => (
                    <div key={cp.id} className="checkpoint-item">
                      <div className="checkpoint-dot" />
                      <div className="checkpoint-content">
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{cp.type.replace(/_/g, ' ').toUpperCase()}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>KM: {cp.km_reading?.toLocaleString()} • {new Date(cp.recorded_at).toLocaleString('id-ID')}</div>
                        {cp.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{cp.notes}</div>}
                        
                        {/* Photos */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          {cp.photo_km && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <a href={getImageUrl(cp.photo_km)} target="_blank" rel="noreferrer">
                                <img src={getImageUrl(cp.photo_km)} alt="Foto KM" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                              </a>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Foto KM</span>
                            </div>
                          )}
                          {cp.photo_nota && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <a href={getImageUrl(cp.photo_nota)} target="_blank" rel="noreferrer">
                                <img src={getImageUrl(cp.photo_nota)} alt="Foto Nota" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                              </a>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Foto Nota</span>
                            </div>
                          )}
                          {cp.photo_pump && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <a href={getImageUrl(cp.photo_pump)} target="_blank" rel="noreferrer">
                                <img src={getImageUrl(cp.photo_pump)} alt="Foto Dispenser" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                              </a>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Dispenser</span>
                            </div>
                          )}
                          {cp.photo_activity && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <a href={getImageUrl(cp.photo_activity)} target="_blank" rel="noreferrer">
                                <img src={getImageUrl(cp.photo_activity)} alt="Foto Aktivitas" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                              </a>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Aktivitas</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detail.events?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Kejadian di Perjalanan
                </h4>
                {detail.events.map(ev => (
                  <div key={ev.id} className="alert alert-warning" style={{ marginBottom: 8 }}>
                    <strong>{ev.title}</strong> — {ev.description} <StatusBadge status={ev.severity} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
