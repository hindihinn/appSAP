import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { FaDesktop, FaMobileAlt, FaSearch, FaExclamationTriangle, FaCog, FaSync, FaUserShield } from 'react-icons/fa';

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
  
  const [permissionsModal, setPermissionsModal] = useState(null); // null | role
  const [systemPermissions, setSystemPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]); // array of active permission ids
  const [savingPermissions, setSavingPermissions] = useState(false);

  const openPermissions = async (role) => {
    setError('');
    setPermissionsModal(role);
    setRolePermissions([]);
    try {
      let sysPerms = systemPermissions;
      if (sysPerms.length === 0) {
        const res = await api.get('/roles/permissions');
        sysPerms = res.data.data || [];
        setSystemPermissions(sysPerms);
      }
      
      const resActive = await api.get(`/roles/${role.id}/permissions`);
      const activeIds = (resActive.data.data || []).map(p => p.id);
      setRolePermissions(activeIds);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data hak akses');
    }
  };

  const handleTogglePermission = (permissionId) => {
    setRolePermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleToggleModule = (moduleName, systemPerms, isAllSelected) => {
    const modulePermIds = systemPerms.filter(p => p.module === moduleName).map(p => p.id);
    if (isAllSelected) {
      setRolePermissions(prev => prev.filter(id => !modulePermIds.includes(id)));
    } else {
      setRolePermissions(prev => {
        const otherIds = prev.filter(id => !modulePermIds.includes(id));
        return [...otherIds, ...modulePermIds];
      });
    }
  };

  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    setError('');
    try {
      await api.put(`/roles/${permissionsModal.id}/permissions`, {
        permission_ids: rolePermissions
      });
      setPermissionsModal(null);
      alert('Hak akses berhasil diperbarui!');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan hak akses');
    }
    setSavingPermissions(false);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles');
      setRoles(res.data.data || []);
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

  // Calculate metrics
  const totalCount = roles.length;
  const webCount = roles.filter(r => r.platform === 'web').length;
  const mobileCount = roles.filter(r => r.platform === 'mobile').length;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      {/* ══ HERO HEADER BANNER (ROLES - SETTINGS THEME) ══ */}
      <div style={{
        background: 'var(--gradient-settings)',
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
              <FaUserShield size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Hak Akses / Peran (Roles)
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Kelola hak akses aplikasi web dan mobile driver untuk keamanan sistem
              </p>
            </div>
          </div>

          {/* Action Area & Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={openAdd} style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              + Tambah Role
            </button>
            <button onClick={load} style={{
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
            { label: 'Total Peran Terdaftar', val: totalCount, icon: <FaUserShield size={20} /> },
            { label: 'Akses Web Portal', val: webCount, icon: <FaDesktop size={18} /> },
            { label: 'Akses Mobile Driver', val: mobileCount, icon: <FaMobileAlt size={18} /> },
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

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--bg-glass)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { key: 'all', label: 'Semua' },
          { key: 'web', label: 'Web', icon: <FaDesktop size={12} /> },
          { key: 'mobile', label: 'Mobile', icon: <FaMobileAlt size={12} /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
            padding: '6px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            background: filter === tab.key ? 'var(--accent)' : 'transparent',
            color: filter === tab.key ? '#fff' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {tab.icon} {tab.label}
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
                    background: pf.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pf.color,
                  }}>
                    {role.platform === 'mobile' ? <FaMobileAlt size={18} /> : <FaDesktop size={18} />}
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
                  {role.name !== 'super_admin' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openPermissions(role)}
                      title="Kelola hak akses"
                      style={{ color: 'var(--accent)' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Akses
                    </button>
                  )}
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
          <div style={{ marginBottom: 12 }}><FaSearch size={36} style={{ opacity:0.3 }} /></div>
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
              placeholder="cth: Staff GA"
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
              placeholder="cth: ga"
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
              <option value="web">Aplikasi Web</option>
              <option value="mobile">Aplikasi Mobile</option>
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
          <div style={{ marginBottom: 12, color: 'var(--warning)' }}><FaExclamationTriangle size={44} /></div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Hapus role <strong>"{deleteConfirm?.display_name}"</strong>?
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Aksi ini tidak bisa dibatalkan. Pastikan tidak ada pengguna yang masih menggunakan role ini.
          </p>
        </div>
      </Modal>

      {/* Manage Permissions Modal */}
      <Modal
        isOpen={!!permissionsModal}
        onClose={() => setPermissionsModal(null)}
        title={`Kelola Hak Akses: ${permissionsModal?.display_name}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setPermissionsModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSavePermissions} disabled={savingPermissions}>
              {savingPermissions ? 'Menyimpan...' : 'Simpan Hak Akses'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Pilih menu dan fitur yang boleh diakses oleh peran <strong>{permissionsModal?.display_name}</strong>. Hak akses ini akan membatasi tampilan navigasi dan proteksi keamanan API.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '60vh', overflowY: 'auto', paddingRight: 6 }}>
          {Object.keys(
            systemPermissions.reduce((acc, p) => {
              if (!acc[p.module]) acc[p.module] = [];
              acc[p.module].push(p);
              return acc;
            }, {})
          ).map(moduleName => {
            const perms = systemPermissions.filter(p => p.module === moduleName);
            const modulePermIds = perms.map(p => p.id);
            const selectedInModule = rolePermissions.filter(id => modulePermIds.includes(id));
            const isAllSelected = selectedInModule.length === perms.length;

            return (
              <div key={moduleName} style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px 20px',
              }}>
                {/* Module Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {MODULE_LABELS[moduleName] || moduleName.toUpperCase()}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleModule(moduleName, systemPermissions, isAllSelected)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isAllSelected ? 'Hapus Semua' : 'Pilih Semua'}
                  </button>
                </div>

                {/* Permissions Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {perms.map(p => {
                    const isChecked = rolePermissions.includes(p.id);
                    return (
                      <label key={p.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        cursor: 'pointer',
                        padding: '6px 8px',
                        borderRadius: 6,
                        transition: 'background 0.2s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(p.id)}
                          style={{ marginTop: 3, cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {p.display_name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {p.name}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

const MODULE_LABELS = {
  vehicles: 'Manajemen Kendaraan',
  drivers: 'Manajemen Driver / SDM',
  trips: 'Manajemen Dinas (Order, Approval, Report)',
  services: 'Manajemen Maintenance / Service',
  reimburse: 'Manajemen Keuangan / Reimbursement',
  settings: 'Pengaturan Sistem (Role, Company)',
};
