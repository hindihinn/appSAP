import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';

export default function UserWeb() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [orgs, setOrgs] = useState({ companies: [], units: [], divisions: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', role_id: '',
    company_id: '', unit_id: '', division_id: '', is_active: 1
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, rRes, oRes] = await Promise.all([
        api.get('/users?type=web'),
        api.get('/roles'),
        api.get('/organizations/companies')
      ]);
      setUsers(uRes.data.data);
      // Filter out driver and warehouse staff roles (ID 4 and 5) for Web Users
      setRoles(rRes.data.data.filter(r => r.id !== 4 && r.id !== 5));
      setOrgs(prev => ({ ...prev, companies: oRes.data.data }));
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
      setOrgs(prev => ({ ...prev, units: res.data.data, divisions: [] }));
      setForm(f => ({ ...f, company_id: id, unit_id: '', division_id: '' }));
    } else if (type === 'unit') {
      const res = await api.get(`/organizations/divisions?unit_id=${id}`);
      setOrgs(prev => ({ ...prev, divisions: res.data.data }));
      setForm(f => ({ ...f, unit_id: id, division_id: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.id) {
        await api.put(`/users/${modal.id}`, form);
      } else {
        await api.post('/users', form);
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
    { label: 'Email', key: 'email' },
    { label: 'Role', key: 'role_name', render: (v) => <span className="badge badge-purple">{v}</span> },
    { label: 'Unit/Cabang', key: 'unit_name', render: (v, row) => <span>{row.unit_name || row.company_name || '-'}</span> },
    { label: 'Status', key: 'is_active', render: (v, row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
    { label: 'Login Terakhir', key: 'last_login', render: (v, row) => <span>{row.last_login ? new Date(row.last_login).toLocaleString('id-ID') : '-'}</span> },
    {
      label: 'Aksi',
      key: 'actions',
      render: (v, row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setModal(row);
            setForm({ ...row, password: '' });
            if (row.company_id) handleOrgChange('company', row.company_id);
            if (row.unit_id) handleOrgChange('unit', row.unit_id);
          }}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(row)}>Hapus</button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen User Web</h1>
          <p className="page-subtitle">Kelola akun akses sistem web (Admin, HRGA, dsb)</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setModal({});
          setForm({ name: '', email: '', password: '', phone: '', role_id: '', company_id: '', unit_id: '', division_id: '', is_active: 1 });
        }}>+ Tambah User Web</button>
      </div>

      <div className="card">
        <DataTable columns={columns} data={users} loading={loading} />
      </div>

      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit Pengguna Web' : 'Tambah Pengguna Web Baru'}
        footer={<button className="btn btn-primary" onClick={handleSubmit}>Simpan</button>}
      >
        <form className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Nama Lengkap</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password {modal?.id && '(Kosongkan jika tidak ganti)'}</label>
            <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">No. Telepon</label>
            <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Role / Hak Akses</label>
            <select className="form-select" value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })} required>
              <option value="">-- Pilih Role --</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Perusahaan (PT)</label>
            <select className="form-select" value={form.company_id} onChange={e => handleOrgChange('company', e.target.value)}>
              <option value="">-- Pilih --</option>
              {orgs.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Unit / Cabang</label>
            <select className="form-select" value={form.unit_id} onChange={e => handleOrgChange('unit', e.target.value)}>
              <option value="">-- Pilih --</option>
              {orgs.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Status Akun</label>
            <select className="form-select" value={form.is_active} onChange={e => setForm({ ...form, is_active: parseInt(e.target.value) })}>
              <option value={1}>Aktif</option>
              <option value={0}>Non-Aktif</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Konfirmasi Hapus User"
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
            Hapus user <strong>"{deleteConfirm?.name}"</strong>?
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            User akan dinonaktifkan dan tidak bisa login. Aksi ini tidak bisa dibatalkan.
          </p>
        </div>
      </Modal>
    </div>
  );
}
