import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import UploadEmployees from './pages/UploadEmployees';
import UploadChecklist from './pages/UploadChecklist';
import QRGeneration from './pages/QRGeneration';
import Execution from './pages/Execution';
import SupportInbox from './pages/SupportInbox';
import Logs from './pages/Logs';
import ScanRedirect from './pages/ScanRedirect';
import ScanLineSelect from './pages/ScanLineSelect';

import Dashboard from './pages/Dashboard';
import { DataProvider } from './context/DataContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <div>Loading...</div>;
  if (!user) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectPath}`} replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/scan/:level/:name" element={<ScanRedirect />} />
      <Route path="/user/scan-select" element={<ScanLineSelect />} />
      
      {/* Routes with Layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
        <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        
        {/* Master Admin Routes */}
        <Route path="master/units" element={
          <ProtectedRoute allowedRoles={['MASTER_ADMIN']}><MasterAdminDashboard /></ProtectedRoute>
        } />
        
        {/* Unit Admin Routes */}
        <Route path="admin/employees" element={
          <ProtectedRoute allowedRoles={['UNIT_ADMIN', 'MASTER_ADMIN']}><UploadEmployees /></ProtectedRoute>
        } />
        <Route path="admin/checklists" element={
          <ProtectedRoute allowedRoles={['UNIT_ADMIN', 'MASTER_ADMIN']}><UploadChecklist /></ProtectedRoute>
        } />
        <Route path="admin/qr-generation" element={
          <ProtectedRoute allowedRoles={['UNIT_ADMIN', 'MASTER_ADMIN']}><QRGeneration /></ProtectedRoute>
        } />
        
        {/* User / Employee Routes */}
        <Route path="user/execute" element={
          <ProtectedRoute allowedRoles={['USER', 'UNIT_ADMIN', 'MASTER_ADMIN']}><Execution /></ProtectedRoute>
        } />
        <Route path="user/support-inbox" element={
          <ProtectedRoute allowedRoles={['USER', 'UNIT_ADMIN', 'MASTER_ADMIN']}><SupportInbox /></ProtectedRoute>
        } />
        
        {/* Common Routes */}
        <Route path="logs" element={
          <ProtectedRoute allowedRoles={['MASTER_ADMIN', 'UNIT_ADMIN']}><Logs /></ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
