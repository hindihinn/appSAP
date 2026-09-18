import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import {
  FaCalendarAlt, FaWrench, FaClock, FaCheckCircle,
  FaExclamationTriangle, FaSync, FaTachometerAlt,
  FaPlus, FaTrash, FaEdit, FaHistory, FaTools,
  FaFileAlt, FaInfoCircle, FaClipboardList
} from 'react-icons/fa';

export default function RoutineService() {
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring', 'standards', 'schedule'
  const [data, setData] = useState([]); // routine_services
  const [history, setHistory] = useState([]); // completed work orders
  const [vehicles, setVehicles] = useState([]); // list of vehicles for dropdowns
  const [loading, setLoading] = useState(true);

  // States for Input Standart Service Form Modal
  const [stdModal, setStdModal] = useState(false);
  const [stdForm, setStdForm] = useState({
    vehicle_id: '',
    service_type: 'Ganti Oli Mesin',
    interval_km: 10000,
    interval_days: 180,
    last_service_date: new Date().toISOString().slice(0, 10),
    last_service_km: 0,
    next_service_date: '',
    next_service_km: '',
    notes: ''
  });
  const [stdEditingId, setStdEditingId] = useState(null);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);
  const [searchVehicles, setSearchVehicles] = useState('');

  // States for scheduling service directly from monitoring list (or manually outside warning)
  const [scheduleModal, setScheduleModal] = useState(false);
  const [isManualSchedule, setIsManualSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    vehicle_id: '',
    nopol: '',
    service_type: '',
    description: '',
    priority: 'medium',
    reported_date: new Date().toISOString().slice(0, 10),
    workshop_name: '',
    workshop_address: '',
    estimated_cost: 0
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, hRes, vRes] = await Promise.all([
        api.get('/services/routine'),
        api.get('/services/history?type=preventive'),
        api.get('/vehicles')
      ]);
      setData(rRes.data.data || []);
      setHistory(hRes.data.data || []);
      setVehicles(vRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Standard Auto-calculate logic
  const handleStdFormChange = (key, val) => {
    setStdForm(prev => {
      const updated = { ...prev, [key]: val };

      // Re-calculate Next Service KM
      const nextKm = (Number(updated.last_service_km) || 0) + (Number(updated.interval_km) || 0);
      updated.next_service_km = nextKm;

      // Re-calculate Next Service Date
      if (updated.last_service_date && updated.interval_days) {
        const d = new Date(updated.last_service_date);
        d.setDate(d.getDate() + Number(updated.interval_days));
        updated.next_service_date = d.toISOString().slice(0, 10);
      } else {
        updated.next_service_date = '';
      }

      return updated;
    });
  };

  // Submit Standard Configuration
  const handleSaveStandard = async (e) => {
    e.preventDefault();
    if (stdEditingId) {
      if (!stdForm.vehicle_id || !stdForm.service_type || !stdForm.interval_km) {
        alert('Mohon isi kendaraan, jenis service, dan interval KM');
        return;
      }
    } else {
      if (selectedVehicleIds.length === 0 || !stdForm.service_type || !stdForm.interval_km) {
        alert('Mohon pilih minimal 1 kendaraan, isi jenis service, dan interval KM');
        return;
      }
    }
    try {
      if (stdEditingId) {
        await api.put(`/services/routine/${stdEditingId}`, stdForm);
      } else {
        await Promise.all(
          selectedVehicleIds.map(vId =>
            api.post('/services/routine', { ...stdForm, vehicle_id: vId })
          )
        );
      }
      setStdModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan standard');
    }
  };

  const handleDeleteStandard = async (id) => {
    if (!window.confirm('Hapus konfigurasi standard service ini?')) return;
    try {
      await api.delete(`/services/routine/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  // Trigger scheduling routine service for a specific warning card vehicle
  const triggerScheduleService = (item) => {
    setIsManualSchedule(false);
    setScheduleForm({
      vehicle_id: item.vehicle_id,
      nopol: item.nopol || '',
      service_type: item.service_type || 'Ganti Oli Mesin',
      description: `Service rutin berkala: ${item.service_type || 'Ganti Oli Mesin'}. Batas standar KM tercapai.`,
      priority: item.status === 'overdue' ? 'high' : 'medium',
      reported_date: new Date().toISOString().slice(0, 10),
      workshop_name: '',
      workshop_address: '',
      estimated_cost: 0
    });
    setScheduleModal(true);
  };

  // Trigger scheduling routine service manually (outside warnings)
  const triggerManualSchedule = () => {
    setIsManualSchedule(true);
    setScheduleForm({
      vehicle_id: '',
      nopol: '',
      service_type: '',
      description: '',
      priority: 'medium',
      reported_date: new Date().toISOString().slice(0, 10),
      workshop_name: '',
      workshop_address: '',
      estimated_cost: 0
    });
    setScheduleModal(true);
  };

  // Submit Work Order for preventive routine service
  const handleSaveScheduleService = async (e) => {
    e.preventDefault();
    if (!scheduleForm.vehicle_id || !scheduleForm.description) {
      alert('Mohon pilih kendaraan dan isi deskripsi pekerjaan');
      return;
    }
    try {
      await api.post('/services/work-orders', {
        vehicle_id: scheduleForm.vehicle_id,
        service_type: 'preventive',
        category: 'Service Rutin',
        description: scheduleForm.description,
        reported_date: scheduleForm.reported_date,
        priority: scheduleForm.priority,
        workshop_name: scheduleForm.workshop_name,
        workshop_address: scheduleForm.workshop_address,
        estimated_cost: scheduleForm.estimated_cost
      });
      alert('Jadwal Service Rutin berhasil dibuat dan ditugaskan ke Driver');
      setScheduleModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat jadwal service');
    }
  };

  // Columns for Standards Table
  const stdColumns = [
    { label: 'Kendaraan', key: 'nopol', primary: true },
    { label: 'Jenis Service', key: 'service_type' },
    { label: 'Interval KM', key: 'interval_km', render: v => `${Number(v).toLocaleString()} km` },
    { label: 'Interval Hari', key: 'interval_days', render: v => `${v} hari` },
    { label: 'Next Service KM', key: 'next_service_km', render: (v, row) => `${Number(v).toLocaleString()} km (Curr: ${Number(row.current_km).toLocaleString()})` },
    { label: 'Next Service Tgl', key: 'next_service_date', render: v => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
    {
      label: 'Aksi',
      key: 'actions',
      render: (v, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setStdEditingId(row.id);
            setStdForm({
              vehicle_id: row.vehicle_id,
              service_type: row.service_type,
              interval_km: row.interval_km,
              interval_days: row.interval_days,
              last_service_date: row.last_service_date ? row.last_service_date.split('T')[0] : '',
              last_service_km: row.last_service_km,
              next_service_date: row.next_service_date ? row.next_service_date.split('T')[0] : '',
              next_service_km: row.next_service_km,
              notes: row.notes || ''
            });
            setStdModal(true);
          }}><FaEdit size={12} /> Edit</button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteStandard(row.id)}><FaTrash size={12} /> Hapus</button>
        </div>
      )
    }
  ];

  // Columns for History Table
  const histColumns = [
    { label: 'No. WO', key: 'wo_number', primary: true },
    { label: 'Armada', key: 'nopol' },
    { label: 'Kategori', key: 'category' },
    { label: 'Deskripsi', key: 'description' },
    { label: 'Tgl Selesai', key: 'completed_date', render: v => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
    { label: 'KM Selesai', key: 'km_at_service', render: v => v ? `${Number(v).toLocaleString()} km` : '-' },
    { label: 'Biaya Aktif', key: 'actual_cost', render: v => `Rp ${Number(v).toLocaleString('id-ID')}` }
  ];

  // Stats calculation
  const totalSchedules = data.length;
  const overdueCount = data.filter(d => d.status === 'overdue' || (d.next_service_km && d.current_km >= d.next_service_km)).length;
  const dueSoonCount = data.filter(d => d.status === 'due_soon').length;
  const activeCount = Math.max(0, totalSchedules - overdueCount - dueSoonCount);

  // Filter list of vehicles needing service (current_km close to or exceeding standard next_service_km)
  const serviceNeededList = data.filter(d =>
    d.status === 'overdue' ||
    d.status === 'due_soon' ||
    (d.next_service_km && d.current_km >= d.next_service_km - 1000)
  );

  return (
    <div>
      {/* ══ HERO HEADER BANNER ══ */}
      <div style={{
        background: 'var(--gradient-services)',
        borderRadius: 20,
        padding: '24px 32px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -70, left: '38%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FaCalendarAlt size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Manajemen Service Rutin
              </h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>
                Atur standar interval pemeliharaan berkala dan jadwalkan armada yang melampaui batas KM
              </p>
            </div>
          </div>
          <button onClick={loadData} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, backdropFilter: 'blur(10px)', transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <FaSync size={11} /> Refresh
          </button>
        </div>

        {/* Dynamic Navigation Sub-Menu Tab group inside banner */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 16 }}>
          {[
            { id: 'monitoring', label: 'Monitoring Service Rutin', icon: <FaTachometerAlt /> },
            { id: 'standards', label: 'Input Standart Service Rutin', icon: <FaTools /> },
            { id: 'history', label: 'Riwayat Service Rutin', icon: <FaHistory /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.12)',
                color: activeTab === tab.id ? 'var(--text-primary)' : '#fff',
                border: 'none', borderRadius: 8, padding: '8px 16px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div>
          {/* ════════════════════════════════════════════════ */}
          {/* TAB 1: MONITORING SERVICE RUTIN */}
          {/* ════════════════════════════════════════════════ */}
          {activeTab === 'monitoring' && (
            <div>
              {/* Metric Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Jadwal Terdaftar', val: totalSchedules, color: 'var(--text-primary)', bg: '#fff' },
                  { label: 'Mencapai Batas Standar', val: overdueCount, color: overdueCount > 0 ? 'var(--danger)' : 'var(--text-primary)', bg: overdueCount > 0 ? 'rgba(239,68,68,0.06)' : '#fff', border: overdueCount > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border)' },
                  { label: 'Mendekati Batas (Soon)', val: dueSoonCount, color: dueSoonCount > 0 ? 'var(--warning)' : 'var(--text-primary)', bg: dueSoonCount > 0 ? 'rgba(245,158,11,0.06)' : '#fff', border: dueSoonCount > 0 ? '1px solid rgba(245,158,11,0.2)' : '1px solid var(--border)' },
                  { label: 'Status Aman', val: activeCount, color: 'var(--success)', bg: '#fff' },
                ].map((m, i) => (
                  <div key={i} style={{
                    background: m.bg, border: m.border || '1px solid var(--border)',
                    borderRadius: 14, padding: '14px 18px', boxShadow: 'var(--shadow)',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Alert section for units needing service */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaExclamationTriangle style={{ color: 'var(--danger)' }} /> Unit Kendaraan Mencapai Batas Standard
                </h3>
                <button className="btn btn-primary" onClick={triggerManualSchedule} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FaWrench size={11} /> Jadwalkan Service Manual (Di Luar Warning)
                </button>
              </div>

              {serviceNeededList.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-muted)', marginBottom: 28 }}>
                  <FaCheckCircle size={32} style={{ color: 'var(--success)', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  Tidak ada kendaraan yang mencapai batas limit standar saat ini. Status aman.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16, marginBottom: 28 }}>
                  {serviceNeededList.map((item) => {
                    const intervalKm = item.interval_km || 10000;
                    const nextKm = item.next_service_km || intervalKm;
                    const lastKm = Math.max(0, nextKm - intervalKm);
                    const drivenKm = Math.max(0, (item.current_km || 0) - lastKm);
                    const kmPercent = Math.min(100, Math.round((drivenKm / intervalKm) * 100));

                    const nextDate = item.next_service_date ? new Date(item.next_service_date) : null;
                    let daysRemaining = 0;
                    if (nextDate) {
                      const today = new Date();
                      daysRemaining = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
                    }

                    const isOverdue = item.status === 'overdue' || (item.next_service_km && item.current_km >= item.next_service_km);

                    return (
                      <div key={item.id} style={{
                        background: '#fff',
                        border: `1.5px solid ${isOverdue ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                        borderRadius: 16, padding: 20, boxShadow: 'var(--shadow)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{item.nopol}</span>
                                <span style={{
                                  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                                  background: isOverdue ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                                  color: isOverdue ? 'var(--danger)' : 'var(--warning)',
                                  textTransform: 'uppercase'
                                }}>{isOverdue ? 'BUTUH SERVICE' : 'DEKATI BATAS'}</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.merk} {item.model || ''}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'rgba(59,130,246,0.08)', padding: '3px 8px', borderRadius: 6 }}>
                              {item.service_type}
                            </span>
                          </div>

                          {/* Progress indicators */}
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                              <span>Mileage Limit ({kmPercent}%)</span>
                              <span>{item.current_km?.toLocaleString()} / {item.next_service_km?.toLocaleString()} km</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: 'var(--bg-primary)', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ width: `${kmPercent}%`, height: '100%', background: isOverdue ? 'var(--danger)' : 'var(--warning)', borderRadius: 10 }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
                              {isOverdue ? `Lebih standar sebanyak ${(item.current_km - nextKm).toLocaleString()} km` : `${nextKm - item.current_km} km tersisa`}
                            </div>
                          </div>

                          {/* Expiry Date Info */}
                          {nextDate && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                              <span>Tenggat Waktu:</span>
                              <span style={{ fontWeight: 700 }}>
                                {nextDate.toLocaleDateString('id-ID')} ({daysRemaining < 0 ? `Lewat ${Math.abs(daysRemaining)} hari` : `${daysRemaining} hari lagi`})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons inside card */}
                        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => triggerScheduleService(item)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11 }}
                          >
                            <FaWrench size={11} /> Jadwalkan Service Rutin
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/* TAB 2: INPUT STANDART SERVICE RUTIN */}
          {/* ════════════════════════════════════════════════ */}
          {activeTab === 'standards' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaTools style={{ color: 'var(--accent)' }} /> Konfigurasi Batas Standar Service Rutin
                </h3>
                <button className="btn btn-primary" onClick={() => {
                  setStdEditingId(null);
                  setSelectedVehicleIds([]);
                  setSearchVehicles('');
                  setStdForm({
                    vehicle_id: '',
                    service_type: 'Ganti Oli Mesin',
                    interval_km: 10000,
                    interval_days: 180,
                    last_service_date: new Date().toISOString().slice(0, 10),
                    last_service_km: 0,
                    next_service_date: '',
                    next_service_km: '',
                    notes: ''
                  });
                  setStdModal(true);
                }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FaPlus size={11} /> Tambah Standard
                </button>
              </div>

              <div className="card">
                <DataTable columns={stdColumns} data={data} loading={loading} />
              </div>
            </div>
          )}

          {/* ══ POPUP MODAL: JADWALKAN SERVICE RUTIN ══ */}
          <Modal
            isOpen={scheduleModal}
            onClose={() => setScheduleModal(false)}
            title="Jadwalkan Service Rutin"
            footer={
              <>
                <button className="btn btn-ghost" onClick={() => setScheduleModal(false)}>Batal</button>
                <button className="btn btn-primary" onClick={handleSaveScheduleService}>Kirim Jadwal ke Driver</button>
              </>
            }
          >
            <form onSubmit={handleSaveScheduleService} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Kendaraan *</label>
                {isManualSchedule ? (
                  <select
                    className="form-select"
                    value={String(scheduleForm.vehicle_id)}
                    onChange={e => {
                      const vId = e.target.value;
                      const vObj = vehicles.find(v => String(v.id) === String(vId));
                      const configs = data.filter(item => String(item.vehicle_id) === String(vId));
                      setScheduleForm(prev => ({
                        ...prev,
                        vehicle_id: vId,
                        nopol: vObj?.nopol || '',
                        service_type: configs[0]?.service_type || '',
                        description: configs[0] ? `Service rutin berkala: ${configs[0].service_type}.` : ''
                      }));
                    }}
                    required
                  >
                    <option value="">-- Pilih Kendaraan --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={String(v.id)}>
                        {v.nopol} — {v.merk} {v.model || ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="form-input"
                    value={scheduleForm.nopol}
                    readOnly
                    style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed', fontWeight: 'bold' }}
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Jenis Pemeliharaan *</label>
                {isManualSchedule ? (
                  <select
                    className="form-select"
                    value={scheduleForm.service_type}
                    onChange={e => {
                      const sType = e.target.value;
                      setScheduleForm(prev => ({
                        ...prev,
                        service_type: sType,
                        description: `Service rutin berkala: ${sType}.`
                      }));
                    }}
                    required
                  >
                    <option value="">-- Pilih Jenis Pemeliharaan --</option>
                    {data
                      .filter(item => String(item.vehicle_id) === String(scheduleForm.vehicle_id))
                      .map(item => (
                        <option key={item.id} value={item.service_type}>
                          {item.service_type}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    className="form-input"
                    value={scheduleForm.service_type || '—'}
                    readOnly
                    style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }}
                  />
                )}
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Tanggal Pengajuan *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={scheduleForm.reported_date}
                    onChange={e => setScheduleForm({ ...scheduleForm, reported_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tingkat Prioritas *</label>
                  <select
                    className="form-select"
                    value={scheduleForm.priority}
                    onChange={e => setScheduleForm({ ...scheduleForm, priority: e.target.value })}
                    required
                  >
                    <option value="low">Rendah (Low)</option>
                    <option value="medium">Sedang (Medium)</option>
                    <option value="high">Tinggi (High)</option>
                    <option value="urgent">Genting (Urgent)</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Estimasi Biaya (Rp)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={scheduleForm.estimated_cost}
                    onChange={e => setScheduleForm({ ...scheduleForm, estimated_cost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Bengkel (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={scheduleForm.workshop_name}
                    onChange={e => setScheduleForm({ ...scheduleForm, workshop_name: e.target.value })}
                    placeholder="Misal: Toyota Auto2000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Bengkel (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={scheduleForm.workshop_address}
                  onChange={e => setScheduleForm({ ...scheduleForm, workshop_address: e.target.value })}
                  placeholder="Alamat bengkel pelaksana"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi Pekerjaan / Keterangan *</label>
                <textarea
                  className="form-input"
                  value={scheduleForm.description}
                  onChange={e => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                  placeholder="Instruksi pengerjaan detail..."
                  style={{ minHeight: 60 }}
                  required
                />
              </div>
            </form>
          </Modal>

          {/* ════════════════════════════════════════════════ */}
          {/* TAB 4: RIWAYAT SERVICE RUTIN */}
          {/* ════════════════════════════════════════════════ */}
          {activeTab === 'history' && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaHistory style={{ color: 'var(--accent)' }} /> Riwayat Pelaksanaan Service Besar (Preventif)
              </h3>
              <div className="card">
                <DataTable columns={histColumns} data={history} loading={loading} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ INPUT STANDART SERVICE MODAL ══ */}
      <Modal
        isOpen={stdModal}
        onClose={() => setStdModal(false)}
        title={stdEditingId ? 'Edit Standar Service Rutin' : 'Tambah Batas Standar Service Rutin'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setStdModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSaveStandard}>Simpan</button>
          </>
        }
      >
        <form onSubmit={handleSaveStandard} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!stdEditingId ? (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Pilih Kendaraan * (Bisa Lebih Dari 1)</span>
                <span style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontWeight: 700 }} onClick={() => {
                  if (selectedVehicleIds.length === vehicles.length) {
                    setSelectedVehicleIds([]);
                  } else {
                    setSelectedVehicleIds(vehicles.map(v => v.id));
                  }
                }}>
                  {selectedVehicleIds.length === vehicles.length ? 'Bersihkan Semua' : 'Pilih Semua'}
                </span>
              </label>

              <input
                type="text"
                className="form-input"
                placeholder="Cari Nopol atau Merk..."
                value={searchVehicles}
                onChange={e => setSearchVehicles(e.target.value)}
                style={{ marginBottom: 8 }}
              />

              <div style={{
                maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6,
                background: 'var(--bg-primary)'
              }}>
                {vehicles
                  .filter(v =>
                    v.nopol.toLowerCase().includes(searchVehicles.toLowerCase()) ||
                    v.merk.toLowerCase().includes(searchVehicles.toLowerCase()) ||
                    (v.model && v.model.toLowerCase().includes(searchVehicles.toLowerCase()))
                  )
                  .map(v => (
                    <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={selectedVehicleIds.includes(v.id)}
                        onChange={() => {
                          setSelectedVehicleIds(prev =>
                            prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id]
                          );
                        }}
                      />
                      <span>{v.nopol} — {v.merk} {v.model || ''}</span>
                    </label>
                  ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {selectedVehicleIds.length} kendaraan terpilih
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Kendaraan *</label>
              <select
                className="form-select"
                value={stdForm.vehicle_id}
                onChange={e => handleStdFormChange('vehicle_id', e.target.value)}
                disabled
                required
              >
                <option value="">-- Pilih --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.nopol} — {v.merk} {v.model || ''}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Jenis Pemeliharaan *</label>
            <input
              type="text"
              className="form-input"
              value={stdForm.service_type}
              onChange={e => handleStdFormChange('service_type', e.target.value)}
              placeholder="Contoh: Ganti Oli Mesin, Ganti Ban, Tune Up"
              required
            />
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Interval KM *</label>
              <input
                type="number"
                className="form-input"
                value={stdForm.interval_km}
                onChange={e => handleStdFormChange('interval_km', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Interval Waktu (Hari)</label>
              <input
                type="number"
                className="form-input"
                value={stdForm.interval_days}
                onChange={e => handleStdFormChange('interval_days', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">KM Service Terakhir *</label>
              <input
                type="number"
                className="form-input"
                value={stdForm.last_service_km}
                onChange={e => handleStdFormChange('last_service_km', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Service Terakhir *</label>
              <input
                type="date"
                className="form-input"
                value={stdForm.last_service_date}
                onChange={e => handleStdFormChange('last_service_date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Autocalculated previews */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 10, padding: 12,
            border: '1.5px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 4,
            fontSize: 11
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <FaInfoCircle /> Proyeksi Batas Standar Berikutnya (Otomatis)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Proyeksi KM Berikutnya:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stdForm.next_service_km ? `${Number(stdForm.next_service_km).toLocaleString()} km` : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Proyeksi Tanggal Berikutnya:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stdForm.next_service_date ? new Date(stdForm.next_service_date).toLocaleDateString('id-ID') : '—'}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Catatan Tambahan</label>
            <textarea
              className="form-input"
              value={stdForm.notes}
              onChange={e => handleStdFormChange('notes', e.target.value)}
              placeholder="Catatan pengerjaan..."
              style={{ minHeight: 60 }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
