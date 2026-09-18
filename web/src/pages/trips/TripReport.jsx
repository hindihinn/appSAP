import { useEffect, useState, useRef } from 'react';
import api, { getImageUrl } from '../../services/api';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
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
  FaClipboardList,
  FaStickyNote,
  FaCarSide,
  FaChartBar,
  FaCalendarAlt,
  FaSyncAlt,
  FaRulerHorizontal,
  FaListOl,
  FaHome,
  FaCommentAlt,
  FaTruck,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInbox
} from 'react-icons/fa';

const cpTypes = {
  departure:        { label: 'Keberangkatan',      color: '#10b981', icon: <FaPlay size={10}/> },
  fuel_stop:        { label: 'Pengisian BBM',       color: '#f59e0b', icon: <FaGasPump size={10}/> },
  rest_stop:        { label: 'Istirahat',           color: '#3b82f6', icon: <FaCoffee size={10}/> },
  arrival:          { label: 'Sampai Tujuan',       color: '#06b6d4', icon: <FaMapMarkerAlt size={10}/> },
  unloading:        { label: 'Bongkar Muat',        color: '#8b5cf6', icon: <FaBoxOpen size={10}/> },
  return_departure: { label: 'Perjalanan Kembali',  color: '#6b7280', icon: <FaSync size={10}/> },
  return_arrival:   { label: 'Sampai Pool (Selesai)',color:'#ef4444', icon: <FaFlagCheckered size={10}/> },
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
      return `<path d="M1.5 2.5l4.5-2 4.5 2v6.5l-4.5 2.5-4.5-2.5V2.5z" fill="${fill}"/>`;
    case 'return_departure':
      return `<path d="M6 1V3C8.2 3 10 4.8 10 7s-1.8 4-4 4-4-1.8-4-4h1.5C3.5 8.4 4.6 9.5 6 9.5s2.5-1.1 2.5-2.5-1.1-2.5-2.5-2.5V6.5L3.5 4.2 6 2v-1z" fill="${fill}"/>`;
    case 'return_arrival':
      return `<path d="M2 1v10h1.5V7h5.5l.5-1.5h2V1.5H9L8.5 3H3.5V1H2z" fill="${fill}"/>`;
    default:
      return `<circle cx="6" cy="6" r="4" fill="${fill}"/>`;
  }
};

const REPORT_TABS = [
  { key: 'all',         label: 'Semua',          icon: <FaClipboardList size={13} />, color: 'var(--accent)', bg: 'rgba(59, 130, 246, 0.1)' },
  { key: 'approved',    label: 'Disetujui',          icon: <FaStickyNote size={13} />,   color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  { key: 'in_progress', label: 'Aktif / Perjalanan', icon: <FaCarSide size={13} />,    color: 'var(--accent)', bg: 'rgba(59, 130, 246, 0.1)' },
  { key: 'completed',   label: 'Selesai',         icon: <FaFlagCheckered size={13} />, color: 'var(--success)', bg: 'rgba(22, 163, 74, 0.1)' },
];

const fmtD = (dt) => dt ? new Date(dt).toLocaleDateString('id-ID') : '-';
const fmtLong = (dt) => dt ? new Date(dt).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' }) : '-';
const fmtFull = (dt) => dt ? new Date(dt).toLocaleString('id-ID', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-';
const fmtTime = (dt) => dt ? new Date(dt).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) : '-';

export default function TripReport() {
  const [data, setData]             = useState([]);
  const [allData, setAllData]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [detail, setDetail]         = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [activeCp, setActiveCp]     = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]         = useState('');

  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef     = useRef({});

  const depKm = detail?.departure_km || detail?.checkpoints?.find(cp => cp.type === 'departure')?.km_reading;
  const arrKm = detail?.arrival_km || detail?.checkpoints?.find(cp => cp.type === 'unloading' || cp.type === 'arrival')?.km_reading;
  const retKm = detail?.return_km || detail?.checkpoints?.find(cp => cp.type === 'return_arrival')?.km_reading;

  const loadData = () => {
    setLoading(true);
    api.get('/trips')
      .then(r => {
        const all = r.data.data || [];
        const allowed = ['approved', 'in_progress', 'completed'];
        const filtered = all.filter(t => allowed.includes(t.status));
        setAllData(filtered);
        setData(filterStatus !== 'all' ? filtered.filter(t => t.status === filterStatus) : filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filterStatus]);

  /* Map setup */
  useEffect(() => {
    let map;
    const timer = setTimeout(() => {
      if (!detail || !detail.checkpoints?.length || !mapRef.current) return;
      const valid = detail.checkpoints.filter(cp => cp.latitude && cp.longitude);
      if (!valid.length) return;

      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      markersRef.current = {};

      map = L.map(mapRef.current).setView([valid[0].latitude, valid[0].longitude], 12);
      mapInstanceRef.current = map;
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { attribution: '© Google' }).addTo(map);

      const coords = [];
      valid.forEach(cp => {
        const c = [cp.latitude, cp.longitude];
        coords.push(c);
        const ti = cpTypes[cp.type] || { color: '#6b7280' };
        const active = activeCp?.id === cp.id;
        const color = active ? '#06b6d4' : ti.color;
        const icon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="transform:${active?'scale(1.2)':'scale(1)'};filter:${active?'drop-shadow(0 0 8px rgba(6,182,212,0.7))':'drop-shadow(0 2px 5px rgba(0,0,0,0.3))'};transition:all 0.2s;width:36px;height:46px;transform-origin:bottom center">
            <svg viewBox="0 0 32 42" width="36" height="46">
              <path d="M16 0C7.16 0 0 7.16 0 16.3C0 27.5 13.6 39.6 15.3 41.1C15.7 41.4 16.3 41.4 16.7 41.1C18.4 39.6 32 27.5 32 16.3C32 7.16 24.84 0 16 0Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
              <circle cx="16" cy="16" r="10" fill="#fff"/>
              <g transform="translate(10, 10)">${getCpSvgPath(cp.type, color)}</g>
            </svg></div>`,
          iconSize: [36, 46], iconAnchor: [18, 46],
        });
        const marker = L.marker(c, { icon }).addTo(map);
        markersRef.current[cp.id] = marker;
        marker.on('click', () => setActiveCp(cp));
      });

      if (valid.length > 1) {
        let passed = false;
        for (let i = 0; i < valid.length - 1; i++) {
          if (['unloading','return_departure','return_arrival'].includes(valid[i].type)) passed = true;
          L.polyline([[valid[i].latitude, valid[i].longitude],[valid[i+1].latitude, valid[i+1].longitude]],
            { color: passed ? '#eab308' : '#3b82f6', weight: 4, opacity: 0.8 }).addTo(map);
        }
      }
      map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
    }, 200);
    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      markersRef.current = {};
    };
  }, [detail]);

  /* Update markers on activeCp change */
  useEffect(() => {
    if (!mapInstanceRef.current || !detail?.checkpoints) return;
    detail.checkpoints.forEach(cp => {
      const marker = markersRef.current[cp.id];
      if (!marker) return;
      const ti = cpTypes[cp.type] || { color: '#6b7280' };
      const active = activeCp?.id === cp.id;
      const color = active ? '#06b6d4' : ti.color;
      marker.setIcon(L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="transform:${active?'scale(1.2)':'scale(1)'};filter:${active?'drop-shadow(0 0 8px rgba(6,182,212,0.7))':'drop-shadow(0 2px 5px rgba(0,0,0,0.3))'};transition:all 0.2s;width:36px;height:46px;transform-origin:bottom center">
          <svg viewBox="0 0 32 42" width="36" height="46">
            <path d="M16 0C7.16 0 0 7.16 0 16.3C0 27.5 13.6 39.6 15.3 41.1C15.7 41.4 16.3 41.4 16.7 41.1C18.4 39.6 32 27.5 32 16.3C32 7.16 24.84 0 16 0Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
            <circle cx="16" cy="16" r="10" fill="#fff"/>
            <g transform="translate(10, 10)">${getCpSvgPath(cp.type, color)}</g>
          </svg></div>`,
        iconSize: [36, 46], iconAnchor: [18, 46],
      }));
      if (active && cp.latitude) mapInstanceRef.current.panTo([cp.latitude, cp.longitude]);
    });
  }, [activeCp, detail]);

  const openDetail = async (id) => {
    try {
      const [tripRes, assignRes] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/trips/${id}/assignments`).catch(() => ({ data: { data: [] } })),
      ]);
      const td = tripRes.data.data;
      setDetail(td);
      setAssignments(assignRes.data.data || []);
      setActiveCp(td?.checkpoints?.length ? td.checkpoints[0] : null);
    } catch { alert('Gagal memuat detail'); }
  };

  const closeDetail = () => { setDetail(null); setAssignments([]); setActiveCp(null); };

  const countOf = (s) => allData.filter(t => t.status === s).length;

  const displayed = data.filter(t =>
    !search ||
    t.spd_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.requester_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase())
  );

  /* ─────────────── RENDER ─────────────── */
  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: 'var(--gradient-trips)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 28,
        position: 'relative', overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-80, left:'35%', width:280, height:280, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:50, height:50, borderRadius:14,
              background:'rgba(255,255,255,0.15)', backdropFilter:'blur(10px)',
              border:'1px solid rgba(255,255,255,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}><FaChartBar size={22} style={{ color: '#fff' }} /></div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:0, letterSpacing:'-0.5px' }}>
                Report Dinas
              </h1>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:'4px 0 0' }}>
                Laporan dan riwayat seluruh perjalanan dinas
              </p>
            </div>
          </div>
          <button onClick={loadData} style={{
            display:'flex', alignItems:'center', gap:8,
            background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)',
            color:'#fff', padding:'9px 18px', borderRadius:10, cursor:'pointer',
            fontSize:13, fontWeight:600, backdropFilter:'blur(10px)', transition:'all 0.2s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:22 }}>
          {[
            { label:'Total Dinas',    val:allData.length,         color:'#ffffff', icon:<FaClipboardList size={20} /> },
            { label:'Dinas Aktif',    val:countOf('in_progress'), color:'#ffffff', icon:<FaCarSide size={20} /> },
            { label:'Selesai',        val:countOf('completed'),   color:'#ffffff', icon:<FaFlagCheckered size={20} /> },
            { label:'Disetujui',      val:countOf('approved'),    color:'#ffffff', icon:<FaCheckCircle size={20} /> },
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

      {/* ══ FILTER PILLS ══ */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {REPORT_TABS.map(tab => {
          const active = filterStatus === tab.key;
          const cnt = tab.key === 'all' ? allData.length : countOf(tab.key);
          return (
            <button key={tab.key} onClick={()=>setFilterStatus(tab.key)} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'8px 18px', borderRadius:20, cursor:'pointer', fontSize:13, fontWeight:600,
              transition:'all 0.2s',
              border:`1.5px solid ${active ? tab.color : 'var(--border)'}`,
              background: active ? tab.bg : 'var(--bg-secondary)',
              color: active ? tab.color : 'var(--text-secondary)',
              boxShadow: active ? `0 4px 14px ${tab.color}30` : 'none',
              transform: active ? 'translateY(-1px)' : 'none',
            }}>
              <span>{tab.icon}</span>
              {tab.label}
              <span style={{
                fontSize:10, fontWeight:700, minWidth:18, height:18,
                background: active ? tab.color : 'var(--bg-primary)',
                color: active ? '#fff' : 'var(--text-muted)',
                borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 4px',
              }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* ══ TABLE CARD ══ */}
      <div style={{
        background:'var(--bg-secondary)', borderRadius:16,
        border:'1px solid var(--border)', overflow:'hidden',
        boxShadow:'0 4px 24px rgba(0,0,0,0.04)',
      }}>
        {/* Card header */}
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexWrap:'wrap', gap:12,
          background:'linear-gradient(90deg,rgba(59,130,246,0.03),transparent)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:9,
              background:'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(22,163,74,0.15))',
              display:'flex', alignItems:'center', justifycontent:'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>Laporan Perjalanan Dinas</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{displayed.length} data ditemukan</div>
            </div>
          </div>
          <div style={{ position:'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
              style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input style={{
              width:270, padding:'8px 12px 8px 34px',
              background:'var(--bg-primary)', border:'1.5px solid var(--border)',
              borderRadius:10, color:'var(--text-primary)', fontSize:13, outline:'none',
            }}
              placeholder="Cari No SPD, order, pemohon..."
              value={search} onChange={e=>setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding:60, textAlign:'center' }}>
            <div style={{
              width:40, height:40, borderRadius:'50%', margin:'0 auto 14px',
              border:'3px solid var(--border)', borderTopColor:'var(--accent)',
              animation:'spin 0.8s linear infinite',
            }}/>
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>Memuat data...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding:'60px 24px', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12, color: 'var(--text-muted)' }}><FaInbox size={48} /></div>
            <h3 style={{ color:'var(--text-primary)', marginBottom:6 }}>Tidak Ada Data</h3>
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>Belum ada laporan dinas untuk filter yang dipilih</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(59,130,246,0.03)', borderBottom:'1px solid var(--border)' }}>
                  {['No SPD','No Order','Pemohon','Tujuan','Driver / Kendaraan','Tgl Berangkat','Jarak','Status','Aksi'].map((h,i)=>(
                    <th key={i} style={{
                      padding:'11px 14px', textAlign:'left', fontSize:10.5, fontWeight:700,
                      color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.8, whiteSpace:'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((t,idx)=>(
                  <tr key={t.id}
                    style={{ borderBottom:'1px solid rgba(59,130,246,0.05)', transition:'background 0.15s',
                      background: idx%2===0 ? 'transparent' : 'rgba(59,130,246,0.01)' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(59,130,246,0.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'transparent':'rgba(59,130,246,0.01)'}
                  >
                    <td style={{ padding:'12px 14px' }}>
                      {t.spd_number
                        ? <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:12, color:'var(--accent)', background:'rgba(59,130,246,0.08)', padding:'3px 8px', borderRadius:6 }}>{t.spd_number}</span>
                        : <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ fontFamily:'monospace', fontWeight:600, fontSize:11, color:'var(--text-secondary)', background:'var(--bg-primary)', padding:'2px 7px', borderRadius:5 }}>
                        {t.order_number}
                      </span>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{
                          width:30, height:30, borderRadius:'50%', flexShrink:0,
                          background:'linear-gradient(135deg,var(--accent),#10b981)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, fontWeight:800, color:'#fff',
                        }}>{(t.requester_name||'U').charAt(0).toUpperCase()}</div>
                        <span style={{ fontWeight:600, fontSize:13 }}>{t.requester_name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ maxWidth:150, fontWeight:500, fontSize:13 }}>{t.destination}</div>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      {t.driver_name ? (
                        <div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{t.driver_name}</div>
                          <div style={{ fontSize:11, color:'var(--accent)', fontFamily:'monospace', fontWeight:600, marginTop:2 }}>{t.nopol}</div>
                          {t.assignment_count>1 && (
                            <span style={{ fontSize:10, background:'rgba(59,130,246,0.1)', color:'var(--accent)', padding:'1px 6px', borderRadius:10, fontWeight:700, display:'inline-block', marginTop:3 }}>
                              +{t.assignment_count-1} lainnya
                            </span>
                          )}
                        </div>
                      ) : <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{fmtD(t.planned_departure)}</div>
                      {t.planned_return && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>s/d {fmtD(t.planned_return)}</div>}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      {t.total_distance ? (
                        <span style={{ fontWeight:700, fontSize:13, color:'var(--accent)' }}>
                          {t.total_distance.toLocaleString()} <span style={{ fontSize:11, fontWeight:500, color:'var(--text-muted)' }}>km</span>
                        </span>
                      ) : <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 14px' }}><StatusBadge status={t.status}/></td>
                    <td style={{ padding:'12px 14px' }}>
                      <button onClick={()=>openDetail(t.id)} style={{
                        display:'flex', alignItems:'center', gap:5,
                        padding:'7px 14px', borderRadius:8, cursor:'pointer',
                        fontSize:12, fontWeight:600, transition:'all 0.2s', whiteSpace:'nowrap',
                        background:'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(22,163,74,0.1))',
                        color:'var(--accent)', border:'1px solid rgba(59,130,246,0.2)',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ DETAIL MODAL ══ */}
      <Modal
        isOpen={!!detail} onClose={closeDetail}
        title={`Detail Laporan Dinas — ${detail?.spd_number || detail?.order_number || ''}`}
        size="xl"
        footer={
          <button onClick={closeDetail} style={{
            padding:'9px 22px', borderRadius:9, border:'1.5px solid var(--border)',
            background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontWeight:600, fontSize:13,
          }}>Tutup</button>
        }
      >
        {detail && (
          <div>
            {/* ── 3-col summary ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
              <div style={{
                background:'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(139,92,246,0.1))',
                border:'1px solid rgba(59,130,246,0.2)', borderRadius:12, padding:'14px 16px',
              }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>No SPD</div>
                <div style={{ fontSize:16, fontWeight:800, fontFamily:'monospace', color:'var(--accent)' }}>{detail.spd_number||'—'}</div>
              </div>
              <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>No Order</div>
                <div style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color:'var(--text-secondary)' }}>{detail.order_number}</div>
              </div>
              <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>Status</div>
                <StatusBadge status={detail.status}/>
              </div>
            </div>

            {/* ── Requester banner ── */}
            <div style={{
              background:'linear-gradient(135deg,rgba(59,130,246,0.05),rgba(16,185,129,0.05))',
              border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px',
              marginBottom:20, display:'flex', alignItems:'center', gap:14,
            }}>
              <div style={{
                width:46, height:46, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg,var(--accent),#10b981)',
                display:'flex', alignItems:'center', justifycontent:'center',
                fontSize:18, fontWeight:800, color:'#fff',
              }}>{(detail.requester_name||'U').charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{detail.requester_name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  {detail.company_name}{detail.unit_name ? ` · ${detail.unit_name}` : ''}
                </div>
              </div>
              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.8 }}>Diajukan</div>
                <div style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{fmtFull(detail.created_at)}</div>
              </div>
            </div>

            {/* ── Info grid ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:10, marginBottom:20 }}>
              {[
                { label:'Tujuan',             value:detail.destination,   icon:<FaMapMarkerAlt /> },
                { label:'Keperluan',           value:detail.purpose,       icon:<FaClipboardList /> },
                { label:'Tgl Rencana Berangkat',value:fmtLong(detail.planned_departure), icon:<FaCalendarAlt /> },
                { label:'Tgl Rencana Kembali', value:fmtLong(detail.planned_return),     icon:<FaSyncAlt /> },
                { label:'Jarak Tempuh',        value:detail.total_distance ? `${detail.total_distance.toLocaleString()} km` : '—', icon:<FaRulerHorizontal /> },
                { label:'KM Berangkat',        value:depKm ? `${depKm.toLocaleString()} km` : '—', icon:<FaListOl /> },
                { label:'KM Bongkar',          value:arrKm ? `${arrKm.toLocaleString()} km` : '—', icon:<FaBoxOpen /> },
                { label:'KM Pulang',           value:retKm ? `${retKm.toLocaleString()} km` : '—', icon:<FaHome /> },
              ].map(({ label, value, icon }, i) => (
                <div key={i} style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', color:'var(--accent)', fontSize:15, marginBottom:4 }}>{icon}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:3, fontWeight:600 }}>{label}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', lineHeight:1.4 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* ── Notes row ── */}
            {(detail.items_description || detail.admin_notes || detail.hrga_notes) && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10, marginBottom:20 }}>
                {detail.items_description && (
                  <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:5, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                      <FaBoxOpen size={11} style={{ color:'var(--accent)' }} />
                      <span>Barang / Keterangan</span>
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{detail.items_description}</div>
                  </div>
                )}
                {detail.admin_notes && (
                  <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, color:'#d97706', textTransform:'uppercase', letterSpacing:1, marginBottom:5, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                      <FaStickyNote size={11} />
                      <span>Catatan Admin GA</span>
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-secondary)', fontStyle:'italic' }}>"{detail.admin_notes}"</div>
                  </div>
                )}
                {detail.hrga_notes && (
                  <div style={{ background:'rgba(139,92,246,0.05)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, color:'#8b5cf6', textTransform:'uppercase', letterSpacing:1, marginBottom:5, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                      <FaCommentAlt size={11} />
                      <span>Catatan GA</span>
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-secondary)', fontStyle:'italic' }}>"{detail.hrga_notes}"</div>
                  </div>
                )}
              </div>
            )}

            {/* ── Extend Perjalanan Info ── */}
            {detail.is_extended == 1 && (
              <div style={{
                background: 'rgba(217,70,239,0.05)', border: '1.5px solid rgba(217,70,239,0.25)',
                borderRadius: 12, padding: '14px 18px', marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(217,70,239,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FaBoxOpen size={13} style={{ color: '#d946ef' }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#d946ef' }}>Extend Perjalanan</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, background: 'rgba(217,70,239,0.15)',
                    color: '#d946ef', padding: '2px 8px', borderRadius: 10,
                  }}>EXTENDED</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
                  {detail.extend_company_name && (
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>PT Tujuan</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{detail.extend_company_name}</div>
                    </div>
                  )}
                  {detail.extend_unit_name && (
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Unit Tujuan</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{detail.extend_unit_name}</div>
                    </div>
                  )}
                  {detail.extend_destination && (
                    <div style={{ gridColumn: '1 / -1', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Tujuan Extend</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{detail.extend_destination}</div>
                    </div>
                  )}
                  {detail.extend_purpose && (
                    <div style={{ gridColumn: '1 / -1', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Deskripsi</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{detail.extend_purpose}</div>
                    </div>
                  )}
                  {detail.extend_notes && (
                    <div style={{ gridColumn: '1 / -1', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Keterangan</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{detail.extend_notes}"</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Assignment cards ── */}
            {assignments.length > 0 && (
              <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                  <span style={{ fontWeight:700, fontSize:13 }}>Assignment Driver & Kendaraan</span>
                  <span style={{ fontSize:11, fontWeight:700, background:'var(--bg-secondary)', color:'var(--text-muted)', padding:'2px 8px', borderRadius:10 }}>
                    {assignments.length} penugasan
                  </span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {assignments.map((a,i)=>(
                    <div key={a.id} style={{
                      background:'var(--bg-secondary)', borderRadius:10,
                      border:`1px solid ${i===0?'rgba(59,130,246,0.3)':'var(--border)'}`,
                      padding:'12px 16px', display:'flex', alignItems:'center', gap:14,
                    }}>
                      <div style={{
                        width:28, height:28, borderRadius:'50%', flexShrink:0,
                        background:i===0?'var(--accent)':'var(--bg-primary)',
                        color:i===0?'#fff':'var(--text-muted)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800,
                      }}>{a.sequence_no}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13 }}>{a.driver_name}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
                          {a.employee_id?`ID: ${a.employee_id}`:''}
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontWeight:700, fontFamily:'monospace', fontSize:13, color:'var(--accent)' }}>{a.nopol}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{a.merk} {a.model}</div>
                      </div>
                      {a.unit_name && (
                        <span style={{ fontSize:11, fontWeight:600, background:'rgba(59,130,246,0.08)', color:'var(--accent)', padding:'3px 8px', borderRadius:6 }}>
                          {a.unit_name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Journey Status Stepper ── */}
            <div style={{
              background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:12,
              padding:'20px 40px', marginBottom:20, position:'relative',
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}>
              {/* Track line */}
              <div style={{ position:'absolute', left:80, right:80, top:'50%', height:3, background:'var(--border)', transform:'translateY(-50%)', zIndex:1 }}/>
              <div style={{
                position:'absolute', left:80, top:'50%', height:3, transform:'translateY(-50%)', zIndex:2, transition:'all 0.4s',
                background:'linear-gradient(90deg,var(--accent),#10b981)',
                width: detail.status==='completed' ? 'calc(100% - 160px)' : detail.status==='in_progress' ? '50%' : '0%',
              }}/>
              {[
                { status:'approved',    label:'Dinas Dibuat',   icon:<FaStickyNote size={15} /> },
                { status:'in_progress', label:'Perjalanan Aktif', icon:<FaTruck size={15} /> },
                { status:'completed',   label:'Dinas Selesai',  icon:<FaFlagCheckered size={15} /> },
              ].map((step,idx)=>{
                const isDone = detail.status==='completed' ||
                               (detail.status==='in_progress' && idx<=1) ||
                               (detail.status==='approved' && idx===0);
                const isActive = (detail.status==='approved' && idx===0) ||
                                 (detail.status==='in_progress' && idx===1) ||
                                 (detail.status==='completed' && idx===2);
                return (
                  <div key={idx} style={{ display:'flex', flexDirection:'column', alignItems:'center', zIndex:3, position:'relative' }}>
                    <div style={{
                      width:44, height:44, borderRadius:'50%',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                      background: isActive ? 'linear-gradient(135deg,var(--accent),#10b981)' : isDone ? 'rgba(59,130,246,0.1)' : 'var(--bg-secondary)',
                      border:`3px solid ${isActive||isDone ? 'var(--accent)' : 'var(--border)'}`,
                      boxShadow: isActive ? '0 0 14px rgba(59,130,246,0.4)' : 'none',
                      transition:'all 0.3s',
                    }}>{step.icon}</div>
                    <span style={{
                      marginTop:8, fontSize:12, fontWeight:isActive||isDone?700:500,
                      color:isActive?'var(--accent)':isDone?'var(--text-primary)':'var(--text-muted)',
                    }}>{step.label}</span>
                  </div>
                );
              })}
            </div>

            {/* ── Map + Checkpoint Timeline ── */}
            {detail.checkpoints?.length > 0 ? (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>Tracking Checkpoint & Rute Peta</span>
                </div>

                {/* Leaflet Map */}
                <div style={{ position:'relative', marginBottom:16 }}>
                  <div ref={mapRef} style={{ height:320, borderRadius:12, border:'1px solid var(--border)', zIndex:1 }}/>
                </div>

                {/* Timeline + Detail split */}
                <div style={{
                  display:'grid', gridTemplateColumns:'300px 1fr', gap:20,
                  background:'var(--bg-primary)', border:'1px solid var(--border)',
                  borderRadius:12, padding:18,
                }}>
                  {/* Left: checkpoint list */}
                  <div style={{ borderRight:'1px solid var(--border)', paddingRight:16, maxHeight:460, overflowY:'auto' }}>
                    {(() => {
                      const unloadIdx = detail.checkpoints.findIndex(c=>['unloading','return_departure','return_arrival'].includes(c.type));
                      return detail.checkpoints.map((cp,idx)=>{
                        const ti = cpTypes[cp.type] || { label:cp.type, color:'#6b7280', icon:null };
                        const active = activeCp?.id===cp.id;
                        const isLast = idx===detail.checkpoints.length-1;
                        const segColor = (unloadIdx!==-1 && idx>=unloadIdx) ? '#eab308' : '#3b82f6';
                        return (
                          <div key={cp.id} onClick={()=>setActiveCp(cp)} style={{
                            display:'flex', gap:12, marginBottom:16, cursor:'pointer',
                            position:'relative', zIndex:2,
                            padding:'8px 10px', borderRadius:8, transition:'all 0.15s',
                            background: active ? 'rgba(59,130,246,0.08)' : 'transparent',
                            border: active ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
                          }}>
                            {!isLast && (
                              <div style={{
                                position:'absolute', left:22, top:28, bottom:-28,
                                width:2, background:segColor, zIndex:1, pointerEvents:'none',
                              }}/>
                            )}
                            <div style={{
                              width:28, height:28, borderRadius:'50%', flexShrink:0,
                              background: active ? 'var(--accent)' : 'var(--bg-secondary)',
                              color: active ? '#fff' : 'var(--text-secondary)',
                              border:`2px solid ${active?'var(--accent)':'var(--border)'}`,
                              boxShadow: active ? '0 0 8px rgba(6,182,212,0.4)' : 'none',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              position:'relative', zIndex:2, transition:'all 0.2s',
                            }}>{ti.icon}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:600, color:active?'var(--accent)':'var(--text-primary)' }}>{ti.label}</div>
                              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
                                {fmtTime(cp.recorded_at)} · KM {cp.km_reading?.toLocaleString()}
                              </div>
                              <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {cp.address || 'Tanpa alamat'}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Right: checkpoint detail */}
                  <div>
                    {activeCp ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                        {/* Header */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border)', paddingBottom:12 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{
                              background:cpTypes[activeCp.type]?.color||'#6b7280', color:'#fff',
                              padding:'3px 10px', borderRadius:5, fontSize:11, fontWeight:700,
                              textTransform:'uppercase', display:'inline-flex', alignItems:'center', gap:4,
                            }}>
                              {cpTypes[activeCp.type]?.icon}
                              {cpTypes[activeCp.type]?.label||activeCp.type}
                            </span>
                            <span style={{ fontSize:12, color:'var(--text-muted)' }}>CP #{activeCp.sequence_number}</span>
                          </div>
                          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{fmtFull(activeCp.recorded_at)}</span>
                        </div>

                        {/* KM + accuracy grid */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                          <div style={{ background:'var(--bg-secondary)', padding:'10px 14px', borderRadius:8 }}>
                            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 }}>KM Reading</div>
                            <div style={{ fontSize:15, fontWeight:700, color:'var(--accent)' }}>
                              {activeCp.km_reading?.toLocaleString()} <span style={{ fontSize:11, fontWeight:500, color:'var(--text-muted)' }}>km</span>
                            </div>
                          </div>
                          <div style={{ background:'var(--bg-secondary)', padding:'10px 14px', borderRadius:8 }}>
                            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 }}>Akurasi GPS</div>
                            <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>
                              {activeCp.location_accuracy ? `±${activeCp.location_accuracy}m` : '—'}
                            </div>
                          </div>
                          {activeCp.fuel_liters && (
                            <div style={{ background:'rgba(234,179,8,0.07)', padding:'10px 14px', borderRadius:8, border:'1px solid rgba(234,179,8,0.2)' }}>
                              <div style={{ fontSize:10, color:'#d97706', textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 }}>Volume BBM</div>
                              <div style={{ fontSize:15, fontWeight:700, color:'#d97706' }}>{activeCp.fuel_liters} L</div>
                            </div>
                          )}
                          {activeCp.fuel_cost && (
                            <div style={{ background:'rgba(234,179,8,0.07)', padding:'10px 14px', borderRadius:8, border:'1px solid rgba(234,179,8,0.2)' }}>
                              <div style={{ fontSize:10, color:'#d97706', textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 }}>Biaya BBM</div>
                              <div style={{ fontSize:15, fontWeight:700, color:'#d97706' }}>Rp {activeCp.fuel_cost.toLocaleString('id-ID')}</div>
                            </div>
                          )}
                        </div>

                        {/* Location */}
                        <div style={{ background:'var(--bg-secondary)', padding:'12px 14px', borderRadius:8 }}>
                          <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Lokasi & Koordinat</div>
                          <div style={{ fontSize:13, fontWeight:500 }}>{activeCp.address||'—'}</div>
                          {activeCp.latitude && (
                            <div style={{ fontSize:11, fontFamily:'monospace', color:'var(--accent)', marginTop:3, display:'flex', alignItems:'center', gap:4 }}>
                              <FaMapMarkerAlt size={10} />
                              <span>{activeCp.latitude}, {activeCp.longitude}</span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {activeCp.notes && (
                          <div style={{ background:'var(--bg-secondary)', padding:'12px 14px', borderRadius:8 }}>
                            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Catatan Driver</div>
                            <div style={{ fontSize:13, fontStyle:'italic', color:'var(--text-secondary)' }}>"{activeCp.notes}"</div>
                          </div>
                        )}

                        {/* Photos */}
                        <div>
                          <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8, fontWeight:600 }}>Lampiran Foto</div>
                          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                            {(() => {
                              return [
                                { key:'photo_km',       label:'Foto KM',   url:activeCp.photo_km },
                                { key:'photo_nota',     label:'Nota',      url:activeCp.photo_nota },
                                { key:'photo_pump',     label:'Dispenser', url:activeCp.photo_pump },
                                { key:'photo_activity', label:'Aktivitas', url:activeCp.photo_activity },
                              ].filter(p=>p.url).map(photo=>(
                                <div key={photo.key} style={{
                                  display:'flex', flexDirection:'column', alignItems:'center',
                                  background:'var(--bg-secondary)', padding:6, borderRadius:8, border:'1px solid var(--border)',
                                }}>
                                  <a href={getImageUrl(photo.url)} target="_blank" rel="noreferrer">
                                    <img src={getImageUrl(photo.url)} alt={photo.label}
                                      style={{ width:90, height:90, objectFit:'cover', borderRadius:6 }}
                                      onError={e=>{e.target.onerror=null;e.target.src=getImageUrl(photo.url);}}
                                    />
                                  </a>
                                  <span style={{ fontSize:10, color:'var(--text-muted)', marginTop:4, fontWeight:500 }}>{photo.label}</span>
                                </div>
                              ));
                            })()}
                            {![activeCp.photo_km,activeCp.photo_nota,activeCp.photo_pump,activeCp.photo_activity].some(Boolean) && (
                              <div style={{ fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}>Tidak ada lampiran foto</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)', padding:32, textAlign:'center' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginBottom:12, opacity:0.35 }}>
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <h4 style={{ marginBottom:4 }}>Pilih Checkpoint</h4>
                        <p style={{ fontSize:12 }}>Klik checkpoint di timeline kiri atau pin pada peta</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding:24, background:'var(--bg-primary)', borderRadius:10, border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:13, textAlign:'center' }}>
                Belum ada data checkpoint perjalanan untuk dinas ini.
              </div>
            )}

            {/* ── Events ── */}
            {detail.events?.length > 0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>Kejadian di Perjalanan</span>
                </div>
                {detail.events.map(ev=>(
                  <div key={ev.id} style={{
                    display:'flex', alignItems:'center', gap:10, marginBottom:8,
                    background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)',
                    borderRadius:9, padding:'10px 14px', fontSize:13,
                  }}>
                    <span style={{ display:'flex', alignItems:'center', color:'#d97706' }}><FaExclamationTriangle size={15} /></span>
                    <div style={{ flex:1 }}>
                      <span style={{ fontWeight:700 }}>{ev.title}</span>
                      {ev.description && <span style={{ color:'var(--text-secondary)', marginLeft:8 }}>— {ev.description}</span>}
                    </div>
                    <StatusBadge status={ev.severity}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
