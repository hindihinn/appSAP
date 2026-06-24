import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';

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
        api.get('/trips?status=pending'),
        api.get('/vehicles'),
        api.get('/drivers/available'),
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
    setAdminNotes('');
    setError('');
    setSuccessMsg('');
    // Generate preview nomor SPD
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const pt = (trip.company_code || 'PT').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const unit = (trip.unit_code || 'UNIT').toUpperCase().replace(/[^A-Z0-9]/g, '');
    setSpdPreview(`PJD-${pt}-${unit}-${today}-###`);
  };

  const closeModal = () => { setModal(null); setError(''); setSuccessMsg(''); };

  // Assignment row handlers
  const addRow = () => setAssignments(a => [...a, emptyRow()]);
  const removeRow = (i) => setAssignments(a => a.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) =>
    setAssignments(a => a.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

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
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Dinas</h1>
          <p className="page-subtitle">Buat Surat Perjalanan Dinas (SPD) dari order yang masuk</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon yellow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{trips.length}</div>
            <div className="stat-label">Order Menunggu</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{vehicles.filter(v => v.status === 'available').length}</div>
            <div className="stat-label">Kendaraan Tersedia</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{drivers.length}</div>
            <div className="stat-label">Driver Tersedia</div>
          </div>
        </div>
      </div>

      {/* Trip Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h3 className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" style={{ marginRight: 8 }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Order Pending — Perlu Dibuatkan SPD ({filteredTrips.length})
          </h3>
          <input
            className="form-input"
            style={{ width: 260, margin: 0 }}
            placeholder="🔍  Cari order, pemohon, tujuan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : filteredTrips.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" style={{ marginBottom: 12, opacity: 0.3 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <h3 style={{ marginBottom: 4 }}>Tidak ada order pending</h3>
            <p>Semua order sudah diproses atau belum ada order masuk</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>No Order</th>
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
                {filteredTrips.map(t => (
                  <tr key={t.id}>
                    <td>
                      <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>
                        {t.order_number}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.requester_name}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{t.company_name || '-'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.unit_name || ''}</div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ fontWeight: 500 }}>{t.destination}</div>
                      {t.destination_address && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.destination_address}</div>
                      )}
                    </td>
                    <td style={{ maxWidth: 180, fontSize: 13, color: 'var(--text-secondary)' }}>
                      {t.purpose ? t.purpose.slice(0, 60) + (t.purpose.length > 60 ? '...' : '') : '-'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div>{fmt(t.planned_departure)}</div>
                      {t.planned_return && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>s/d {fmt(t.planned_return)}</div>
                      )}
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openModal(t)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                        </svg>
                        Buat SPD
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
        title="Buat Surat Perjalanan Dinas (SPD)"
        size="xl"
        footer={
          !successMsg ? (
            <>
              <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? '⏳ Menyimpan...' : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    Buat SPD & Kirim ke HRGA
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
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>⚠ {error}</div>
            )}
            {successMsg && (
              <div className="alert alert-success" style={{ marginBottom: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: 8, padding: '12px 16px', fontWeight: 600 }}>
                ✓ {successMsg}
              </div>
            )}

            {/* Info Order */}
            <div style={{ background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                📋 Informasi Order
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {[
                  ['No Order', <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{modal.order_number}</span>],
                  ['Pemohon', modal.requester_name],
                  ['Perusahaan', modal.company_name || '-'],
                  ['Unit', modal.unit_name || '-'],
                  ['Tujuan', modal.destination],
                  ['Keperluan', modal.purpose || '-'],
                  ['Rencana Berangkat', fmt(modal.planned_departure)],
                  ['Rencana Kembali', fmt(modal.planned_return)],
                ].map(([label, val], i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{val}</div>
                  </div>
                ))}
              </div>
              {modal.items_description && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Barang / Keterangan</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{modal.items_description}</div>
                </div>
              )}
            </div>

            {/* Nomor SPD */}
            <div style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Nomor SPD (Auto-Generate)</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)', letterSpacing: 1 }}>{spdPreview}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Format: PJD-{'{PT}'}-{'{UNIT}'}-{'{TANGGAL}'}-{'{NO}'}  — Nomor urut final ditentukan saat submit</div>
              </div>
            </div>

            {/* Multi Driver & Kendaraan */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                  Assignment Driver & Kendaraan
                  <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: '1px 8px', fontSize: 11 }}>
                    {assignments.length} driver
                  </span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={addRow} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Tambah Driver
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {assignments.map((row, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: 14, display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr 1fr 36px', gap: 10, alignItems: 'center'
                  }}>
                    {/* Seq badge */}
                    <div style={{ width: 24, height: 24, background: i === 0 ? 'var(--accent)' : 'var(--bg-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? '#fff' : 'var(--text-muted)', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    {/* Kendaraan */}
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                        Kendaraan {i === 0 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      <select
                        className="form-select"
                        style={{ margin: 0, fontSize: 13 }}
                        value={row.vehicle_id}
                        onChange={e => updateRow(i, 'vehicle_id', e.target.value)}
                      >
                        <option value="">-- Pilih Kendaraan --</option>
                        {vehicles.filter(v => v.status === 'available' || v.id == row.vehicle_id).map(v => (
                          <option key={v.id} value={v.id}>
                            {v.nopol} — {v.merk} {v.model}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Driver */}
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                        Driver {i === 0 && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      <select
                        className="form-select"
                        style={{ margin: 0, fontSize: 13 }}
                        value={row.driver_id}
                        onChange={e => updateRow(i, 'driver_id', e.target.value)}
                      >
                        <option value="">-- Pilih Driver --</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.assigned_vehicle ? `(${d.assigned_vehicle})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Unit */}
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Unit (Opsional)</label>
                      <select
                        className="form-select"
                        style={{ margin: 0, fontSize: 13 }}
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
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Catatan</label>
                      <input
                        className="form-input"
                        style={{ margin: 0, fontSize: 13 }}
                        placeholder="Opsional..."
                        value={row.notes}
                        onChange={e => updateRow(i, 'notes', e.target.value)}
                      />
                    </div>
                    {/* Remove */}
                    <button
                      onClick={() => removeRow(i)}
                      disabled={assignments.length === 1}
                      style={{ background: 'none', border: 'none', cursor: assignments.length === 1 ? 'not-allowed' : 'pointer', opacity: assignments.length === 1 ? 0.3 : 1, color: 'var(--danger)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                      title="Hapus baris"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Catatan Admin */}
            <div className="form-group">
              <label className="form-label">Catatan Admin (Opsional)</label>
              <textarea
                className="form-textarea"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Catatan tambahan untuk HRGA..."
                rows={3}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
