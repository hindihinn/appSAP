import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';

const COLORS = ['#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><div className="empty-icon">⚠️</div><h3>Gagal memuat dashboard</h3></div>;

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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Ringkasan aktivitas sistem manajemen kendaraan</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>↻ Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/trips/monitoring')}>📍 Live Monitoring</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon cyan">🚛</div>
          <div>
            <div className="stat-value">{stats.totalVehicles}</div>
            <div className="stat-label">Total Kendaraan</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">👤</div>
          <div>
            <div className="stat-value">{stats.totalDrivers}</div>
            <div className="stat-label">Total Driver</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📍</div>
          <div>
            <div className="stat-value">{stats.activeTrips}</div>
            <div className="stat-label">Dinas Aktif</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">⏳</div>
          <div>
            <div className="stat-value">{stats.pendingTrips}</div>
            <div className="stat-label">Order Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">✅</div>
          <div>
            <div className="stat-value">{stats.completedTripsMonth}</div>
            <div className="stat-label">Dinas Bulan Ini</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🔧</div>
          <div>
            <div className="stat-value">{stats.pendingWO}</div>
            <div className="stat-label">WO Aktif</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">💰</div>
          <div>
            <div className="stat-value">{stats.pendingReimburse}</div>
            <div className="stat-label">Reimburse Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⚠️</div>
          <div>
            <div className="stat-value">{totalAlerts}</div>
            <div className="stat-label">Peringatan Aktif</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:24 }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">📊 Trend Dinas 6 Bulan</h3></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="month" tick={{ fill:'#94a3b8', fontSize:11 }} />
              <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} />
              <Tooltip contentStyle={{ background:'#111827', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8 }} />
              <Bar dataKey="completed" fill="#10b981" radius={[4,4,0,0]} name="Selesai" />
              <Bar dataKey="in_progress" fill="#06b6d4" radius={[4,4,0,0]} name="Berlangsung" />
              <Bar dataKey="pending" fill="#f59e0b" radius={[4,4,0,0]} name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">🚛 Status Kendaraan</h3></div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={vehicleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                {vehicleStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background:'#111827', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8 }} />
              <Legend formatter={(v) => <span style={{ color:'#94a3b8', fontSize:12 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts + Recent Trips */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🔔 Peringatan ({totalAlerts})</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vehicles/legality')}>Lihat Semua</button>
          </div>
          {totalAlerts === 0 ? (
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>✅ Tidak ada peringatan</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(alerts.expiringVehicleDocs || []).slice(0,3).map(d => (
                <div key={d.id} className="alert alert-warning" style={{ marginBottom:0 }}>
                  🚛 {d.nopol} - {d.type.toUpperCase()} kadaluarsa {new Date(d.expiry_date).toLocaleDateString('id-ID')}
                </div>
              ))}
              {(alerts.expiringDriverDocs || []).slice(0,2).map(d => (
                <div key={d.id} className="alert alert-warning" style={{ marginBottom:0 }}>
                  👤 {d.driver_name} - {d.type.toUpperCase()} kadaluarsa {new Date(d.expiry_date).toLocaleDateString('id-ID')}
                </div>
              ))}
              {(alerts.overdueServices || []).slice(0,2).map(d => (
                <div key={d.id} className="alert alert-danger" style={{ marginBottom:0 }}>
                  🔧 {d.nopol} - {d.service_type} terlambat service
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🚀 Dinas Terbaru</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/trips/history')}>Lihat Semua</button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>No Order</th><th>Tujuan</th><th>Driver</th><th>Status</th></tr></thead>
              <tbody>
                {(recentTrips || []).map(t => (
                  <tr key={t.id} style={{ cursor:'pointer' }} onClick={() => navigate('/trips/monitoring')}>
                    <td style={{ color:'var(--accent)', fontSize:12 }}>{t.order_number}</td>
                    <td style={{ color:'var(--text-primary)' }}>{t.destination}</td>
                    <td>{t.driver_name || '-'}</td>
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
