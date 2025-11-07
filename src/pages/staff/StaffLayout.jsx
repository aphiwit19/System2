import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

const StaffLayout = () => {
  const { profile } = useAuth();
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Sidebar */}
      <div style={{
        width: '220px',
        backgroundColor: '#fff',
        padding: '20px',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        height: '100vh',
        overflowY: 'auto',
        flexShrink: 0
      }}>
        <h2 style={{ marginBottom: '30px', color: '#333' }}>Staff Panel</h2>
        <Link
          to="/staff"
          style={{
            marginTop: 8,
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: location.pathname === '/staff' ? '#e0e0e0' : '#f0f0f0',
            color: '#333',
            textDecoration: 'none',
            display: 'block',
            fontWeight: 'bold'
          }}
        >
          รายการสินค้า
        </Link>
        <Link
          to="/staff/withdraw"
          style={{
            marginTop: 8,
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: location.pathname === '/staff/withdraw' ? '#e0e0e0' : '#f0f0f0',
            color: '#333',
            textDecoration: 'none',
            display: 'block',
            fontWeight: 'bold'
          }}
        >
          คำสั่งเบิก
        </Link>
        <Link
          to="/staff/orders"
          style={{
            marginTop: 8,
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: location.pathname === '/staff/orders' ? '#e0e0e0' : '#f0f0f0',
            color: '#333',
            textDecoration: 'none',
            display: 'block',
            fontWeight: 'bold'
          }}
        >
          ติดตามสถานะ
        </Link>

        {/* logout moved to header snackbar */}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default StaffLayout;