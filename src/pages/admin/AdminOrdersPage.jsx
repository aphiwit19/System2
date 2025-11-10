import { useEffect, useState } from 'react';
import { getAllWithdrawals, updateWithdrawalShipping } from '../../services';

const carriers = ['EMS', 'ไปรษณีย์ไทย', 'Kerry', 'J&T', 'Flash'];
const statuses = ['รอดำเนินการ', 'กำลังดำเนินการส่ง', 'ส่งสำเร็จ'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('customer'); // customer | staff
  const [edits, setEdits] = useState({}); // { [id]: { shippingCarrier, trackingNumber, shippingStatus } }
  const [savedOk, setSavedOk] = useState({}); // { [id]: true when last save succeeded }

  // (UX revert) remove badge styling helper

  const load = async () => {
    setLoading(true);
    try {
      const list = await getAllWithdrawals();
      setOrders(list);
      // initialize edit state
      const init = {};
      const savedInit = {};
      list.forEach(o => {
        init[o.id] = {
          shippingCarrier: o.shippingCarrier || '',
          trackingNumber: o.trackingNumber || '',
          shippingStatus: o.shippingStatus || 'รอดำเนินการ',
        };
        savedInit[o.id] = !!(o.shippingCarrier && o.trackingNumber && o.shippingStatus);
      });
      setEdits(init);
      setSavedOk(savedInit);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => {
    const hit = (
      o.trackingNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.requestedBy?.toLowerCase().includes(search.toLowerCase()) ||
      o.receivedBy?.toLowerCase().includes(search.toLowerCase())
    );
    const statusOk = statusFilter === 'all' || (o.shippingStatus || 'รอดำเนินการ') === statusFilter;
    const sourceOk = (o.createdSource || '') === sourceFilter;
    return hit && statusOk && sourceOk;
  });

  const canSave = (id) => {
    const order = orders.find(o => o.id === id);
    if ((order?.deliveryMethod || 'shipping') === 'pickup') return false;
    const e = edits[id] || {};
    return (e.shippingCarrier && e.trackingNumber && e.shippingStatus);
  };

  const saveRow = async (id) => {
    if (!canSave(id)) return;
    const e = edits[id];
    const order = orders.find(o => o.id === id);
    setSavingId(id);
    try {
      await updateWithdrawalShipping(id, {
        shippingCarrier: e.shippingCarrier,
        trackingNumber: e.trackingNumber.trim(),
        shippingStatus: e.shippingStatus,
      }, order?.createdByUid);
      // optimistic update without reload
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...e } : o));
      setSavedOk(prev => ({ ...prev, [id]: true }));
    } finally {
      setSavingId(null);
    }
  };

  // (UX revert) no counters in filters

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        background: '#fff', padding: 20, borderRadius: 8, marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>จัดการคำสั่งซื้อ/การจัดส่ง</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา (ชื่อผู้เบิก/ผู้รับ/Tracking)" style={{ padding: '10px 40px 10px 12px', borderRadius: 20, border: '1px solid #ddd', width: 220 }}/>
            <span style={{ position:'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color:'#999' }}>🔍</span>
          </div>
          <select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: 20, border: '1px solid #ddd' }}>
            <option value="customer">ผู้ซื้อ</option>
            <option value="staff">ผู้เบิก</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ background:'#fff', padding: 40, borderRadius: 8, textAlign: 'center' }}>กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'#fff', padding: 40, borderRadius: 8, textAlign: 'center', color:'#777' }}>ไม่พบรายการ</div>
      ) : (
        <div style={{ background:'#fff', borderRadius: 8, overflow:'hidden', boxShadow:'0 2px 4px rgba(0,0,0,0.1)' }}>
          {sourceFilter === 'customer' ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1.1fr 1.6fr 1.1fr 1.1fr 1fr 0.8fr', gap:8, padding:'12px 16px', background:'#f8f9fa', fontWeight:600 }}>
                <div>วันที่</div>
                <div>ผู้สั่งซื้อ</div>
                <div>ที่อยู่</div>
                <div>ขนส่ง</div>
                <div>Tracking</div>
                <div>สถานะ</div>
                <div style={{ textAlign:'center' }}>บันทึก</div>
              </div>
              {filtered.map(o => (
                <div key={o.id} style={{ display:'grid', gridTemplateColumns:'1.1fr 1.1fr 1.6fr 1.1fr 1.1fr 1fr 0.8fr', gap:8, padding:'12px 16px', borderTop:'1px solid #eee', alignItems:'center' }}>
                  <div>{new Date(o.withdrawDate?.seconds ? o.withdrawDate.seconds*1000 : o.withdrawDate).toLocaleDateString('th-TH')}</div>
                  <div>{o.requestedBy || '-'}</div>
                  <div style={{ whiteSpace:'pre-wrap', color:'#555' }}>{o.requestedAddress || '-'}</div>
                  <div>
                    <select disabled={(o.deliveryMethod||'shipping')==='pickup'} value={(edits[o.id]?.shippingCarrier) ?? ''} onChange={(e)=>{ setEdits(s=>({ ...s, [o.id]: { ...s[o.id], shippingCarrier: e.target.value } })); setSavedOk(prev=>({ ...prev, [o.id]: false })); }} style={{ padding:'6px 8px', border:'1px solid #ddd', borderRadius:6 }}>
                      <option value="">เลือกผู้ให้บริการ</option>
                      {carriers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input disabled={(o.deliveryMethod||'shipping')==='pickup'} value={(edits[o.id]?.trackingNumber) ?? ''} onChange={(e)=>{ setEdits(s=>({ ...s, [o.id]: { ...s[o.id], trackingNumber: e.target.value } })); setSavedOk(prev=>({ ...prev, [o.id]: false })); }} placeholder="เช่น EX123456789TH" style={{ padding:'6px 8px', border:'1px solid #ddd', borderRadius:6, width:'100%' }} />
                  </div>
                  <div>
                    <select disabled={(o.deliveryMethod||'shipping')==='pickup'} value={(edits[o.id]?.shippingStatus) ?? 'รอดำเนินการ'} onChange={(e)=>{ setEdits(s=>({ ...s, [o.id]: { ...s[o.id], shippingStatus: e.target.value } })); setSavedOk(prev=>({ ...prev, [o.id]: false })); }} style={{ padding:'6px 8px', border:'1px solid #ddd', borderRadius:6 }}>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <button onClick={()=>saveRow(o.id)} disabled={savingId===o.id || !canSave(o.id)} style={{ padding:'8px 14px', minWidth:96, background: savedOk[o.id] ? '#4CAF50' : (canSave(o.id) ? '#2196F3' : '#9e9e9e'), color:'#fff', border:'none', borderRadius:6, cursor: savingId===o.id || !canSave(o.id) ? 'not-allowed' : 'pointer' }}>
                      {savingId===o.id ? 'กำลังบันทึก...' : (savedOk[o.id] ? 'บันทึกแล้ว' : 'บันทึก')}
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1.1fr 1.1fr 1.6fr 1.1fr 1.1fr 1fr 0.8fr', gap:8, padding:'12px 16px', background:'#f8f9fa', fontWeight:600 }}>
                <div>วันที่</div>
                <div>ผู้เบิก</div>
                <div>ผู้รับ</div>
                <div>ที่อยู่</div>
                <div>ขนส่ง</div>
                <div>Tracking</div>
                <div>สถานะ</div>
                <div style={{ textAlign:'center' }}>บันทึก</div>
              </div>
              {filtered.map(o => {
                const address = o.receivedAddress || '-';
                return (
                  <div key={o.id} style={{ display:'grid', gridTemplateColumns:'1.1fr 1.1fr 1.1fr 1.6fr 1.1fr 1.1fr 1fr 0.8fr', gap:8, padding:'12px 16px', borderTop:'1px solid #eee', alignItems:'center' }}>
                    <div>{new Date(o.withdrawDate?.seconds ? o.withdrawDate.seconds*1000 : o.withdrawDate).toLocaleDateString('th-TH')}</div>
                    <div>{o.requestedBy || '-'}</div>
                    <div>{o.receivedBy || ((o.createdSource||'')==='customer' ? '-' : '-')}</div>
                    <div style={{ whiteSpace:'pre-wrap', color:'#555' }}>{address}</div>
                    <div>
                      <select disabled={(o.deliveryMethod||'shipping')==='pickup'} value={(edits[o.id]?.shippingCarrier) ?? ''} onChange={(e)=>{ setEdits(s=>({ ...s, [o.id]: { ...s[o.id], shippingCarrier: e.target.value } })); setSavedOk(prev=>({ ...prev, [o.id]: false })); }} style={{ padding:'6px 8px', border:'1px solid #ddd', borderRadius:6 }}>
                        <option value="">เลือกผู้ให้บริการ</option>
                        {carriers.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <input disabled={(o.deliveryMethod||'shipping')==='pickup'} value={(edits[o.id]?.trackingNumber) ?? ''} onChange={(e)=>{ setEdits(s=>({ ...s, [o.id]: { ...s[o.id], trackingNumber: e.target.value } })); setSavedOk(prev=>({ ...prev, [o.id]: false })); }} placeholder="เช่น EX123456789TH" style={{ padding:'6px 8px', border:'1px solid #ddd', borderRadius:6, width:'100%' }} />
                    </div>
                    <div>
                      <select disabled={(o.deliveryMethod||'shipping')==='pickup'} value={(edits[o.id]?.shippingStatus) ?? 'รอดำเนินการ'} onChange={(e)=>{ setEdits(s=>({ ...s, [o.id]: { ...s[o.id], shippingStatus: e.target.value } })); setSavedOk(prev=>({ ...prev, [o.id]: false })); }} style={{ padding:'6px 8px', border:'1px solid #ddd', borderRadius:6 }}>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <button onClick={()=>saveRow(o.id)} disabled={savingId===o.id || !canSave(o.id)} style={{ padding:'8px 14px', minWidth:96, background: savedOk[o.id] ? '#4CAF50' : (canSave(o.id) ? '#2196F3' : '#9e9e9e'), color:'#fff', border:'none', borderRadius:6, cursor: savingId===o.id || !canSave(o.id) ? 'not-allowed' : 'pointer' }}>
                        {savingId===o.id ? 'กำลังบันทึก...' : (savedOk[o.id] ? 'บันทึกแล้ว' : 'บันทึก')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
