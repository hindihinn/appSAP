import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaPlay, FaGasPump, FaCoffee, FaMapMarkerAlt, FaBoxOpen, FaSync, FaFlagCheckered } from 'react-icons/fa';

const cpTypes = {
  departure: { label: 'Keberangkatan', color: '#10b981', icon: <FaPlay size={12} />, iconText: '🚀' },
  fuel_stop: { label: 'Pengisian BBM', color: '#f59e0b', icon: <FaGasPump size={12} />, iconText: '⛽' },
  rest_stop: { label: 'Istirahat', color: '#3b82f6', icon: <FaCoffee size={12} />, iconText: '☕' },
  arrival: { label: 'Sampai Tujuan', color: '#06b6d4', icon: <FaMapMarkerAlt size={12} />, iconText: '📍' },
  unloading: { label: 'Bongkar Muat', color: '#8b5cf6', icon: <FaBoxOpen size={12} />, iconText: '📦' },
  return_departure: { label: 'Perjalanan Kembali', color: '#6b7280', icon: <FaSync size={12} />, iconText: '🔄' },
  return_arrival: { label: 'Sampai Pool (Selesai)', color: '#ef4444', icon: <FaFlagCheckered size={12} />, iconText: '🏁' },
};

export default function TripMonitoring() {
  const [trips, setTrips] = useState([]);
  const [allTrips, setAllTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [activeCp, setActiveCp] = useState(null);

  const depKm = detail?.departure_km || detail?.checkpoints?.find(cp => cp.type === 'departure')?.km_reading;
  const arrKm = detail?.arrival_km || detail?.checkpoints?.find(cp => cp.type === 'unloading' || cp.type === 'arrival')?.km_reading;
  const retKm = detail?.return_km || detail?.checkpoints?.find(cp => cp.type === 'return_arrival')?.km_reading;
  
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ vehicle_id: '', driver_id: '', notes: '', action: 'approve' });
  const [error, setError] = useState('');

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        api.get('/trips/status/monitoring'),
        api.get('/trips'),
        api.get('/vehicles'),
        api.get('/drivers/available')
      ]);
      setTrips(results[0].status === 'fulfilled' ? results[0].value.data.data : []);
      setAllTrips(results[1].status === 'fulfilled' ? results[1].value.data.data : []);
      setVehicles(results[2].status === 'fulfilled' ? results[2].value.data.data : []);
      setDrivers(results[3].status === 'fulfilled' ? results[3].value.data.data : []);
    } catch (err) {
      setError('Gagal memuat data monitoring');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // 1. Initialize Map ONLY when detail changes (modal opens)
  useEffect(() => {
    let map;
    const timer = setTimeout(() => {
      if (!detail || !detail.checkpoints || detail.checkpoints.length === 0 || !mapRef.current) return;

      const validCps = detail.checkpoints.filter(cp => cp.latitude && cp.longitude);
      if (validCps.length === 0) return;

      const center = [validCps[0].latitude, validCps[0].longitude];
      
      // Clean up previous map if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = {};

      map = L.map(mapRef.current).setView(center, 12);
      mapInstanceRef.current = map;

      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google'
      }).addTo(map);

      const pathCoordinates = [];

      validCps.forEach((cp) => {
        const coords = [cp.latitude, cp.longitude];
        pathCoordinates.push(coords);

        const typeInfo = cpTypes[cp.type] || { label: cp.type, color: '#6b7280', iconText: '📍' };
        const isActive = activeCp?.id === cp.id;
        const color = isActive ? '#06b6d4' : typeInfo.color;
        const scale = isActive ? 'scale(1.2)' : 'scale(1)';
        const shadow = isActive ? 'drop-shadow(0 0 8px rgba(6,182,212,0.6))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `
            <div style="transform: ${scale}; filter: ${shadow}; transition: all 0.2s; width: 36px; height: 46px; transform-origin: bottom center;">
              <svg viewBox="0 0 32 42" width="36" height="46">
                <path d="M16 0C7.16 0 0 7.16 0 16.3C0 27.5 13.6 39.6 15.3 41.1C15.7 41.4 16.3 41.4 16.7 41.1C18.4 39.6 32 27.5 32 16.3C32 7.16 24.84 0 16 0Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
                <circle cx="16" cy="16" r="10" fill="#ffffff" />
                <text x="16" y="20.5" font-size="12" text-anchor="middle" fill="${color}">${typeInfo.iconText}</text>
              </svg>
            </div>
          `,
          iconSize: [36, 46],
          iconAnchor: [18, 46]
        });

        const marker = L.marker(coords, { icon: customIcon }).addTo(map);
        markersRef.current[cp.id] = marker;

        marker.on('click', () => {
          setActiveCp(cp);
        });
      });

      if (validCps.length > 1) {
        let passedUnloading = false;
        for (let i = 0; i < validCps.length - 1; i++) {
          const cpStart = validCps[i];
          const cpEnd = validCps[i+1];
          if (cpStart.type === 'unloading' || cpStart.type === 'return_departure' || cpStart.type === 'return_arrival') {
            passedUnloading = true;
          }
          const segmentColor = passedUnloading ? '#eab308' : '#3b82f6';
          L.polyline([[cpStart.latitude, cpStart.longitude], [cpEnd.latitude, cpEnd.longitude]], {
            color: segmentColor,
            weight: 4,
            opacity: 0.8
          }).addTo(map);
        }
      }

      const bounds = L.latLngBounds(pathCoordinates);
      map.fitBounds(bounds, { padding: [30, 30] });

      // Invalidate map layout size once fully loaded in DOM
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);

    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = {};
    };
  }, [detail]);

  // 2. Dynamically update marker colors and pan to active pin when activeCp changes
  useEffect(() => {
    if (!mapInstanceRef.current || !detail || !detail.checkpoints) return;

    detail.checkpoints.forEach((cp) => {
      const marker = markersRef.current[cp.id];
      if (!marker) return;

      const typeInfo = cpTypes[cp.type] || { label: cp.type, color: '#6b7280', iconText: '📍' };
      const isActive = activeCp?.id === cp.id;
      const color = isActive ? '#06b6d4' : typeInfo.color;
      const scale = isActive ? 'scale(1.2)' : 'scale(1)';
      const shadow = isActive ? 'drop-shadow(0 0 8px rgba(6,182,212,0.6))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="transform: ${scale}; filter: ${shadow}; transition: all 0.2s; width: 36px; height: 46px; transform-origin: bottom center;">
            <svg viewBox="0 0 32 42" width="36" height="46">
              <path d="M16 0C7.16 0 0 7.16 0 16.3C0 27.5 13.6 39.6 15.3 41.1C15.7 41.4 16.3 41.4 16.7 41.1C18.4 39.6 32 27.5 32 16.3C32 7.16 24.84 0 16 0Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
              <circle cx="16" cy="16" r="10" fill="#ffffff" />
              <text x="16" y="20.5" font-size="12" text-anchor="middle" fill="${color}">${typeInfo.iconText}</text>
            </svg>
          </div>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 46]
      });

      marker.setIcon(customIcon);
      if (isActive && cp.latitude && cp.longitude) {
        mapInstanceRef.current.panTo([cp.latitude, cp.longitude]);
      }
    });
  }, [activeCp, detail]);

  const openDetail = async (id) => {
    try {
      const [tripRes, assignRes] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/trips/${id}/assignments`).catch(() => ({ data: { data: [] } }))
      ]);
      const tripData = tripRes.data.data;
      setDetail(tripData);
      setAssignments(assignRes.data.data || []);
      if (tripData?.checkpoints?.length > 0) {
        setActiveCp(tripData.checkpoints[0]);
      } else {
        setActiveCp(null);
      }
    } catch { 
      alert('Gagal memuat detail'); 
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setAssignments([]);
    setActiveCp(null);
  };

  const handleAdminReview = async (tripId) => {
    try {
      await api.put(`/trips/${tripId}/admin-review`, {
        vehicle_id: reviewForm.vehicle_id, driver_id: reviewForm.driver_id,
        admin_notes: reviewForm.notes, action: reviewForm.action
      });
      setReviewModal(null); load();
    } catch { alert('Gagal melakukan review'); }
  };

  const handleHrgaReview = async (tripId) => {
    try {
      await api.put(`/trips/${tripId}/hrga-review`, {
        vehicle_id: reviewForm.vehicle_id || undefined, driver_id: reviewForm.driver_id || undefined,
        hrga_notes: reviewForm.notes, action: reviewForm.action
      });
      setReviewModal(null); load();
    } catch { alert('Gagal melakukan review'); }
  };

  const pendingTrips = allTrips.filter(t => ['pending', 'admin_review', 'hrga_review'].includes(t.status));
  const activeTrips = trips;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Monitoring Dinas</h1>
          <p className="page-subtitle">Pantau status order dan perjalanan dinas aktif</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon yellow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div><div className="stat-value">{pendingTrips.length}</div><div className="stat-label">Order Pending</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
          </div>
          <div><div className="stat-value">{activeTrips.length}</div><div className="stat-label">Dinas Aktif</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div><div className="stat-value">{allTrips.filter(t => t.status === 'completed').length}</div><div className="stat-label">Selesai</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <div><div className="stat-value">{allTrips.filter(t => t.status === 'rejected').length}</div><div className="stat-label">Ditolak</div></div>
        </div>
      </div>

      {/* Pending Orders */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3 className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" style={{ marginRight: 8 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            Order Perlu Di Review ({pendingTrips.length})
          </h3>
        </div>
        {pendingTrips.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" style={{ marginBottom: 12, opacity: 0.4 }}><polyline points="20 6 9 17 4 12" /></svg>
            <p>Semua order sudah diproses</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>No Order</th><th>Pemohon</th><th>Tujuan</th><th>Tgl Berangkat</th><th>Kendaraan</th><th>Driver</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pendingTrips.map(t => (
                  <tr key={t.id}>
                    <td><span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{t.order_number}</span></td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.requester_name}</td>
                    <td>{t.destination}</td>
                    <td>{t.planned_departure ? new Date(t.planned_departure).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td>{t.nopol || <span className="badge badge-warning" style={{ fontSize: 10 }}>Belum dipilih</span>}</td>
                    <td>{t.driver_name || <span className="badge badge-warning" style={{ fontSize: 10 }}>Belum dipilih</span>}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      {t.status === 'pending' && (
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          setReviewModal({ ...t, reviewType: 'admin' });
                          setReviewForm({ vehicle_id: '', driver_id: '', notes: '', action: 'approve' });
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><polyline points="20 6 9 17 4 12" /></svg>
                          Review
                        </button>
                      )}
                      {t.status === 'admin_review' && (
                        <button className="btn btn-purple btn-sm" onClick={() => {
                          setReviewModal({ ...t, reviewType: 'hrga' });
                          setReviewForm({ vehicle_id: t.vehicle_id || '', driver_id: t.driver_id || '', notes: '', action: 'approve' });
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                          Review HRGA
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Trips */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3 className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ marginRight: 8 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
            Dinas Aktif ({activeTrips.length})
          </h3>
        </div>
        {activeTrips.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" style={{ marginBottom: 12, opacity: 0.3 }}><path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
            <h3 style={{ marginBottom: 4 }}>Tidak ada dinas aktif</h3>
            <p>Semua kendaraan dalam keadaan standby</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 16, padding: 4 }}>
            {activeTrips.map(t => (
              <div key={t.id} className="trip-card" onClick={() => openDetail(t.id)} style={{ cursor: 'pointer' }}>
                <div className="trip-card-header">
                  <span className="trip-order-num">{t.spd_number || t.order_number}</span>
                  <StatusBadge status={t.status} />
                </div>
                <h4 className="trip-destination">{t.destination}</h4>
                <div className="trip-meta">
                  <div className="trip-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                    <span>{t.nopol || '-'}</span>
                  </div>
                  <div className="trip-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    <span>{t.driver_name || '-'}</span>
                  </div>
                  <div className="trip-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span>Checkpoint: {t.checkpoint_count || 0}</span>
                  </div>
                  <div className="trip-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                    <span>Event: {t.event_count || 0}</span>
                  </div>
                </div>
                {t.driver_phone && (
                  <div className="trip-phone">📞 {t.driver_phone}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!detail} onClose={closeDetail} title={`Detail Perjalanan Dinas — ${detail?.spd_number || detail?.order_number || ''}`} size="xl">
        {detail && (
          <div>
            {/* Header: No SPD + No Order + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>No SPD</div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>
                  {detail.spd_number || '—'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>No Order</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  {detail.order_number}
                </div>
              </div>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Status</div>
                <StatusBadge status={detail.status} />
              </div>
            </div>

            {/* Info Pemohon & Dinas */}
            <div style={{ background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                📋 Detail Perjalanan Dinas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  ['Pemohon', detail.requester_name],
                  ['Perusahaan', detail.company_name || '-'],
                  ['Unit Kerja', detail.unit_name || '-'],
                  ['Tujuan', detail.destination],
                  ['Keperluan', detail.purpose || '-'],
                  ['Tgl Rencana Berangkat', detail.planned_departure ? new Date(detail.planned_departure).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'],
                  ['Tgl Rencana Kembali', detail.planned_return ? new Date(detail.planned_return).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'],
                  ['Jarak Tempuh', detail.total_distance ? `${detail.total_distance.toLocaleString()} km` : '—'],
                  ['KM Berangkat', depKm ? `${depKm.toLocaleString()} km` : '-'],
                  ['KM Bongkar', arrKm ? `${arrKm.toLocaleString()} km` : '-'],
                  ['KM Pulang', retKm ? `${retKm.toLocaleString()} km` : '-'],
                  ['Tgl Diajukan', detail.created_at ? new Date(detail.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'],
                ].map(([label, val], i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{val}</div>
                  </div>
                ))}
              </div>
              {detail.items_description && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Barang / Keterangan</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{detail.items_description}</div>
                </div>
              )}
              {detail.admin_notes && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Catatan Admin</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{detail.admin_notes}"</div>
                </div>
              )}
              {detail.hrga_notes && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Catatan HRGA</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{detail.hrga_notes}"</div>
                </div>
              )}
            </div>

            {/* Assignment Table */}
            {assignments.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                  Assignment Driver & Kendaraan
                </h4>
                <div className="table-container" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Driver</th>
                        <th>Kendaraan</th>
                        <th>Unit</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a, i) => (
                        <tr key={a.id}>
                          <td>
                            <span style={{ width: 22, height: 22, background: i === 0 ? 'var(--accent)' : 'var(--bg-secondary)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? '#fff' : 'var(--text-muted)' }}>
                              {a.sequence_no}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.driver_name}</div>
                            {a.employee_id && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {a.employee_id}</div>}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{a.nopol}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.merk} {a.model}</div>
                          </td>
                          <td style={{ fontSize: 13 }}>{a.unit_name || '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{a.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stepper Status Perjalanan */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 12, 
              padding: '20px 40px', marginBottom: 24, position: 'relative'
            }}>
              <div style={{
                position: 'absolute', left: '80px', right: '80px', top: '50%', height: '3px',
                background: 'var(--border)', transform: 'translateY(-50%)', zIndex: 1
              }} />
              <div style={{
                position: 'absolute', left: '80px', top: '50%', height: '3px',
                width: detail.status === 'completed' ? 'calc(100% - 160px)' : detail.status === 'in_progress' ? '50%' : '0%',
                background: 'var(--accent)', transform: 'translateY(-50%)', zIndex: 2, transition: 'all 0.4s'
              }} />

              {[
                { status: 'approved', label: 'Dinas Dibuat', icon: '📝' },
                { status: 'in_progress', label: 'Perjalanan Aktif', icon: '🚚' },
                { status: 'completed', label: 'Dinas Selesai', icon: '🏁' }
              ].map((step, idx) => {
                const isDone = (detail.status === 'completed') || 
                               (detail.status === 'in_progress' && idx <= 1) || 
                               (detail.status === 'approved' && idx === 0);
                const isActive = (detail.status === 'approved' && idx === 0) ||
                                 (detail.status === 'in_progress' && idx === 1) ||
                                 (detail.status === 'completed' && idx === 2);
                
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, position: 'relative' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isActive ? 'var(--accent)' : isDone ? 'rgba(6,182,212,0.1)' : 'var(--bg-secondary)',
                      color: isActive ? '#fff' : isDone ? 'var(--accent)' : 'var(--text-muted)',
                      border: `3px solid ${isActive || isDone ? 'var(--accent)' : 'var(--border)'}`,
                      fontSize: 18, transition: 'all 0.3s',
                      boxShadow: isActive ? '0 0 12px rgba(6,182,212,0.5)' : 'none'
                    }}>
                      {step.icon}
                    </div>
                    <span style={{
                      marginTop: 8, fontSize: 12, fontWeight: isActive || isDone ? 600 : 500,
                      color: isActive ? 'var(--accent)' : isDone ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}>{step.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Interactive Timeline & Map Tracking */}
            {detail.checkpoints?.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Tracking Checkpoint & Rute Peta
                </h4>

                {/* Leaflet Map Section */}
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <div ref={mapRef} style={{ height: '350px', borderRadius: '12px', border: '1px solid var(--border)', zIndex: 1 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
                  
                  {/* Left Column: Stepper Timeline list */}
                  <div style={{ borderRight: '1px solid var(--border)', paddingRight: 16, maxHeight: '480px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      {(() => {
                        const unloadingIdx = detail.checkpoints.findIndex(c => c.type === 'unloading' || c.type === 'return_departure' || c.type === 'return_arrival');
                        return detail.checkpoints.map((cp, idx) => {
                          const typeInfo = cpTypes[cp.type] || { label: cp.type, color: '#6b7280', iconText: '📍' };
                          const isActive = activeCp?.id === cp.id;
                          const isLast = idx === detail.checkpoints.length - 1;
                          const segmentColor = (unloadingIdx !== -1 && idx >= unloadingIdx) ? '#eab308' : '#3b82f6';

                          return (
                            <div 
                              key={cp.id}
                              onClick={() => setActiveCp(cp)}
                              style={{
                                display: 'flex', gap: 14, marginBottom: 20, cursor: 'pointer', position: 'relative', zIndex: 2,
                                padding: '8px 12px', borderRadius: 8, transition: 'all 0.2s',
                                background: isActive ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                                border: isActive ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid transparent',
                              }}
                            >
                              {/* Connector Line to Next Item */}
                              {!isLast && (
                                <div style={{
                                  position: 'absolute',
                                  left: '27px',
                                  top: '24px',
                                  bottom: '-40px',
                                  width: '2px',
                                  background: segmentColor,
                                  zIndex: 1,
                                  pointerEvents: 'none'
                                }} />
                              )}

                              <div style={{
                                width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isActive ? 'var(--accent)' : 'var(--bg-secondary)',
                                color: isActive ? '#fff' : 'var(--text-secondary)',
                                border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                                boxShadow: isActive ? '0 0 10px rgba(6,182,212,0.4)' : 'none',
                                flexShrink: 0, transition: 'all 0.2s',
                                position: 'relative', zIndex: 2
                              }}>
                              {typeInfo.icon}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                                {typeInfo.label}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(cp.recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • KM {cp.km_reading?.toLocaleString()}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {cp.address || 'Tanpa alamat'}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                  {/* Right Column: Checkpoint Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                    {activeCp ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              background: cpTypes[activeCp.type]?.color || '#6b7280', color: '#fff',
                              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4
                            }}>
                              {activeCp.type === 'departure' && <FaPlay size={10} />}
                              {activeCp.type === 'fuel_stop' && <FaGasPump size={10} />}
                              {activeCp.type === 'rest_stop' && <FaCoffee size={10} />}
                              {activeCp.type === 'arrival' && <FaMapMarkerAlt size={10} />}
                              {activeCp.type === 'unloading' && <FaBoxOpen size={10} />}
                              {activeCp.type === 'return_departure' && <FaSync size={10} />}
                              {activeCp.type === 'return_arrival' && <FaFlagCheckered size={10} />}
                              {cpTypes[activeCp.type]?.label || activeCp.type}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Checkpoint #{activeCp.sequence_number}
                            </span>
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                            {new Date(activeCp.recorded_at).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>KM Reading</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{activeCp.km_reading?.toLocaleString()} km</div>
                          </div>

                          <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Akurasi GPS</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{activeCp.location_accuracy ? `±${activeCp.location_accuracy}m` : '—'}</div>
                          </div>

                          {activeCp.fuel_liters && (
                            <div style={{ background: 'rgba(234,179,8,0.08)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(234,179,8,0.2)' }}>
                              <div style={{ fontSize: 10, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Volume BBM</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning)' }}>{activeCp.fuel_liters} Liter</div>
                            </div>
                          )}

                          {activeCp.fuel_cost && (
                            <div style={{ background: 'rgba(234,179,8,0.08)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(234,179,8,0.2)' }}>
                              <div style={{ fontSize: 10, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Biaya BBM</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning)' }}>Rp {activeCp.fuel_cost.toLocaleString('id-ID')}</div>
                            </div>
                          )}
                        </div>

                        {/* Location Address & LatLong */}
                        <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lokasi & Koordinat</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{activeCp.address || '—'}</div>
                          {activeCp.latitude && (
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)', marginTop: 2 }}>
                              📌 Lat: {activeCp.latitude}, Long: {activeCp.longitude}
                            </div>
                          )}
                        </div>

                        {/* Note */}
                        {activeCp.notes && (
                          <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Catatan Driver</div>
                            <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{activeCp.notes}"</div>
                          </div>
                        )}

                        {/* Photos */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lampiran Foto</div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {[
                              { key: 'photo_km', label: 'Foto KM', url: activeCp.photo_km },
                              { key: 'photo_nota', label: 'Foto Nota', url: activeCp.photo_nota },
                              { key: 'photo_pump', label: 'Dispenser', url: activeCp.photo_pump },
                              { key: 'photo_activity', label: 'Aktivitas', url: activeCp.photo_activity },
                            ].filter(p => p.url).map(photo => (
                              <div key={photo.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-secondary)', padding: 6, borderRadius: 8, border: '1px solid var(--border)' }}>
                                <a href={`http://localhost:5000${photo.url}`} target="_blank" rel="noreferrer" style={{ display: 'block', position: 'relative' }}>
                                  <img 
                                    src={`http://localhost:5000${photo.url}`} 
                                    alt={photo.label} 
                                    style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6 }} 
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = photo.url;
                                    }}
                                  />
                                </a>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{photo.label}</span>
                              </div>
                            ))}
                            {![activeCp.photo_km, activeCp.photo_nota, activeCp.photo_pump, activeCp.photo_activity].some(Boolean) && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>Tidak ada lampiran foto</div>
                            )}
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', padding: 32, textAlign: 'center' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginBottom: 12, opacity: 0.4 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        <h4 style={{ marginBottom: 4 }}>Pilih Checkpoint</h4>
                        <p style={{ fontSize: 12 }}>Klik salah satu checkpoint di sebelah kiri atau klik pin pada peta untuk melihat detail perjalanannya</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
                Belum ada data checkpoint perjalanan untuk dinas ini.
              </div>
            )}

            {/* Event List */}
            {detail.events?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                  Kejadian di Perjalanan
                </h4>
                {detail.events.map(ev => (
                  <div key={ev.id} className="alert alert-warning" style={{ marginBottom: 8, fontSize: 13 }}>
                    <strong>{ev.title}</strong> — {ev.description} <StatusBadge status={ev.severity} />
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal isOpen={!!reviewModal} onClose={() => setReviewModal(null)}
        title={`Review Order ${reviewModal?.order_number || ''}`}
        footer={<>
          <button className="btn btn-danger btn-sm" onClick={() => {
            setReviewForm(f => ({ ...f, action: 'reject' }));
            setTimeout(() => reviewModal.reviewType === 'admin' ? handleAdminReview(reviewModal.id) : handleHrgaReview(reviewModal.id), 0);
          }}>✕ Tolak</button>
          <button className="btn btn-primary" onClick={() => reviewModal.reviewType === 'admin' ? handleAdminReview(reviewModal.id) : handleHrgaReview(reviewModal.id)}>
            ✓ Setujui & Lanjutkan
          </button>
        </>}>
        {reviewModal && (
          <div>
            <div style={{ padding: 16, background: 'rgba(6,182,212,0.08)', borderRadius: 10, border: '1px solid rgba(6,182,212,0.2)', marginBottom: 20, fontSize: 14 }}>
              <strong>{reviewModal.destination}</strong>
              {reviewModal.purpose && <span style={{ color: 'var(--text-muted)' }}> — {reviewModal.purpose}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Pilih Kendaraan *</label>
              <select className="form-select" value={reviewForm.vehicle_id} onChange={e => setReviewForm(f => ({ ...f, vehicle_id: e.target.value }))}>
                <option value="">-- Pilih Kendaraan --</option>
                {vehicles.filter(v => v.status === 'available').map(v => (
                  <option key={v.id} value={v.id}>{v.nopol} — {v.merk} {v.model} ({v.capacity_ton}T)</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Pilih Driver</label>
              <select className="form-select" value={reviewForm.driver_id} onChange={e => setReviewForm(f => ({ ...f, driver_id: e.target.value }))}>
                <option value="">-- Auto dari Assignment --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} {d.assigned_vehicle ? `(${d.assigned_vehicle})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Catatan Review</label>
              <textarea className="form-textarea" value={reviewForm.notes} onChange={e => setReviewForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan opsional..." />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
