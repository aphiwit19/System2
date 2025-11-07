import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffLayout from './pages/staff/StaffLayout';
import StaffOrdersPage from './pages/staff/StaffOrdersPage';
import AdminLayout from './pages/admin/AdminLayout';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerLayout from './pages/customer/CustomerLayout';
import CustomerWithdrawPage from './pages/customer/CustomerWithdrawPage';
import CustomerOrdersPage from './pages/customer/CustomerOrdersPage';
import WithdrawPage from './pages/staff/WithdrawPage';
import UsersPage from './pages/admin/UsersPage';
import ProductsPage from './pages/admin/ProductsPage';
import EditProductPage from './pages/admin/EditProductPage';
import InventoryHistoryPage from './pages/admin/InventoryHistoryPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';

function HomeRouter() {
  const { profile } = useAuth();
  if (!profile) return null;
  if (profile.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (profile.role === 'staff') return <Navigate to="/staff" replace />;
  return <Navigate to="/customer" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute allow={['admin','staff','customer']} />}> 
            <Route index element={<HomeRouter />} />
          </Route>

          <Route path="/admin" element={<ProtectedRoute allow={['admin']} />}> 
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<ProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="addproduct" element={<AdminDashboard />} />
              <Route path="products/:id/edit" element={<EditProductPage />} />
              <Route path="products/:id/history" element={<InventoryHistoryPage />} />
            </Route>
          </Route>

          <Route path="/staff" element={<ProtectedRoute allow={['staff']} />}> 
            <Route element={<StaffLayout />}> 
              <Route index element={<StaffDashboard />} />
              <Route path="orders" element={<StaffOrdersPage />} />
              <Route path="withdraw" element={<WithdrawPage />} />
            </Route>
          </Route>

          <Route path="/customer" element={<ProtectedRoute allow={['customer']} />}> 
            <Route element={<CustomerLayout />}> 
              <Route index element={<CustomerDashboard />} />
              <Route path="orders" element={<CustomerOrdersPage />} />
              <Route path="withdraw" element={<CustomerWithdrawPage />} />
            </Route>
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;