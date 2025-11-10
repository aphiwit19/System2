import { useEffect, useMemo, useState } from 'react';
import { getAllProducts, getInventoryHistory } from '../../services';

export default function InventoryHistoryIndex() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all'); // all | in | out
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);

  useEffect(() => {
    const load = async () => {
      setLoadingProducts(true);
      try {
        const list = await getAllProducts();
        setProducts(list);
      } finally {
        setLoadingProducts(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => (p.productName || '').toLowerCase().includes(q));
  }, [products, search]);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('th-TH');
  };

  const onSelectProduct = async (id) => {
    setSelectedId(id);
    const p = products.find(x => x.id === id) || null;
    setSelectedProduct(p);
    setHistory([]);
    if (!id) return;
    setLoadingHistory(true);
    try {
      const rows = await getInventoryHistory(id);
      setHistory(rows);
    } finally {
      setLoadingHistory(false);
    }
  };

  // filter by date range and type
  const filteredHistory = useMemo(() => {
    let rows = history;
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      rows = rows.filter(r => {
        const ts = r.date?.toDate ? r.date.toDate().getTime() : new Date(r.date).getTime();
        return ts >= start.getTime();
      });
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      rows = rows.filter(r => {
        const ts = r.date?.toDate ? r.date.toDate().getTime() : new Date(r.date).getTime();
        return ts <= end.getTime();
      });
    }
    if (typeFilter !== 'all') rows = rows.filter(r => (r.type || 'in') === typeFilter);
    return rows;
  }, [history, typeFilter, fromDate, toDate]);

  const totalIn = useMemo(() => {
    return filteredHistory.reduce((sum, r) => {
      if ((r.type || 'in') === 'in' && r.costPrice !== null && r.costPrice !== undefined) {
        return sum + (parseFloat(r.costPrice || 0) * parseInt(r.quantity || 0));
      }
      return sum;
    }, 0);
  }, [filteredHistory]);

  const totalOut = useMemo(() => {
    return filteredHistory.reduce((sum, r) => {
      if ((r.type || 'in') === 'out' && r.costPrice !== null && r.costPrice !== undefined) {
        return sum + (parseFloat(r.costPrice || 0) * parseInt(r.quantity || 0));
      }
      return sum;
    }, 0);
  }, [filteredHistory]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

  // reset page when filters change
  useEffect(() => { setPage(1); }, [selectedId, typeFilter, fromDate, toDate]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>ประวัติสินค้าเข้า–ออกคลัง</h1>
      </div>

      {/* Filters */}
      <div style={{ background:'#fff', borderRadius: 8, padding: 16, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 160px 160px', gap:12, alignItems:'center' }}>
          <div style={{ display:'flex', gap:8 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const list = filtered;
                  if (list.length > 0) {
                    onSelectProduct(list[0].id);
                  }
                }
              }}
              placeholder="ค้นหาชื่อสินค้า"
              style={{ flex:1, padding:'10px 12px', border:'1px solid #ddd', borderRadius:6 }}
            />
            <button
              onClick={() => { setSearch(''); setSelectedId(''); setSelectedProduct(null); setHistory([]); }}
              style={{ padding:'10px 12px', border:'1px solid #ddd', background:'#fff', borderRadius:6, cursor:'pointer', whiteSpace:'nowrap' }}
            >ล้าง</button>
            <select
              value={selectedId}
              onChange={(e)=> onSelectProduct(e.target.value)}
              style={{ minWidth:240, padding:'10px 12px', border:'1px solid #ddd', borderRadius:6 }}
            >
              <option value="">เลือกสินค้า</option>
              {filtered.map(p => (
                <option key={p.id} value={p.id}>{p.productName}</option>
              ))}
            </select>
          </div>
          <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={{ padding:'10px 12px', border:'1px solid #ddd', borderRadius:6 }} />
          <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={{ padding:'10px 12px', border:'1px solid #ddd', borderRadius:6 }} />
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ padding:'10px 12px', border:'1px solid #ddd', borderRadius:6 }}>
            <option value="all">ทุกประเภท</option>
            <option value="in">เข้า (IN)</option>
            <option value="out">ออก (OUT)</option>
          </select>
        </div>
        {loadingProducts && (
          <div style={{ marginTop:8, color:'#666' }}>กำลังโหลดสินค้า...</div>
        )}
      </div>

      {/* Summary */}
      {selectedId && !loadingHistory && history.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom: 12, flexWrap:'wrap' }}>
          <span style={{ background:'#e8f5e9', color:'#2e7d32', padding:'6px 10px', borderRadius:14, fontWeight:600 }}>IN ฿{totalIn.toLocaleString()}</span>
          <span style={{ background:'#fdecea', color:'#c62828', padding:'6px 10px', borderRadius:14, fontWeight:600 }}>OUT ฿{totalOut.toLocaleString()}</span>
        </div>
      )}

      {/* List */}
      <div style={{ background:'#fff', borderRadius: 8, padding: 8, boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
        {!selectedId ? (
          <div style={{ padding: 20, color:'#777' }}>กรุณาเลือกสินค้าเพื่อแสดงประวัติ</div>
        ) : loadingHistory ? (
          <div style={{ padding: 20, color:'#666' }}>กำลังโหลดประวัติ...</div>
        ) : pageItems.length === 0 ? (
          <div style={{ padding: 20, color:'#777' }}>ไม่พบข้อมูลตามตัวกรอง</div>
        ) : (
          <>
            <div style={{ padding: '8px 8px 0 8px', color:'#666', textAlign:'right' }}>Page {currentPage} of {totalPages} | Showing {pageItems.length} of {filteredHistory.length}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, padding:8 }}>
              {pageItems.map(h => {
                const isOut = (h.type || 'in') === 'out';
                const sign = isOut ? '-' : '+';
                const color = isOut ? '#e53935' : '#2e7d32';
                const unitCost = (h.costPrice === null || h.costPrice === undefined) ? null : parseFloat(h.costPrice || 0);
                const total = unitCost === null ? 0 : unitCost * parseInt(h.quantity || 0);
                return (
                  <div key={h.id} style={{ display:'grid', gridTemplateColumns:'150px 1fr 120px', alignItems:'center', gap:12, padding:'14px 16px', border:'1px solid #eee', borderRadius:12 }}>
                    <div style={{ color, fontWeight:700, fontSize:18 }}>฿{(isOut ? total : total).toLocaleString(undefined,{minimumFractionDigits:0})}</div>
                    <div>
                      <div style={{ fontWeight:700, marginBottom:6, fontSize:16, color:'#333' }}>{selectedProduct?.productName || '-'}</div>
                      <div style={{ lineHeight:1.5 }}>
                        <span style={{ background: isOut ? '#fdecea' : '#e8f5e9', color, padding:'4px 8px', borderRadius:12, fontSize:12, fontWeight:700 }}>{(h.type || 'in').toUpperCase()}</span>
                        <span style={{ marginLeft:8, color:'#444', fontSize:14 }}>จำนวน {sign}{parseInt(h.quantity || 0).toLocaleString()} | ต้นทุน/หน่วย {unitCost === null ? '-' : `฿${unitCost.toLocaleString()}`}</span>
                      </div>
                      {h.source && <div style={{ marginTop:6, color:'#666', fontSize:13 }}>ที่มา: {h.source}</div>}
                    </div>
                    <div style={{ textAlign:'right', color:'#666', fontSize:13 }}>{formatDate(h.date)}</div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, padding:'8px 0 12px' }}>
              <button disabled={currentPage === 1} onClick={()=>setPage(p=>Math.max(1,p-1))} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #ddd', background: currentPage===1?'#eee':'#fff', cursor: currentPage===1?'not-allowed':'pointer' }}>Previous</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={()=>setPage(i+1)} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #ddd', background: currentPage===i+1?'#1976d2':'#fff', color: currentPage===i+1?'#fff':'#111' }}>{i+1}</button>
              ))}
              <button disabled={currentPage === totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #ddd', background: currentPage===totalPages?'#eee':'#fff', cursor: currentPage===totalPages?'not-allowed':'pointer' }}>Next</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

