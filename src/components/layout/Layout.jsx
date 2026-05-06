import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import QRBottomNav from './QRBottomNav';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { units } = useData();
  const { user } = useAuth();
  
  const isQrRoute = ['/user/execute', '/user/scan-select', '/user/support-inbox'].some(path => location.pathname.startsWith(path));
  const qrModeFlag = localStorage.getItem('qr_mode') === 'true';
  
  // Show QR UI ONLY for regular USERS or public scans
  // UNIT_ADMIN and MASTER_ADMIN should ALWAYS see the standard sidebar/header
  const isQrMode = (qrModeFlag || isQrRoute) && (!user || user.role === 'USER');

  // Find user's unit configuration for dynamic branding
  let currentUnit = null;
  if (user && user.role !== 'MASTER_ADMIN') {
    currentUnit = units.find(u => u.name === user.unit || u.id === user.id);
  }

  // Inject dynamic styles if a custom theme color is defined
  const themeStyles = currentUnit && currentUnit.themeColor ? (
    <style>{`
      :root {
        --primary: ${currentUnit.themeColor};
        --primary-light: ${currentUnit.themeColor}dd;
        --primary-dark: ${currentUnit.themeColor}99;
      }
      .sidebar-header svg {
        display: none !important;
      }
    `}</style>
  ) : null;

  if (isQrMode) {
    return (
      <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '70px' }}>
        {themeStyles}
        {/* Simple header for QR Mode */}
        <div style={{ backgroundColor: '#FFF', padding: '1rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Shop Floor Operations</h1>
        </div>
        <main style={{ padding: '1rem' }}>
          <Outlet />
        </main>
        <QRBottomNav />
      </div>
    );
  }

  return (
    <div className={`app-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {themeStyles}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90 }}
        />
      )}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} currentUnit={currentUnit} />
      <div className="main-content">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
