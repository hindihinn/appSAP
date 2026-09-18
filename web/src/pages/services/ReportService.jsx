import { useEffect, useState } from 'react';
import api, { getImageUrl } from '../../services/api';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import {
  FaWrench,
  FaCalendarAlt,
  FaDollarSign,
  FaStickyNote,
  FaFileAlt,
  FaClipboardList,
  FaSearch,
  FaTrash,
  FaBuilding,
  FaCogs,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaInbox,
  FaPlus
} from 'react-icons/fa';

export default function ReportService() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // WO Creation Modal State
  const [woModalOpen, setWoModalOpen] = useState(false);
  const [workshopName, setWorkshopName] = useState('');
  const [workshopAddress, setWorkshopAddress] = useState('');
  const [mechanicName, setMechanicName] = useState('');
  const [repairDate, setRepairDate] = useState(new Date().toISOString().slice(0, 10));
  const [estimatedCost, setEstimatedCost] = useState('');
  const [priority, setPriority] = useState('medium');
  const [woNotes, setWoNotes] = useState('');
  const [submittingWo, setSubmittingWo] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/services/tickets');
      setTickets(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetails = async (id) => {
    setDetailsLoading(true);
    try {
      const res = await api.get(`/services/tickets/${id}`);
      setTicketDetails(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSelectTicket = (t) => {
    setSelectedTicket(t);
    loadTicketDetails(t.id);
  };

  const handleOpenWoModal = () => {
    setWorkshopName('');
    setWorkshopAddress('');
    setMechanicName('');
    setRepairDate(new Date().toISOString().slice(0, 10));
    setEstimatedCost('');
    setPriority('medium');
    setWoNotes('');
    setWoModalOpen(true);
  };

  const handleSubmitWo = async (e) => {
    e.preventDefault();
    if (!workshopName) return alert('Nama Bengkel wajib diisi');

    setSubmittingWo(true);
    try {
      await api.post('/services/work-orders', {
        ticket_id: selectedTicket.id,
        service_type: 'corrective',
        category: 'Perbaikan Kerusakan',
        description: `Perbaikan kendala: ${ticketDetails.description}`,
        workshop_name: workshopName,
        workshop_address: workshopAddress,
        mechanic_name: mechanicName,
        reported_date: repairDate,
        km_at_service: ticketDetails.notes && !isNaN(ticketDetails.notes) ? Number(ticketDetails.notes) : 0,
        estimated_cost: estimatedCost ? Number(estimatedCost) : 0,
        priority: priority,
        notes: woNotes
      });

      alert('Work Order Service berhasil dibuat!');
      setWoModalOpen(false);
      loadTickets();
      if (selectedTicket) {
        loadTicketDetails(selectedTicket.id);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal membuat Work Order');
    } finally {
      setSubmittingWo(false);
    }
  };

  const handleRejectTicket = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menolak laporan kerusakan ini?')) return;
    try {
      await api.put(`/services/tickets/${selectedTicket.id}/status`, { status: 'rejected' });
      alert('Laporan kerusakan ditolak!');
      loadTickets();
      if (selectedTicket) {
        loadTicketDetails(selectedTicket.id);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menolak laporan kerusakan');
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      t.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.nopol?.toLowerCase().includes(search.toLowerCase()) ||
      t.damage_type?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ? true : t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header Banner */}
      <div style={{
        background: 'var(--gradient-services)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 28,
        position: 'relative', overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FaFileAlt size={22} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>Report Service</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>Manajemen Laporan Kerusakan Kendaraan dari Driver</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Side: Ticket List */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' }}>
          {/* Filters & Search */}
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={13} />
              <input
                type="text"
                placeholder="Cari ticket, nopol, driver..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  background: 'var(--bg-primary)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
            {/* Status Quick Filters */}
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'pending', 'approved', 'rejected', 'completed'].map(st => {
                const labelMap = { all: 'Semua', pending: 'Pending', approved: 'Disetujui', rejected: 'Ditolak', completed: 'Selesai' };
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: statusFilter === st ? 'var(--accent)' : 'var(--bg-primary)',
                      color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.15s'
                    }}
                  >
                    {labelMap[st] || st.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat tiket...</div>
            ) : filteredTickets.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <FaInbox size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div style={{ fontSize: 13 }}>Tidak ada laporan</div>
              </div>
            ) : (
              filteredTickets.map(t => {
                const isActive = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: isActive ? 'rgba(59,130,246,0.06)' : 'var(--bg-primary)',
                      border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                      marginBottom: 10,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 4px 12px rgba(59,130,246,0.05)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{t.ticket_number}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      🚙 <strong>{t.nopol}</strong> · {t.merk} {t.model}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>👤 {t.driver_name}</span>
                      <span>📅 {new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Ticket Details Panel */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, minHeight: 'calc(100vh - 220px)' }}>
          {!selectedTicket ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
              <FaClipboardList size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h4>Pilih Laporan Kerusakan</h4>
              <p style={{ fontSize: 12 }}>Silakan pilih salah satu tiket laporan di panel kiri untuk melihat detail kerusakan</p>
            </div>
          ) : detailsLoading || !ticketDetails ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Memuat detail laporan...</div>
          ) : (
            <div>
              {/* Detail Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{ticketDetails.ticket_number}</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Dilaporkan pada {new Date(ticketDetails.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {ticketDetails.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={handleRejectTicket}
                      style={{
                        background: 'var(--danger)',
                        color: '#fff',
                        border: 'none',
                        padding: '9px 18px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 12px rgba(239,68,68,0.2)'
                      }}
                    >
                      <FaTimesCircle size={12} /> Tolak Laporan
                    </button>
                    <button
                      onClick={handleOpenWoModal}
                      style={{
                        background: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        padding: '9px 18px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 12px rgba(59,130,246,0.2)'
                      }}
                    >
                      <FaPlus size={12} /> Buat WO Service
                    </button>
                  </div>
                )}
              </div>

              {/* Info Sections Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Detail Driver & Unit</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{ticketDetails.driver_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    🚙 {ticketDetails.nopol} ({ticketDetails.merk} {ticketDetails.model})
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    🏢 {ticketDetails.company_name} · {ticketDetails.unit_name}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Jenis Kerusakan</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)', textTransform: 'capitalize' }}>
                    ⚠️ {ticketDetails.damage_type.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Status: <StatusBadge status={ticketDetails.status} />
                  </div>
                </div>
              </div>

              {/* Description & Notes */}
              <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Deskripsi Kerusakan</h4>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                  {ticketDetails.description}
                </div>
                {ticketDetails.notes && (
                  <div style={{ marginTop: 14 }}>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Keterangan Tambahan</h5>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{ticketDetails.notes}"
                    </div>
                  </div>
                )}
              </div>

              {/* Photos */}
              <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Bukti Foto Kerusakan</h4>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {ticketDetails.photos?.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Tidak ada bukti foto terlampir</div>
                  ) : (() => {
                    return ticketDetails.photos?.map(p => (
                      <div key={p.id} style={{ border: '1px solid var(--border)', padding: 4, borderRadius: 8, background: 'var(--bg-secondary)' }}>
                        <a href={getImageUrl(p.photo_path)} target="_blank" rel="noreferrer">
                          <img
                            src={getImageUrl(p.photo_path)}
                            alt="Bukti kerusakan"
                            style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getImageUrl(p.photo_path);
                            }}
                          />
                        </a>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WO Service Creation Modal */}
      <Modal
        isOpen={woModalOpen}
        onClose={() => setWoModalOpen(false)}
        title="Buat Work Order (WO) Service"
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setWoModalOpen(false)}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              onClick={handleSubmitWo}
              disabled={submittingWo}
              style={{
                padding: '9px 20px',
                borderRadius: 8,
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59,130,246,0.15)'
              }}
            >
              {submittingWo ? 'Memproses...' : 'Simpan & Kirim WO'}
            </button>
          </div>
        }
      >
        {selectedTicket && (
          <form onSubmit={handleSubmitWo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'rgba(59,130,246,0.04)', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)', fontSize: 12 }}>
              <div>Nomor Tiket: <strong>{selectedTicket.ticket_number}</strong></div>
              <div style={{ marginTop: 2 }}>Unit Kendaraan: <strong>{selectedTicket.nopol}</strong> ({selectedTicket.merk})</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Nama Bengkel *</label>
              <input
                type="text"
                placeholder="Contoh: Bengkel Utama Motor"
                value={workshopName}
                onChange={e => setWorkshopName(e.target.value)}
                style={{
                  padding: '9px 12px',
                  background: 'var(--bg-primary)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: 13
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Alamat Bengkel</label>
              <textarea
                placeholder="Masukkan alamat bengkel perbaikan"
                value={workshopAddress}
                onChange={e => setWorkshopAddress(e.target.value)}
                rows={2}
                style={{
                  padding: '9px 12px',
                  background: 'var(--bg-primary)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: 13,
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Nama Mekanik</label>
                <input
                  type="text"
                  placeholder="Nama mekanik/kontak"
                  value={mechanicName}
                  onChange={e => setMechanicName(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    background: 'var(--bg-primary)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: 13
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Tanggal Rencana Perbaikan</label>
                <input
                  type="date"
                  value={repairDate}
                  onChange={e => setRepairDate(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    background: 'var(--bg-primary)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: 13
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Estimasi Biaya (Rp)</label>
                <input
                  type="number"
                  placeholder="Rp 0"
                  value={estimatedCost}
                  onChange={e => setEstimatedCost(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    background: 'var(--bg-primary)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: 13
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Prioritas Perbaikan</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    background: 'var(--bg-primary)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: 13
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Keterangan / Instruksi</label>
              <textarea
                placeholder="Masukkan keterangan detail instruksi perbaikan..."
                value={woNotes}
                onChange={e => setWoNotes(e.target.value)}
                rows={2}
                style={{
                  padding: '9px 12px',
                  background: 'var(--bg-primary)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: 13,
                  resize: 'none'
                }}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
