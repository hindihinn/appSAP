import { useEffect, useState, useRef } from 'react';
import api, { getImageUrl } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  FaWrench,
  FaMapMarkerAlt,
  FaPlay,
  FaFlagCheckered,
  FaFileInvoice,
  FaClipboardList,
  FaHistory,
  FaInfoCircle,
  FaCheckCircle,
  FaDollarSign,
  FaCalculator,
  FaShippingFast,
  FaChartLine,
  FaTags,
  FaCalendarAlt,
  FaFilter,
  FaClock,
  FaImage,
  FaSyncAlt
} from 'react-icons/fa';

const INIT = {
  vehicle_id: '',
  service_type: 'preventive',
  category: 'engine',
  description: '',
  workshop_name: '',
  mechanic_name: '',
  reported_date: '',
  km_at_service: '',
  estimated_cost: '',
  priority: 'medium',
  notes: ''
};

export default function WorkOrder() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);

  // Tabs: 'active' | 'history'
  const [activeTab, setActiveTab] = useState('active');

  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  // Tracking Modal State
  const [trackingModal, setTrackingModal] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [selectedCpType, setSelectedCpType] = useState('start_to_workshop');

  // Map refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const load = async () => {
    setLoading(true);
    try {
      const [wRes, vRes] = await Promise.all([
        api.get('/services/work-orders'),
        api.get('/vehicles')
      ]);
      setData(wRes.data.data);
      setVehicles(vRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          fd.append(k, v);
        }
      });
      await api.post('/services/work-orders', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setModal(false);
      load();
    } catch (err) {
      alert('Gagal membuat Work Order');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/services/work-orders/${id}/status`, { status });
      load();
    } catch (err) {
      alert('Gagal memperbarui status');
    }
  };

  const handleOpenTracking = async (row) => {
    setTrackingModal(row);
    setTrackingLoading(true);
    try {
      const res = await api.get(`/services/work-orders/${row.id}`);
      const woData = res.data.data;
      setTrackingData(woData);

      // Auto select the latest checkpoint type
      if (woData.checkpoints && woData.checkpoints.length > 0) {
        setSelectedCpType(woData.checkpoints[woData.checkpoints.length - 1].type);
      } else {
        setSelectedCpType('start_to_workshop');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memuat detail tracking');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Get SVG pin path depending on checkpoint type
  const getCpSvgPath = (type, fill) => {
    switch (type) {
      case 'start_to_workshop':
        return `<path d="M4 2v8l6-4z" fill="${fill}"/>`; // Play
      case 'arrive_at_workshop':
        return `<path d="M9.5 5H9V2.5c0-.8-.7-1.5-1.5-1.5h-3C3.7 1 3 1.7 3 2.5v7h6V6.5h.5c.3 0 .5-.2.5-.5V5z" fill="${fill}"/>`; // Wrench
      case 'return_to_office':
        return `<path d="M2 1v10h1.5V7h5.5l.5-1.5h2V1.5H9L8.5 3H3.5V1H2z" fill="${fill}"/>`; // Flag
      default:
        return `<circle cx="6" cy="6" r="4" fill="${fill}"/>`;
    }
  };

  // Initialize Map when trackingData changes
  useEffect(() => {
    let map;
    const timer = setTimeout(() => {
      if (!trackingData || !trackingData.checkpoints || trackingData.checkpoints.length === 0 || !mapRef.current) return;

      const validCps = trackingData.checkpoints.filter(cp => cp.latitude && cp.longitude);
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

        const color = '#3b82f6';

        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `
            <div style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); transition: all 0.2s; width: 30px; height: 40px; transform-origin: bottom center;">
              <svg viewBox="0 0 32 42" width="30" height="40">
                <path d="M16 0C7.16 0 0 7.16 0 16.3C0 27.5 13.6 39.6 15.3 41.1C15.7 41.4 16.3 41.4 16.7 41.1C18.4 39.6 32 27.5 32 16.3C32 7.16 24.84 0 16 0Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
                <circle cx="16" cy="16" r="10" fill="#ffffff" />
                <g transform="translate(10, 10) scale(0.85)">${getCpSvgPath(cp.type, color)}</g>
              </svg>
            </div>
          `,
          iconSize: [30, 40],
          iconAnchor: [15, 40]
        });

        const marker = L.marker(coords, { icon: customIcon }).addTo(map);
        markersRef.current[cp.type] = marker;

        marker.on('click', () => {
          setSelectedCpType(cp.type);
        });
      });

      // Draw polyline route path
      if (validCps.length > 1) {
        L.polyline(pathCoordinates, {
          color: 'var(--accent)',
          weight: 4,
          opacity: 0.8
        }).addTo(map);
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
  }, [trackingData]);

  // Pan map to coordinate when active selectedCpType updates
  useEffect(() => {
    if (!mapInstanceRef.current || !trackingData || !trackingData.checkpoints) return;
    const cp = trackingData.checkpoints.find(c => c.type === selectedCpType);
    if (cp && cp.latitude && cp.longitude) {
      mapInstanceRef.current.panTo([cp.latitude, cp.longitude]);
    }
  }, [selectedCpType, trackingData]);

  // Dynamic filter processing (instantly updates dashboard KPI cards & charts)
  const filteredData = data.filter(item => {
    if (selectedVehicle && Number(item.vehicle_id) !== Number(selectedVehicle)) return false;

    if (startDate) {
      const itemDate = new Date(item.created_at || item.reported_date);
      const start = new Date(startDate);
      if (itemDate < start) return false;
    }

    if (endDate) {
      const itemDate = new Date(item.created_at || item.reported_date);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }

    return true;
  });

  // Split datasets based on tabs
  const activeWOs = filteredData.filter(item => ['draft', 'pending', 'approved', 'in_progress'].includes(item.status));
  const historyWOs = filteredData.filter(item => ['completed', 'cancelled'].includes(item.status));

  // ==========================================
  // DASHBOARD CALCULATIONS (KPI & CHARTS)
  // ==========================================
  const totalWOCount = filteredData.length;

  // Total costs spent (Completed actual_cost or fallback estimated_cost)
  const totalActualCost = filteredData
    .filter(item => item.status === 'completed')
    .reduce((sum, item) => sum + Number(item.actual_cost || item.estimated_cost || 0), 0);

  const completedWOsCount = filteredData.filter(item => item.status === 'completed').length;
  const averageCost = completedWOsCount > 0 ? totalActualCost / completedWOsCount : 0;

  const activeVehiclesCount = new Set(
    filteredData
      .filter(item => ['pending', 'approved', 'in_progress'].includes(item.status))
      .map(item => item.vehicle_id)
  ).size;

  // 1. Damage Categories Frequency Map
  const categories = ['engine', 'brake', 'tire', 'electrical', 'suspension', 'body', 'ac', 'other'];
  const categoryLabels = {
    engine: 'Mesin / Transmisi',
    brake: 'Sistem Rem',
    tire: 'Masalah Ban',
    electrical: 'Kelistrikan/Lampu',
    suspension: 'Kaki-kaki/Suspensi',
    body: 'Kerusakan Body',
    ac: 'Air Conditioner',
    other: 'Lainnya'
  };

  const categoryCounts = {};
  categories.forEach(cat => { categoryCounts[cat] = 0; });
  filteredData.forEach(item => {
    const cat = item.category || 'other';
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat]++;
    } else {
      categoryCounts['other']++;
    }
  });
  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  // 2. Cost and Frequency Monthly Trend Map (Last 6 Months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
    monthlyTrend.push({ key: monthKey, label: monthLabel, cost: 0, count: 0 });
  }

  filteredData.forEach(item => {
    const itemDate = new Date(item.created_at || item.reported_date || new Date());
    const mKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthlyTrend.find(b => mKey === b.key);
    if (bucket) {
      bucket.count++;
      if (item.status === 'completed') {
        bucket.cost += Number(item.actual_cost || item.estimated_cost || 0);
      }
    }
  });

  const maxMonthCost = Math.max(...monthlyTrend.map(b => b.cost), 1000000);

  // Columns definition for Active WO
  const activeColumns = [
    { key: 'wo_number', label: 'No WO', primary: true, render: v => <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}>{v}</span> },
    { key: 'nopol', label: 'Kendaraan', render: (v, row) => <div><strong>{v}</strong><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.merk} {row.model}</div></div> },
    { key: 'service_type', label: 'Tipe', render: v => ({ preventive: 'Preventive', corrective: 'Corrective', emergency: 'Emergency', bodywork: 'Body' }[v] || v) },
    { key: 'category', label: 'Kategori', render: v => categoryLabels[v] || v },
    { key: 'description', label: 'Deskripsi', render: v => <span style={{ maxWidth: 180, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v}>{v}</span> },
    { key: 'priority', label: 'Prioritas', badge: true },
    { key: 'estimated_cost', label: 'Est. Biaya', render: v => v ? `Rp ${Number(v).toLocaleString('id-ID')}` : '-' },
    { key: 'status', label: 'Status', badge: true },
  ];

  // Columns definition for History WO
  const historyColumns = [
    { key: 'wo_number', label: 'No WO', primary: true, render: v => <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}>{v}</span> },
    { key: 'nopol', label: 'Kendaraan', render: (v, row) => <div><strong>{v}</strong><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.merk} {row.model}</div></div> },
    { key: 'service_type', label: 'Tipe', render: v => ({ preventive: 'Preventive', corrective: 'Corrective', emergency: 'Emergency', bodywork: 'Body' }[v] || v) },
    { key: 'category', label: 'Kategori', render: v => categoryLabels[v] || v },
    { key: 'estimated_cost', label: 'Estimasi Biaya', render: v => v ? `Rp ${Number(v).toLocaleString('id-ID')}` : '-' },
    { key: 'actual_cost', label: 'Biaya Riil', render: (v, row) => <span style={{ fontWeight: 600, color: 'var(--success)' }}>{v ? `Rp ${Number(v).toLocaleString('id-ID')}` : (row.estimated_cost ? `Rp ${Number(row.estimated_cost).toLocaleString('id-ID')}` : '-')}</span> },
    { key: 'completed_date', label: 'Tgl Selesai', render: v => v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-' },
    { key: 'status', label: 'Status', badge: true },
  ];

  // Stepper definition
  const stepperSteps = [
    { type: 'start_to_workshop', label: '1. Menuju Bengkel', icon: <FaPlay size={10} />, desc: 'Driver mulai perjalanan menuju bengkel' },
    { type: 'arrive_at_workshop', label: '2. Sampai di Bengkel', icon: <FaWrench size={10} />, desc: 'Driver tiba di bengkel dan perbaikan dilakukan' },
    { type: 'return_to_office', label: '3. Sampai di Kantor', icon: <FaFlagCheckered size={10} />, desc: 'Perbaikan selesai dan driver kembali ke kantor' }
  ];

  const selectedCp = trackingData?.checkpoints?.find(c => c.type === selectedCpType);

  if (loading && data.length === 0) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* ══ HERO HEADER BANNER (DINAS THEME STYLED) ══ */}
      <div style={{
        background: 'var(--gradient-services)',
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
              <FaWrench size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Monitoring Work Order
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Pantau perbaikan unit armada, estimasi biaya, dan real-time stepper driver secara real-time
              </p>
            </div>
          </div>

          {/* Action Area & Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Create WO Button */}
            <button onClick={() => { setForm(INIT); setModal(true); }} style={{
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
              + Buat WO Baru
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
            { label: 'WO Pending', val: data.filter(t => t.status === 'pending').length, icon: <FaClock size={20} /> },
            { label: 'Servis Berjalan', val: data.filter(t => t.status === 'in_progress').length, icon: <FaWrench size={20} /> },
            { label: 'Selesai', val: data.filter(t => t.status === 'completed').length, icon: <FaCheckCircle size={20} /> },
            { label: 'Total Pengeluaran', val: `Rp ${(totalActualCost / 1000000).toFixed(1)} jt`, icon: <FaDollarSign size={20} /> },
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
                <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
                  {s.val}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. FILTER PANEL */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '16px 20px',
        border: '1px solid var(--border)',
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <FaFilter size={12} style={{ color: 'var(--accent)' }} /> Filter Data Monitoring
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 100px', gap: 16, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Dari Tanggal</label>
            <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Sampai Tanggal</label>
            <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Kendaraan</label>
            <select className="form-select" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
              <option value="">Semua Kendaraan</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.nopol} - {v.merk} {v.model}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-ghost" style={{ height: 38 }} onClick={() => { setStartDate(''); setEndDate(''); setSelectedVehicle(''); }}>
            Reset
          </button>
        </div>
      </div>

      {/* 3. CHARTS GRID SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '6fr 4fr', gap: 24, marginBottom: 32 }}>
        {/* Cost Trend Graph */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
            <FaChartLine style={{ color: 'var(--accent)' }} /> Trend Biaya Perbaikan (6 Bulan Terakhir)
          </h3>
          <div style={{ position: 'relative', width: '100%', height: 180 }}>
            {/* SVG Line / Area Graph */}
            <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 500 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="45" x2="500" y2="45" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="0" y1="135" x2="500" y2="135" stroke="#f3f4f6" strokeWidth="1" />

              {/* Path generation */}
              {(() => {
                const points = monthlyTrend.map((m, idx) => {
                  const x = (idx * (500 / 5));
                  const percent = m.cost / maxMonthCost;
                  const y = 140 - (percent * 110);
                  return { x, y };
                });
                const dPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                const dArea = `${dPath} L${points[points.length - 1].x},150 L0,150 Z`;

                return (
                  <>
                    <path d={dArea} fill="url(#areaGrad)" />
                    <path d={dPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="var(--accent)" strokeWidth="2.5" />
                        <text x={p.x} y={p.y - 12} fontSize="8" fontWeight="bold" fill="var(--text-secondary)" textAnchor="middle">
                          {monthlyTrend[idx].cost > 0 ? `Rp ${(monthlyTrend[idx].cost / 1000000).toFixed(1)}M` : ''}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          {/* Axis Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px 0 10px', borderTop: '1px solid #f3f4f6' }}>
            {monthlyTrend.map((m, idx) => (
              <span key={idx} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{m.label}</span>
            ))}
          </div>
        </div>

        {/* Most Frequent Damage Categories */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
            <FaTags style={{ color: 'var(--accent)' }} /> Kategori Kerusakan Paling Sering
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categories.map(cat => {
              const count = categoryCounts[cat];
              const percent = Math.min((count / maxCategoryCount) * 100, 100);

              return (
                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{categoryLabels[cat]}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{count} Kali</span>
                  </div>
                  <div style={{ width: '100%', height: 7, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      backgroundColor: count > 0 ? 'var(--accent)' : 'transparent',
                      borderRadius: 4,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. SUB-PAGES / INTERACTIVE TABS VIEW (RESTORED TO ORIGINAL UNDERLINE STYLE BELOW BANNER) */}
      <div style={{ marginBottom: 20, borderBottom: '2px solid var(--border)', display: 'flex', gap: 8 }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '12px 24px',
            fontSize: 13,
            fontWeight: 700,
            color: activeTab === 'active' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'active' ? '3px solid var(--accent)' : '3px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none',
            marginBottom: -2
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FaClipboardList /> WO Service Aktif ({activeWOs.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 24px',
            fontSize: 13,
            fontWeight: 700,
            color: activeTab === 'history' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'history' ? '3px solid var(--accent)' : '3px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none',
            marginBottom: -2
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FaHistory /> Riwayat & Selesai ({historyWOs.length})
          </span>
        </button>
      </div>

      {/* 5. DATA TABLES RENDER */}
      {activeTab === 'active' ? (
        <DataTable
          columns={activeColumns}
          data={activeWOs}
          loading={loading}
          onAdd={() => { setForm(INIT); setModal(true); }}
          addLabel="Buat WO Baru"
          actions={row => (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-info btn-sm" onClick={() => handleOpenTracking(row)}>Tracking</button>
              {row.status === 'draft' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(row.id, 'pending')}>Submit</button>}
              {row.status === 'pending' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(row.id, 'approved')}>Approve</button>}
              {row.status === 'approved' && <button className="btn btn-warning btn-sm" onClick={() => updateStatus(row.id, 'in_progress')}>Mulai</button>}
              {row.status === 'in_progress' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(row.id, 'completed')}>Selesai</button>}
              {['draft', 'pending', 'approved', 'in_progress'].includes(row.status) && ['super_admin', 'admin_ga', 'ga'].includes(user?.role_name) && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (window.confirm('Apakah Anda yakin ingin membatalkan Work Order ini?')) {
                      updateStatus(row.id, 'cancelled');
                    }
                  }}
                >
                  Batalkan
                </button>
              )}
            </div>
          )}
        />
      ) : (
        <DataTable
          columns={historyColumns}
          data={historyWOs}
          loading={loading}
          onAdd={() => { setForm(INIT); setModal(true); }}
          addLabel="Buat WO Baru"
          actions={row => (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-info btn-sm" onClick={() => handleOpenTracking(row)}>Tracking</button>
            </div>
          )}
        />
      )}

      {/* CREATE WORK ORDER MODAL */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Buat Work Order Baru"
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan WO'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Kendaraan Unit *</label>
            <select className="form-select" value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} required>
              <option value="">-- Pilih --</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.nopol} - {v.merk} {v.model}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipe Service *</label>
              <select className="form-select" value={form.service_type} onChange={e => set('service_type', e.target.value)}>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="emergency">Emergency</option>
                <option value="bodywork">Body/Cat</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Kategori Kerusakan</label>
              <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{categoryLabels[c]}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Deskripsi Kerusakan *</label>
            <textarea className="form-textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Tulis deskripsi kendala pada unit..." required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Bengkel Rekanan</label>
              <input className="form-input" value={form.workshop_name} onChange={e => set('workshop_name', e.target.value)} placeholder="Nama Bengkel" />
            </div>
            <div className="form-group">
              <label className="form-label">Mekanik</label>
              <input className="form-input" value={form.mechanic_name} onChange={e => set('mechanic_name', e.target.value)} placeholder="Nama Mekanik" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tgl Lapor Perbaikan</label>
              <input className="form-input" type="date" value={form.reported_date} onChange={e => set('reported_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">KM Odometer Saat Masuk</label>
              <input className="form-input" type="number" value={form.km_at_service} onChange={e => set('km_at_service', e.target.value)} placeholder="KM Odometer" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Estimasi Biaya Awal (Rp)</label>
              <input className="form-input" type="number" value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)} placeholder="Contoh: 1500000" />
            </div>
            <div className="form-group">
              <label className="form-label">Prioritas Perbaikan</label>
              <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Foto Lampiran Awal (Optional)</label>
            <input className="form-input" type="file" accept="image/*" onChange={e => set('before_photo', e.target.files[0])} />
          </div>
        </form>
      </Modal>

      {/* WO STEPPER TRACKING DETAILS MODAL */}
      <Modal
        isOpen={!!trackingModal}
        onClose={() => { setTrackingModal(null); setTrackingData(null); }}
        title="Tracking WO Service Stepper"
        size="xl"
        footer={<button className="btn btn-ghost" onClick={() => { setTrackingModal(null); setTrackingData(null); }}>Tutup</button>}
      >
        {trackingLoading || !trackingData ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Memuat progress tracking...</div>
        ) : (
          <div>
            {/* Info Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>No WO</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>{trackingData.wo_number}</div>
              </div>
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Kendaraan</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{trackingData.nopol} ({trackingData.merk})</div>
              </div>
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Bengkel & Mekanik</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{trackingData.workshop_name || '—'} ({trackingData.mechanic_name || '—'})</div>
              </div>
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Biaya Riil (Actual Cost)</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
                  {trackingData.actual_cost ? `Rp ${Number(trackingData.actual_cost).toLocaleString('id-ID')}` : (trackingData.estimated_cost ? `Rp ${Number(trackingData.estimated_cost).toLocaleString('id-ID')} (Est.)` : '—')}
                </div>
              </div>
            </div>

            {/* Stepper Timeline & Detail Panel - Side by Side Dinas Style */}

            {/* Map Container */}
            {trackingData.checkpoints?.length > 0 && (
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <h4 style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaMapMarkerAlt /> Rute Peta Checkpoint Perbaikan
                </h4>
                <div ref={mapRef} style={{ height: '240px', borderRadius: '12px', border: '1px solid var(--border)', zIndex: 1 }} />
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: '320px 1fr',
              gap: 24,
              background: '#fff',
              borderRadius: 12,
              border: '1px solid var(--border)',
              padding: 20
            }}>

              {/* Left Column: Vertical Clickable Stepper Timeline */}
              <div style={{ borderRight: '1px solid var(--border)', paddingRight: 20 }}>
                <h4 style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 0.5 }}>
                  Timeline Checkpoint
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {stepperSteps.map((step, idx) => {
                    const cp = trackingData.checkpoints?.find(c => c.type === step.type);
                    const isSelected = selectedCpType === step.type;
                    const isLast = idx === stepperSteps.length - 1;

                    // Connection line color logic
                    const nextStepCp = stepperSteps[idx + 1] ? trackingData.checkpoints?.find(c => c.type === stepperSteps[idx + 1].type) : null;
                    const segmentColor = nextStepCp ? 'var(--accent)' : 'var(--border)';

                    return (
                      <div
                        key={step.type}
                        onClick={() => setSelectedCpType(step.type)}
                        style={{
                          display: 'flex',
                          gap: 14,
                          marginBottom: 20,
                          cursor: 'pointer',
                          position: 'relative',
                          zIndex: 2,
                          padding: '8px 12px',
                          borderRadius: 8,
                          transition: 'all 0.2s',
                          background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                          border: isSelected ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
                        }}
                      >
                        {/* Connector Line to Next Circle */}
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

                        {/* Timeline Circle */}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected ? 'var(--accent)' : (cp ? 'rgba(59,130,246,0.1)' : 'var(--bg-secondary)'),
                          color: isSelected ? '#fff' : (cp ? 'var(--accent)' : 'var(--text-secondary)'),
                          border: `2px solid ${isSelected ? 'var(--accent)' : (cp ? 'rgba(59,130,246,0.2)' : 'var(--border)')}`,
                          boxShadow: isSelected ? '0 0 8px rgba(59,130,246,0.35)' : 'none',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                          position: 'relative',
                          zIndex: 2
                        }}>
                          {step.icon}
                        </div>

                        {/* Step title & snippet */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                            {step.label}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {cp ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <FaCalendarAlt size={11} style={{ marginRight: 4 }} />
                                {new Date(cp.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • KM {cp.km_reading?.toLocaleString()}
                              </span>
                            ) : (
                              <span style={{ fontStyle: 'italic' }}>Belum dilewati</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Checkpoint Details Inspector */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minWidth: 0 }}>
                {selectedCp ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Header Details */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          background: 'var(--accent)',
                          color: '#fff',
                          padding: '3px 10px',
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          {selectedCpType === 'start_to_workshop' && <FaPlay size={10} />}
                          {selectedCpType === 'arrive_at_workshop' && <FaWrench size={10} />}
                          {selectedCpType === 'return_to_office' && <FaFlagCheckered size={10} />}
                          {stepperSteps.find(s => s.type === selectedCpType)?.label.substring(3)}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FaCheckCircle size={12} /> Selesai Dilewati
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>
                        <FaCalendarAlt size={12} style={{ marginRight: 4 }} />
                        {new Date(selectedCp.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* KPI Details Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>KM Odometer</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                          {selectedCp.km_reading?.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>km</span>
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Status Laporan</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>Sukses Terkirim</div>
                      </div>
                    </div>

                    {/* Location Card */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lokasi & Koordinat GPS</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCp.address || '—'}</div>
                      {selectedCp.latitude && (
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FaMapMarkerAlt size={10} />
                          <a
                            href={`https://www.google.com/maps?q=${selectedCp.latitude},${selectedCp.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textDecoration: 'underline', fontWeight: 600 }}
                          >
                            {selectedCp.latitude}, {selectedCp.longitude} (Lihat Google Maps)
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Lampiran Foto */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FaImage size={12} /> Lampiran Foto Bukti Checkpoint
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {(() => {
                          return [
                            { key: 'photo_km', label: 'Foto KM Odometer', url: selectedCp.photo_km },
                            { key: 'photo_activity', label: selectedCpType === 'arrive_at_workshop' ? 'Foto Perbaikan' : 'Foto Kondisi Unit', url: selectedCp.photo_activity },
                            { key: 'photo_invoice', label: 'Foto Nota Perbaikan', url: selectedCp.photo_invoice },
                          ].filter(p => p.url).map(photo => (
                            <div
                              key={photo.key}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                background: 'var(--bg-secondary)',
                                padding: 8,
                                borderRadius: 12,
                                border: '1px solid var(--border)',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                              }}
                            >
                              <a href={getImageUrl(photo.url)} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                                <img
                                  src={getImageUrl(photo.url)}
                                  alt={photo.label}
                                  style={{ width: 130, height: 130, objectFit: 'cover', borderRadius: 8 }}
                                  onError={(e) => { e.target.onerror = null; e.target.src = getImageUrl(photo.url); }}
                                />
                              </a>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 6 }}>{photo.label}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Not reached placeholder card
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px 20px',
                    textAlign: 'center',
                    border: '1px dashed var(--border)',
                    borderRadius: 12,
                    backgroundColor: 'var(--bg-secondary)'
                  }}>
                    <FaClock size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Langkah Belum Dilewati
                    </h4>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', maxWidth: 300 }}>
                      Driver belum menginput detail laporan checkpoint untuk langkah ({stepperSteps.find(s => s.type === selectedCpType)?.label}) ini di aplikasi HP.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
