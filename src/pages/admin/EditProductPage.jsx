import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProductById, updateProduct } from '../../services';
import { Link } from 'react-router-dom';

export default function EditProductPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    purchaseLocation: '',
    costPrice: '',
    image: '',
    addDate: '',
    quantity: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const product = await getProductById(id);
        // แปลง Timestamp เป็น date string
        const addDate = product.addDate?.toDate ? product.addDate.toDate() : new Date(product.addDate);
        const formattedDate = addDate.toISOString().split('T')[0];
        
        setFormData({
          productName: product.productName || '',
          description: product.description || '',
          purchaseLocation: product.purchaseLocation || '',
          costPrice: product.costPrice || product.price || '',
          image: product.image || '',
          addDate: formattedDate,
          quantity: product.quantity || ''
        });
      } catch (err) {
        console.error('Error loading product:', err);
        setError('ไม่พบสินค้านี้');
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await updateProduct(id, formData);
      alert('อัพเดตข้อมูลสินค้าสำเร็จ!');
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Error updating product:', err);
      setError('เกิดข้อผิดพลาดในการอัพเดตข้อมูลสินค้า: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#666' }}>กำลังโหลดข้อมูลสินค้า...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    // Removed the sidebar and adjusted the main content styling
    <div style={{ padding: '20px' }}>
      
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '10px', fontSize: '28px', color: '#333' }}>แก้ไขข้อมูลสินค้า</h2>
        <p style={{ marginBottom: '30px', color: '#666', fontSize: '14px' }}>อัพเดตข้อมูลสินค้าของคุณ</p>
        
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: 4,
            marginBottom: 16
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="productName" style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', fontSize: '14px' }}>
              ชื่อสินค้า *
            </label>
            <input
              type="text"
              id="productName"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 15,
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <div>
            <label htmlFor="description" style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', fontSize: '14px' }}>
              คำอธิบายสินค้า *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 15,
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <div>
            <label htmlFor="purchaseLocation" style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', fontSize: '14px' }}>
              ที่ตั้งซื้อ / แหล่งที่ซื้อ
            </label>
            <input
              type="text"
              id="purchaseLocation"
              name="purchaseLocation"
              value={formData.purchaseLocation}
              onChange={handleChange}
              placeholder="เช่น ร้าน A สาขา B หรือแหล่งที่มา"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 15,
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="costPrice" style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', fontSize: '14px' }}>
                ราคา (บาท) *
              </label>
              <input
                type="number"
                id="costPrice"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="กรอกราคาสินค้า"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 15,
                  border: '2px solid #e0e0e0',
                  borderRadius: 8,
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            <div>
              <label htmlFor="quantity" style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', fontSize: '14px' }}>
                จำนวนสินค้า *
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 15,
                  border: '2px solid #e0e0e0',
                  borderRadius: 8,
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>
          </div>

          <div>
            <label htmlFor="image" style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', fontSize: '14px' }}>
              URL รูปภาพ
            </label>
            <input
              type="url"
              id="image"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 15,
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <div>
            <label htmlFor="addDate" style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', fontSize: '14px' }}>
              วันที่เพิ่มสินค้า *
            </label>
            <input
              type="date"
              id="addDate"
              name="addDate"
              value={formData.addDate}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 15,
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 24px',
                fontSize: 16,
                backgroundColor: saving ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                transition: 'background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!saving) e.target.style.backgroundColor = '#0056b3';
              }}
              onMouseLeave={(e) => {
                if (!saving) e.target.style.backgroundColor = '#007bff';
              }}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              style={{
                padding: '12px 24px',
                fontSize: 16,
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'background-color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}