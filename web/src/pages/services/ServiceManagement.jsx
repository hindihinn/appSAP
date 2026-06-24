import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';

export default function ServiceManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/services/work-orders').then(r=>{setData(r.data.data);setLoading(false);}).catch(()=>setLoading(false)); }, []);
  const columns = [
    { key:'wo_number', label:'No WO', primary:true },
    { key:'nopol', label:'Kendaraan' },
    { key:'service_type', label:'Tipe' },
    { key:'description', label:'Deskripsi' },
    { key:'reported_date', label:'Tgl Lapor', render:v=>v?new Date(v).toLocaleDateString('id-ID'):'-' },
    { key:'estimated_cost', label:'Est. Biaya', render:v=>v?`Rp ${Number(v).toLocaleString('id-ID')}`:'-' },
    { key:'actual_cost', label:'Biaya Aktual', render:v=>v?`Rp ${Number(v).toLocaleString('id-ID')}`:'-' },
    { key:'priority', label:'Prioritas', badge:true },
    { key:'status', label:'Status', badge:true },
  ];
  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Manajemen Service</h1><p className="page-subtitle">Kelola semua work order service kendaraan</p></div></div>
      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}
