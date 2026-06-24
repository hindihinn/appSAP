import { useEffect, useState } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';

export default function ReimburseMonitoring() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/reimbursements').then(r=>{setData(r.data.data);setLoading(false);}).catch(()=>setLoading(false)); }, []);

  const updateStatus = async (id, status) => {
    await api.put(`/reimbursements/${id}/status`, { status });
    const r = await api.get('/reimbursements');
    setData(r.data.data);
  };

  const columns = [
    { key:'reimburse_number', label:'No Reimburse', primary:true, render:v=><span style={{color:'var(--accent)',fontWeight:600,fontSize:12}}>{v}</span> },
    { key:'driver_name', label:'Driver' },
    { key:'order_number', label:'No Order Dinas' },
    { key:'destination', label:'Tujuan' },
    { key:'total_amount', label:'Total', render:v=>`Rp ${Number(v||0).toLocaleString('id-ID')}` },
    { key:'status', label:'Status', badge:true },
    { key:'created_at', label:'Tgl Buat', render:v=>new Date(v).toLocaleDateString('id-ID') },
  ];

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Monitoring Reimbursement</h1><p className="page-subtitle">Pantau status klaim reimburse driver</p></div></div>
      <DataTable columns={columns} data={data} loading={loading}
        actions={row=>(
          <div style={{display:'flex',gap:4}}>
            {row.status==='submitted' && <button className="btn btn-primary btn-sm" onClick={()=>updateStatus(row.id,'reviewed')}>Review</button>}
            {row.status==='reviewed' && <button className="btn btn-success btn-sm" onClick={()=>updateStatus(row.id,'approved')}>Approve</button>}
            {row.status==='approved' && <button className="btn btn-success btn-sm" onClick={()=>updateStatus(row.id,'paid')}>Bayar</button>}
          </div>
        )}
      />
    </div>
  );
}
