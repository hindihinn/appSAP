import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { FaExclamationTriangle, FaMobileAlt, FaUserCheck, FaUsers, FaSync, FaWarehouse } from 'react-icons/fa';

export default function UserMobile() {
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [mobileRoles, setMobileRoles] = useState([]);
  const [orgs, setOrgs] = useState({ companies: [], units: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    name: '', username: '', password: '', phone: '', role_id: '',
    company_id: '', unit_id: '', is_active: 1
  });
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, oRes, dRes, rRes] = await Promise.all([
        api.get('/users?type=mobile'),
        api.get('/organizations/companies'),
        api.get('/drivers?exclude_photos=true'),
        api.get('/roles')
      ]);
      setUsers(uRes.data.data || []);
      setDrivers(dRes.data.data || []);
      setOrgs(prev => ({ ...prev, companies: oRes.data.data || [] }));
      const allRoles = rRes.data.data || [];
      const mobRoles = allRoles.filter(r => r.platform === 'mobile');
      setMobileRoles(mobRoles);
      // Set default role_id to first mobile role
      if (mobRoles.length > 0) {
        setForm(f => ({ ...f, role_id: f.role_id || mobRoles[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOrgChange = async (type, id) => {
    if (type === 'company') {
      const res = await api.get(`/organizations/units?company_id=${id}`);
      setOrgs(prev => ({ ...prev, units: res.data.data }));
      setForm(f => ({ ...f, company_id: id, unit_id: '' }));
    }
  };

  // When a driver is selected from the dropdown, auto-fill name, phone, unit, company
  const handleDriverSelect = async (driverId) => {
    setSelectedDriverId(driverId);
    if (!driverId) {
      setForm(f => ({ ...f, name: '', phone: '', company_id: '', unit_id: '' }));
      setOrgs(prev => ({ ...prev, units: [] }));
      return;
    }
    const driver = drivers.find(d => String(d.id) === String(driverId));
    if (!driver) return;

    // Load units for the driver's company if available
    if (driver.company_id) {
      const res = await api.get(`/organizations/units?company_id=${driver.company_id}`);
      setOrgs(prev => ({ ...prev, units: res.data.data }));
    }

    setForm(f => ({
      ...f,
      name: driver.name || '',
      phone: driver.phone || '',
      company_id: driver.company_id || '',
      unit_id: driver.unit_id || '',
    }));
  };

  const handleRoleChange = (newRoleId) => {
    setForm(f => ({
      ...f,
      role_id: parseInt(newRoleId),
      name: '', phone: '', company_id: '', unit_id: ''
    }));
    setSelectedDriverId('');
    setOrgs(prev => ({ ...prev, units: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      company_id: form.company_id === '' || form.company_id === null ? null : Number(form.company_id),
      unit_id: form.unit_id === '' || form.unit_id === null ? null : Number(form.unit_id),
      role_id: form.role_id === '' ? null : Number(form.role_id),
      is_active: Number(form.is_active)
    };
    try {
      if (modal.id) {
        await api.put(`/users/${modal.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setModal(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan user');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus user');
    }
  };

  const columns = [
    { label: 'Nama', key: 'name' },
    { label: 'Username Login', key: 'username' },
    { label: 'Role', key: 'role_id', render: (v, row) => {
      const role = mobileRoles.find(r => r.id === v) || { display_name: row.role_name || `Role #${v}` };
      return <span className="badge badge-purple">{role.display_name}</span>;
    }},
    { label: 'Unit/Gudang', key: 'unit_name', render: (v, row) => <span>{row.unit_name || row.company_name || '-'}</span> },
    { label: 'Status Akun', key: 'is_active', render: (v, row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
    { label: 'Aplikasi Terakhir', key: 'last_login', render: (v, row) => <span>{row.last_login ? new Date(row.last_login).toLocaleString('id-ID') : 'Belum Login'}</span> },
    {
      label: 'Aksi',
      key: 'actions',
      render: (v, row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setModal(row);
            setSelectedDriverId('');
            setForm({ ...row, password: '', role_id: row.role_id });
            if (row.company_id) handleOrgChange('company', row.company_id);
          }}>Edit Akses</button>
          <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(row)}>Hapus</button>
        </div>
      )
    }
  ];

  // Check if current role is driver-type (by role name, not hardcoded ID)
  const selectedRole = mobileRoles.find(r => String(r.id) === String(form.role_id));
  const isDriver = selectedRole ? selectedRole.name.toLowerCase().includes('driver') : false;

  // Calculate metrics
  const totalCount = users.length;
  const driverCount = users.filter(u => u.role_name?.toLowerCase().includes('driver')).length;
  const staffCount = totalCount - driverCount;

  return (
    <div>
      {/* ══ HERO HEADER BANNER (USER MOBILE - SETTINGS THEME) ══ */}
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
              <FaMobileAlt size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Pengguna Aplikasi Mobile
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                Kelola kredensial login dan status aktif untuk driver dan staff gudang lapangan
              </p>
            </div>
          </div>

          {/* Action Area & Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => {
              setModal({});
              setSelectedDriverId('');
              setForm({ name: '', username: '', password: '', phone: '', role_id: mobileRoles[0]?.id || '', company_id: '', unit_id: '', is_active: 1 });
              setOrgs(prev => ({ ...prev, units: [] }));
            }} style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              + Tambah Akses Mobile
            </button>
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
            { label: 'Total User Mobile', val: totalCount, icon: <FaUsers size={20} /> },
            { label: 'Kategori Driver', val: driverCount, icon: <FaUserCheck size={20} /> },
            { label: 'Kategori Gudang / Staff', val: staffCount, icon: <FaWarehouse size={18} /> },
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

      <div className="card">
        <DataTable columns={columns} data={users} loading={loading} />
      </div>

      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit Pengguna Mobile' : 'Tambah Pengguna Mobile'}
        footer={<button className="btn btn-primary" onClick={handleSubmit}>Simpan</button>}
      >
        <form className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Role Selection — Always at top */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Role Akses Mobile</label>
            <select
              className="form-select"
              value={form.role_id}
              onChange={e => handleRoleChange(e.target.value)}
            >
              <option value="">-- Pilih Role --</option>
              {mobileRoles.map(r => (
                <option key={r.id} value={r.id}>{r.display_name}</option>
              ))}
            </select>
          </div>

          {/* === DRIVER MODE: Select from existing drivers === */}
          {isDriver && !modal?.id && (
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Pilih Driver</label>
              <select
                className="form-select"
                value={selectedDriverId}
                onChange={e => handleDriverSelect(e.target.value)}
                required
              >
                <option value="">-- Pilih Driver --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.unit_name ? ` — ${d.unit_name}` : ''}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Nama, No. Telepon, PT & Unit akan otomatis terisi dari data driver
              </div>
            </div>
          )}

          {/* Nama — read-only if driver mode with selection, manual if staff gudang or edit */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Nama {isDriver ? 'Driver' : 'Staff'}</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => !isDriver && setForm({ ...form, name: e.target.value })}
              readOnly={isDriver && !!selectedDriverId && !modal?.id}
              style={isDriver && !!selectedDriverId && !modal?.id ? { background: 'var(--bg-secondary)', cursor: 'not-allowed' } : {}}
              placeholder={isDriver && !selectedDriverId ? 'Pilih driver terlebih dahulu' : ''}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username Login</label>
            <input
              className="form-input"
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password {modal?.id && '(Kosongkan jika tidak ganti)'}</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">No. Telepon</label>
            <input
              className="form-input"
              value={form.phone}
              onChange={e => !isDriver || !selectedDriverId ? setForm({ ...form, phone: e.target.value }) : null}
              readOnly={isDriver && !!selectedDriverId && !modal?.id}
              style={isDriver && !!selectedDriverId && !modal?.id ? { background: 'var(--bg-secondary)', cursor: 'not-allowed' } : {}}
            />
          </div>

          {/* PT & Unit — auto-filled in driver mode, manual in staff mode */}
          <div className="form-group">
            <label className="form-label">Perusahaan (PT)</label>
            {isDriver && !!selectedDriverId && !modal?.id ? (
              // Read-only display when driver is selected
              <input
                className="form-input"
                value={orgs.companies.find(c => String(c.id) === String(form.company_id))?.name || form.company_id || '—'}
                readOnly
                style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }}
              />
            ) : (
              <select
                className="form-select"
                value={form.company_id}
                onChange={e => handleOrgChange('company', e.target.value)}
              >
                <option value="">-- Pilih --</option>
                {orgs.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Unit / Gudang</label>
            {isDriver && !!selectedDriverId && !modal?.id ? (
              // Read-only display when driver is selected
              <input
                className="form-input"
                value={orgs.units.find(u => String(u.id) === String(form.unit_id))?.name || form.unit_id || '—'}
                readOnly
                style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }}
              />
            ) : (
              <select
                className="form-select"
                value={form.unit_id}
                onChange={e => setForm({ ...form, unit_id: e.target.value })}
              >
                <option value="">-- Pilih --</option>
                {orgs.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Status Akun</label>
            <select
              className="form-select"
              value={form.is_active}
              onChange={e => setForm({ ...form, is_active: parseInt(e.target.value) })}
            >
              <option value={1}>Aktif (Bisa Login)</option>
              <option value={0}>Non-Aktif (Blokir)</option>
            </select>
          </div>

        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Konfirmasi Hapus User Mobile"
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
            Hapus akses mobile <strong>"{deleteConfirm?.name}"</strong>?
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            User tidak akan bisa login ke aplikasi mobile. Aksi ini tidak bisa dibatalkan.
          </p>
        </div>
      </Modal>
    </div>
  );
}
