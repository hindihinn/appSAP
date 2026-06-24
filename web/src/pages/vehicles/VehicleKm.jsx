import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';

export default function VehicleKm() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/vehicle-km/monitoring').then(r => { setData(r.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const columns = [
    { key:'nopol', label:'No. Polisi', primary:true },
    { key:'merk', label:'Kendaraan', render:(v,r) => `${v} ${r.model||''}` },
    { key:'current_km', label:'KM Saat Ini', render:v => (v||0).toLocaleString('id-ID') + ' km' },
    { key:'last_km', label:'KM Terakhir Input', render:v => v ? v.toLocaleString('id-ID') + ' km' : '-' },
    { key:'last_recorded', label:'Terakhir Dicatat', render:v => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Monitoring Kilometer</h1><p className="page-subtitle">Pantau kilometer kendaraan secara berkala</p></div>
      </div>
      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}
