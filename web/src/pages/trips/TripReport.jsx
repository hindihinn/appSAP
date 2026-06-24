import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
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

export default function TripReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [activeCp, setActiveCp] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const depKm = detail?.departure_km || detail?.checkpoints?.find(cp => cp.type === 'departure')?.km_reading;
  const arrKm = detail?.arrival_km || detail?.checkpoints?.find(cp => cp.type === 'unloading' || cp.type === 'arrival')?.km_reading;
  const retKm = detail?.return_km || detail?.checkpoints?.find(cp => cp.type === 'return_arrival')?.km_reading;

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const loadData = () => {
    setLoading(true);
    api.get('/trips')
      .then(r => { 
        const allTrips = r.data.data || [];
        // Hanya tampilkan status approved (sudah dibuat), in_progress (aktif), dan completed (sudah selesai)
        const allowedStatuses = ['approved', 'in_progress', 'completed'];
        const reportTrips = allTrips.filter(t => allowedStatuses.includes(t.status));

        if (filterStatus !== 'all') {
          setData(reportTrips.filter(t => t.status === filterStatus));
        } else {
          setData(reportTrips);
        }
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { 
    loadData();
  }, [filterStatus]);

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

  const columns = [
    {
      key: 'spd_number',
      label: 'No SPD',
      render: (v) => v ? (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>
          {v}
        </span>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
      )
    },
    {
      key: 'order_number',
      label: 'No Order',
      primary: true,
      render: (v) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)' }}>{v}</span>
    },
    { key: 'requester_name', label: 'Pemohon' },
    { key: 'destination', label: 'Tujuan' },
    {
      key: 'driver_name',
      label: 'Driver / Kendaraan',
      render: (v, row) => v ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.nopol || ''}</div>
          {row.assignment_count > 1 && (
            <span style={{ fontSize: 10, background: 'rgba(6,182,212,0.1)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
              +{row.assignment_count - 1} lainnya
            </span>
          )}
        </div>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
      )
    },
    {
      key: 'planned_departure',
      label: 'Tgl Berangkat',
      render: (v, row) => (
        <div>
          <div style={{ fontSize: 13 }}>{v ? new Date(v).toLocaleDateString('id-ID') : '-'}</div>
          {row.planned_return && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>s/d {new Date(row.planned_return).toLocaleDateString('id-ID')}</div>
          )}
        </div>
      )
    },
    {
      key: 'total_distance',
      label: 'Jarak',
      render: v => v ? `${v.toLocaleString()} km` : '-'
    },
    { key: 'status', label: 'Status', badge: true },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Report Dinas</h1>
          <p className="page-subtitle">Laporan dan riwayat seluruh dinas</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg-glass)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { key: 'all', label: 'Semua', color: 'var(--text-secondary)' },
          { key: 'approved', label: 'Dibuat', color: 'var(--info)' },
          { key: 'in_progress', label: 'Aktif / Perjalanan', color: 'var(--info)' },
          { key: 'completed', label: 'Selesai', color: 'var(--success)' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            style={{
              padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: filterStatus === tab.key ? 'var(--accent)' : 'transparent',
              color: filterStatus === tab.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
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
      <Modal isOpen={!!detail} onClose={closeDetail} title={`Detail Laporan Dinas — ${detail?.spd_number || detail?.order_number || ''}`} size="xl">
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
    </div>
  );
}
