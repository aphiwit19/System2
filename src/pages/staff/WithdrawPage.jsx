import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createWithdrawal, getAllProducts } from '../../server/products';
import { useAuth } from '../../auth/AuthContext';

function readCart() {
  try {
    const raw = localStorage.getItem('staffCart');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem('staffCart', JSON.stringify(items));
}

export default function WithdrawPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [productsById, setProductsById] = useState({});
  const [items, setItems] = useState(readCart());
  const [requestedBy, setRequestedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().slice(0,10));
  const [submitting, setSubmitting] = useState(false);
  const total = useMemo(() => items.reduce((s, it) => s + (it.price * (it.quantity || 0)), 0), [items]);

  useEffect(() => {
    const load = async () => {
      const list = await getAllProducts();
      const map = {};
      list.forEach(p => { map[p.id] = p; });
      setProductsById(map);
    };
    load();
  }, []);

  const updateQty = (id, qty) => {
    const stock = productsById[id]?.quantity ?? 0;
    const value = Math.max(1, Math.min(parseInt(qty || 1), stock));
    const next = items.map(it => it.id === id ? { ...it, quantity: value } : it);
    setItems(next);
    writeCart(next);
  };

  const removeItem = (id) => {
    const next = items.filter(it => it.id !== id);
    setItems(next);
    writeCart(next);
  };

  const submit = async () => {
    if (items.length === 0) return;
    if (!requestedBy.trim() || !receivedBy.trim() || !withdrawDate) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    setSubmitting(true);
    try {
      await createWithdrawal({
        items: items.map(it => ({ productId: it.id, productName: it.productName, price: it.price, quantity: it.quantity, subtotal: it.price * it.quantity })),
        requestedBy: requestedBy.trim(),
        receivedBy: receivedBy.trim(),
        withdrawDate,
        total,
        createdByUid: user?.uid || null,
        createdByEmail: user?.email || null,
      });
      writeCart([]);
      alert('บันทึกคำสั่งเบิกสำเร็จ');
      navigate('/staff');
    } catch (e) {
      alert('ไม่สามารถบันทึกคำสั่งเบิกได้: ' + (e?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Removed the outer div with flex layout since it's now handled by StaffLayout
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>คำสั่งเบิก</h2>
        <Link to="/staff" style={{ color: '#667eea', textDecoration: 'none' }}>← กลับไปเลือกสินค้า</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 16 }}>
          {items.length === 0 ? (
            <p style={{ color: '#999' }}>ยังไม่มีรายการในคำสั่งเบิก</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(it => (
                <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 80px', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.productName}</div>
                    <div style={{ color: '#777', fontSize: 12 }}>คงเหลือ: {productsById[it.id]?.quantity ?? 0} ชิ้น</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>฿{(it.price).toLocaleString()}</div>
                  <div>
                    <input type="number" min={1} max={productsById[it.id]?.quantity ?? 0} value={it.quantity} onChange={(e)=>updateQty(it.id, e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }} />
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>฿{(it.price * it.quantity).toLocaleString()}</div>
                  <button onClick={()=>removeItem(it.id)} style={{ gridColumn: '1 / -1', justifySelf: 'end', background: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer' }}>ลบ</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>รายละเอียดผู้เบิก</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>ผู้เบิก</div>
              <input value={requestedBy} onChange={(e)=>setRequestedBy(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>ผู้รับ</div>
              <input value={receivedBy} onChange={(e)=>setReceivedBy(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>วันที่เบิก</div>
              <input type="date" value={withdrawDate} onChange={(e)=>setWithdrawDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ color: '#666' }}>ราคารวม</span>
              <strong>฿{total.toLocaleString()}</strong>
            </div>
            <button disabled={submitting || items.length===0} onClick={submit} style={{ padding: '12px', background: submitting || items.length===0 ? '#ccc' : '#4CAF50', color: '#fff', border: 'none', borderRadius: 8, cursor: submitting || items.length===0 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              {submitting ? 'กำลังบันทึก...' : 'บันทึกคำสั่งเบิก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}