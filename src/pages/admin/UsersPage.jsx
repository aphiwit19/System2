import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { getAllUsers, updateUserRole } from '../../services';
import { Link, useLocation } from 'react-router-dom';

export default function UsersPage() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    const run = async () => {
      try {
        const usersData = await getAllUsers();
        setUsers(usersData);
        setFilteredUsers(usersData);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => (u.role || 'customer') === filterRole);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, filterRole, users]);

  const handleUpdateRole = async (id, role, currentRole) => {
    if (role === currentRole) return;
    
    setSaving(true);
    try {
      await updateUserRole(id, role);
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, role } : u)));
    } catch (error) {
      console.error('Error updating role:', error);
      alert('เกิดข้อผิดพลาดในการอัพเดต Role: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return { bg: '#f44336', color: '#fff', label: 'Admin' };
      case 'staff':
        return { bg: '#2196F3', color: '#fff', label: 'Staff' };
      case 'customer':
        return { bg: '#4CAF50', color: '#fff', label: 'Customer' };
      default:
        return { bg: '#9e9e9e', color: '#fff', label: 'Customer' };
    }
  };

  const isActiveLink = (path) => location.pathname === path;

  if (loading) {
    return (
      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <p style={{ color: '#666', fontSize: '16px' }}>กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
        <div>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#333', fontWeight: '700' }}>
            จัดการผู้ใช้
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            จัดการสิทธิ์และบทบาทของผู้ใช้ทั้งหมด
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="ค้นหาผู้ใช้..."
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
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{
              padding: '10px 15px',
              borderRadius: '20px',
              border: '1px solid #ddd',
              fontSize: '14px',
              backgroundColor: '#fff'
            }}
          >
            <option value="all">ทุกบทบาท</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="customer">Customer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1fr 1fr',
          padding: '16px 20px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #eee',
          fontWeight: 'bold'
        }}>
          <div>อีเมล</div>
          <div>ชื่อ</div>
          <div>บทบาทปัจจุบัน</div>
          <div>เปลี่ยนบทบาท</div>
        </div>
        
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              ไม่พบผู้ใช้ที่ตรงกับเงื่อนไขการค้นหา
            </div>
          ) : (
            filteredUsers.map((user) => {
              const currentRole = user.role || 'customer';
              const roleInfo = getRoleBadgeColor(currentRole);
              
              return (
                <div
                  key={user.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr 1fr 1fr',
                    padding: '16px 20px',
                    borderBottom: '1px solid #eee',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {user.email}
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {user.displayName || '-'}
                  </div>
                  <div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      backgroundColor: roleInfo.bg,
                      color: roleInfo.color,
                      fontWeight: '500'
                    }}>
                      {roleInfo.label}
                    </span>
                  </div>
                  <div>
                    <select
                      value={currentRole}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value, currentRole)}
                      disabled={saving}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '13px',
                        backgroundColor: '#fff',
                        cursor: saving ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <option value="customer">Customer</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
