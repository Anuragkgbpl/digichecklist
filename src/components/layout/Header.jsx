import React from 'react';
import { User, Bell, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          className="btn btn-secondary mobile-menu-btn" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ padding: '0.5rem', border: 'none', backgroundColor: 'transparent' }}
        >
          <Menu size={24} />
        </button>
        <h1 className="header-title">QR Checklist System</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <Bell size={18} />
        </button>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
              <User size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{user.id}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
