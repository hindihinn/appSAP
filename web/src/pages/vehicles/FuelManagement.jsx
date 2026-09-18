import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { FaGasPump, FaPlus, FaPencilAlt, FaTrash, FaCalendarAlt, FaDollarSign, FaInfoCircle, FaSync } from 'react-icons/fa';

const INIT_FORM = {
  name: '',
  type: 'diesel',
  price: '',
  active_from: ''
};

export default function FuelManagement() {
  const [fuels, setFuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INIT_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadFuels = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/fuels');
      setFuels(response.data.data || []);
    } catch (err) {
      setError('Gagal memuat data bahan bakar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFuels();
  }, []);

  const openAdd = () => {
    setForm(INIT_FORM);
    setEditingId(null);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (fuel) => {
    setForm({
      name: fuel.name || '',
      type: fuel.type || 'diesel',
      price: fuel.price || '',
      active_from: fuel.active_from ? fuel.active_from.split('T')[0] : ''
    });
    setEditingId(fuel.id);
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.type || !form.price || !form.active_from) {
      setError('Semua field wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        price: Number(form.price)
      };

      if (editingId) {
        await api.put(`/fuels/${editingId}`, payload);
      } else {
        await api.post('/fuels', payload);
      }
      setModalOpen(false);
      loadFuels();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data harga bahan bakar ini?')) return;
    try {
      await api.delete(`/fuels/${id}`);
      loadFuels();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus data');
    }
  };

  const columns = [
    { key: 'name', label: 'Nama Bahan Bakar', primary: true },
    { 
      key: 'type', 
      label: 'Jenis', 
      render: v => v === 'gasoline' ? 'Bensin (Gasoline)' : 'Solar (Diesel)' 
    },
    { 
      key: 'price', 
      label: 'Harga per Liter', 
      render: v => `Rp ${Number(v).toLocaleString('id-ID')}` 
    },
    { 
      key: 'active_from', 
      label: 'Periode Aktif Dari', 
      render: v => v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' 
    }
  ];

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      {/* ══ HERO HEADER BANNER ══ */}
      <div style={{
        background: 'var(--gradient-vehicles)',
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
              <FaGasPump size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Harga Bahan Bakar
              </h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>
                Atur dan pantau ketetapan harga BBM aktif untuk klaim reimbursement operasional
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={openAdd} style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              fontSize: 12, fontWeight: 700, backdropFilter: 'blur(10px)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              + Tambah Harga BBM
            </button>
            <button onClick={loadFuels} style={{
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
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaInfoCircle />
          <span>{error}</span>
        </div>
      )}

      {/* ══ INTERACTIVE PRICING BOARDS ══ */}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FaGasPump style={{ color: 'var(--accent)' }} /> Harga Aktif Saat Ini
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        {fuels.length === 0 ? (
          <div style={{ gridColumn: 'span 3', padding: 40, textAlign: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-muted)' }}>
            Belum ada data harga BBM aktif terdaftar.
          </div>
        ) : (
          fuels.map((fuel) => (
            <div key={fuel.id} style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 20,
              boxShadow: 'var(--shadow)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 150
            }}>
              {/* Decorative top accent strip depending on type */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                background: fuel.type === 'gasoline' ? 'var(--accent)' : 'var(--warning)'
              }} />
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: fuel.type === 'gasoline' ? 'var(--accent)' : 'var(--warning)' }}>
                    {fuel.type === 'gasoline' ? 'Bensin' : 'Solar'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FaCalendarAlt size={10} /> {fuel.active_from ? new Date(fuel.active_from).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </span>
                </div>
                
                <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{fuel.name}</h4>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 0 0', letterSpacing: '-0.5px' }}>
                  Rp {Number(fuel.price).toLocaleString('id-ID')}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>/ liter</span>
                </div>
              </div>

              {/* Action buttons inside the pricing card */}
              <div style={{
                display: 'flex', gap: 8, marginTop: 16, paddingTop: 12,
                borderTop: '1px solid var(--border)', justifyContent: 'flex-end'
              }}>
                <button
                  className="btn btn-ghost btn-sm"
                  title="Edit Harga"
                  onClick={() => openEdit(fuel)}
                  style={{ padding: '6px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <FaPencilAlt size={10} /> Edit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  title="Hapus"
                  onClick={() => handleDelete(fuel.id)}
                  style={{ color: 'var(--danger)', padding: '6px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <FaTrash size={10} /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ══ HISTORIC LOGS TABLE ══ */}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FaInfoCircle style={{ color: 'var(--accent)' }} /> Riwayat Log Ketetapan Harga
      </h3>
      
      <div className="card">
        <DataTable 
          columns={columns} 
          data={fuels} 
          loading={loading} 
        />
      </div>

      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingId ? 'Edit Harga Bahan Bakar' : 'Tambah Harga Bahan Bakar'} 
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <FaGasPump size={13} style={{ opacity: 0.7 }} />
              Nama Bahan Bakar *
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Contoh: Dexlite, Biosolar, Pertamax" 
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              required 
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <FaInfoCircle size={13} style={{ opacity: 0.7 }} />
              Kategori Jenis *
            </label>
            <select 
              className="form-select" 
              value={form.type} 
              onChange={e => setForm({ ...form, type: e.target.value })} 
              required
            >
              <option value="diesel">Solar (Diesel)</option>
              <option value="gasoline">Bensin (Gasoline)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <FaDollarSign size={13} style={{ opacity: 0.7 }} />
              Harga per Liter *
            </label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="Contoh: 14500" 
              value={form.price} 
              onChange={e => setForm({ ...form, price: e.target.value })} 
              required 
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <FaCalendarAlt size={13} style={{ opacity: 0.7 }} />
              Periode Aktif Dari *
            </label>
            <input 
              type="date" 
              className="form-input" 
              value={form.active_from} 
              onChange={e => setForm({ ...form, active_from: e.target.value })} 
              required 
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
