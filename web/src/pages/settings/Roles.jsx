import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';

const PLATFORM_BADGE = {
  web: {
    label: 'Web',
    color: 'var(--accent)',
    bg: 'rgba(6,182,212,0.1)',
    border: 'rgba(6,182,212,0.25)',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  mobile: {
    label: 'Mobile',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.25)',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="2" width="14" height="20" rx="2"/>
        <circle cx="12" cy="18" r="1" fill="currentColor"/>
      </svg>
    ),
  },
};

const EMPTY_FORM = { name: '', display_name: '', description: '', platform: 'web' };

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null); // null | {} (add) | role (edit)
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles');
      setRoles(res.data.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setError('');
    setForm(EMPTY_FORM);
    setModal({});
  };

  const openEdit = (role) => {
    setError('');
    setForm({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      platform: role.platform || 'web',
    });
    setModal(role);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.display_name.trim()) { setError('Nama tampilan wajib diisi'); return; }
    if (!modal?.id && !form.name.trim()) { setError('Nama kunci role wajib diisi'); return; }
    setSaving(true);
    try {
      if (modal?.id) {
        await api.put(`/roles/${modal.id}`, form);
      } else {
        await api.post('/roles', form);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan role');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/roles/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus role');
    }
  };

  const filtered = roles.filter(r =>
    filter === 'all' ? true : (r.platform || 'web') === filter
  );

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Role</h1>
          <p className="page-subtitle">Kelola role dan platform akses pengguna sistem</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Role
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--bg-glass)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { key: 'all', label: 'Semua' },
          { key: 'web', label: '🖥 Web' },
          { key: 'mobile', label: '📱 Mobile' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
            padding: '6px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            background: filter === tab.key ? 'var(--accent)' : 'transparent',
            color: filter === tab.key ? '#fff' : 'var(--text-secondary)',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Role Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map(role => {
          const pf = PLATFORM_BADGE[role.platform || 'web'];
          return (
            <div key={role.id} style={{
              background: 'var(--bg-glass)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '18px 20px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: pf.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                  }}>
                    {role.platform === 'mobile' ? '📱' : '🖥'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{role.display_name}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 1 }}>{role.name}</div>
                  </div>
                </div>
                {/* Platform Badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: pf.bg, color: pf.color, border: `1px solid ${pf.border}`,
                }}>
                  {pf.icon} {pf.label}
                </span>
              </div>

              {/* Description */}
              {role.description && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  {role.description}
                </p>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {role.is_system && (
                  <span style={{
                    background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                    color: 'var(--accent)', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                  }}>SYSTEM</span>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {role.id}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openEdit(role)}
                    title="Edit role"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                  {!role.is_system && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteConfirm(role)}
                      title="Hapus role"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p>Tidak ada role ditemukan</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? `Edit Role: ${modal.display_name}` : 'Tambah Role Baru'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
        {modal?.is_system && modal?.name === 'super_admin' && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            Super Admin adalah role sistem dengan akses penuh. Hanya platform yang dapat diubah.
          </div>
        )}
        <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Display Name */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Nama Tampilan *</label>
            <input
              className="form-input"
              value={form.display_name}
              onChange={e => setForm({ ...form, display_name: e.target.value })}
              placeholder="cth: Staff HRGA"
              required
            />
          </div>

          {/* Role Key Name — only editable on create */}
          <div className="form-group">
            <label className="form-label">Nama Kunci Role {modal?.id ? '' : '*'}</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => !modal?.id && setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              readOnly={!!modal?.id}
              style={modal?.id ? { background: 'var(--bg-secondary)', cursor: 'not-allowed' } : {}}
              placeholder="cth: staff_hrga"
              required={!modal?.id}
            />
            {!modal?.id && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Hanya huruf kecil dan underscore, tidak bisa diubah setelah dibuat
              </div>
            )}
          </div>

          {/* Platform */}
          <div className="form-group">
            <label className="form-label">Platform Akses</label>
            <select
              className="form-select"
              value={form.platform}
              onChange={e => setForm({ ...form, platform: e.target.value })}
            >
              <option value="web">🖥 Aplikasi Web</option>
              <option value="mobile">📱 Aplikasi Mobile</option>
            </select>
          </div>

          {/* Description */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Deskripsi</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Deskripsi singkat tentang role ini..."
              rows={3}
            />
          </div>

        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Konfirmasi Hapus Role"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Batal</button>
            <button className="btn btn-danger" onClick={handleDelete}>Ya, Hapus</button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Hapus role <strong>"{deleteConfirm?.display_name}"</strong>?
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Aksi ini tidak bisa dibatalkan. Pastikan tidak ada pengguna yang masih menggunakan role ini.
          </p>
        </div>
      </Modal>
    </div>
  );
}
