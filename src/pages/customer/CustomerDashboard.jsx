import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../auth/AuthContext';
import { getAllProducts } from '../../server/products';

export default function CustomerDashboard() {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [showQtyPrompt, setShowQtyPrompt] = useState(false);
  const [promptProduct, setPromptProduct] = useState(null);
  const [promptQty, setPromptQty] = useState('1');
  const [showDetail, setShowDetail] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const cartKey = (uid) => `customerCart_${uid || 'guest'}`;

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await getAllProducts();
        setProducts(productsData);
        setFilteredProducts(productsData);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // migrate legacy key 'customerCart' to per-user key one time
  useEffect(() => {
    try {
      const uid = user?.uid || 'guest';
      const newKey = cartKey(uid);
      const legacy = localStorage.getItem('customerCart');
      const current = localStorage.getItem(newKey);
      if (legacy && !current) {
        localStorage.setItem(newKey, legacy);
        localStorage.removeItem('customerCart');
      }
    } catch {}
  }, [user?.uid]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
      setCurrentPage(1);
    } else {
      const filtered = products.filter(p => p.productName?.toLowerCase().includes(searchTerm.toLowerCase()));
      setFilteredProducts(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, products]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const openQtyPrompt = (product) => {
    setPromptProduct(product);
    setPromptQty('1');
    setShowQtyPrompt(true);
  };

  const confirmAddToCart = () => {
    if (!promptProduct) return;
    const qty = Math.max(1, Math.min(parseInt(promptQty || 1), promptProduct.quantity || 0));
    try {
      const raw = localStorage.getItem(cartKey(user?.uid));
      const cart = raw ? JSON.parse(raw) : [];
      const exists = cart.find(it => it.id === promptProduct.id);
      if (exists) {
        exists.quantity = Math.min((exists.quantity || 0) + qty, promptProduct.quantity || 0);
      } else {
        cart.push({ id: promptProduct.id, productName: promptProduct.productName, price: promptProduct.price ?? promptProduct.costPrice ?? 0, quantity: qty, image: promptProduct.image || null, stock: promptProduct.quantity || 0 });
      }
      localStorage.setItem(cartKey(user?.uid), JSON.stringify(cart));
      setShowQtyPrompt(false);
    } catch {
      setShowQtyPrompt(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>All Products</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 40px 10px 15px',
                borderRadius: '20px',
                border: '1px solid #ddd',
                fontSize: '14px',
                width: '250px'
              }}
            />
            <span style={{
              position: 'absolute',
              right: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999'
            }}>🔍</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#666' }}>{profile?.displayName || user?.email || 'Customer'}</span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#4CAF50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }} onClick={() => setShowMenu(v => !v)} title={profile?.displayName || 'Customer'} role="button" aria-label="profile-menu" tabIndex={0}>
              {(profile?.displayName || user?.email || 'C')[0].toUpperCase()}
            </div>
          </div>
          {showMenu && (
            <div style={{ position:'absolute', right: 0, top: 'calc(100% + 8px)', background:'#323232', color:'#fff', borderRadius:8, padding:'10px 12px', minWidth:160, boxShadow:'0 4px 10px rgba(0,0,0,0.25)', zIndex: 3000 }}>
              <div style={{ paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.15)', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.displayName || user?.email || 'Customer'}</div>
              </div>
              <button onClick={() => signOut(auth)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#f44336', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>ออกจากระบบ</button>
            </div>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading products...</p>
        </div>
      ) : currentProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '8px' }}>
          <p style={{ color: '#999', fontSize: '18px' }}>
            {searchTerm ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้า'}
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {currentProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  padding: '15px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                onClick={() => { setDetailProduct(product); setShowDetail(true); }}
              >
                <div style={{
                  width: '100%',
                  height: '200px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.productName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div style={{
                    display: product.image ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    color: '#999'
                  }}>
                    No Image
                  </div>
                </div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '18px',
                  color: '#333',
                  fontWeight: 'bold'
                }}>
                  {product.productName || 'Unnamed Product'}
                </h3>
                <p style={{
                  margin: '0 0 10px 0',
                  fontSize: '12px',
                  color: '#666',
                  height: '36px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {product.description || 'ไม่มีคำอธิบาย'}
                </p>
                <div style={{
                  backgroundColor: '#e8f5e9',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  fontSize: '14px',
                  color: '#2e7d32',
                  fontWeight: 500
                }}>
                  จำนวนคงเหลือ: {product.quantity || 0} ชิ้น
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '10px'
                }}>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#4CAF50'
                  }}>
                    ฿{(product.price ?? product.costPrice ?? 0).toLocaleString()}
                  </span>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#673AB7',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onClick={(e) => { e.stopPropagation(); openQtyPrompt(product); }}
                  >
                    เพิ่มลงตะกร้า
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              padding: '20px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  color: currentPage === 1 ? '#999' : '#333'
                }}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: currentPage === page ? '#4CAF50' : '#fff',
                    color: currentPage === page ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: currentPage === page ? 'bold' : 'normal'
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#fff',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  color: currentPage === totalPages ? '#999' : '#333'
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      {/* Product Detail Modal */}
      {showDetail && detailProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: 20 }} onClick={() => setShowDetail(false)}>
          <div style={{ background: '#fff', borderRadius: 12, width: 640, maxWidth: '100%', padding: 20, display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }} onClick={(e)=>e.stopPropagation()}>
            <div style={{ width: '100%', height: 280, background:'#f0f0f0', borderRadius: 8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {detailProduct.image ? (
                <img src={detailProduct.image} alt={detailProduct.productName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <span style={{ color:'#999' }}>No Image</span>
              )}
            </div>
            <div>
              <h2 style={{ marginTop: 0 }}>{detailProduct.productName || 'Unnamed Product'}</h2>
              <p style={{ color:'#666', whiteSpace:'pre-wrap' }}>{detailProduct.description || 'ไม่มีคำอธิบาย'}</p>
              <div style={{ background:'#e8f5e9', color:'#2e7d32', padding:'8px 12px', borderRadius:6, fontWeight:500, marginTop:8 }}>จำนวนคงเหลือ: {detailProduct.quantity || 0} ชิ้น</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
                <span style={{ fontSize:22, fontWeight:'bold', color:'#4CAF50' }}>฿{(detailProduct.price ?? detailProduct.costPrice ?? 0).toLocaleString()}</span>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setShowDetail(false); openQtyPrompt(detailProduct); }} style={{ padding:'8px 14px', background:'#673AB7', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>เพิ่มลงตะกร้า</button>
                  <button onClick={() => setShowDetail(false)} style={{ padding:'8px 14px', background:'#6c757d', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>ปิด</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Prompt Modal */}
      {showQtyPrompt && promptProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }} onClick={() => setShowQtyPrompt(false)}>
          <div style={{ background: '#fff', borderRadius: 12, width: 420, maxWidth: '100%', padding: 20 }} onClick={(e)=>e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>ระบุจำนวนสินค้า</h3>
            <p style={{ marginTop: 0, color: '#666' }}>{promptProduct.productName}</p>
            <input type="number" min={1} max={promptProduct.quantity || 0} value={promptQty} onChange={(e)=>setPromptQty(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={()=>setShowQtyPrompt(false)} style={{ padding: '10px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={confirmAddToCart} style={{ padding: '10px 16px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>เพิ่มลงตะกร้า</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

