import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList, Inbox, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const QRBottomNav = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const scanLevel = localStorage.getItem('qr_scan_level');
  const scanName = localStorage.getItem('qr_scan_name');

  if (location.pathname.includes('kore-modules') || scanLevel === 'koremodule' || scanLevel === 'kore') {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('qr_mode');
    localStorage.removeItem('qr_scan_level');
    localStorage.removeItem('qr_scan_name');
    logout();
    navigate('/login');
  };

  const getUpdateLink = () => {
    if (scanLevel === 'activitytype') {
      return `/user/scan-select?activityType=${encodeURIComponent(scanName || '')}`;
    }
    return `/user/execute?scanLevel=${encodeURIComponent(scanLevel || '')}&scanName=${encodeURIComponent(scanName || '')}`;
  };

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0.5rem 0', paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)', zIndex: 100, boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)' }}>
      <NavLink 
        to={getUpdateLink()} 
        className={({ isActive }) => isActive ? "qr-nav-item active" : "qr-nav-item"}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: '#64748B', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}
      >
        <ClipboardList size={24} />
        <span>Update</span>
      </NavLink>

      <NavLink 
        to="/user/support-inbox" 
        className={({ isActive }) => isActive ? "qr-nav-item active" : "qr-nav-item"}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: '#64748B', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}
      >
        <Inbox size={24} />
        <span>Inbox</span>
      </NavLink>

      <NavLink 
        to="/dashboard" 
        className={({ isActive }) => isActive ? "qr-nav-item active" : "qr-nav-item"}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: '#64748B', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}
      >
        <LayoutDashboard size={24} />
        <span>Dashboard</span>
      </NavLink>
      
      <button 
        onClick={handleLogout}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: '#DC2626', background: 'none', border: 'none', fontSize: '0.75rem', fontWeight: 600, flex: 1, cursor: 'pointer' }}
      >
        <LogOut size={24} />
        <span>Exit</span>
      </button>

      <style>{`
        .qr-nav-item.active {
          color: #059669 !important;
        }
      `}</style>
    </div>
  );
};

export default QRBottomNav;
