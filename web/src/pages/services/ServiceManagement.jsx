import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { FaWrench, FaClipboardList, FaSpinner, FaExclamationTriangle, FaSync } from 'react-icons/fa';

export default function ServiceManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    api.get('/services/work-orders')
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
    { key:'service_type', label:'Tipe' },
    { key:'description', label:'Deskripsi' },
    { key:'reported_date', label:'Tgl Lapor', render:v=>v?new Date(v).toLocaleDateString('id-ID'):'-' },
    { key:'estimated_cost', label:'Est. Biaya', render:v=>v?`Rp ${Number(v).toLocaleString('id-ID')}`:'-' },
    { key:'actual_cost', label:'Biaya Aktual', render:v=>v?`Rp ${Number(v).toLocaleString('id-ID')}`:'-' },
    { key:'priority', label:'Prioritas', badge:true },
    { key:'status', label:'Status', badge:true },
  ];

  // Calculate metrics
  const totalCount = data.length;
  const activeCount = data.filter(w => ['pending', 'approved', 'in_progress'].includes(w.status)).length;
  const completedCount = data.filter(w => w.status === 'completed').length;
  const urgentCount = data.filter(w => w.priority === 'urgent' || w.priority === 'high').length;

  return (
    <div>
      {/* ══ HERO HEADER BANNER (SERVICE MANAGEMENT - SERVICES THEME) ══ */}
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
                Manajemen Service
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Kelola semua Surat Perintah Kerja (Work Order) perbaikan armada operasional
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 22 }}>
          {[
            { label: 'Total Work Order', val: totalCount, icon: <FaClipboardList size={20} /> },
            { label: 'WO Aktif / Berjalan', val: activeCount, icon: <FaSpinner size={20} /> },
            { label: 'WO Selesai', val: completedCount, icon: <FaWrench size={20} /> },
            { label: 'Prioritas Tinggi / Urgent', val: urgentCount, icon: <FaExclamationTriangle size={20} />, highlight: urgentCount > 0 },
          ].map((s, i) => (
            <div key={i} style={{
              background: s.highlight ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.12)', 
              border: s.highlight ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.15)',
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
