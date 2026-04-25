import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QrCode, Lock, User, Leaf, Shield, Globe, ArrowRight, TreePine } from 'lucide-react';
import { useData } from '../context/DataContext';

const Login = () => {
  const { employees: cloudEmployees, units: cloudUnits, updateFirebase } = useData();
  const [activePortal, setActivePortal] = useState('UNIT'); // 'UNIT' or 'MASTER'
  
  useEffect(() => {
    // Automatically switch to Master Portal if the URL hostname contains 'master'
    if (window.location.hostname.includes('master')) {
      setActivePortal('MASTER');
    }
  }, []);

  // Data Migration: LocalStorage -> Firebase (Only once if Firebase is empty)
  useEffect(() => {
    const migrate = async () => {
      const localUnits = JSON.parse(localStorage.getItem('pcms_units') || '[]');
      if (localUnits.length > 0 && cloudUnits.length === 0) {
        await updateFirebase('units', localUnits);
      }
      const localEmps = JSON.parse(localStorage.getItem('pcms_employees') || '[]');
      if (localEmps.length > 0 && cloudEmployees.length === 0) {
        await updateFirebase('employees', localEmps);
      }
      const localChecklists = JSON.parse(localStorage.getItem('pcms_checklists') || '[]');
      if (localChecklists.length > 0) {
        await updateFirebase('checklists', localChecklists);
      }
    };
    migrate();
  }, [cloudUnits, cloudEmployees]);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loginType, setLoginType] = useState('USER'); // 'USER', 'UNIT_ADMIN'
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    
    if (!id || !password) {
      setError('Please enter ID and Password');
      return;
    }
    
    let actualUser = null;
    const role = activePortal === 'MASTER' ? 'MASTER_ADMIN' : loginType;

    // Direct check for Master Admin for absolute reliability
    if (role === 'MASTER_ADMIN') {
      const inputId = id.trim();
      const inputPass = password.trim();
      
      // Case-insensitive ID check for Master Admin
      if (inputId.toLowerCase() !== 'master_jarvis' || inputPass !== '9826731251@Anurag') {
        setError('Invalid Master Admin credentials. Please check ID and Password.');
        return;
      }
      actualUser = { id: 'Master_jarvis', name: 'Master Admin', role: 'MASTER_ADMIN', unit: null, allowedActivity: 'ALL' };
    } else if (role === 'USER') {
      const emp = cloudEmployees.find(e => e.Employee_ID === id.trim());
      
      if (!emp) {
        setError('User ID not found in Employee Master.');
        return;
      }
      if (emp.Status === 'Inactive') {
        setError('This account is marked as Inactive.');
        return;
      }
      const storedPassword = emp.password || emp.Employee_ID;
      if (storedPassword !== password.trim()) {
        setError('Incorrect password.');
        return;
      }
      
      actualUser = {
        id: emp.Employee_ID,
        name: emp.Employee_Name,
        role: 'USER',
        unit: 'Unit A',
        allowedActivity: emp.Allowed_Activity || 'ALL'
      };
    } else if (role === 'UNIT_ADMIN') {
      const unit = cloudUnits.find(u => u.id === id.trim() || u.name === id.trim());
      if (!unit) {
        setError('Unit ID/Name not found.');
        return;
      }
      if (unit.password && unit.password !== password.trim()) {
        setError('Incorrect Unit Admin password.');
        return;
      }
      actualUser = { id: unit.id, name: unit.name, role: 'UNIT_ADMIN', unit: unit.name, allowedActivity: 'ALL' };
    }
    
    const success = login(id.trim(), password.trim(), role, actualUser);
    
    if (!success) {
      setError('Login failed. Please try again.');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect');
    navigate(redirectUrl || '/');
  };

  const handleQRLogin = () => {
    login('qr_user', 'qr_token', 'USER');
    navigate('/');
  };

  return (
    <div className="login-page-container">
      <style>{`
        .login-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #064E3B 0%, #065F46 40%, #059669 100%);
          padding: 1rem;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .login-card {
          width: 100%;
          max-width: 900px;
          display: flex;
          background-color: #FFF;
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          z-index: 10;
        }
        .login-left {
          flex: 1;
          background-color: #ECFDF5;
          padding: 3.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-right: 1px solid #D1FAE5;
        }
        .login-right {
          flex: 1;
          padding: 3.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .mobile-header {
          display: none;
          text-align: center;
          margin-bottom: 2rem;
        }
        @media (max-width: 850px) {
          .login-card {
            flex-direction: column;
            max-width: 450px;
          }
          .login-left {
            display: none;
          }
          .mobile-header {
            display: block;
          }
          .login-right {
            padding: 2.5rem 2rem;
          }
        }
        .portal-tab {
          padding: 0.75rem 0;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .input-group {
          margin-bottom: 1.25rem;
        }
        .input-label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #374151;
        }
        .input-wrapper {
          position: relative;
        }
        .login-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          border: 2px solid #F1F5F9;
          border-radius: 0.875rem;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
          font-size: 1rem;
        }
        .login-input:focus {
          border-color: #10B981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }
        .login-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          border-radius: 0.875rem;
          background-color: #059669;
          color: white;
          border: none;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 1rem;
        }
        .login-btn:hover {
          background-color: #047857;
          transform: translateY(-2px);
        }
        .qr-btn {
          width: 100%;
          margin-top: 1rem;
          padding: 0.875rem;
          border-radius: 0.875rem;
          border: 2px solid #D1FAE5;
          background-color: #ECFDF5;
          color: #059669;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .qr-btn:hover {
          background-color: #D1FAE5;
        }
      `}</style>

      {/* Decorative Elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', opacity: 0.1 }}><TreePine size={400} color="#FFF" /></div>
      <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', opacity: 0.1 }}><TreePine size={300} color="#FFF" /></div>

      <div className="login-card">
        {/* Left Side: Info & Theme */}
        <div className="login-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: '#10B981', padding: '0.6rem', borderRadius: '0.875rem' }}><Leaf color="#FFF" size={28} /></div>
            <span style={{ fontWeight: 800, color: '#065F46', fontSize: '1.25rem' }}>Digital PCMS</span>
          </div>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 900, lineHeight: 1.1, color: '#065F46', marginBottom: '1.5rem' }}>
            Digitizing for a <br/><span style={{ color: '#10B981' }}>Greener Future.</span>
          </h2>
          <p style={{ color: '#374151', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
            Eliminate paperwork with our state-of-the-art compliance system. Precision, speed, and sustainability combined.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>100%</div><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em' }}>PAPERLESS</div></div>
            <div style={{ width: '1px', backgroundColor: '#D1FAE5' }}></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>Real-time</div><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em' }}>MONITORING</div></div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="login-right">
          <div className="mobile-header">
            <div style={{ backgroundColor: '#10B981', padding: '0.6rem', borderRadius: '0.875rem', width: 'fit-content', margin: '0 auto 1rem auto' }}><Leaf color="#FFF" size={24} /></div>
            <h2 style={{ color: '#065F46', margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Digital PCMS</h2>
          </div>

          {/* Portal Switcher */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', borderBottom: '2px solid #F1F5F9' }}>
            <div 
              onClick={() => { setActivePortal('UNIT'); setLoginType('USER'); }}
              className="portal-tab"
              style={{ color: activePortal === 'UNIT' ? '#059669' : '#94A3B8', borderBottom: activePortal === 'UNIT' ? '2px solid #059669' : 'none', marginBottom: '-2px' }}
            >
              Unit Portal
            </div>
            <div 
              onClick={() => setActivePortal('MASTER')}
              className="portal-tab"
              style={{ color: activePortal === 'MASTER' ? '#059669' : '#94A3B8', borderBottom: activePortal === 'MASTER' ? '2px solid #059669' : 'none', marginBottom: '-2px' }}
            >
              Master Admin
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#1F2937' }}>Welcome</h3>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>
              {activePortal === 'MASTER' ? 'Global Administration Console' : 'Secure Unit Login'}
            </p>
          </div>

          {activePortal === 'UNIT' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', backgroundColor: '#F8FAFC', padding: '0.3rem', borderRadius: '0.875rem' }}>
              {['USER', 'UNIT_ADMIN'].map((type) => (
                <div 
                  key={type}
                  onClick={() => setLoginType(type)}
                  style={{
                    flex: 1, textAlign: 'center', padding: '0.6rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '0.6rem', cursor: 'pointer',
                    backgroundColor: loginType === type ? '#FFF' : 'transparent',
                    color: loginType === type ? '#059669' : '#64748B',
                    boxShadow: loginType === type ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {type === 'USER' ? 'Employee' : 'Unit Admin'}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">
                {activePortal === 'MASTER' ? 'Admin ID' : loginType === 'UNIT_ADMIN' ? 'Unit ID' : 'Employee ID'}
              </label>
              <div className="input-wrapper">
                <User size={20} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" value={id} onChange={(e) => setId(e.target.value)}
                  className="login-input"
                  placeholder="Enter your ID"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <Lock size={20} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: '0.8rem', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} /> {error}
              </div>
            )}

            <button type="submit" className="login-btn">
              Continue <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </button>
          </form>

          {activePortal === 'UNIT' && loginType === 'USER' && (
            <button onClick={handleQRLogin} className="qr-btn">
              <QrCode size={20} /> Login via QR Scan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
