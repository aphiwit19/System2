import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

const CustomerLayout = () => {
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
        <h2 style={{ marginBottom: '30px', color: '#333' }}>Customer Panel</h2>
        <Link
          to="/customer"
          style={{
            marginTop: 8,
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: location.pathname === '/customer' ? '#e0e0e0' : '#f0f0f0',
            color: '#333',
            textDecoration: 'none',
            display: 'block',
            fontWeight: 'bold'
          }}
        >
          รายการสินค้า
        </Link>
        <Link
          to="/customer/orders"
          style={{
            marginTop: 8,
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: location.pathname === '/customer/orders' ? '#e0e0e0' : '#f0f0f0',
            color: '#333',
            textDecoration: 'none',
            display: 'block',
            fontWeight: 'bold'
          }}
        >
          ติดตามสถานะ
        </Link>
        <Link
          to="/customer/withdraw"
          style={{
            marginTop: 8,
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: location.pathname === '/customer/withdraw' ? '#e0e0e0' : '#f0f0f0',
            color: '#333',
            textDecoration: 'none',
            display: 'block',
            fontWeight: 'bold'
          }}
        >
          คำสั่งซื้อ
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

export default CustomerLayout;
