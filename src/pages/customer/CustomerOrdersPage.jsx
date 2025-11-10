import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getWithdrawalsByUser } from '../../services';

const statuses = ['รอดำเนินการ', 'กำลังดำเนินการส่ง', 'ส่งสำเร็จ'];

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const list = await getWithdrawalsByUser(user.uid);
      setOrders(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.uid]);

  const filtered = orders.filter(o => {
    const hit = (
      (o.trackingNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.shippingCarrier || '').toLowerCase().includes(search.toLowerCase())
    );
    const statusOk = statusFilter === 'all' || (o.shippingStatus || 'รอดำเนินการ') === statusFilter;
    return hit && statusOk;
  });

  return (
    <div style={{ padding: 20 }}>
      <div style={{ background:'#fff', padding:20, borderRadius:8, marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin:0, color:'#333' }}>คำสั่งซื้อของฉัน</h1>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา (ขนส่ง/Tracking)" style={{ padding:'10px 40px 10px 12px', borderRadius:20, border:'1px solid #ddd', width:280 }} />
            <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#999' }}>🔍</span>
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ padding:'10px 12px', borderRadius:20, border:'1px solid #ddd' }}>
            <option value="all">สถานะทั้งหมด</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ background:'#fff', padding:40, borderRadius:8, textAlign:'center' }}>กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'#fff', padding:40, borderRadius:8, textAlign:'center', color:'#777' }}>ไม่พบรายการ</div>
      ) : (
        <div style={{ background:'#fff', borderRadius:8, overflow:'hidden', boxShadow:'0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1.1fr 1.6fr 1fr 1fr 1fr 1fr', padding:'12px 16px', background:'#f8f9fa', fontWeight:600 }}>
            <div>วันที่เบิก</div>
            <div>ผู้สั่งซื้อ</div>
            <div>ที่อยู่</div>
            <div>ขนส่ง</div>
            <div>Tracking</div>
            <div>สถานะ</div>
            <div>ราคารวม</div>
          </div>
          {filtered.map(o => (
            <div key={o.id} style={{ display:'grid', gridTemplateColumns:'1.1fr 1.1fr 1.6fr 1fr 1fr 1fr 1fr', padding:'12px 16px', borderTop:'1px solid #eee', alignItems:'center' }}>
              <div>{new Date(o.withdrawDate?.seconds ? o.withdrawDate.seconds*1000 : o.withdrawDate).toLocaleDateString('th-TH')}</div>
              <div>{o.requestedBy || '-'}</div>
              <div style={{ whiteSpace:'pre-wrap', color:'#555' }}>{o.requestedAddress || '-'}</div>
              <div>{o.shippingCarrier || '-'}</div>
              <div style={{ fontFamily:'monospace' }}>{o.trackingNumber || '-'}</div>
              <div>{o.shippingStatus || 'รอดำเนินการ'}</div>
              <div>฿{(o.total || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
