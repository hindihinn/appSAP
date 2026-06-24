import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { HiOutlineIdentification, HiOutlineOfficeBuilding, HiOutlineViewGrid, HiOutlineTruck, HiOutlineTag, HiOutlineCube, HiOutlineCalendar, HiOutlineColorSwatch, HiOutlineScale, HiOutlineLightningBolt, HiOutlineLocationMarker, HiOutlineClipboardList, HiOutlineCamera, HiOutlinePhotograph, HiOutlineTrash, HiOutlineUpload, HiOutlinePencil, HiOutlineDocumentText, HiOutlineShieldCheck, HiOutlineCog, HiOutlineEye, HiOutlineX, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineZoomIn } from 'react-icons/hi';

const INIT = { vehicle_code:'', company_id:'', unit_id:'', nopol:'', merk:'', model:'', type:'truck', year:'', color:'', chassis_number:'', engine_number:'', capacity_ton:'', fuel_type:'solar', current_km:0, ownership:'owned', notes:'' };

const PHOTO_FIELDS = [
  { key: 'photo_front', label: 'Depan', desc: 'Tampak Depan' },
  { key: 'photo_back', label: 'Belakang', desc: 'Tampak Belakang' },
  { key: 'photo_left', label: 'Kiri', desc: 'Samping Kiri' },
  { key: 'photo_right', label: 'Kanan', desc: 'Samping Kanan' },
];

/* ── Reusable: Section Header ── */
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:10, borderBottom:'1px solid var(--border-color, #e2e8f0)' }}>
    <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg, #1b7a8a, #1a94a8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Icon size={16} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize:'0.88rem', fontWeight:700, color:'var(--text-primary, #1a2e35)' }}>{title}</div>
      {subtitle && <div style={{ fontSize:'0.72rem', color:'var(--text-muted, #8ba3ab)' }}>{subtitle}</div>}
    </div>
  </div>
);

/* ── Reusable: Form Field with Icon ── */
const IconField = ({ icon: Icon, label, required, children }) => (
  <div className="form-group" style={{ marginBottom:14 }}>
    <label className="form-label" style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary, #4a6670)', marginBottom:6 }}>
      <Icon size={14} style={{ opacity:0.7 }} />
      {label}{required && <span style={{ color:'var(--danger, #dc2626)', marginLeft:2 }}>*</span>}
    </label>
    {children}
  </div>
);

/* ── Status label map ── */
const STATUS_MAP = {
  available: { label:'Tersedia', color:'#059669', bg:'rgba(5,150,105,0.1)' },
  in_use: { label:'Digunakan', color:'#0e8fa0', bg:'rgba(14,143,160,0.1)' },
  maintenance: { label:'Maintenance', color:'#d97706', bg:'rgba(217,119,6,0.1)' },
  inactive: { label:'Nonaktif', color:'#dc2626', bg:'rgba(220,38,38,0.1)' },
};
const OWNERSHIP_MAP = { owned:'Milik Sendiri', rental:'Rental', leasing:'Leasing' };

/* ── View Detail Row ── */
const DetailRow = ({ icon: Icon, label, value }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #f1f5f9' }}>
    <Icon size={15} style={{ color:'var(--accent, #1a94a8)', flexShrink:0 }} />
    <span style={{ fontSize:'0.78rem', color:'var(--text-muted, #8ba3ab)', width:120, flexShrink:0 }}>{label}</span>
    <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-primary, #1a2e35)' }}>{value || '—'}</span>
  </div>
);

export default function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [units, setUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(INIT);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [photoPreviews, setPhotoPreviews] = useState({});
  const [viewData, setViewData] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [viewPhotoIdx, setViewPhotoIdx] = useState(0);
  const [lightbox, setLightbox] = useState({ open: false, photos: [], idx: 0 });
  const fileRefs = useRef({});

  const load = async () => {
    setLoading(true);
    const [vRes, uRes, cRes] = await Promise.all([
      api.get('/vehicles', { params: { status: filterStatus || undefined } }),
      api.get('/organizations/units'),
      api.get('/organizations/companies'),
    ]);
    setVehicles(vRes.data.data);
    setUnits(uRes.data.data);
    setCompanies(cRes.data.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterStatus]);

  useEffect(() => {
    if (form.company_id) {
      const filtered = units.filter(u => String(u.company_id) === String(form.company_id));
      setFilteredUnits(filtered);
      if (!filtered.find(u => String(u.id) === String(form.unit_id))) {
        setForm(f => ({ ...f, unit_id: '' }));
      }
    } else {
      setFilteredUnits(units);
    }
  }, [form.company_id, units]);

  const openAdd = () => { setForm(INIT); setEditing(null); setPhotoPreviews({}); setModal(true); };

  const openView = (v) => {
    setViewData(v);
    setViewPhotoIdx(0);
    setViewModal(true);
  };

  const openEdit = (v) => {
    const vehicleUnit = units.find(u => u.id === v.unit_id);
    const companyId = vehicleUnit ? vehicleUnit.company_id : (v.company_id || '');
    setForm({ ...v, unit_id: v.unit_id || '', company_id: String(companyId || '') });
    setEditing(v.id);
    const previews = {};
    const apiBase = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
    PHOTO_FIELDS.forEach(pf => { if (v[pf.key]) previews[pf.key] = `${apiBase}${v[pf.key]}`; });
    setPhotoPreviews(previews);
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'company_id') return;
        if (PHOTO_FIELDS.some(pf => pf.key === k)) return;
        if (v !== undefined && v !== null) fd.append(k, v);
      });
      PHOTO_FIELDS.forEach(pf => { if (form[pf.key] instanceof File) fd.append(pf.key, form[pf.key]); });
      if (editing) await api.put(`/vehicles/${editing}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/vehicles', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.message || 'Gagal menyimpan'); }
    setSaving(false);
  };

  const handleDelete = async (id) => { if (!confirm('Hapus kendaraan ini?')) return; await api.delete(`/vehicles/${id}`); load(); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhotoChange = (key, file) => {
    if (!file) return;
    set(key, file);
    setPhotoPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
  };

  const removePhoto = (key) => {
    set(key, null);
    setPhotoPreviews(prev => { const n = { ...prev }; if (n[key]?.startsWith('blob:')) URL.revokeObjectURL(n[key]); delete n[key]; return n; });
    if (fileRefs.current[key]) fileRefs.current[key].value = '';
  };

  const columns = [
    { key:'vehicle_code', label:'Kode', render: v => v || '-' },
    { key:'nopol', label:'No. Polisi', primary:true },
    { key:'merk', label:'Merk', render:(v,r) => `${v} ${r.model||''}` },
    { key:'type', label:'Tipe' },
    { key:'year', label:'Tahun' },
    { key:'company_name', label:'PT' },
    { key:'unit_name', label:'Unit' },
    { key:'current_km', label:'KM Saat Ini', render:v => v?.toLocaleString('id-ID') + ' km' },
    { key:'status', label:'Status', badge:true },
    { key:'fuel_type', label:'BBM' },
  ];

  const g3 = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 };
  const g2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Unit Kendaraan</h1><p className="page-subtitle">Kelola data unit kendaraan operasional</p></div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select className="form-select" style={{ width:160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="available">Tersedia</option>
            <option value="in_use">Digunakan</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>

      <DataTable columns={columns} data={vehicles} loading={loading} onAdd={openAdd} addLabel="Tambah Kendaraan"
        actions={(row) => (
          <div style={{ display:'flex', gap:4 }}>
            <button className="btn btn-ghost btn-sm" title="Lihat Detail" onClick={() => openView(row)} style={{ color:'var(--accent, #1a94a8)' }}><HiOutlineEye size={16}/></button>
            <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(row)}><HiOutlinePencil size={15}/></button>
            <button className="btn btn-ghost btn-sm" title="Hapus" onClick={() => handleDelete(row.id)}><HiOutlineTrash size={15}/></button>
          </div>
        )}
      />

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Kendaraan' : 'Tambah Kendaraan'} size="xl"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </>}>
        <form onSubmit={handleSave}>

          {/* ═══ Section 1: Identitas & Organisasi ═══ */}
          <SectionHeader icon={HiOutlineIdentification} title="Identitas & Organisasi" subtitle="Kode kendaraan, perusahaan dan unit" />
          <div style={g3}>
            <IconField icon={HiOutlineTag} label="Kode Kendaraan">
              <input className="form-input" placeholder="VHC-001" value={form.vehicle_code} onChange={e => set('vehicle_code', e.target.value)} />
            </IconField>
            <IconField icon={HiOutlineOfficeBuilding} label="PT (Perusahaan)" required>
              <select className="form-select" value={form.company_id} onChange={e => set('company_id', e.target.value)} required>
                <option value="">— Pilih PT —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </IconField>
            <IconField icon={HiOutlineViewGrid} label="Unit" required>
              <select className="form-select" value={form.unit_id} onChange={e => set('unit_id', e.target.value)} required disabled={!form.company_id}
                style={!form.company_id ? { opacity:0.5, cursor:'not-allowed' } : {}}>
                <option value="">{form.company_id ? '— Pilih Unit —' : '— Pilih PT dulu —'}</option>
                {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </IconField>
          </div>

          {/* ═══ Section 2: Informasi Kendaraan ═══ */}
          <div style={{ marginTop:20 }}>
            <SectionHeader icon={HiOutlineTruck} title="Informasi Kendaraan" subtitle="Detail merk, model dan spesifikasi" />
            <div style={g3}>
              <IconField icon={HiOutlineClipboardList} label="No. Polisi" required>
                <input className="form-input" placeholder="B 1234 XYZ" value={form.nopol} onChange={e => set('nopol', e.target.value)} required />
              </IconField>
              <IconField icon={HiOutlineCube} label="Merk" required>
                <input className="form-input" placeholder="Mitsubishi" value={form.merk} onChange={e => set('merk', e.target.value)} required />
              </IconField>
              <IconField icon={HiOutlineCube} label="Model">
                <input className="form-input" placeholder="Canter" value={form.model} onChange={e => set('model', e.target.value)} />
              </IconField>
            </div>
            <div style={g3}>
              <IconField icon={HiOutlineTruck} label="Tipe">
                <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                  {['truck','pickup','van','minibus','sedan','motorcycle','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </IconField>
              <IconField icon={HiOutlineCalendar} label="Tahun">
                <input className="form-input" type="number" placeholder="2024" value={form.year} onChange={e => set('year', e.target.value)} />
              </IconField>
              <IconField icon={HiOutlineColorSwatch} label="Warna">
                <input className="form-input" placeholder="Putih" value={form.color || ''} onChange={e => set('color', e.target.value)} />
              </IconField>
            </div>
          </div>

          {/* ═══ Section 3: Spesifikasi Teknis ═══ */}
          <div style={{ marginTop:20 }}>
            <SectionHeader icon={HiOutlineCog} title="Spesifikasi Teknis" subtitle="Kapasitas, bahan bakar dan kilometer" />
            <div style={g3}>
              <IconField icon={HiOutlineScale} label="Kapasitas (Ton)">
                <input className="form-input" type="number" step="0.1" placeholder="0.0" value={form.capacity_ton} onChange={e => set('capacity_ton', e.target.value)} />
              </IconField>
              <IconField icon={HiOutlineLightningBolt} label="Bahan Bakar">
                <select className="form-select" value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)}>
                  {['solar','pertalite','pertamax','dex'].map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
                </select>
              </IconField>
              <IconField icon={HiOutlineLocationMarker} label="KM Saat Ini">
                <input className="form-input" type="number" placeholder="0" value={form.current_km} onChange={e => set('current_km', e.target.value)} />
              </IconField>
            </div>
            <div style={g2}>
              <IconField icon={HiOutlineShieldCheck} label="Kepemilikan">
                <select className="form-select" value={form.ownership} onChange={e => set('ownership', e.target.value)}>
                  <option value="owned">Milik Sendiri</option>
                  <option value="rental">Rental</option>
                  <option value="leasing">Leasing</option>
                </select>
              </IconField>
              {editing && (
                <IconField icon={HiOutlineCog} label="Status">
                  <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="available">Tersedia</option>
                    <option value="in_use">Digunakan</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </IconField>
              )}
            </div>
          </div>

          {/* ═══ Section 4: Foto Kendaraan ═══ */}
          <div style={{ marginTop:20 }}>
            <SectionHeader icon={HiOutlineCamera} title="Dokumentasi Foto" subtitle="Upload foto dari 4 sisi kendaraan" />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
              {PHOTO_FIELDS.map(pf => (
                <div key={pf.key}
                  className="vehicle-photo-card"
                  onClick={() => !photoPreviews[pf.key] && fileRefs.current[pf.key]?.click()}
                  style={{
                    border: photoPreviews[pf.key] ? '2px solid var(--accent, #1a94a8)' : '2px dashed #cbd5e1',
                    borderRadius:12, overflow:'hidden', cursor:'pointer', transition:'all 0.25s ease',
                    background: photoPreviews[pf.key] ? '#f0fdfa' : '#f8fafc',
                    position:'relative',
                  }}
                  onMouseEnter={e => { if (!photoPreviews[pf.key]) { e.currentTarget.style.borderColor='var(--accent, #1a94a8)'; e.currentTarget.style.background='#f0fdfa'; e.currentTarget.style.transform='translateY(-2px)'; } }}
                  onMouseLeave={e => { if (!photoPreviews[pf.key]) { e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.transform='none'; } }}
                >
                  {photoPreviews[pf.key] ? (
                    <div style={{ position:'relative' }}>
                      <img src={photoPreviews[pf.key]} alt={pf.label}
                        style={{ width:'100%', height:130, objectFit:'cover', display:'block' }} />
                      <div style={{ position:'absolute', top:6, right:6, display:'flex', gap:4 }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); fileRefs.current[pf.key]?.click(); }}
                          style={{ width:28, height:28, borderRadius:8, border:'none', background:'rgba(0,0,0,0.55)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                          <HiOutlinePencil size={13}/>
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removePhoto(pf.key); }}
                          style={{ width:28, height:28, borderRadius:8, border:'none', background:'rgba(220,38,38,0.85)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                          <HiOutlineTrash size={13}/>
                        </button>
                      </div>
                      <div style={{ padding:'8px 10px', borderTop:'1px solid var(--border-color, #e2e8f0)', display:'flex', alignItems:'center', gap:6 }}>
                        <HiOutlinePhotograph size={14} style={{ color:'var(--accent, #1a94a8)' }} />
                        <span style={{ fontSize:'0.73rem', fontWeight:600, color:'var(--text-secondary, #4a6670)' }}>{pf.desc}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding:'24px 12px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg, rgba(26,148,168,0.08), rgba(26,148,168,0.15))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <HiOutlineUpload size={20} style={{ color:'var(--accent, #1a94a8)' }} />
                      </div>
                      <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-primary, #1a2e35)' }}>{pf.desc}</div>
                      <div style={{ fontSize:'0.68rem', color:'var(--text-muted, #8ba3ab)', lineHeight:1.3 }}>Klik untuk upload<br/>JPG, PNG maks 10MB</div>
                    </div>
                  )}
                  <input ref={el => fileRefs.current[pf.key] = el} type="file" accept="image/*" style={{ display:'none' }}
                    onChange={e => handlePhotoChange(pf.key, e.target.files[0])} />
                </div>
              ))}
            </div>
          </div>

          {/* ═══ Section 5: Catatan ═══ */}
          <div style={{ marginTop:20 }}>
            <IconField icon={HiOutlineDocumentText} label="Catatan">
              <textarea className="form-textarea" placeholder="Tambahkan catatan (opsional)..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </IconField>
          </div>
        </form>
      </Modal>

      {/* ═══════ VIEW DETAIL MODAL ═══════ */}
      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title="Detail Kendaraan" size="xl"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setViewModal(false)}>Tutup</button>
          <button className="btn btn-primary" onClick={() => { setViewModal(false); if(viewData) openEdit(viewData); }}><HiOutlinePencil size={14} style={{marginRight:4}}/> Edit Kendaraan</button>
        </>}>
        {viewData && (() => {
          const apiBase = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
          const photos = PHOTO_FIELDS.map(pf => ({ ...pf, url: viewData[pf.key] ? `${apiBase}${viewData[pf.key]}` : null })).filter(p => p.url);
          const st = STATUS_MAP[viewData.status] || STATUS_MAP.available;
          return (
            <div>
              {/* Header card */}
              <div style={{ background:'linear-gradient(135deg, #0f3d47, #1a6b7a)', borderRadius:14, padding:'20px 24px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <HiOutlineTruck size={26} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize:'1.15rem', fontWeight:800, color:'#fff' }}>{viewData.merk} {viewData.model || ''}</div>
                    <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.7)', marginTop:2 }}>{viewData.nopol} {viewData.vehicle_code ? `• ${viewData.vehicle_code}` : ''}</div>
                  </div>
                </div>
                <div style={{ background:st.bg, color:st.color, padding:'6px 14px', borderRadius:20, fontSize:'0.78rem', fontWeight:700, border:`1px solid ${st.color}22` }}>{st.label}</div>
              </div>

              {/* Photo gallery */}
              {photos.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <SectionHeader icon={HiOutlineCamera} title="Foto Kendaraan" subtitle={`${photos.length} foto tersedia — klik untuk perbesar`} />
                  {/* Main preview */}
                  <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border-color, #e2e8f0)', marginBottom:10, cursor:'pointer', position:'relative' }}
                    onClick={() => setLightbox({ open:true, photos, idx:viewPhotoIdx })}>
                    <img src={photos[viewPhotoIdx]?.url} alt={photos[viewPhotoIdx]?.desc}
                      style={{ width:'100%', height:280, objectFit:'cover', display:'block' }} />
                    <div style={{ position:'absolute', top:10, right:10, width:36, height:36, borderRadius:10, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                      <HiOutlineZoomIn size={18} color="#fff" />
                    </div>
                    <div style={{ padding:'8px 14px', background:'#f8fafc', display:'flex', alignItems:'center', gap:6 }}>
                      <HiOutlinePhotograph size={14} style={{ color:'var(--accent)' }}/>
                      <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)' }}>{photos[viewPhotoIdx]?.desc}</span>
                    </div>
                  </div>
                  {/* Thumbnails */}
                  <div style={{ display:'flex', gap:8 }}>
                    {photos.map((p, i) => (
                      <div key={p.key} onClick={() => { setViewPhotoIdx(i); }}
                        style={{ width:72, height:52, borderRadius:8, overflow:'hidden', cursor:'pointer', border: i===viewPhotoIdx ? '2px solid var(--accent, #1a94a8)' : '2px solid transparent', opacity: i===viewPhotoIdx ? 1 : 0.6, transition:'all 0.2s ease' }}
                        onMouseEnter={e => e.currentTarget.style.opacity='1'}
                        onMouseLeave={e => { if(i!==viewPhotoIdx) e.currentTarget.style.opacity='0.6'; }}>
                        <img src={p.url} alt={p.desc} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info sections */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div style={{ background:'#f8fafc', borderRadius:12, padding:16, border:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text-primary)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <HiOutlineIdentification size={15} style={{ color:'var(--accent)' }}/> Identitas & Organisasi
                  </div>
                  <DetailRow icon={HiOutlineTag} label="Kode" value={viewData.vehicle_code} />
                  <DetailRow icon={HiOutlineClipboardList} label="No. Polisi" value={viewData.nopol} />
                  <DetailRow icon={HiOutlineOfficeBuilding} label="PT" value={viewData.company_name} />
                  <DetailRow icon={HiOutlineViewGrid} label="Unit" value={viewData.unit_name} />
                  <DetailRow icon={HiOutlineShieldCheck} label="Kepemilikan" value={OWNERSHIP_MAP[viewData.ownership] || viewData.ownership} />
                </div>
                <div style={{ background:'#f8fafc', borderRadius:12, padding:16, border:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text-primary)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <HiOutlineCog size={15} style={{ color:'var(--accent)' }}/> Spesifikasi Teknis
                  </div>
                  <DetailRow icon={HiOutlineTruck} label="Tipe" value={viewData.type?.charAt(0).toUpperCase() + viewData.type?.slice(1)} />
                  <DetailRow icon={HiOutlineCube} label="Merk / Model" value={`${viewData.merk} ${viewData.model||''}`} />
                  <DetailRow icon={HiOutlineCalendar} label="Tahun" value={viewData.year} />
                  <DetailRow icon={HiOutlineColorSwatch} label="Warna" value={viewData.color} />
                  <DetailRow icon={HiOutlineScale} label="Kapasitas" value={viewData.capacity_ton ? `${viewData.capacity_ton} Ton` : null} />
                  <DetailRow icon={HiOutlineLightningBolt} label="BBM" value={viewData.fuel_type?.charAt(0).toUpperCase() + viewData.fuel_type?.slice(1)} />
                  <DetailRow icon={HiOutlineLocationMarker} label="KM Saat Ini" value={viewData.current_km ? `${Number(viewData.current_km).toLocaleString('id-ID')} km` : null} />
                </div>
              </div>

              {viewData.notes && (
                <div style={{ marginTop:16, background:'#f8fafc', borderRadius:12, padding:16, border:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text-primary)', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                    <HiOutlineDocumentText size={15} style={{ color:'var(--accent)' }}/> Catatan
                  </div>
                  <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight:1.6, margin:0 }}>{viewData.notes}</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ═══════ FULLSCREEN LIGHTBOX ═══════ */}
      {lightbox.open && lightbox.photos.length > 0 && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(8px)', display:'flex', flexDirection:'column', animation:'fadeIn 0.2s ease' }}
          onClick={() => setLightbox(lb => ({ ...lb, open:false }))}>
          {/* Top bar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', flexShrink:0 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <HiOutlinePhotograph size={18} color="rgba(255,255,255,0.7)" />
              <span style={{ color:'#fff', fontSize:'0.9rem', fontWeight:600 }}>{lightbox.photos[lightbox.idx]?.desc}</span>
              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.8rem', marginLeft:8 }}>{lightbox.idx + 1} / {lightbox.photos.length}</span>
            </div>
            <button onClick={() => setLightbox(lb => ({ ...lb, open:false }))}
              style={{ width:40, height:40, borderRadius:10, border:'none', background:'rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
              <HiOutlineX size={20} />
            </button>
          </div>
          {/* Main image area */}
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', padding:'0 80px', minHeight:0 }}
            onClick={e => e.stopPropagation()}>
            {/* Left arrow */}
            {lightbox.photos.length > 1 && (
              <button onClick={() => setLightbox(lb => ({ ...lb, idx: (lb.idx - 1 + lb.photos.length) % lb.photos.length }))}
                style={{ position:'absolute', left:16, width:48, height:48, borderRadius:14, border:'none', background:'rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', zIndex:2 }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                <HiOutlineChevronLeft size={24} />
              </button>
            )}
            <img src={lightbox.photos[lightbox.idx]?.url} alt={lightbox.photos[lightbox.idx]?.desc}
              style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', borderRadius:8, boxShadow:'0 8px 40px rgba(0,0,0,0.4)' }} />
            {/* Right arrow */}
            {lightbox.photos.length > 1 && (
              <button onClick={() => setLightbox(lb => ({ ...lb, idx: (lb.idx + 1) % lb.photos.length }))}
                style={{ position:'absolute', right:16, width:48, height:48, borderRadius:14, border:'none', background:'rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', zIndex:2 }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                <HiOutlineChevronRight size={24} />
              </button>
            )}
          </div>
          {/* Bottom thumbnails */}
          <div style={{ display:'flex', justifyContent:'center', gap:10, padding:'16px 24px', flexShrink:0 }}
            onClick={e => e.stopPropagation()}>
            {lightbox.photos.map((p, i) => (
              <div key={p.key} onClick={() => setLightbox(lb => ({ ...lb, idx: i }))}
                style={{ width:64, height:48, borderRadius:8, overflow:'hidden', cursor:'pointer', border: i===lightbox.idx ? '2px solid #fff' : '2px solid rgba(255,255,255,0.2)', opacity: i===lightbox.idx ? 1 : 0.5, transition:'all 0.2s ease', flexShrink:0 }}
                onMouseEnter={e => e.currentTarget.style.opacity='1'}
                onMouseLeave={e => { if(i!==lightbox.idx) e.currentTarget.style.opacity='0.5'; }}>
                <img src={p.url} alt={p.desc} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
