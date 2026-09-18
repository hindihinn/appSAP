import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { FaMoneyBillWave, FaClock, FaCheckDouble, FaHourglassHalf, FaSync } from 'react-icons/fa';

export default function ReimburseMonitoring() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await api.get('/reimbursements');
      setData(r.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  const updateStatus = async (id, status) => {
    await api.put(`/reimbursements/${id}/status`, { status });
    loadData();
  };

  const columns = [
    { key:'reimburse_number', label:'No Reimburse', primary:true, render:v=><span style={{color:'var(--accent)',fontWeight:600,fontSize:12}}>{v}</span> },
    { key:'driver_name', label:'Driver' },
    { key:'order_number', label:'No Order Dinas' },
    { key:'destination', label:'Tujuan' },
    { key:'total_amount', label:'Total', render:v=>`Rp ${Number(v||0).toLocaleString('id-ID')}` },
    { key:'status', label:'Status', badge:true },
    { key:'created_at', label:'Tgl Buat', render:v=>new Date(v).toLocaleDateString('id-ID') },
  ];

  // Calculate metrics
  const totalCount = data.length;
  const submittedCount = data.filter(r => r.status === 'submitted').length;
  const reviewedCount = data.filter(r => r.status === 'reviewed').length;
  const approvedCount = data.filter(r => r.status === 'approved').length;

  return (
    <div>
      {/* ══ HERO HEADER BANNER (REIMBURSE MONITORING - PURPLE THEME) ══ */}
      <div style={{
        background: 'var(--gradient-reimburse)',
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
              <FaMoneyBillWave size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Monitoring Reimbursement
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Pantau, review, setujui, dan proses pencairan klaim reimburse driver operasional
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
            { label: 'Total Klaim', val: totalCount, icon: <FaMoneyBillWave size={20} /> },
            { label: 'Diajukan Driver', val: submittedCount, icon: <FaClock size={20} /> },
            { label: 'Dalam Review', val: reviewedCount, icon: <FaHourglassHalf size={20} /> },
            { label: 'Disetujui', val: approvedCount, icon: <FaCheckDouble size={20} /> },
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

      <DataTable columns={columns} data={data} loading={loading}
        actions={row=>(
          <div style={{display:'flex',gap:4}}>
            {row.status==='submitted' && <button className="btn btn-primary btn-sm" onClick={()=>updateStatus(row.id,'reviewed')}>Review</button>}
            {row.status==='reviewed' && <button className="btn btn-success btn-sm" onClick={()=>updateStatus(row.id,'approved')}>Approve</button>}
            {row.status==='approved' && <button className="btn btn-success btn-sm" onClick={()=>updateStatus(row.id,'paid')}>Bayar</button>}
          </div>
        )}
      />
    </div>
  );
}
