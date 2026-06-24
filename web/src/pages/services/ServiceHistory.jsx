import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';

export default function ServiceHistory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/services/history').then(r=>{setData(r.data.data);setLoading(false);}).catch(()=>setLoading(false)); }, []);
  const columns = [
    { key:'wo_number', label:'No WO', primary:true },
    { key:'nopol', label:'Kendaraan' },
    { key:'merk', label:'Merk' },
    { key:'service_type', label:'Tipe' },
    { key:'description', label:'Deskripsi' },
    { key:'workshop_name', label:'Bengkel' },
    { key:'completed_date', label:'Tgl Selesai', render:v=>v?new Date(v).toLocaleDateString('id-ID'):'-' },
    { key:'km_at_service', label:'KM Service', render:v=>v?`${v.toLocaleString()} km`:'-' },
    { key:'actual_cost', label:'Biaya', render:v=>v?`Rp ${Number(v).toLocaleString('id-ID')}`:'-' },
  ];
  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">History Service</h1><p className="page-subtitle">Riwayat seluruh pekerjaan service kendaraan</p></div></div>
      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}
