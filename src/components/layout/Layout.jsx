import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90 }}
        />
      )}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
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
