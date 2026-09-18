import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  FaClock,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaBan,
  FaClipboardList,
  FaShieldAlt,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaSyncAlt,
  FaBoxOpen,
  FaStickyNote,
  FaExclamationTriangle,
  FaCommentAlt,
  FaPhoneAlt,
  FaTruck,
  FaInbox
} from 'react-icons/fa';

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const fmtDate = (dt) =>
  dt ? new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const TABS = [
  { key: 'waiting_hrga', label: 'Menunggu GA', icon: <FaClock size={13} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  { key: 'admin_review', label: 'Review Admin GA',  icon: <FaSearch size={13} />,  color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  { key: 'approved',    label: 'Disetujui',      icon: <FaCheckCircle size={13} />, color: 'var(--success)', bg: 'rgba(22, 163, 74, 0.1)' },
  { key: 'rejected',   label: 'Ditolak',         icon: <FaTimesCircle size={13} />, color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.1)' },
  { key: 'cancelled',  label: 'Dibatalkan',      icon: <FaBan size={13} />, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
  { key: 'all',        label: 'Semua',           icon: <FaClipboardList size={13} />, color: 'var(--accent)', bg: 'rgba(59, 130, 246, 0.1)' },
];

function InfoCard({ label, value, icon }) {
  return (
    <div style={{
      background: 'var(--bg-primary)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 14px',
    }}>
      {icon && <div style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)', fontSize: 16, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{value || '—'}</div>
    </div>
  );
}

export default function ApprovalDinas() {
  const { user } = useAuth();
  const [trips, setTrips]             = useState([]);
  const [allTrips, setAllTrips]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [hrganotes, setHrgaNotes]     = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('waiting_hrga');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/trips');
      const all = res.data.data || [];
      setAllTrips(all);
      setTrips(filterStatus !== 'all' ? all.filter(t => t.status === filterStatus) : all);
    } catch {
      setError('Gagal memuat data');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterStatus]);

  const openModal = async (trip) => {
    setModal(trip); setHrgaNotes(''); setIsCancelling(false);
    setCancelReason(''); setError('');
    try {
      const res = await api.get(`/trips/${trip.id}/assignments`);
      setAssignments(res.data.data || []);
    } catch { setAssignments([]); }
  };

  const closeModal = () => {
    setModal(null); setAssignments([]); setError('');
    setIsCancelling(false); setCancelReason('');
  };

  const handleApprove = async (action) => {
    if (action === 'reject' && !hrganotes.trim()) { setError('Alasan penolakan wajib diisi'); return; }
    setSaving(true); setError('');
    try {
      await api.put(`/trips/${modal.id}/hrga-approve`, { hrga_notes: hrganotes, action });
      closeModal(); load();
    } catch (err) { setError(err.response?.data?.message || 'Gagal memproses persetujuan'); }
    setSaving(false);
  };

  const submitCancellation = async () => {
    if (!cancelReason.trim()) { setError('Alasan pembatalan wajib diisi'); return; }
    setSaving(true); setError('');
    try {
      await api.put(`/trips/${modal.id}/cancel`, { cancel_reason: cancelReason });
      closeModal(); load();
    } catch (err) { setError(err.response?.data?.message || 'Gagal membatalkan dinas'); }
    setSaving(false);
  };

  const filtered = trips.filter(t =>
    !search ||
    t.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.spd_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.requester_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase())
  );

  const countOf = (s) => allTrips.filter(t => t.status === s).length;

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
        <div style={{ position:'absolute', top:-50, right:-50, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-70, left:'38%', width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:50, height:50, borderRadius:14,
              background:'rgba(255,255,255,0.15)', backdropFilter:'blur(10px)',
              border:'1px solid rgba(255,255,255,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}><FaShieldAlt size={22} style={{ color: '#fff' }} /></div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:0, letterSpacing:'-0.5px' }}>
                Approval Dinas — GA
              </h1>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:'4px 0 0' }}>
                Review dan setujui Surat Perjalanan Dinas dari Admin GA
              </p>
            </div>
          </div>
          <button onClick={load} style={{
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
            { label:'Menunggu GA', val:countOf('waiting_hrga'), color:'#ffffff', icon:<FaClock size={20} /> },
            { label:'Disetujui',     val:countOf('approved'),     color:'#ffffff', icon:<FaCheckCircle size={20} /> },
            { label:'Sedang Dinas',  val:countOf('in_progress'),  color:'#ffffff', icon:<FaTruck size={20} /> },
            { label:'Ditolak',       val:countOf('rejected'),     color:'#ffffff', icon:<FaTimesCircle size={20} /> },
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

      {error && (
        <div style={{
          display:'flex', alignItems:'center', gap:10, marginBottom:16,
          background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)',
          color:'#ef4444', borderRadius:10, padding:'11px 16px', fontSize:13,
        }}>
          <FaExclamationTriangle size={13} /> {error}
        </div>
      )}

      {/* ══ FILTER PILLS ══ */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {TABS.map(tab => {
          const active = filterStatus === tab.key;
          const cnt = tab.key === 'all' ? allTrips.length : countOf(tab.key);
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
              background:'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15))',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>Daftar Surat Dinas</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{filtered.length} data ditemukan</div>
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
              placeholder="Cari No DN, order, pemohon..."
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
        ) : filtered.length === 0 ? (
          <div style={{ padding:'60px 24px', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12, color: 'var(--text-muted)' }}><FaInbox size={48} /></div>
            <h3 style={{ color:'var(--text-primary)', marginBottom:6 }}>Tidak Ada Data</h3>
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>Tidak ada surat dinas dengan status yang dipilih</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(59,130,246,0.03)', borderBottom:'1px solid var(--border)' }}>
                  {['No SPD','No Order','Pemohon','Perusahaan / Unit','Tujuan','Driver / Kendaraan','Tgl Rencana','Status','Aksi'].map((h,i)=>(
                    <th key={i} style={{
                      padding:'11px 14px', textAlign:'left', fontSize:10.5, fontWeight:700,
                      color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.8, whiteSpace:'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t,idx)=>(
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
                          background:'linear-gradient(135deg,var(--accent),#8b5cf6)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, fontWeight:800, color:'#fff',
                        }}>{(t.requester_name||'U').charAt(0).toUpperCase()}</div>
                        <span style={{ fontWeight:600, fontSize:13 }}>{t.requester_name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{t.company_name||'-'}</div>
                      {t.unit_name && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{t.unit_name}</div>}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ maxWidth:160, fontWeight:500, fontSize:13 }}>{t.destination}</div>
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
                      <div style={{ fontSize:13, fontWeight:500 }}>{fmtDate(t.planned_departure)}</div>
                      {t.planned_return && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>s/d {fmtDate(t.planned_return)}</div>}
                    </td>
                    <td style={{ padding:'12px 14px' }}><StatusBadge status={t.status}/></td>
                    <td style={{ padding:'12px 14px' }}>
                      <button onClick={()=>openModal(t)} style={{
                        display:'flex', alignItems:'center', gap:5,
                        padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer',
                        fontSize:12, fontWeight:600, transition:'all 0.2s', whiteSpace:'nowrap',
                        background: ['admin_review','waiting_hrga'].includes(t.status)
                          ? 'linear-gradient(135deg,var(--accent),#8b5cf6)' : 'var(--bg-primary)',
                        color: ['admin_review','waiting_hrga'].includes(t.status) ? '#fff' : 'var(--text-secondary)',
                        boxShadow: ['admin_review','waiting_hrga'].includes(t.status) ? '0 3px 10px rgba(59,130,246,0.2)' : 'none',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        {['admin_review','waiting_hrga'].includes(t.status) ? 'Review' : 'Detail'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ APPROVAL MODAL ══ */}
      <Modal
        isOpen={!!modal} onClose={closeModal}
        title={`Review Surat Dinas — ${modal?.spd_number || modal?.order_number || ''}`}
        size="xl"
        footer={
          isCancelling ? (
            <>
              <button onClick={()=>setIsCancelling(false)} disabled={saving} style={{
                padding:'9px 20px', borderRadius:9, border:'1.5px solid var(--border)',
                background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontWeight:600, fontSize:13,
              }}>← Kembali</button>
              <button onClick={submitCancellation} disabled={saving||!cancelReason.trim()} style={{
                padding:'9px 22px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
                background:'linear-gradient(135deg,#dc2626,#ef4444)', color:'#fff',
                boxShadow:'0 4px 14px rgba(220,38,38,0.35)',
                opacity:(!cancelReason.trim()||saving)?0.6:1,
              }}>
                {saving ? '⏳ Membatalkan...' : '🚫 Konfirmasi Batalkan'}
              </button>
            </>
          ) : ['admin_review','waiting_hrga'].includes(modal?.status) ? (
            <>
              {(user?.role_name === 'super_admin' || user?.role_name === 'ga') && (
                <button onClick={()=>handleApprove('reject')} disabled={saving} style={{
                  marginRight:'auto', display:'flex', alignItems:'center', gap:6,
                  padding:'9px 18px', borderRadius:9, cursor:'pointer', fontWeight:700, fontSize:13,
                  background:'rgba(239,68,68,0.08)', color:'#ef4444', border:'1.5px solid rgba(239,68,68,0.25)',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  {saving ? 'Memproses...' : 'Tolak'}
                </button>
              )}
              <button onClick={closeModal} disabled={saving} style={{
                padding:'9px 20px', borderRadius:9, border:'1.5px solid var(--border)',
                background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontWeight:600, fontSize:13,
              }}>{(user?.role_name === 'super_admin' || user?.role_name === 'ga') ? 'Batal' : 'Tutup'}</button>
              {(user?.role_name === 'super_admin' || user?.role_name === 'ga') && (
                <button onClick={()=>handleApprove('approve')} disabled={saving} style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'9px 22px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
                  background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff',
                  boxShadow:'0 4px 14px rgba(5,150,105,0.35)',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {saving ? 'Memproses...' : 'Setujui & Aktifkan'}
                </button>
              )}
            </>
          ) : ['approved','in_progress'].includes(modal?.status) ? (
            <>
              {(user?.role_name === 'super_admin' || user?.role_name === 'ga') && (
                <button onClick={()=>setIsCancelling(true)} disabled={saving} style={{
                  marginRight:'auto', display:'flex', alignItems:'center', gap:6,
                  padding:'9px 18px', borderRadius:9, border:'1.5px solid rgba(239,68,68,0.25)',
                  background:'rgba(239,68,68,0.07)', color:'#ef4444', cursor:'pointer', fontWeight:700, fontSize:13,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  Batalkan Dinas
                </button>
              )}
              <button onClick={closeModal} style={{
                padding:'9px 22px', borderRadius:9, border:'1.5px solid var(--border)',
                background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontWeight:600, fontSize:13,
              }}>Tutup</button>
            </>
          ) : (
            <button onClick={closeModal} style={{
              padding:'9px 22px', borderRadius:9, border:'1.5px solid var(--border)',
              background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontWeight:600, fontSize:13,
            }}>Tutup</button>
          )
        }
      >
        {modal && (
          <div>
            {error && (
              <div style={{
                display:'flex', alignItems:'center', gap:8, marginBottom:14,
                background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.22)',
                color:'#ef4444', borderRadius:9, padding:'10px 14px', fontSize:13,
              }}>
                <FaExclamationTriangle size={13} />
                <span>{error}</span>
              </div>
            )}

            {isCancelling ? (
              /* ── Cancellation Panel ── */
              <div>
                <div style={{
                  background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.18)',
                  borderRadius:12, padding:18, marginBottom:18,
                  display:'flex', alignItems:'flex-start', gap:12,
                }}>
                  <FaExclamationTriangle size={24} style={{ color: '#ef4444', flexShrink:0, marginTop:2 }} />
                  <div>
                    <div style={{ fontWeight:700, color:'#ef4444', fontSize:14, marginBottom:4 }}>Peringatan Pembatalan</div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>
                      Driver dan kendaraan akan dilepas kembali ke status <strong>Standby (available)</strong>. Aksi ini tidak dapat diurungkan.
                    </div>
                  </div>
                </div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:8 }}>
                  Alasan Pembatalan <span style={{ color:'#ef4444' }}>*</span>
                </label>
                <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)}
                  placeholder="Masukkan alasan mengapa Surat Dinas ini dibatalkan..." rows={4}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)',
                    background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:13, resize:'vertical',
                    outline:'none', fontFamily:'inherit' }}/>
              </div>
            ) : (
              <>
                {/* ── 3-col summary ── */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
                  <div style={{
                    background:'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(139,92,246,0.1))',
                    border:'1px solid rgba(59,130,246,0.2)', borderRadius:12, padding:'14px 16px',
                  }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>No SPD</div>
                    <div style={{ fontSize:16, fontWeight:800, fontFamily:'monospace', color:'var(--accent)' }}>{modal.spd_number||'—'}</div>
                  </div>
                  <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>No Order</div>
                    <div style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color:'var(--text-secondary)' }}>{modal.order_number}</div>
                  </div>
                  <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>Status</div>
                    <StatusBadge status={modal.status}/>
                  </div>
                </div>

                {/* ── Requester banner ── */}
                <div style={{
                  background:'linear-gradient(135deg,rgba(59,130,246,0.05),rgba(139,92,246,0.05))',
                  border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px',
                  marginBottom:18, display:'flex', alignItems:'center', gap:14,
                }}>
                  <div style={{
                    width:46, height:46, borderRadius:'50%', flexShrink:0,
                    background:'linear-gradient(135deg,var(--accent),#8b5cf6)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:18, fontWeight:800, color:'#fff',
                  }}>{(modal.requester_name||'U').charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>{modal.requester_name}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                      {modal.company_name}{modal.unit_name ? ` · ${modal.unit_name}` : ''}
                    </div>
                  </div>
                  <div style={{ marginLeft:'auto', textAlign:'right' }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.8 }}>Diajukan</div>
                    <div style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{fmt(modal.created_at)}</div>
                  </div>
                </div>

                {/* ── Detail info cards ── */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:10, marginBottom:18 }}>
                  {[
                    { label:'Tujuan',        value:modal.destination,              icon:<FaMapMarkerAlt /> },
                    { label:'Keperluan',      value:modal.purpose,                  icon:<FaClipboardList /> },
                    { label:'Tgl Berangkat',  value:fmtDate(modal.planned_departure), icon:<FaCalendarAlt /> },
                    { label:'Tgl Kembali',    value:fmtDate(modal.planned_return),  icon:<FaSyncAlt /> },
                  ].map((item,i)=>(<InfoCard key={i} {...item}/>))}
                </div>

                {(modal.items_description||modal.admin_notes) && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
                    {modal.items_description && (
                      <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px' }}>
                        <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:5, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                          <FaBoxOpen size={11} style={{ color:'var(--accent)' }} />
                          <span>Barang / Keterangan</span>
                        </div>
                        <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{modal.items_description}</div>
                      </div>
                    )}
                    {modal.admin_notes && (
                      <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:'12px 14px' }}>
                        <div style={{ fontSize:10, color:'#d97706', textTransform:'uppercase', letterSpacing:1, marginBottom:5, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                          <FaStickyNote size={11} />
                          <span>Catatan Admin</span>
                        </div>
                        <div style={{ fontSize:13, color:'var(--text-secondary)', fontStyle:'italic' }}>"{modal.admin_notes}"</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Assignments ── */}
                <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:18 }}>
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

                  {assignments.length === 0 ? (
                    <div>
                      <div style={{ textAlign:'center', padding:'16px 0', color:'var(--text-muted)', fontSize:13 }}>
                        Belum ada assignment driver/kendaraan
                      </div>
                      {modal.driver_name && (
                        <div style={{
                          marginTop:8, padding:'10px 14px', background:'var(--bg-secondary)',
                          borderRadius:10, border:'1px solid var(--border)', fontSize:13,
                          display:'flex', alignItems:'center', gap:10,
                        }}>
                          <span style={{ fontWeight:600 }}>{modal.driver_name}</span>
                          {modal.nopol && <span style={{ color:'var(--accent)', fontFamily:'monospace', fontWeight:600 }}>{modal.nopol}</span>}
                        </div>
                      )}
                    </div>
                  ) : (
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
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:12, fontWeight:800,
                          }}>{a.sequence_no}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, fontSize:13 }}>{a.driver_name}</div>
                            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
                              {a.employee_id?`ID: ${a.employee_id}`:''}
                              {a.driver_phone && (
                                <span style={{ display:'inline-flex', alignItems:'center', gap:3, marginLeft:6 }}>
                                  · <FaPhoneAlt size={9} style={{ color:'var(--text-muted)' }} /> {a.driver_phone}
                                </span>
                              )}
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
                  )}
                </div>

                {/* ── Catatan GA input ── */}
                {['admin_review','waiting_hrga'].includes(modal?.status) && (
                  <div>
                    <div style={{
                      marginBottom:10, padding:'10px 14px', borderRadius:9, fontSize:12, fontWeight:500,
                      background: modal?.status==='waiting_hrga' ? 'rgba(139,92,246,0.07)' : 'rgba(245,158,11,0.07)',
                      border: `1px solid ${modal?.status==='waiting_hrga'?'rgba(139,92,246,0.22)':'rgba(245,158,11,0.22)'}`,
                      color: modal?.status==='waiting_hrga' ? '#8b5cf6' : '#d97706',
                    }}>
                      {modal?.status==='waiting_hrga' ? (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <FaCheckCircle size={12} style={{ color:'#8b5cf6' }} />
                          <span>Surat Dinas sudah dibuat Admin GA dan siap untuk disetujui GA.</span>
                        </div>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <FaExclamationTriangle size={12} style={{ color:'#d97706' }} />
                          <span>Status admin_review — pastikan No DN sudah diisi oleh Admin GA.</span>
                        </div>
                      )}
                    </div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:8 }}>
                      Catatan GA
                      <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:400, marginLeft:6 }}>(wajib diisi jika menolak)</span>
                    </label>
                    <textarea value={hrganotes} onChange={e=>setHrgaNotes(e.target.value)}
                      placeholder="Catatan persetujuan atau alasan penolakan..." rows={3}
                      style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)',
                        background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:13,
                        resize:'vertical', outline:'none', fontFamily:'inherit' }}/>
                  </div>
                )}

                {/* ── Existing GA notes ── */}
                {!['admin_review','waiting_hrga'].includes(modal?.status) && modal.hrga_notes && (
                  <div style={{ padding:'14px 16px', background:'var(--bg-primary)', borderRadius:10, border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                      <FaCommentAlt size={11} style={{ color:'var(--accent)' }} />
                      <span>Catatan GA</span>
                    </div>
                    <div style={{ fontSize:13, fontStyle:'italic', color:'var(--text-secondary)' }}>"{modal.hrga_notes}"</div>
                    {modal.hrga_name && (
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>— {modal.hrga_name} · {fmt(modal.hrga_reviewed_at)}</div>
                    )}
                  </div>
                )}

                {modal.status==='rejected' && modal.rejection_reason && (
                  <div style={{ marginTop:12, padding:'12px 16px', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.22)', borderRadius:10, fontSize:13, color:'#ef4444', display:'flex', alignItems:'center', gap:6 }}>
                    <FaTimesCircle size={13} />
                    <span><strong>Alasan Penolakan:</strong> {modal.rejection_reason}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
