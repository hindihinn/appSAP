import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { getImageUrl } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FaPlay, 
  FaGasPump, 
  FaCoffee, 
  FaMapMarkerAlt, 
  FaBoxOpen, 
  FaSync, 
  FaFlagCheckered,
  FaClock,
  FaTruck,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaHistory,
  FaSyncAlt,
  FaSearch,
  FaInbox,
  FaEye,
  FaTimes,
  FaUser,
  FaBuilding,
  FaCalendarAlt,
  FaClipboardList,
  FaStickyNote,
  FaPlus
} from 'react-icons/fa';

const cpTypes = {
  departure:        { label: 'Keberangkatan',      color: '#10b981', icon: <FaPlay size={10}/> },
  fuel_stop:        { label: 'Pengisian BBM',       color: '#f59e0b', icon: <FaGasPump size={10}/> },
  rest_stop:        { label: 'Istirahat',           color: '#3b82f6', icon: <FaCoffee size={10}/> },
  arrival:          { label: 'Sampai Tujuan',       color: '#06b6d4', icon: <FaMapMarkerAlt size={10}/> },
  unloading:        { label: 'Bongkar Muat',        color: '#8b5cf6', icon: <FaBoxOpen size={10}/> },
  extend_unloading: { label: 'Extend Pengantaran',   color: '#d946ef', icon: <FaBoxOpen size={10}/> },
  return_departure: { label: 'Perjalanan Kembali',  color: '#6b7280', icon: <FaSync size={10}/> },
  return_arrival:   { label: 'Sampai Pool (Selesai)',color:'#ef4444', icon: <FaFlagCheckered size={10}/> },
  incident:         { label: 'Kendala Kejadian',    color: '#ef4444', icon: <FaExclamationTriangle size={10}/> },
};

const getCpSvgPath = (type, fill) => {
  switch (type) {
    case 'departure':
      return `<path d="M3.5 2v8l6-4z" fill="${fill}"/>`;
    case 'fuel_stop':
      return `<path d="M9.5 5H9V2.5c0-.8-.7-1.5-1.5-1.5h-3C3.7 1 3 1.7 3 2.5v7h6V6.5h.5c.3 0 .5-.2.5-.5V5z M5 8.5H4v-1.5h1v1.5z M8 4.5H4v-2h4v2z" fill="${fill}"/>`;
    case 'rest_stop':
      return `<path d="M1.5 4h8v4.5c0 1.4-1.1 2.5-2.5 2.5h-3C2.6 11 1.5 9.9 1.5 8.5V4z M9.5 5.5h1c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5h-1v-3z" fill="${fill}"/>`;
    case 'arrival':
      return `<path d="M6 0.5C3.5 0.5 1.5 2.5 1.5 5c0 3.2 4.5 6.5 4.5 6.5s4.5-3.3 4.5-6.5c0-2.5-2-4.5-4.5-4.5z M6 7C4.9 7 4 6.1 4 5s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="${fill}"/>`;
    case 'unloading':
    case 'extend_unloading':
      return `<path d="M1.5 2.5l4.5-2 4.5 2v6.5l-4.5 2.5-4.5-2.5V2.5z" fill="${fill}"/>`;
    case 'return_departure':
      return `<path d="M6 1V3C8.2 3 10 4.8 10 7s-1.8 4-4 4-4-1.8-4-4h1.5C3.5 8.4 4.6 9.5 6 9.5s2.5-1.1 2.5-2.5-1.1-2.5-2.5-2.5V6.5L3.5 4.2 6 2v-1z" fill="${fill}"/>`;
    case 'return_arrival':
      return `<path d="M2 1v10h1.5V7h5.5l.5-1.5h2V1.5H9L8.5 3H3.5V1H2z" fill="${fill}"/>`;
    case 'incident':
      return `<path d="M6 1L1 11h10L6 1zm.7 8.5H5.3v-1h1.4v1zm0-1.8H5.3v-3.2h1.4v3.2z" fill="${fill}"/>`;
    default:
      return `<circle cx="6" cy="6" r="4" fill="${fill}"/>`;
  }
};

export default function TripMonitoring() {
  const { user } = useAuth();
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

  const [showHistory, setShowHistory] = useState(false);
  const [histSearch, setHistSearch] = useState('');
  const [histStatus, setHistStatus] = useState('all');
  const [histDate, setHistDate] = useState('');

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extending, setExtending] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [units, setUnits] = useState([]);
  const [extendForm, setExtendForm] = useState({ company_id: '', unit_id: '', destination: '', purpose: '', notes: '' });
  const [extendError, setExtendError] = useState('');

  const [activeTab, setActiveTab] = useState('monitoring');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDayIndex };
  };

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
        api.get('/vehicles?exclude_photos=true'),
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
                <g transform="translate(10, 10)">${getCpSvgPath(cp.type, color)}</g>
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

      const typeInfo = cpTypes[cp.type] || { label: cp.type, color: '#6b7280' };
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
              <g transform="translate(10, 10)">${getCpSvgPath(cp.type, color)}</g>
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

  const openExtend = async () => {
    setExtendForm({ company_id: '', unit_id: '', destination: '', purpose: '', notes: '' });
    setExtendError('');
    setShowExtendModal(true);
    if (companies.length === 0 || units.length === 0) {
      try {
        const [compRes, unitRes] = await Promise.all([
          api.get('/organizations/companies'),
          api.get('/organizations/units')
        ]);
        setCompanies(compRes.data.data || []);
        setUnits(unitRes.data.data || []);
      } catch (err) {
        setExtendError('Gagal memuat daftar perusahaan / unit');
      }
    }
  };

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    setExtendError('');
    if (!extendForm.company_id || !extendForm.unit_id || !extendForm.destination) {
      setExtendError('Perusahaan, unit, dan tujuan wajib diisi');
      return;
    }
    setExtending(true);
    try {
      await api.put(`/trips/${detail.id}/extend`, extendForm);
      setShowExtendModal(false);
      // Reload details and list
      openDetail(detail.id);
      load();
    } catch (err) {
      setExtendError(err.response?.data?.message || 'Gagal memperpanjang perjalanan');
    } finally {
      setExtending(false);
    }
  };

  const handleAdminPreReview = async (tripId, action, notes) => {
    try {
      await api.put(`/trips/${tripId}/admin-pre-review`, {
        admin_notes: notes,
        action,
      });
      setReviewModal(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal melakukan review');
    }
  };

  const pendingTrips = allTrips.filter(t => ['pending', 'admin_review'].includes(t.status));
  const activeTrips = trips;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: 'var(--gradient-trips)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 28,
        position: 'relative', overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-70, left:'38%', width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:50, height:50, borderRadius:14,
              background:'rgba(255,255,255,0.15)', backdropFilter:'blur(10px)',
              border:'1px solid rgba(255,255,255,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}><FaMapMarkerAlt size={22} style={{ color: '#fff' }} /></div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:0, letterSpacing:'-0.5px' }}>
                Monitoring Dinas
              </h1>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:'4px 0 0' }}>
                Pantau status order dan perjalanan dinas aktif secara real-time
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* View Tab Switcher */}
            <div style={{ 
              display: 'flex', 
              background: 'rgba(255,255,255,0.12)', 
              borderRadius: 10, 
              padding: 3, 
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)'
            }}>
              <button 
                onClick={() => setActiveTab('monitoring')} 
                style={{
                  background: activeTab === 'monitoring' ? '#fff' : 'transparent',
                  color: activeTab === 'monitoring' ? 'var(--primary)' : '#fff',
                  border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, transition: 'all 0.2s'
                }}
              >
                Live Monitoring
              </button>
              <button 
                onClick={() => setActiveTab('calendar')} 
                style={{
                  background: activeTab === 'calendar' ? '#fff' : 'transparent',
                  color: activeTab === 'calendar' ? 'var(--primary)' : '#fff',
                  border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, transition: 'all 0.2s'
                }}
              >
                Kalender Dinas
              </button>
            </div>

            <button onClick={() => {
              setHistSearch('');
              setHistStatus('all');
              setHistDate('');
              setShowHistory(true);
            }} style={{
              display:'flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)',
              color:'#fff', padding:'9px 18px', borderRadius:10, cursor:'pointer',
              fontSize:13, fontWeight:600, backdropFilter:'blur(10px)', transition:'all 0.2s',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.3)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'}
            >
              <FaHistory size={14} />
              History Order
            </button>
            <button onClick={load} style={{
              display:'flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)',
              color:'#fff', padding:'9px 18px', borderRadius:10, cursor:'pointer',
              fontSize:13, fontWeight:600, backdropFilter:'blur(10px)', transition:'all 0.2s',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            >
              <FaSyncAlt size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:22 }}>
          {[
            { label:'Order Pending', val:pendingTrips.length, color:'#ffffff', icon:<FaClock size={20} /> },
            { label:'Dinas Aktif',   val:activeTrips.length,  color:'#ffffff', icon:<FaTruck size={20} /> },
            { label:'Selesai',       val:allTrips.filter(t => t.status === 'completed').length, color:'#ffffff', icon:<FaCheckCircle size={20} /> },
            { label:'Ditolak',       val:allTrips.filter(t => t.status === 'rejected').length,  color:'#ffffff', icon:<FaTimesCircle size={20} /> },
          ].map((s,i)=>(
            <div key={i} style={{
              background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.15)',
              borderRadius:12, padding:'14px 16px', backdropFilter:'blur(10px)',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ display:'flex', alignItems:'center', color: '#fff' }}>{s.icon}</span>
                <span style={{ fontSize:24, fontWeight:800, color: '#fff' }}>
                  {s.val}
                </span>
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-danger"><FaExclamationTriangle size={13} style={{ marginRight: 6 }} />{error}</div>}

      {activeTab === 'monitoring' && (
        <>
          {/* Pending Orders — Order masuk dari gudang */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ background:'linear-gradient(90deg,rgba(59,130,246,0.03),transparent)' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center' }}>
                <FaClock size={16} style={{ color: 'var(--warning)', marginRight: 8 }} />
                Order Masuk dari Gudang ({pendingTrips.length})
              </h3>
            </div>
            {pendingTrips.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <FaInbox size={40} style={{ marginBottom: 12, opacity: 0.4, color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 13 }}>Semua order sudah diproses</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr style={{ background:'rgba(59,130,246,0.03)', borderBottom:'1px solid var(--border)' }}>
                      <th>No Order</th><th>Pemohon</th><th>Perusahaan / Unit</th><th>Tujuan</th><th>Tgl Berangkat</th><th>Status</th><th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTrips.map((t, idx) => (
                      <tr key={t.id} style={{ borderBottom:'1px solid rgba(59,130,246,0.05)', background: idx%2===0 ? 'transparent' : 'rgba(59,130,246,0.01)' }}>
                        <td><span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{t.order_number}</span></td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.requester_name}</td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{t.company_name || '-'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.unit_name || ''}</div>
                        </td>
                        <td style={{ maxWidth: 180 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.destination}</div>
                          {t.purpose && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.purpose.slice(0, 40)}{t.purpose.length > 40 ? '...' : ''}</div>}
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 500 }}>{t.planned_departure ? new Date(t.planned_departure).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>
                          {t.status === 'pending' && (user?.role_name === 'super_admin' || user?.role_name === 'ga') && (
                            <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => {
                              setReviewModal({ ...t, reviewType: 'admin_pre' });
                              setReviewForm({ notes: '', action: 'approve' });
                            }}>
                              <FaCheckCircle size={12} />
                              Review
                            </button>
                          )}
                          {t.status === 'admin_review' && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: 'rgba(22,163,74,0.08)', color: 'var(--success)',
                              border: '1px solid rgba(22,163,74,0.25)', borderRadius: 8,
                              padding: '4px 10px', fontSize: 12, fontWeight: 600
                            }}>
                              <FaCheckCircle size={12} />
                              Siap Create Dinas
                            </span>
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
            <div className="card-header" style={{ background:'linear-gradient(90deg,rgba(59,130,246,0.03),transparent)' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center' }}>
                <FaTruck size={16} style={{ color: 'var(--accent)', marginRight: 8 }} />
                Dinas Aktif ({activeTrips.length})
              </h3>
            </div>
            {activeTrips.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                <FaInbox size={48} style={{ marginBottom: 12, opacity: 0.3, color: 'var(--text-muted)' }} />
                <h3 style={{ marginBottom: 4, color: 'var(--text-secondary)' }}>Tidak ada dinas aktif</h3>
                <p style={{ fontSize: 13 }}>Semua kendaraan dalam keadaan standby</p>
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
                        <FaTruck size={14} style={{ color: 'var(--accent)' }} />
                        <span>{t.nopol || '-'}</span>
                      </div>
                      <div className="trip-meta-item">
                        <FaUser size={14} style={{ color: 'var(--accent)' }} />
                        <span>{t.driver_name || '-'}</span>
                      </div>
                      <div className="trip-meta-item">
                        <FaMapMarkerAlt size={14} style={{ color: 'var(--accent)' }} />
                        <span>Checkpoint: {t.checkpoint_count || 0}</span>
                      </div>
                      <div className="trip-meta-item">
                        <FaExclamationTriangle size={14} style={{ color: 'var(--warning)' }} />
                        <span>Event: {t.event_count || 0}</span>
                      </div>
                    </div>
                    {t.driver_phone && (
                      <div className="trip-phone" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                        <span>📞</span> <span>{t.driver_phone}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 20 }}>
          {/* Left Side: Calendar Grid */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
                <FaCalendarAlt size={16} style={{ color: 'var(--accent)', marginRight: 8 }} />
                Kalender Jadwal & Dinas
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ minWidth: 32, padding: '4px 8px' }}
                >
                  &lt;
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>
                  {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ minWidth: 32, padding: '4px 8px' }}
                >
                  &gt;
                </button>
              </div>
            </div>

            {/* Calendar Grid Container */}
            <div>
              {/* Day Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8, textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: 12 }}>
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, idx) => (
                  <div key={idx} style={{ padding: 4 }}>{day}</div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {/* Pad the front empty days */}
                {Array.from({ length: getDaysInMonth(currentDate).firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} style={{ minHeight: 80, background: 'var(--bg-glass)', opacity: 0.15, borderRadius: 8 }} />
                ))}

                {/* Actual Days of the Month */}
                {Array.from({ length: getDaysInMonth(currentDate).daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const cellDateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
                  
                  // Find all trips matching this date
                  const tripsOnDate = allTrips.filter(t => {
                    if (!t.planned_departure) return false;
                    return t.planned_departure.split('T')[0] === cellDateStr && t.status !== 'rejected' && t.status !== 'cancelled';
                  });

                  const isSelected = selectedDate && 
                    selectedDate.getDate() === day && 
                    selectedDate.getMonth() === currentDate.getMonth() && 
                    selectedDate.getFullYear() === currentDate.getFullYear();

                  const isToday = new Date().getDate() === day && 
                    new Date().getMonth() === currentDate.getMonth() && 
                    new Date().getFullYear() === currentDate.getFullYear();

                  return (
                    <div 
                      key={`day-${day}`}
                      onClick={() => setSelectedDate(cellDate)}
                      style={{
                        minHeight: 80,
                        padding: 8,
                        borderRadius: 10,
                        border: isSelected 
                          ? '2px solid var(--accent)' 
                          : isToday 
                            ? '1px dashed var(--accent)'
                            : '1px solid var(--border)',
                        background: isSelected 
                          ? 'rgba(59,130,246,0.05)' 
                          : 'var(--bg-glass)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.borderColor = isToday ? 'var(--accent)' : 'var(--border)';
                      }}
                    >
                      <div style={{ 
                        fontSize: 12, 
                        fontWeight: 700, 
                        textAlign: 'right', 
                        color: isToday ? 'var(--accent)' : 'var(--text-primary)' 
                      }}>
                        {day}
                      </div>

                      {tripsOnDate.length > 0 && (
                        <div style={{
                          background: 'rgba(59,130,246,0.1)',
                          border: '1px solid rgba(59,130,246,0.25)',
                          borderRadius: 6,
                          padding: '2px 4px',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          marginTop: 8
                        }}>
                          <FaUser size={8} />
                          <span>{tripsOnDate.length} Driver</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Side: Details list */}
          <div className="card" style={{ padding: 20 }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <FaClipboardList size={16} style={{ color: 'var(--accent)', marginRight: 8 }} />
              Daftar Dinas - {selectedDate ? selectedDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
            </h3>

            {/* List Table */}
            {(() => {
              const selectedDateStr = selectedDate 
                ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                : '';

              const activeTripsForSelectedDate = allTrips.filter(t => {
                if (!t.planned_departure) return false;
                return t.planned_departure.split('T')[0] === selectedDateStr && t.status !== 'rejected' && t.status !== 'cancelled';
              });

              if (activeTripsForSelectedDate.length === 0) {
                return (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <FaInbox size={40} style={{ marginBottom: 12, opacity: 0.4, color: 'var(--text-muted)' }} />
                    <p style={{ fontSize: 13 }}>Tidak ada jadwal dinas pada tanggal ini</p>
                  </div>
                );
              }

              return (
                <div style={{ overflowY: 'auto', maxHeight: 460 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(59,130,246,0.03)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: 10, fontSize: 12 }}>Order / Unit</th>
                        <th style={{ padding: 10, fontSize: 12 }}>Driver</th>
                        <th style={{ padding: 10, fontSize: 12 }}>Tujuan</th>
                        <th style={{ padding: 10, fontSize: 12 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTripsForSelectedDate.map(t => (
                        <tr 
                          key={t.id} 
                          onClick={() => openDetail(t.id)}
                          style={{ 
                            borderBottom: '1px solid rgba(59,130,246,0.05)', 
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
                              {t.order_number}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FaTruck size={10} />
                              {t.nopol || 'Belum ditugaskan'}
                            </div>
                          </td>
                          <td style={{ padding: 10, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t.driver_name || 'Belum ditugaskan'}
                          </td>
                          <td style={{ padding: 10, fontSize: 12, color: 'var(--text-secondary)', maxWidth: 120, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {t.destination}
                          </td>
                          <td style={{ padding: 10 }}>
                            <StatusBadge status={t.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!detail} onClose={closeDetail} title={`Detail Perjalanan Dinas — ${detail?.spd_number || detail?.order_number || ''}`} size="xl">
        {detail && (
          <div>
            {/* Header: No SPD + No Order + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>No DN / SPD</div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>
                  {detail.spd_number || '—'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>No Order</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  {detail.order_number}
                </div>
              </div>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>Status</div>
                <StatusBadge status={detail.status} />
              </div>
            </div>

            {['approved', 'in_progress'].includes(detail.status) && !detail.is_extended && (user?.role_name === 'super_admin' || user?.role_name === 'admin_ga' || user?.role_name === 'ga') && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <button className="btn btn-warning" onClick={openExtend} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <FaPlus size={12} /> Extend Perjalanan
                </button>
              </div>
            )}

            {/* Info Pemohon & Dinas */}
            <div style={{ background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FaClipboardList size={13} style={{ color: 'var(--accent)' }} />
                <span>Detail Perjalanan Dinas</span>
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                  </div>
                ))}
              </div>
              {detail.items_description && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>Barang / Keterangan</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{detail.items_description}</div>
                </div>
              )}
              {detail.admin_notes && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>Catatan Admin GA</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{detail.admin_notes}"</div>
                </div>
              )}
              {detail.hrga_notes && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>Catatan GA</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{detail.hrga_notes}"</div>
                </div>
              )}
              {detail.is_extended === 1 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>
                    Ekstensi Perjalanan (Extended Trip)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    {[
                      ['Perusahaan Tujuan (Ext)', detail.extend_company_name || '-'],
                      ['Unit Kerja (Ext)', detail.extend_unit_name || '-'],
                      ['Tujuan Perpanjangan', detail.extend_destination],
                      ['Keperluan Perpanjangan', detail.extend_purpose || '-'],
                      ['Catatan Perpanjangan', detail.extend_notes || '-'],
                    ].map(([label, val], i) => (
                      <div key={i}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                      </div>
                    ))}
                  </div>
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
                      <tr style={{ background:'rgba(59,130,246,0.03)', borderBottom:'1px solid var(--border)' }}>
                        <th style={{ width: 40 }}>#</th>
                        <th>Driver</th>
                        <th>Kendaraan</th>
                        <th>Unit</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a, i) => (
                        <tr key={a.id} style={{ borderBottom:'1px solid rgba(59,130,246,0.05)' }}>
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
                            <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)' }}>{a.nopol}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.merk} {a.model}</div>
                          </td>
                          <td style={{ fontSize: 13, fontWeight: 500 }}>{a.unit_name || '—'}</td>
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
                background: 'linear-gradient(90deg,var(--accent),#10b981)', transform: 'translateY(-50%)', zIndex: 2, transition: 'all 0.4s'
              }} />

              {[
                { status: 'approved', label: 'Dinas Dibuat', icon: <FaStickyNote size={15} /> },
                { status: 'in_progress', label: 'Perjalanan Aktif', icon: <FaTruck size={15} /> },
                { status: 'completed', label: 'Dinas Selesai', icon: <FaFlagCheckered size={15} /> }
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
                      background: isActive ? 'linear-gradient(135deg,var(--accent),#10b981)' : isDone ? 'rgba(59,130,246,0.1)' : 'var(--bg-secondary)',
                      color: isActive ? '#fff' : isDone ? 'var(--accent)' : 'var(--text-muted)',
                      border: `3px solid ${isActive || isDone ? 'var(--accent)' : 'var(--border)'}`,
                      transition: 'all 0.3s',
                      boxShadow: isActive ? '0 0 12px rgba(59,130,246,0.4)' : 'none'
                    }}>
                      {step.icon}
                    </div>
                    <span style={{
                      marginTop: 8, fontSize: 12, fontWeight: isActive || isDone ? 700 : 500,
                      color: isActive ? 'var(--accent)' : isDone ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}>{step.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Interactive Timeline & Map Tracking */}
            {detail.checkpoints?.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                  <FaMapMarkerAlt size={16} style={{ color: 'var(--accent)' }} />
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
                          const typeInfo = cpTypes[cp.type] || { label: cp.type, color: '#6b7280' };
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
                                background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                border: isActive ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
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
                                boxShadow: isActive ? '0 0 10px rgba(59,130,246,0.3)' : 'none',
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
                              padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4
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
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{activeCp.km_reading?.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>km</span></div>
                          </div>

                          <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Akurasi GPS</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{activeCp.location_accuracy ? `±${activeCp.location_accuracy}m` : '—'}</div>
                          </div>

                          {activeCp.fuel_liters && (
                            <div style={{ background: 'rgba(234,179,8,0.08)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(234,179,8,0.2)' }}>
                              <div style={{ fontSize: 10, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Volume BBM</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>{activeCp.fuel_liters} Liter</div>
                            </div>
                          )}

                          {activeCp.fuel_cost && (
                            <div style={{ background: 'rgba(234,179,8,0.08)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(234,179,8,0.2)' }}>
                              <div style={{ fontSize: 10, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Biaya BBM</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>Rp {activeCp.fuel_cost.toLocaleString('id-ID')}</div>
                            </div>
                          )}
                        </div>

                        {/* Location Address & LatLong */}
                        <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lokasi & Koordinat</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{activeCp.address || '—'}</div>
                          {activeCp.latitude && (
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FaMapMarkerAlt size={10} />
                              <span>{activeCp.latitude}, {activeCp.longitude}</span>
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
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Lampiran Foto</div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {(() => {
                              return [
                                { key: 'photo_km', label: 'Foto KM', url: activeCp.photo_km },
                                { key: 'photo_nota', label: 'Foto Nota', url: activeCp.photo_nota },
                                { key: 'photo_pump', label: 'Dispenser', url: activeCp.photo_pump },
                                { key: 'photo_activity', label: 'Aktivitas', url: activeCp.photo_activity },
                              ].filter(p => p.url).map(photo => (
                                <div key={photo.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-secondary)', padding: 6, borderRadius: 8, border: '1px solid var(--border)' }}>
                                  <a href={getImageUrl(photo.url)} target="_blank" rel="noreferrer" style={{ display: 'block', position: 'relative' }}>
                                    <img 
                                      src={getImageUrl(photo.url)} 
                                      alt={photo.label} 
                                      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6 }} 
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = getImageUrl(photo.url);
                                      }}
                                    />
                                  </a>
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{photo.label}</span>
                                </div>
                              ));
                            })()}
                            {![activeCp.photo_km, activeCp.photo_nota, activeCp.photo_pump, activeCp.photo_activity].some(Boolean) && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>Tidak ada lampiran foto</div>
                            )}
                          </div>
                        </div>

                        {/* Extend Trip Details if checkpoint is extend_unloading */}
                        {activeCp.type === 'extend_unloading' && (
                          <div style={{ background: 'rgba(217,70,239,0.05)', border: '1.5px solid rgba(217,70,239,0.2)', padding: '14px', borderRadius: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#d946ef', letterSpacing: 0.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FaBoxOpen size={11}/> DETAIL EXTEND PERJALANAN
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {detail.extend_company_name && (
                                <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 7 }}>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>PT Tujuan</div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{detail.extend_company_name}</div>
                                </div>
                              )}
                              {detail.extend_unit_name && (
                                <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 7 }}>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Unit Tujuan</div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{detail.extend_unit_name}</div>
                                </div>
                              )}
                              {detail.extend_destination && (
                                <div style={{ gridColumn: '1 / -1', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 7 }}>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Tujuan</div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{detail.extend_destination}</div>
                                </div>
                              )}
                              {detail.extend_purpose && (
                                <div style={{ gridColumn: '1 / -1', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 7 }}>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Deskripsi</div>
                                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: '1.4' }}>{detail.extend_purpose}</div>
                                </div>
                              )}
                              {detail.extend_notes && (
                                <div style={{ gridColumn: '1 / -1', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 7 }}>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Keterangan</div>
                                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: '1.4', fontStyle: 'italic' }}>"{detail.extend_notes}"</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Event / Incident Details if checkpoint is an incident */}
                        {activeCp.type === 'incident' && (() => {
                          const incidentEvent = detail.events?.find(ev => ev.checkpoint_id === activeCp.id);
                          if (!incidentEvent) return null;
                          return (
                            <div style={{ background: 'rgba(239,68,68,0.04)', border: '1.5px solid rgba(239,68,68,0.15)', padding: '14px', borderRadius: 8, marginTop: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', letterSpacing: 0.5 }}>
                                  ⚠️ DETAIL LAPORAN KEJADIAN
                                </div>
                                <span style={{
                                  background: (incidentEvent.severity === 'critical' || incidentEvent.severity === 'high') ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                  color: (incidentEvent.severity === 'critical' || incidentEvent.severity === 'high') ? 'var(--danger)' : 'var(--warning)',
                                  padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase'
                                }}>
                                  Urgensi: {incidentEvent.severity}
                                </span>
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                {incidentEvent.title}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                {incidentEvent.description || 'Tidak ada deskripsi detail.'}
                              </div>
                            </div>
                          );
                        })()}

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
                  <FaExclamationTriangle size={15} style={{ color: 'var(--warning)' }} />
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

      {/* Review Modal — Admin Review Order (Pre-Create Dinas) */}
      <Modal isOpen={!!reviewModal} onClose={() => setReviewModal(null)}
        title={`Review Order dari Gudang — ${reviewModal?.order_number || ''}`}
        footer={(user?.role_name === 'super_admin' || user?.role_name === 'ga') ? (
          <>
            <button className="btn btn-danger btn-sm" onClick={() =>
              handleAdminPreReview(reviewModal.id, 'reject', reviewForm.notes)
            }>✕ Tolak Order</button>
            <button className="btn btn-primary" onClick={() =>
              handleAdminPreReview(reviewModal.id, 'approve', reviewForm.notes)
            }>
              ✓ Setujui → Masuk Create Dinas
            </button>
          </>
        ) : null}>
        {reviewModal && (
          <div>
            <div style={{ padding: 16, background: 'rgba(59,130,246,0.08)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Detail Order</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{reviewModal.destination}</div>
              {reviewModal.purpose && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{reviewModal.purpose}</div>}
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>📅 {reviewModal.planned_departure ? new Date(reviewModal.planned_departure).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</span>
                <span>🏢 {reviewModal.company_name || '-'} / {reviewModal.unit_name || '-'}</span>
                <span>👤 {reviewModal.requester_name}</span>
              </div>
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, marginBottom: 16, fontSize: 12, color: 'var(--warning)' }}>
              ℹ️ Setelah disetujui, order akan masuk ke halaman <strong>Create Dinas</strong> untuk assign driver &amp; kendaraan.
            </div>
            <div className="form-group">
              <label className="form-label">Catatan Admin (opsional)</label>
              <textarea className="form-textarea" rows={3} value={reviewForm.notes}
                onChange={e => setReviewForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan untuk disampaikan ke Create Dinas..." />
            </div>
          </div>
        )}
      </Modal>

      {/* History Order Modal */}
      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="History Seluruh Order Perjalanan" size="xl">
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <FaSearch size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Cari No Order, SPD, pemohon, tujuan..." 
                value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px 8px 36px',
                  background: 'var(--bg-primary)', border: '1.5px solid var(--border)',
                  borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                }}
              />
            </div>
            {/* Status Filter */}
            <div style={{ minWidth: '150px' }}>
              <select
                value={histStatus}
                onChange={e => setHistStatus(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--bg-primary)', border: '1.5px solid var(--border)',
                  borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                }}
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="admin_review">Review Admin GA</option>
                <option value="waiting_hrga">Menunggu GA</option>
                <option value="approved">Disetujui</option>
                <option value="in_progress">Aktif / Perjalanan</option>
                <option value="completed">Selesai</option>
                <option value="rejected">Ditolak</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
            {/* Date Filter */}
            <div style={{ minWidth: '150px' }}>
              <input 
                type="date" 
                value={histDate}
                onChange={e => setHistDate(e.target.value)}
                style={{
                  width: '100%', padding: '7px 12px',
                  background: 'var(--bg-primary)', border: '1.5px solid var(--border)',
                  borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                }}
              />
            </div>
            {/* Reset Button */}
            {(histSearch || histStatus !== 'all' || histDate) && (
              <button 
                onClick={() => { setHistSearch(''); setHistStatus('all'); setHistDate(''); }} 
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <FaTimes size={12} /> Reset Filter
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="table-container" style={{ margin: 0, maxHeight: '420px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr style={{ background: 'rgba(59,130,246,0.03)', borderBottom: '1px solid var(--border)' }}>
                  <th>No Order / SPD</th>
                  <th>Pemohon</th>
                  <th>Tujuan</th>
                  <th>Tgl Berangkat</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {allTrips.filter(t => {
                  const matchesSearch = !histSearch || 
                    t.order_number?.toLowerCase().includes(histSearch.toLowerCase()) ||
                    t.spd_number?.toLowerCase().includes(histSearch.toLowerCase()) ||
                    t.requester_name?.toLowerCase().includes(histSearch.toLowerCase()) ||
                    t.destination?.toLowerCase().includes(histSearch.toLowerCase());
                  const matchesStatus = histStatus === 'all' || t.status === histStatus;
                  const matchesDate = !histDate || (t.planned_departure && t.planned_departure.startsWith(histDate));
                  return matchesSearch && matchesStatus && matchesDate;
                }).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <FaInbox size={32} style={{ opacity: 0.5 }} />
                        <span>Tidak ada data history order</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allTrips.filter(t => {
                    const matchesSearch = !histSearch || 
                      t.order_number?.toLowerCase().includes(histSearch.toLowerCase()) ||
                      t.spd_number?.toLowerCase().includes(histSearch.toLowerCase()) ||
                      t.requester_name?.toLowerCase().includes(histSearch.toLowerCase()) ||
                      t.destination?.toLowerCase().includes(histSearch.toLowerCase());
                    const matchesStatus = histStatus === 'all' || t.status === histStatus;
                    const matchesDate = !histDate || (t.planned_departure && t.planned_departure.startsWith(histDate));
                    return matchesSearch && matchesStatus && matchesDate;
                  }).map((t, idx) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)', background: idx%2===0 ? 'transparent' : 'rgba(59,130,246,0.01)' }}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent)', fontFamily: 'monospace' }}>
                          {t.order_number}
                        </div>
                        {t.spd_number && (
                          <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: 2 }}>
                            {t.spd_number}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.requester_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.company_name}</div>
                      </td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{t.destination}</td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{t.planned_departure ? new Date(t.planned_departure).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => { setShowHistory(false); openDetail(t.id); }}>
                          <FaEye size={13} /> Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Extend Perjalanan Modal */}
      <Modal 
        isOpen={showExtendModal} 
        onClose={() => setShowExtendModal(false)} 
        title={`Extend Perjalanan Dinas — ${detail?.spd_number || detail?.order_number || ''}`}
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowExtendModal(false)} disabled={extending}>Batal</button>
            <button className="btn btn-warning" onClick={handleExtendSubmit} disabled={extending} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {extending ? (
                <>
                  <div className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#000' }} />
                  Menyimpan...
                </>
              ) : (
                <>
                  <FaPlus size={12} /> Extend Dinas
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleExtendSubmit}>
          {extendError && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <FaExclamationTriangle size={13} style={{ marginRight: 6 }} />
              {extendError}
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Perusahaan Tujuan (PT) *</label>
            <select
              className="form-select"
              value={extendForm.company_id}
              onChange={e => setExtendForm({ ...extendForm, company_id: e.target.value, unit_id: '' })}
              required
            >
              <option value="">-- Pilih Perusahaan --</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Unit Kerja *</label>
            <select
              className="form-select"
              value={extendForm.unit_id}
              onChange={e => setExtendForm({ ...extendForm, unit_id: e.target.value })}
              required
              disabled={!extendForm.company_id}
            >
              <option value="">-- Pilih Unit --</option>
              {units.filter(u => String(u.company_id) === String(extendForm.company_id)).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tujuan Perpanjangan *</label>
            <input
              type="text"
              className="form-input"
              value={extendForm.destination}
              onChange={e => setExtendForm({ ...extendForm, destination: e.target.value })}
              placeholder="Masukkan tujuan extend..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Deskripsi / Keperluan (Opsional)</label>
            <textarea
              className="form-textarea"
              value={extendForm.purpose}
              onChange={e => setExtendForm({ ...extendForm, purpose: e.target.value })}
              placeholder="Deskripsi keperluan extend..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Keterangan / Catatan (Opsional)</label>
            <textarea
              className="form-textarea"
              value={extendForm.notes}
              onChange={e => setExtendForm({ ...extendForm, notes: e.target.value })}
              placeholder="Keterangan tambahan..."
              rows={3}
            />
          </div>
        </form>
      </Modal>

    </div>
  );
}
