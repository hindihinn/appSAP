import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';

const fmt = (dt) =>
  dt ? new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const fmtDate = (dt) =>
  dt ? new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function ApprovalDinas() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [hrganotes, setHrgaNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('admin_review');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/trips${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`);
      setTrips(res.data.data || []);
    } catch {
      setError('Gagal memuat data');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterStatus]);

  const openModal = async (trip) => {
    setModal(trip);
    setHrgaNotes('');
    setError('');
    try {
      const res = await api.get(`/trips/${trip.id}/assignments`);
      setAssignments(res.data.data || []);
    } catch {
      setAssignments([]);
    }
  };

  const closeModal = () => { setModal(null); setAssignments([]); setError(''); };

  const handleApprove = async (action) => {
    if (action === 'reject' && !hrganotes.trim()) {
      setError('Alasan penolakan wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.put(`/trips/${modal.id}/hrga-approve`, {
        hrga_notes: hrganotes,
        action,
      });
      closeModal();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memproses persetujuan');
    }
    setSaving(false);
  };

  const filtered = trips.filter(t =>
    !search ||
    t.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.spd_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.requester_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    pending_approval: trips.length,
    approved: 0,
    rejected: 0,
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Dinas (HRGA)</h1>
          <p className="page-subtitle">Review dan setujui Surat Perjalanan Dinas yang masuk dari Admin</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>⚠ {error}</div>}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg-glass)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { key: 'admin_review', label: 'Menunggu HRGA', color: 'var(--warning)' },
          { key: 'approved', label: 'Disetujui', color: 'var(--success)' },
          { key: 'rejected', label: 'Ditolak', color: 'var(--danger)' },
          { key: 'all', label: 'Semua', color: 'var(--text-secondary)' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            style={{
              padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: filterStatus === tab.key ? 'var(--accent)' : 'transparent',
              color: filterStatus === tab.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h3 className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ marginRight: 8 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Daftar SPD ({filtered.length})
          </h3>
          <input
            className="form-input"
            style={{ width: 280, margin: 0 }}
            placeholder="🔍  Cari no SPD, order, pemohon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" style={{ marginBottom: 12, opacity: 0.3 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <h3 style={{ marginBottom: 4 }}>Tidak ada SPD</h3>
            <p>Tidak ada SPD dengan status yang dipilih</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>No SPD</th>
                  <th>No Order</th>
                  <th>Pemohon</th>
                  <th>Perusahaan / Unit</th>
                  <th>Tujuan</th>
                  <th>Driver / Kendaraan</th>
                  <th>Tgl Rencana</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      {t.spd_number ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>
                          {t.spd_number}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)' }}>
                        {t.order_number}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.requester_name}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{t.company_name || '-'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.unit_name || ''}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, maxWidth: 180 }}>{t.destination}</div>
                    </td>
                    <td>
                      {t.driver_name ? (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{t.driver_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.nopol || ''}</div>
                          {t.assignment_count > 1 && (
                            <span style={{ fontSize: 10, background: 'rgba(6,182,212,0.1)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                              +{t.assignment_count - 1} lainnya
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 13 }}>{fmtDate(t.planned_departure)}</div>
                      {t.planned_return && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>s/d {fmtDate(t.planned_return)}</div>
                      )}
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      <button
                        className={`btn btn-sm ${t.status === 'admin_review' ? 'btn-purple' : 'btn-ghost'}`}
                        onClick={() => openModal(t)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        {t.status === 'admin_review' ? 'Review' : 'Detail'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      <Modal
        isOpen={!!modal}
        onClose={closeModal}
        title={`Review SPD — ${modal?.spd_number || modal?.order_number || ''}`}
        size="xl"
        footer={
          modal?.status === 'admin_review' ? (
            <>
              <button
                className="btn btn-danger"
                onClick={() => handleApprove('reject')}
                disabled={saving}
                style={{ marginRight: 'auto' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {saving ? 'Memproses...' : 'Tolak SPD'}
              </button>
              <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Batal</button>
              <button
                className="btn btn-success"
                onClick={() => handleApprove('approve')}
                disabled={saving}
                style={{ background: 'var(--success, #10b981)', color: '#fff' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                {saving ? 'Memproses...' : 'Setujui SPD'}
              </button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={closeModal}>Tutup</button>
          )
        }
      >
        {modal && (
          <div>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>⚠ {error}</div>
            )}

            {/* Header: No SPD + No Order + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>No SPD</div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>
                  {modal.spd_number || '—'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>No Order</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  {modal.order_number}
                </div>
              </div>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Status</div>
                <StatusBadge status={modal.status} />
              </div>
            </div>

            {/* Info Pemohon & Dinas */}
            <div style={{ background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                📋 Detail Order
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  ['Pemohon', modal.requester_name],
                  ['Perusahaan', modal.company_name || '-'],
                  ['Unit', modal.unit_name || '-'],
                  ['Tujuan', modal.destination],
                  ['Keperluan', modal.purpose || '-'],
                  ['Tgl Berangkat', fmtDate(modal.planned_departure)],
                  ['Tgl Kembali', fmtDate(modal.planned_return)],
                  ['Diajukan', fmt(modal.created_at)],
                ].map(([label, val], i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
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
              {modal.admin_notes && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Catatan Admin</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{modal.admin_notes}"</div>
                </div>
              )}
            </div>

            {/* Assignment Table */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
                Assignment Driver & Kendaraan
                <span style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', borderRadius: 12, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
                  {assignments.length} penugasan
                </span>
              </div>
              {assignments.length === 0 ? (
                <div style={{ padding: '16px', background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                  Belum ada assignment. Gunakan data di bawah.
                </div>
              ) : (
                <div className="table-container" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Driver</th>
                        <th>Kendaraan</th>
                        <th>Unit</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a, i) => (
                        <tr key={a.id}>
                          <td>
                            <span style={{ width: 22, height: 22, background: i === 0 ? 'var(--accent)' : 'var(--bg-secondary)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? '#fff' : 'var(--text-muted)' }}>
                              {a.sequence_no}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.driver_name}</div>
                            {a.employee_id && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {a.employee_id}</div>}
                            {a.driver_phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📞 {a.driver_phone}</div>}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{a.nopol}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.merk} {a.model}</div>
                          </td>
                          <td style={{ fontSize: 13 }}>{a.unit_name || '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{a.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Fallback: single driver jika tidak ada trip_assignments */}
              {assignments.length === 0 && modal.driver_name && (
                <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{modal.driver_name}</span>
                  {modal.nopol && <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{modal.nopol}</span>}
                </div>
              )}
            </div>

            {/* Catatan HRGA */}
            {modal.status === 'admin_review' && (
              <div className="form-group">
                <label className="form-label">
                  Catatan HRGA
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>(wajib diisi jika menolak)</span>
                </label>
                <textarea
                  className="form-textarea"
                  value={hrganotes}
                  onChange={e => setHrgaNotes(e.target.value)}
                  placeholder="Catatan persetujuan atau alasan penolakan..."
                  rows={3}
                />
              </div>
            )}

            {/* Show existing HRGA notes for non-pending */}
            {modal.status !== 'admin_review' && modal.hrga_notes && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Catatan HRGA</div>
                <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{modal.hrga_notes}"</div>
                {modal.hrga_name && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>— {modal.hrga_name} · {fmt(modal.hrga_reviewed_at)}</div>
                )}
              </div>
            )}
            {modal.status === 'rejected' && modal.rejection_reason && (
              <div className="alert alert-danger" style={{ marginTop: 12, fontSize: 13 }}>
                <strong>Alasan Penolakan:</strong> {modal.rejection_reason}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
