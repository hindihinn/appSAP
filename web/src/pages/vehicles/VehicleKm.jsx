import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { FaTachometerAlt, FaRoute, FaSyncAlt, FaChartBar, FaArrowUp, FaHistory } from 'react-icons/fa';

export default function VehicleKm() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Logs modal state
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsModal, setLogsModal] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/vehicle-km/monitoring')
      .then(r => { setData(r.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleShowLogs = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setLogsModal(true);
    setLogsLoading(true);
    try {
      const res = await api.get('/vehicle-km', { params: { vehicle_id: vehicle.id } });
      setLogs(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const columns = [
    { key:'nopol', label:'No. Polisi', primary:true },
    { key:'merk', label:'Kendaraan', render:(v,r) => `${v} ${r.model||''}` },
    { key:'current_km', label:'KM Saat Ini', render:v => (v||0).toLocaleString('id-ID') + ' km' },
    { key:'last_km', label:'KM Terakhir Input', render:v => v ? v.toLocaleString('id-ID') + ' km' : '-' },
    { key:'last_recorded', label:'Terakhir Dicatat', render:v => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
  ];

  // Calculate metrics
  const totalKm = data.reduce((sum, item) => sum + (item.current_km || 0), 0);
  const avgKm = data.length > 0 ? Math.round(totalKm / data.length) : 0;
  const maxKm = data.length > 0 ? Math.max(...data.map(item => item.current_km || 0)) : 0;

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
              <FaTachometerAlt size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Monitoring Kilometer
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Pantau kilometer kendaraan operasional secara berkala untuk keperluan perawatan dan efisiensi rute
              </p>
            </div>
          </div>

          {/* Action Area & Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
            { label: 'Total Kendaraan', val: data.length, icon: <FaTachometerAlt size={20} /> },
            { label: 'Akumulasi KM', val: totalKm.toLocaleString('id-ID'), icon: <FaRoute size={20} /> },
            { label: 'Rerata KM', val: avgKm.toLocaleString('id-ID'), icon: <FaChartBar size={20} /> },
            { label: 'KM Tertinggi', val: maxKm.toLocaleString('id-ID'), icon: <FaArrowUp size={20} /> },
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
        actions={row => (
          <button 
            className="btn btn-info btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => handleShowLogs(row)}
          >
            <FaHistory size={12} /> Log Kilometer
          </button>
        )}
      />

      {/* KILOMETER LOGS MODAL */}
      <Modal
        isOpen={logsModal}
        onClose={() => setLogsModal(false)}
        title={`Log Kilometer - ${selectedVehicle?.nopol} (${selectedVehicle?.merk} ${selectedVehicle?.model || ''})`}
        size="lg"
        footer={
          <button className="btn btn-ghost" onClick={() => setLogsModal(false)}>Tutup</button>
        }
      >
        {logsLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat log kilometer...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum ada catatan log kilometer untuk unit ini.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Tanggal</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>KM Terbaca</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>KM Sebelumnya</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Selisih (+KM)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Sumber / Mobilisasi</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Pencatat</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const diff = (log.km_reading || 0) - (log.previous_km || 0);
                  // Fix: parse date string in local timezone to avoid UTC+8 offset showing 08:00
                  const rawDate = log.recorded_date;
                  let dateLabel = '-';
                  if (rawDate) {
                    // If it's a date-only string like "2026-06-05", parse as local date
                    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawDate.toString().substring(0, 10));
                    const d = isDateOnly
                      ? new Date(rawDate.toString().substring(0, 10) + 'T00:00:00')
                      : new Date(rawDate);
                    dateLabel = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                  }
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>{dateLabel}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>
                        {log.km_reading?.toLocaleString('id-ID')} km
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                        {log.previous_km ? `${log.previous_km.toLocaleString('id-ID')} km` : '-'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                        {diff > 0 ? `+${diff.toLocaleString('id-ID')} km` : '-'}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{ 
                          fontSize: 11, 
                          padding: '2px 8px', 
                          borderRadius: 4, 
                          background: log.source === 'service' ? 'rgba(219,39,119,0.1)' : log.source === 'trip' ? 'rgba(59,130,246,0.1)' : 'rgba(156,163,175,0.1)',
                          color: log.source === 'service' ? 'var(--pink, #db2777)' : log.source === 'trip' ? 'var(--accent)' : 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          marginRight: 6
                        }}>
                          {log.source || 'manual'}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{log.notes || ''}</span>
                      </td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {log.recorded_by_name || 'Driver / App'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
