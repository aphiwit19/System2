import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { getAllProducts, deleteProduct, updateProductQuantity, getInventoryHistory, isLowStock } from '../../services';
import { Link } from 'react-router-dom';

export default function ProductsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityChange, setQuantityChange] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  // inventory history modal states
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const lowStock = filteredProducts.filter(p => isLowStock(p));

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await getAllProducts();
        setProducts(productsData);
        setFilteredProducts(productsData);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
      setCurrentPage(1);
    } else {
      const filtered = products.filter(product =>
        product.productName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, products]);

  // คำนวณ pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบสินค้า "${productName}"?`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteProduct(productId);
      // Reload products
      const productsData = await getAllProducts();
      setProducts(productsData);
      setFilteredProducts(productsData);
      alert('ลบสินค้าสำเร็จ!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('เกิดข้อผิดพลาดในการลบสินค้า: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenQuantityModal = (product) => {
    setSelectedProduct(product);
    setQuantityChange('');
    setShowQuantityModal(true);
  };

  const openHistory = async (product) => {
    setSelectedProduct(product);
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const rows = await getInventoryHistory(product.id);
      setHistoryRows(rows);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUpdateQuantity = async () => {
    if (!quantityChange || parseInt(quantityChange) <= 0) {
      alert('กรุณากรอกจำนวนสินค้าที่ต้องการเพิ่ม');
      return;
    }

    setIsUpdating(true);
    try {
      await updateProductQuantity(selectedProduct.id, quantityChange, true);
      // Reload products
      const productsData = await getAllProducts();
      setProducts(productsData);
      setFilteredProducts(productsData);
      setShowQuantityModal(false);
      setSelectedProduct(null);
      setQuantityChange('');
      alert('อัพเดตจำนวนสินค้าสำเร็จ!');
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('เกิดข้อผิดพลาดในการอัพเดตจำนวนสินค้า: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('th-TH');
  };

  return (
    // Removed the sidebar and adjusted the main content styling
    <div style={{ padding: '20px' }}>
      {/* Header */}
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
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>All Products</h1>
        </div>
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
            <span style={{ color: '#666' }}>{profile?.displayName || user?.email || 'Admin'}</span>
            <div
              onClick={() => setShowMenu(v => !v)}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: '#4CAF50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
              title={profile?.displayName || 'Admin'}
              role="button"
              aria-label="profile-menu"
              tabIndex={0}
            >
              {(profile?.displayName || user?.email || 'A')[0].toUpperCase()}
            </div>
          </div>
          {showMenu && (
            <div style={{ position:'absolute', right: 0, top: 'calc(100% + 8px)', background:'#323232', color:'#fff', borderRadius:8, padding:'10px 12px', minWidth:160, boxShadow:'0 4px 10px rgba(0,0,0,0.25)', zIndex: 3000 }}>
              <div style={{ paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.15)', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.displayName || user?.email || 'Admin'}</div>
              </div>
              <button
                onClick={() => signOut(auth)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#f44336', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}
              >ออกจากระบบ</button>
            </div>
          )}
        </div>
      </div>

      {/* Low stock banner */}
      {lowStock.length > 0 && (
        <div style={{ background:'#fff3e0', border: '1px solid #ffcc80', color:'#e65100', borderRadius:8, padding:12, marginBottom:16, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <strong>แจ้งเตือนสต็อกต่ำ:</strong> พบ {lowStock.length} รายการที่ต่ำกว่า 20% ของสต็อกตั้งต้น
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>กำลังโหลดข้อมูลสินค้า...</p>
        </div>
      ) : currentProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '8px' }}>
          <p style={{ color: '#999', fontSize: '18px' }}>
            {searchTerm ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้าในระบบ'}
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
                {isLowStock(product) && (
                  <div style={{ position:'relative' }}>
                    <div style={{ position:'absolute', top:-6, right:-6, background:'#ff7043', color:'#fff', padding:'4px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>LOW STOCK</div>
                  </div>
                )}
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
                {product.purchaseLocation && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                    แหล่งที่ซื้อ: {product.purchaseLocation}
                  </div>
                )}
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
                  fontWeight: 'bold'
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      แก้ไข
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenQuantityModal(product);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#FF9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      เพิ่ม
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product.id, product.productName);
                      }}
                      disabled={isDeleting}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: isDeleting ? '#ccc' : '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Product Detail Modal */}
          {showDetail && detailProduct && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: 20 }} onClick={() => setShowDetail(false)}>
              <div style={{ background: '#fff', borderRadius: 12, width: 700, maxWidth: '100%', padding: 20, display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }} onClick={(e)=>e.stopPropagation()}>
                <div style={{ width: '100%', height: 320, background:'#f0f0f0', borderRadius: 8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {detailProduct.image ? (
                    <img src={detailProduct.image} alt={detailProduct.productName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <span style={{ color:'#999' }}>No Image</span>
                  )}
                </div>
                <div>
                  <h2 style={{ marginTop: 0 }}>{detailProduct.productName || 'Unnamed Product'}</h2>
                  {detailProduct.purchaseLocation && (
                    <div style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 8px' }}>
                      แหล่งที่ซื้อ: {detailProduct.purchaseLocation}
                    </div>
                  )}
                  <p style={{ color:'#666', whiteSpace:'pre-wrap' }}>{detailProduct.description || 'ไม่มีคำอธิบาย'}</p>
                  <div style={{ background:'#e8f5e9', color:'#2e7d32', padding:'8px 12px', borderRadius:6, fontWeight:500, marginTop:8 }}>จำนวนคงเหลือ: {detailProduct.quantity || 0} ชิ้น</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 12 }}>
                    <span style={{ fontSize:22, fontWeight:'bold', color:'#4CAF50' }}>฿{(detailProduct.price ?? detailProduct.costPrice ?? 0).toLocaleString()}</span>
                    <div style={{ display:'flex', gap: 8 }}>
                      <Link to={`/admin/products/${detailProduct.id}/edit`} onClick={() => setShowDetail(false)} style={{ padding:'8px 14px', background:'#2196F3', color:'#fff', borderRadius:6, textDecoration:'none' }}>แก้ไข</Link>
                      <button onClick={() => { setShowDetail(false); handleOpenQuantityModal(detailProduct); }} style={{ padding:'8px 14px', background:'#FF9800', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>+/-</button>
                      <button onClick={() => { setShowDetail(false); handleDeleteProduct(detailProduct.id, detailProduct.productName); }} disabled={isDeleting} style={{ padding:'8px 14px', background: isDeleting ? '#ccc' : '#f44336', color:'#fff', border:'none', borderRadius:6, cursor: isDeleting ? 'not-allowed' : 'pointer' }}>ลบ</button>
                      <button onClick={() => setShowDetail(false)} style={{ padding:'8px 14px', background:'#6c757d', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>ปิด</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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

      {/* Quantity Modal */}
      {showQuantityModal && selectedProduct && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: 20
        }} onClick={() => setShowQuantityModal(false)}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            width: 420,
            maxWidth: '100%',
            padding: 20
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>ปรับจำนวนสินค้า</h3>
            <p style={{ marginTop: 0, color: '#666' }}>
              {selectedProduct.productName} (คงเหลือ: {selectedProduct.quantity} ชิ้น)
            </p>
            <input
              type="number"
              min="1"
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: 8
              }}
              placeholder="จำนวนที่ต้องการเพิ่ม"
            />
            <div style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              marginTop: 16
            }}>
              <button
                onClick={() => setShowQuantityModal(false)}
                style={{
                  padding: '10px 16px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUpdateQuantity}
                disabled={isUpdating}
                style={{
                  padding: '10px 16px',
                  background: isUpdating ? '#ccc' : '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {isUpdating ? 'กำลังปรับปรุง...' : 'ปรับจำนวน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}