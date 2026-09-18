import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { FaHistory, FaWrench, FaMoneyBillWave, FaChartBar, FaSync } from 'react-icons/fa';

export default function ServiceHistory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    api.get('/services/history')
      .then(r => {
        setData(r.data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  const columns = [
    { key:'wo_number', label:'No WO', primary:true },
    { key:'nopol', label:'Kendaraan' },
    { key:'merk', label:'Merk' },
    { 
      key:'service_type', 
      label:'Tipe', 
      render: v => v === 'preventive' ? (
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', color: 'var(--success)', textTransform: 'uppercase' }}>
          Service Rutin
        </span>
      ) : (
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(59,130,246,0.08)', color: 'var(--accent)', textTransform: 'uppercase' }}>
          Perbaikan Bengkel
        </span>
      )
    },
    { key:'category', label:'Kategori' },
    { key:'description', label:'Deskripsi' },
    { key:'workshop_name', label:'Bengkel' },
    { key:'completed_date', label:'Tgl Selesai', render:v=>v?new Date(v).toLocaleDateString('id-ID'):'-' },
    { key:'km_at_service', label:'KM Service', render:v=>v?`${v.toLocaleString()} km`:'-' },
    { key:'actual_cost', label:'Biaya', render:v=>v?`Rp ${Number(v).toLocaleString('id-ID')}`:'-' },
  ];

  // Calculate metrics
  const totalCount = data.length;
  const totalCost = data.reduce((sum, item) => sum + Number(item.actual_cost || 0), 0);
  const avgCost = totalCount > 0 ? Math.round(totalCost / totalCount) : 0;

  return (
    <div>
      {/* ══ HERO HEADER BANNER (SERVICE HISTORY - SERVICES THEME) ══ */}
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
              <FaHistory size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                History Service
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Arsip dan riwayat seluruh perbaikan serta perawatan kendaraan operasional
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 22 }}>
          {[
            { label: 'Total Pekerjaan Selesai', val: totalCount, icon: <FaWrench size={20} /> },
            { label: 'Total Pengeluaran Perbaikan', val: `Rp ${totalCost.toLocaleString('id-ID')}`, icon: <FaMoneyBillWave size={20} /> },
            { label: 'Rata-rata Pengeluaran', val: `Rp ${avgCost.toLocaleString('id-ID')}`, icon: <FaChartBar size={20} /> },
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

      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}
