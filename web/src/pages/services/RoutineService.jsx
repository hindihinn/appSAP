import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';

export default function RoutineService() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/services/routine').then(r=>{setData(r.data.data);setLoading(false);}).catch(()=>setLoading(false)); }, []);

  const columns = [
    { key:'nopol', label:'Kendaraan', primary:true },
    { key:'merk', label:'Merk' },
    { key:'service_type', label:'Jenis Service' },
    { key:'interval_km', label:'Interval KM', render:v=>v?`${v.toLocaleString()} km`:'-' },
    { key:'interval_days', label:'Interval Hari', render:v=>v?`${v} hari`:'-' },
    { key:'last_service_date', label:'Service Terakhir', render:v=>v?new Date(v).toLocaleDateString('id-ID'):'-' },
    { key:'next_service_date', label:'Service Berikutnya', render:v=>v?new Date(v).toLocaleDateString('id-ID'):'-' },
    { key:'next_service_km', label:'KM Berikutnya', render:v=>v?`${v.toLocaleString()} km`:'-' },
    { key:'current_km', label:'KM Saat Ini', render:v=>`${(v||0).toLocaleString()} km` },
    { key:'status', label:'Status', badge:true },
  ];

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Service Rutin</h1><p className="page-subtitle">Jadwal dan monitoring service berkala kendaraan</p></div></div>
      {data.filter(d=>d.status==='overdue').length > 0 && (
        <div className="alert alert-danger">⚠️ {data.filter(d=>d.status==='overdue').length} kendaraan terlambat service rutin!</div>
      )}
      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}
