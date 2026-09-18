import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  FaStickyNote,
  FaSearch,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClipboardList,
  FaSpinner,
  FaClock,
  FaTruck,
  FaUser,
  FaPlus,
  FaTrashAlt,
  FaSyncAlt
} from 'react-icons/fa';

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const emptyRow = () => ({ vehicle_id: '', driver_id: '', unit_id: '', notes: '' });

export default function CreateDinas() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [units, setUnits] = useState([]);
  const [modal, setModal] = useState(null);           // trip yang dipilih
  const [assignments, setAssignments] = useState([emptyRow()]); // multi-driver rows
  const [loadingDriverFor, setLoadingDriverFor] = useState({}); // { rowIndex: true/false }
  const [autoFilledDriver, setAutoFilledDriver] = useState({});  // { rowIndex: true/false } — driver diisi otomatis
  const [adminNotes, setAdminNotes] = useState('');
  const [spdPreview, setSpdPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [tripsRes, vehiclesRes, driversRes, unitsRes] = await Promise.all([
        api.get('/trips?status=admin_review'),
        api.get('/vehicles?exclude_photos=true'),
        api.get('/drivers?exclude_photos=true'),
        api.get('/organizations/units'),
      ]);
      setTrips(tripsRes.data.data || []);
      setVehicles(vehiclesRes.data.data || []);
      setDrivers(driversRes.data.data || []);
      setUnits(unitsRes.data.data || []);
    } catch {
      setError('Gagal memuat data');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openModal = (trip) => {
    setModal(trip);
    setAssignments([emptyRow()]);
    setLoadingDriverFor({});
    setAutoFilledDriver({});
    setAdminNotes('');
    setError('');
    setSuccessMsg('');
    // Generate preview nomor DN: DN-{seq}/{MM}/{YYYY}-{PT}-{UNIT}
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const pt = (trip.company_code || 'PT').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const unit = (trip.unit_code || 'UNIT').toUpperCase().replace(/[^A-Z0-9]/g, '');
    setSpdPreview(`DN-##/${mm}/${yyyy}-${pt}-${unit}`);
  };

  const closeModal = () => { setModal(null); setError(''); setSuccessMsg(''); };

  // Assignment row handlers
  const addRow = () => setAssignments(a => [...a, emptyRow()]);
  const removeRow = (i) => setAssignments(a => a.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) =>
    setAssignments(a => a.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  // Saat kendaraan dipilih → auto-fetch driver yang di-assign
  const handleVehicleChange = async (i, vehicleId) => {
    // Update vehicle_id dulu, reset driver
    setAssignments(a => a.map((row, idx) => idx === i ? { ...row, vehicle_id: vehicleId, driver_id: '' } : row));
    setAutoFilledDriver(prev => ({ ...prev, [i]: false }));

    if (!vehicleId) return;

    setLoadingDriverFor(prev => ({ ...prev, [i]: true }));
    try {
      const res = await api.get(`/vehicles/${vehicleId}/assigned-driver`);
      const driver = res.data?.data;
      if (driver) {
        setAssignments(a => a.map((row, idx) => idx === i ? { ...row, driver_id: String(driver.id) } : row));
        setAutoFilledDriver(prev => ({ ...prev, [i]: true }));
      }
    } catch {
      // Tidak ada driver assignment — biarkan user pilih manual
    } finally {
      setLoadingDriverFor(prev => ({ ...prev, [i]: false }));
    }
  };

  const handleSubmit = async () => {
    setError('');
    // Validate
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      if (!a.vehicle_id) { setError(`Baris ${i + 1}: Kendaraan harus dipilih`); return; }
      if (!a.driver_id) { setError(`Baris ${i + 1}: Driver harus dipilih`); return; }
    }
    setSaving(true);
    try {
      const res = await api.post(`/trips/${modal.id}/create-dinas`, {
        admin_notes: adminNotes,
        assignments,
      });
      setSuccessMsg(`SPD berhasil dibuat! Nomor: ${res.data.data.spd_number}`);
      setTimeout(() => { closeModal(); load(); }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat SPD');
    }
    setSaving(false);
  };

  const filteredTrips = trips.filter(t =>
    !search ||
    t.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.requester_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: 'var(--gradient-trips)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 28,
        position: 'relative', overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -70, left: '38%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><FaClipboardList size={22} style={{ color: '#fff' }} /></div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Create Surat Dinas (DN)
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Assign driver dan kendaraan untuk order perjalanan yang telah disetujui admin
              </p>
            </div>
          </div>
          <button onClick={load} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff', padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, backdropFilter: 'blur(10px)', transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <FaSyncAlt size={14} />
            Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 22 }}>
          {[
            { label: 'Order Menunggu', val: trips.length, color: '#ffffff', icon: <FaClock size={20} /> },
            { label: 'Kendaraan Tersedia', val: vehicles.filter(v => v.status === 'available').length, color: '#ffffff', icon: <FaTruck size={20} /> },
            { label: 'Driver Tersedia', val: drivers.filter(d => d.status === 'available').length, color: '#ffffff', icon: <FaUser size={20} /> },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(10px)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>{s.icon}</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
                  {s.val}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && !modal && <div className="alert alert-danger" style={{ marginBottom: 20 }}><FaExclamationTriangle size={13} style={{ marginRight: 6 }} />{error}</div>}

      {/* Trip Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: 'linear-gradient(90deg,rgba(59,130,246,0.03),transparent)' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center' }}>
            <FaClock size={16} style={{ color: 'var(--warning)', marginRight: 8 }} />
            Order Siap Dibuatkan Surat Dinas ({filteredTrips.length})
          </h3>
          <div style={{ position: 'relative', width: 280 }}>
            <FaSearch size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ width: '100%', paddingLeft: 36, margin: 0 }}
              placeholder="Cari order, pemohon, tujuan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : filteredTrips.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 12, opacity: 0.3, color: 'var(--text-muted)' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <h3 style={{ marginBottom: 4, color: 'var(--text-secondary)' }}>Tidak ada order pending</h3>
            <p style={{ fontSize: 13 }}>Semua order sudah diproses atau belum ada order masuk</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr style={{ background: 'rgba(59,130,246,0.03)', borderBottom: '1px solid var(--border)' }}>
                  <th>No Order</th>
                  <th>No DN Preview</th>
                  <th>Pemohon</th>
                  <th>Perusahaan / Unit</th>
                  <th>Tujuan</th>
                  <th>Keperluan</th>
                  <th>Tgl Rencana</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((t, idx) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(59,130,246,0.01)' }}>
                    <td>
                      <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>
                        {t.order_number}
                      </span>
                      {t.admin_notes && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <FaStickyNote size={9} /> <span>{t.admin_notes}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(139,92,246,0.08)', color: 'var(--purple, #8b5cf6)', padding: '3px 8px', borderRadius: 6, border: '1px dashed rgba(139,92,246,0.25)', fontWeight: 600 }}>
                        DN-##/{String(new Date().getMonth() + 1).padStart(2, '0')}/{new Date().getFullYear()}-{(t.company_code || 'PT').toUpperCase()}-{(t.unit_code || 'UNIT').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.requester_name}</td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{t.company_name || '-'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.unit_name || ''}</div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t.destination}</div>
                      {t.destination_address && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.destination_address}</div>
                      )}
                    </td>
                    <td style={{ maxWidth: 180, fontSize: 12, color: 'var(--text-secondary)' }}>
                      {t.purpose ? t.purpose.slice(0, 60) + (t.purpose.length > 60 ? '...' : '') : '-'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500 }}>
                      <div>{fmt(t.planned_departure)}</div>
                      {t.planned_return && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>s/d {fmt(t.planned_return)}</div>
                      )}
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => openModal(t)}
                      >
                        <FaPlus size={10} />
                        Buat Dinas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create SPD Modal */}
      <Modal
        isOpen={!!modal}
        onClose={closeModal}
        title="Buat Surat Dinas (DN) & Kirim ke GA"
        size="xl"
        footer={
          !successMsg ? (
            <>
              <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {saving ? <><FaSpinner size={13} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</> : (
                  <>
                    <FaCheckCircle size={13} />
                    Buat Dinas & Kirim ke GA
                  </>
                )}
              </button>
            </>
          ) : null
        }
      >
        {modal && (
          <div>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FaExclamationTriangle size={13} /> {error}
              </div>
            )}
            {successMsg && (
              <div className="alert alert-success" style={{ marginBottom: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: 8, padding: '12px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FaCheckCircle size={14} /> {successMsg}
              </div>
            )}

            {/* Info Order */}
            <div style={{ background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FaClipboardList size={13} style={{ color: 'var(--accent)' }} />
                <span>Informasi Order</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  ['No Order', <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{modal.order_number}</span>],
                  ['Pemohon', modal.requester_name],
                  ['Perusahaan', modal.company_name || '-'],
                  ['Unit Kerja', modal.unit_name || '-'],
                  ['Tujuan', modal.destination],
                  ['Keperluan', modal.purpose || '-'],
                  ['Rencana Berangkat', fmt(modal.planned_departure)],
                  ['Rencana Kembali', fmt(modal.planned_return)],
                ].map(([label, val], i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                  </div>
                ))}
              </div>
              {modal.items_description && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>Barang / Keterangan</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{modal.items_description}</div>
                </div>
              )}
            </div>

            {/* Nomor SPD */}
            <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FaStickyNote size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Nomor SPD (Auto-Generate)</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)', letterSpacing: 0.5 }}>{spdPreview}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Format: DN-##/MM/YYYY-PT-UNIT — Nomor urut final ditentukan saat submit</div>
              </div>
            </div>

            {/* Multi Driver & Kendaraan */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  <span>Assignment Driver & Kendaraan</span>
                  <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    {assignments.length} Driver
                  </span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={addRow} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FaPlus size={12} />
                  Tambah Driver
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {assignments.map((row, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 12,
                    padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap',
                    position: 'relative'
                  }}>
                    {/* Seq badge */}
                    <div style={{ width: 28, height: 28, background: i === 0 ? 'var(--accent)' : 'var(--bg-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: i === 0 ? '#fff' : 'var(--text-muted)', flexShrink: 0, marginTop: 22 }}>
                      {i + 1}
                    </div>
                    {/* Kendaraan */}
                    <div style={{ flex: '1', minWidth: '180px' }}>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                        Kendaraan {i === 0 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      <select
                        className="form-select"
                        style={{ margin: 0, fontSize: 13, height: 38 }}
                        value={row.vehicle_id}
                        onChange={e => handleVehicleChange(i, e.target.value)}
                      >
                        <option value="">-- Pilih Kendaraan --</option>
                        {vehicles.filter(v => v.status === 'available' || String(v.id) === String(row.vehicle_id)).map(v => (
                          <option key={v.id} value={v.id}>
                            {v.nopol} — {v.merk} {v.model}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Driver */}
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                        <span>Driver {i === 0 && <span style={{ color: 'var(--danger)' }}>*</span>}</span>
                        {loadingDriverFor[i] && (
                          <span style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <FaSpinner size={10} style={{ animation: 'spin 1s linear infinite' }} />
                            Cek assignment...
                          </span>
                        )}
                        {!loadingDriverFor[i] && autoFilledDriver[i] && (
                          <span style={{ fontSize: 10, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }}>
                            ✓ Auto
                          </span>
                        )}
                      </label>
                      <select
                        className="form-select"
                        style={{ margin: 0, fontSize: 13, height: 38, borderColor: autoFilledDriver[i] ? 'rgba(16,185,129,0.5)' : undefined }}
                        value={row.driver_id}
                        onChange={e => { updateRow(i, 'driver_id', e.target.value); setAutoFilledDriver(prev => ({ ...prev, [i]: false })); }}
                        disabled={loadingDriverFor[i]}
                      >
                        <option value="">{loadingDriverFor[i] ? 'Mencari driver...' : '-- Pilih Driver --'}</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.assigned_vehicle ? `(${d.assigned_vehicle})` : ''}
                          </option>
                        ))}
                        {row.driver_id && !drivers.find(d => String(d.id) === String(row.driver_id)) && (
                          <option value={row.driver_id}>(Driver dari assignment)</option>
                        )}
                      </select>
                    </div>
                    {/* Unit */}
                    <div style={{ flex: '1', minWidth: '150px' }}>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Unit (Opsional)</label>
                      <select
                        className="form-select"
                        style={{ margin: 0, fontSize: 13, height: 38 }}
                        value={row.unit_id}
                        onChange={e => updateRow(i, 'unit_id', e.target.value)}
                      >
                        <option value="">-- Unit --</option>
                        {units.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.company_name})</option>
                        ))}
                      </select>
                    </div>
                    {/* Notes */}
                    <div style={{ flex: '1.5', minWidth: '180px' }}>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Catatan</label>
                      <input
                        className="form-input"
                        style={{ margin: 0, fontSize: 13, height: 38 }}
                        placeholder="Catatan driver (opsional)..."
                        value={row.notes}
                        onChange={e => updateRow(i, 'notes', e.target.value)}
                      />
                    </div>
                    {/* Remove Action */}
                    <button
                      onClick={() => removeRow(i)}
                      disabled={assignments.length === 1}
                      style={{
                        background: 'none',
                        cursor: assignments.length === 1 ? 'not-allowed' : 'pointer',
                        opacity: assignments.length === 1 ? 0.3 : 1,
                        color: 'var(--danger)', padding: '6px 10px', borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginTop: 22, border: '1px solid transparent', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if (assignments.length > 1) { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; } }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}
                      title="Hapus baris"
                    >
                      <FaTrashAlt size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Catatan Admin */}
            <div className="form-group" style={{ marginTop: 20 }}>
              <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Catatan Admin GA (Opsional)</label>
              <textarea
                className="form-textarea"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Catatan tambahan untuk disampaikan ke GA..."
                rows={3}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
