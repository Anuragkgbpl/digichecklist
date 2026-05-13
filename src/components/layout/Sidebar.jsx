import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, ClipboardList, QrCode, PlayCircle, Inbox, FileClock, Building2, LogOut, Leaf } from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen, currentUnit }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsOpen(false);
    }
  };

  if (!user) return null;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header" style={{ paddingBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {currentUnit && currentUnit.logo ? (
            <img src={currentUnit.logo} alt="Logo" style={{ height: '32px', marginRight: '0.75rem', objectFit: 'contain' }} />
          ) : (
            <img src="/logo.png" alt="Logo" style={{ height: '42px', width: '42px', marginRight: '0.75rem', objectFit: 'cover', borderRadius: '8px' }} />
          )}
          <h2>{currentUnit ? currentUnit.name : 'Master Console'}</h2>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-completed)' }}></div>
          {user.role.replace('_', ' ')} {user.unit && `• ${user.unit}`}
        </div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        {user.role === 'MASTER_ADMIN' && (
          <>
            <div style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '1rem' }}>
              System Management
            </div>
            <NavLink to="/master/units" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <Building2 size={20} />
              <span>Manage Units</span>
            </NavLink>
          </>
        )}

        {user.role === 'UNIT_ADMIN' && (
          <>
            <div style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '1rem' }}>
              Unit Administration
            </div>
            <NavLink to="/admin/employees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <Users size={20} />
              <span>Employee Master</span>
            </NavLink>
            <NavLink to="/admin/checklists" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <ClipboardList size={20} />
              <span>Checklist Master</span>
            </NavLink>
            <NavLink to="/admin/qr-generation" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <QrCode size={20} />
              <span>QR Generation</span>
            </NavLink>
            <NavLink to="/logs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <FileClock size={20} />
              <span>Logs & Audit Trail</span>
            </NavLink>
          </>
        )}

        {(user.role === 'USER' || user.role === 'UNIT_ADMIN' || user.role === 'MASTER_ADMIN') && (
          <>
            <div style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '1rem' }}>
              Checklist Operations
            </div>
            {user.role === 'USER' && (
              <NavLink to="/user/execute" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                <PlayCircle size={20} />
                <span>Execute Checklist</span>
              </NavLink>
            )}
            <NavLink to="/user/support-inbox" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <Inbox size={20} />
              <span>Support Inbox</span>
            </NavLink>
          </>
        )}
      </nav>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <button 
          onClick={handleLogout}
          className="btn btn-secondary" 
          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--status-rejected)', border: 'none', backgroundColor: '#FEF2F2' }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
