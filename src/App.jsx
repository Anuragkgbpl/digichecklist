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
import QRScanLanding from './pages/QRScanLanding';
import Dashboard from './pages/Dashboard';
import { DataProvider } from './context/DataContext';
import ErrorBoundary from './components/ErrorBoundary';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
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
      {/* ── PUBLIC ROUTES (No login needed) ── */}
      <Route path="/login" element={<Login />} />
      <Route path="/scan/:level/:name" element={<ScanRedirect />} />
      <Route path="/scan-landing/:level/:name" element={<QRScanLanding />} />

      {/* QR Scan flow - fully public, no login required */}


      {/* ── PROTECTED ROUTES (Login required) ── */}
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
        
        {/* Support Inbox - protected */}
        <Route path="user/support-inbox" element={
          <ProtectedRoute allowedRoles={['USER', 'UNIT_ADMIN', 'MASTER_ADMIN']}><SupportInbox /></ProtectedRoute>
        } />
        
        {/* QR Scan flow - inside layout */}
        <Route path="user/scan-select" element={<ScanLineSelect />} />
        <Route path="user/execute" element={<Execution />} />
        
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
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <Router>
            <AppRoutes />
          </Router>
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
