const STATUS_MAP = {
  available:    { label: 'Tersedia',       cls: 'badge-success' },
  in_use:       { label: 'Digunakan',      cls: 'badge-info' },
  maintenance:  { label: 'Maintenance',    cls: 'badge-warning' },
  inactive:     { label: 'Nonaktif',       cls: 'badge-default' },
  on_duty:      { label: 'Sedang Dinas',   cls: 'badge-info' },
  off:          { label: 'Off',            cls: 'badge-default' },
  active:       { label: 'Aktif',          cls: 'badge-success' },
  expiring_soon:{ label: 'Segera Kadaluarsa', cls: 'badge-warning' },
  expired:      { label: 'Kadaluarsa',     cls: 'badge-danger' },
  pending:      { label: 'Menunggu',       cls: 'badge-default' },
  admin_review: { label: 'Review Admin',   cls: 'badge-warning' },
  hrga_review:  { label: 'Review HRGA',    cls: 'badge-purple' },
  approved:     { label: 'Disetujui',      cls: 'badge-success' },
  in_progress:  { label: 'Berlangsung',    cls: 'badge-info' },
  completed:    { label: 'Selesai',        cls: 'badge-success' },
  rejected:     { label: 'Ditolak',        cls: 'badge-danger' },
  cancelled:    { label: 'Dibatalkan',     cls: 'badge-default' },
  draft:        { label: 'Draft',          cls: 'badge-default' },
  submitted:    { label: 'Diajukan',       cls: 'badge-info' },
  reviewed:     { label: 'Direview',       cls: 'badge-purple' },
  paid:         { label: 'Dibayar',        cls: 'badge-success' },
  due_soon:     { label: 'Jatuh Tempo',    cls: 'badge-warning' },
  overdue:      { label: 'Terlambat',      cls: 'badge-danger' },
  on_schedule:  { label: 'Tepat Waktu',    cls: 'badge-success' },
  low:          { label: 'Rendah',         cls: 'badge-success' },
  medium:       { label: 'Sedang',         cls: 'badge-info' },
  high:         { label: 'Tinggi',         cls: 'badge-warning' },
  urgent:       { label: 'Urgent',         cls: 'badge-danger' },
  critical:     { label: 'Kritis',         cls: 'badge-danger' },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'badge-default' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
