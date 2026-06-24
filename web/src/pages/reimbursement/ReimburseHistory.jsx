import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';

export default function ReimburseHistory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/reimbursements').then(r=>{setData(r.data.data.filter(d=>['approved','paid','rejected'].includes(d.status)));setLoading(false);}).catch(()=>setLoading(false)); }, []);
  const columns = [
    { key:'reimburse_number', label:'No Reimburse', primary:true },
    { key:'driver_name', label:'Driver' },
    { key:'order_number', label:'No Order' },
    { key:'total_amount', label:'Total', render:v=>`Rp ${Number(v||0).toLocaleString('id-ID')}` },
    { key:'status', label:'Status', badge:true },
    { key:'approved_by_name', label:'Disetujui Oleh' },
    { key:'created_at', label:'Tanggal', render:v=>new Date(v).toLocaleDateString('id-ID') },
  ];
  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">History Reimbursement</h1><p className="page-subtitle">Riwayat klaim reimbursement</p></div></div>
      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}
