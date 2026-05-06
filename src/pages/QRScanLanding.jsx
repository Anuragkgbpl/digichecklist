import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, QrCode, ClipboardList, Inbox, LayoutDashboard, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const QRScanLanding = () => {
  const { level, name } = useParams();
  const { employees } = useData();
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // If already logged in as a USER, we can skip the login prompt
  // But if it's UNIT_ADMIN or MASTER_ADMIN testing, they might want to switch to a USER context.
  // We'll show the prompt anyway for the specific "Test Scan" flow requested.

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!employeeId.trim()) {
      setError('Please enter your Employee ID');
      return;
    }

    setIsProcessing(true);

    // Simulate slow loading as requested
    setTimeout(() => {
      const emp = employees.find(e => String(e.Employee_ID).trim().toLowerCase() === String(employeeId).trim().toLowerCase());

      if (!emp) {
        setError('Employee ID not found in the system.');
        setIsProcessing(false);
        return;
      }

      if (emp.Status === 'Inactive') {
        setError('This account is marked as Inactive.');
        setIsProcessing(false);
        return;
      }

      const actualUser = {
        id: emp.Employee_ID,
        name: emp.Employee_Name,
        role: 'USER',
        unit: emp.Unit || 'Unit A',
        allowedActivity: emp.Allowed_Activity || 'ALL'
      };

      // Mock password to bypass context logic
      login(emp.Employee_ID, '', 'USER', actualUser);
      localStorage.setItem('qr_mode', 'true');
      localStorage.setItem('qr_scan_level', level);
      localStorage.setItem('qr_scan_name', name);
      setIsAuthenticated(true);
      setIsProcessing(false);
    }, 1500); // 1.5 seconds simulated delay
  };

  const navigateToUpdateChecklist = () => {
    if (level === 'activitytype') {
      navigate(`/user/scan-select?activityType=${encodeURIComponent(name)}`);
    } else {
      navigate(`/user/execute?scanLevel=${encodeURIComponent(level)}&scanName=${encodeURIComponent(name)}`);
    }
  };

  if (isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <QrCode size={32} color="#059669" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#064E3B', margin: '0 0 0.5rem' }}>Scan Processed</h2>
            <p style={{ color: '#475569', margin: 0 }}>Welcome, <strong>{user?.name}</strong>! Choose an action below.</p>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <button 
              onClick={navigateToUpdateChecklist}
              style={{ backgroundColor: '#FFF', border: '2px solid #E2E8F0', borderRadius: '1rem', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#10B981'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <div style={{ backgroundColor: '#ECFDF5', padding: '1rem', borderRadius: '0.75rem' }}><ClipboardList size={28} color="#059669" /></div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>Update Checklist</div>
                <div style={{ fontSize: '0.875rem', color: '#64748B' }}>Proceed with the scanned {level === 'activitytype' ? 'Activity' : level} ({name})</div>
              </div>
            </button>

            <button 
              onClick={() => navigate('/user/support-inbox')}
              style={{ backgroundColor: '#FFF', border: '2px solid #E2E8F0', borderRadius: '1rem', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#3B82F6'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <div style={{ backgroundColor: '#EFF6FF', padding: '1rem', borderRadius: '0.75rem' }}><Inbox size={28} color="#2563EB" /></div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>Support Inbox</div>
                <div style={{ fontSize: '0.875rem', color: '#64748B' }}>View jobs allocated to you or by you</div>
              </div>
            </button>

            <button 
              onClick={() => navigate('/dashboard')}
              style={{ backgroundColor: '#FFF', border: '2px solid #E2E8F0', borderRadius: '1rem', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#8B5CF6'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <div style={{ backgroundColor: '#F5F3FF', padding: '1rem', borderRadius: '0.75rem' }}><LayoutDashboard size={28} color="#7C3AED" /></div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>Unit Dashboard</div>
                <div style={{ fontSize: '0.875rem', color: '#64748B' }}>View all unit activities and metrics</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#064E3B', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#FFF', borderRadius: '1.5rem', padding: '2.5rem 2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <PlayCircle size={28} color="#10B981" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#065F46', margin: '0 0 0.5rem' }}>Processing Scan</h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>
            Scanned {level}: <strong>{name}</strong>
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Employee ID
            </label>
            <div style={{ position: 'relative' }}>
              <User size={20} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={employeeId} 
                onChange={(e) => setEmployeeId(e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', border: '2px solid #E2E8F0', borderRadius: '0.75rem', outline: 'none', fontSize: '1rem', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                placeholder="Enter your ID to continue"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isProcessing}
            style={{ width: '100%', backgroundColor: '#059669', color: '#FFF', border: 'none', padding: '1rem', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'background-color 0.2s', opacity: isProcessing ? 0.8 : 1 }}
          >
            {isProcessing ? (
              <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default QRScanLanding;
