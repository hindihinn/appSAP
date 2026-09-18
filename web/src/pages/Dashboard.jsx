import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import {
  FaTruck, FaUserTie, FaMapMarkerAlt, FaClock,
  FaCheckCircle, FaWrench, FaMoneyBillWave, FaExclamationTriangle,
  FaChartBar, FaBell, FaRocket, FaSync, FaChevronRight, FaPlusCircle, FaHistory
} from 'react-icons/fa';

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return (
    <div className="empty-state">
      <div className="empty-icon"><FaExclamationTriangle size={40} /></div>
      <h3>Gagal memuat dashboard</h3>
    </div>
  );

  const { stats, alerts, recentTrips, monthlyTrips } = data;

  // Process monthly chart data
  const monthMap = {};
  (monthlyTrips || []).forEach(m => {
    if (!monthMap[m.month]) monthMap[m.month] = { month: m.month };
    monthMap[m.month][m.status] = m.count;
  });
  const chartData = Object.values(monthMap).slice(-6);

  const vehicleStatusData = (stats.vehiclesByStatus || []).map(v => ({
    name: v.status, value: Number(v.count)
  }));

  const totalAlerts = (alerts.expiringVehicleDocs?.length || 0) + (alerts.expiringDriverDocs?.length || 0) + (alerts.overdueServices?.length || 0);

  // Advanced Operations Metrics
  const vehicleUtilization = Math.round((stats.activeTrips / (stats.totalVehicles || 1)) * 100);
  const activeDriverRatio = Math.round((stats.activeTrips / (stats.totalDrivers || 1)) * 100);

  return (
    <div className="dashboard-view-wrapper">
      {/* ══ HERO HEADER BANNER (DASHBOARD SIGNATURE BLUE THEME) ══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Background decorative translucent circles */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -70, left: '38%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 2 }}>
          {/* Title & Icon Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.05)'
            }}>
              <FaTruck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.5px' }}>Dashboard Utama</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '4px 0 0' }}>Sistem Informasi Manajemen Kendaraan & Operasional PT. Sinar Alam Plantations</p>
            </div>
          </div>

          {/* Action Buttons Section inside Banner */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn"
              onClick={() => window.location.reload()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '10px 18px',
                fontWeight: 700
              }}
            >
              <FaSync size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ══ QUICK ACTION DOCK (PREMIUM WIDGETS) ══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div className="quick-action-widget" onClick={() => navigate('/trips/monitoring')} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 16, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s ease' }}>
          <div style={{ background: '#bae6fd', color: '#0369a1', width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyCenter: 'center', justifyContent: 'center' }}><FaMapMarkerAlt size={18} /></div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0369a1' }}>Live Monitoring</h4>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#0369a1', opacity: 0.8 }}>Pantau posisi driver aktif</p>
          </div>
        </div>

        <div className="quick-action-widget" onClick={() => navigate('/trips/create-dinas')} style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: 16, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s ease' }}>
          <div style={{ background: '#c7d2fe', color: '#4338ca', width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyCenter: 'center', justifyContent: 'center' }}><FaPlusCircle size={18} /></div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#4338ca' }}>Buat Surat Dinas</h4>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#4338ca', opacity: 0.8 }}>Jadwalkan rute jalan baru</p>
          </div>
        </div>

        <div className="quick-action-widget" onClick={() => navigate('/services/work-orders')} style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 16, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s ease' }}>
          <div style={{ background: '#fde68a', color: '#b45309', width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyCenter: 'center', justifyContent: 'center' }}><FaWrench size={18} /></div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#b45309' }}>Work Order Service</h4>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#b45309', opacity: 0.8 }}>Input jadwal pemeliharaan</p>
          </div>
        </div>

        <div className="quick-action-widget" onClick={() => navigate('/reimbursements/monitoring')} style={{ background: '#f3e8ff', border: '1px solid #e9d5ff', borderRadius: 16, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s ease' }}>
          <div style={{ background: '#e9d5ff', color: '#6b21a8', width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyCenter: 'center', justifyContent: 'center' }}><FaMoneyBillWave size={18} /></div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#6b21a8' }}>Klaim Keuangan</h4>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b21a8', opacity: 0.8 }}>Verifikasi pengajuan BBM, dll</p>
          </div>
        </div>
      </div>

      {/* ══ RICH PERFORMANCE KPI SECTIONS ══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {/* KPI Group 1: Fleet Capacity */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Utilisasi Armada</span>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>{stats.totalVehicles} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>Unit</span></h2>
            </div>
            <div style={{ background: '#f0f9ff', color: '#0284c7', padding: 8, borderRadius: 10 }}><FaTruck size={18} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            <span>Tingkat Pemakaian Kendaraan</span>
            <span style={{ fontWeight: 700, color: '#0284c7' }}>{vehicleUtilization}% Aktif</span>
          </div>
          <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${vehicleUtilization}%`, background: 'linear-gradient(90deg, #0284c7, #0ea5e9)', borderRadius: 3 }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span>Driver Terdaftar: <strong>{stats.totalDrivers}</strong></span>
            <span>Rasio Tugas: <strong>{activeDriverRatio}%</strong></span>
          </div>
        </div>

        {/* KPI Group 2: Operational Progress */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Perjalanan Dinas</span>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>{stats.activeTrips} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>Aktif</span></h2>
            </div>
            <div style={{ background: '#f0fdf4', color: '#10b981', padding: 8, borderRadius: 10 }}><FaMapMarkerAlt size={18} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            <span>Order Baru Menunggu Berangkat</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>{stats.pendingTrips} Pending</span>
          </div>
          <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${Math.round((stats.activeTrips / ((stats.activeTrips + stats.pendingTrips) || 1)) * 100)}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: 3 }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span>Dinas Selesai Bulan Ini</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>{stats.completedTripsMonth} Dinas</span>
          </div>
        </div>

        {/* KPI Group 3: Maintenance & Risk */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Kesehatan & Legalitas</span>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>{totalAlerts} <span style={{ fontSize: 14, fontWeight: 500, color: '#ef4444' }}>Temuan</span></h2>
            </div>
            <div style={{ background: '#fef2f2', color: '#ef4444', padding: 8, borderRadius: 10 }}><FaExclamationTriangle size={18} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            <span>Antrean Work Order Pemeliharaan</span>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>{stats.pendingWO} Antrean WO</span>
          </div>
          <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${Math.round((stats.pendingWO / ((stats.pendingWO + totalAlerts) || 1)) * 100)}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)', borderRadius: 3 }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span>Reimburse Pending: <strong>{stats.pendingReimburse}</strong></span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>Peringatan Aktif</span>
          </div>
        </div>
      </div>

      {/* ══ CHARTS ROW ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaChartBar size={16} style={{ color: 'var(--accent)' }} /> Trend Dinas 6 Bulan terakhir
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', color: '#ffffff', fontSize: 12 }} />
              <Bar dataKey="completed" fill="url(#colorCompleted)" radius={[6, 6, 0, 0]} name="Selesai" />
              <Bar dataKey="in_progress" fill="url(#colorInProgress)" radius={[6, 6, 0, 0]} name="Berlangsung" />
              <Bar dataKey="pending" fill="url(#colorPending)" radius={[6, 6, 0, 0]} name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaTruck size={16} style={{ color: 'var(--accent)' }} /> Status Kendaraan
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={vehicleStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={3}
                label={false}
              >
                {vehicleStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} style={{ outline: 'none' }} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', color: '#ffffff', fontSize: 12 }} />
              <Legend formatter={(v) => <span style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>{v}</span>} iconSize={8} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ══ ALERTS & RECENT TRIPS ROW ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaBell size={15} style={{ color: 'var(--warning)' }} /> Peringatan Kadaluarsa ({totalAlerts})
            </h3>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', borderRadius: 8 }} onClick={() => navigate('/vehicles/legality')}>Lihat Semua</button>
          </div>
          {totalAlerts === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: '16px 0' }}>
              <FaCheckCircle size={14} style={{ color: '#10b981' }} /> Tidak ada berkas/dokumen kadaluarsa saat ini.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(alerts.expiringVehicleDocs || []).slice(0, 3).map(d => (
                <div key={d.id} className="alert alert-warning" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaTruck size={12} />
                    <span>{d.nopol} - STNK kadaluarsa {new Date(d.expiry_date).toLocaleDateString('id-ID')}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vehicles/legality')} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10 }}>Update</button>
                </div>
              ))}
              {(alerts.expiringDriverDocs || []).slice(0, 2).map(d => (
                <div key={d.id} className="alert alert-warning" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaUserTie size={12} />
                    <span>{d.driver_name} - SIM kadaluarsa {new Date(d.expiry_date).toLocaleDateString('id-ID')}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/hr/legality')} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10 }}>Update</button>
                </div>
              ))}
              {(alerts.overdueServices || []).slice(0, 2).map(d => (
                <div key={d.id} className="alert alert-danger" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaWrench size={12} />
                    <span>{d.nopol} - {d.service_type || 'Servis Rutin'} terlambat servis</span>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => navigate('/services/work-orders')} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, color: '#ffffff', background: '#ef4444' }}>Input WO</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaRocket size={15} style={{ color: 'var(--accent)' }} /> Perjalanan Dinas Terbaru
            </h3>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', borderRadius: 8 }} onClick={() => navigate('/trips/history')}><FaHistory size={11} style={{ marginRight: 2 }} /> Riwayat</button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>No Order</th><th>Tujuan</th><th>Driver</th><th>Status</th></tr></thead>
              <tbody>
                {(recentTrips || []).slice(0, 5).map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/trips/monitoring')}>
                    <td style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>{t.order_number}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t.destination}</td>
                    <td style={{ fontSize: 12.5 }}>{t.driver_name || '-'}</td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
