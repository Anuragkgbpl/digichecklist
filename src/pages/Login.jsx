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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #064E3B 0%, #065F46 40%, #059669 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', opacity: 0.1 }}><TreePine size={400} color="#FFF" /></div>
      <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', opacity: 0.1 }}><TreePine size={300} color="#FFF" /></div>

      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', backgroundColor: '#FFF', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        {/* Left Side: Info & Theme */}
        <div style={{ flex: 1, backgroundColor: '#ECFDF5', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid #D1FAE5' }} className="no-mobile">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#10B981', padding: '0.5rem', borderRadius: '0.75rem' }}><Leaf color="#FFF" size={24} /></div>
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.1, color: '#065F46', marginBottom: '1.5rem' }}>
            Digitizing for a <br/><span style={{ color: '#10B981' }}>Greener Future.</span>
          </h2>
          <p style={{ color: '#374151', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            A paperless approach to industrial compliance and safety. Join the mission to save forests through digital precision.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>100%</div><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>PAPERLESS</div></div>
            <div style={{ width: '1px', backgroundColor: '#D1FAE5' }}></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>Real-time</div><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>MONITORING</div></div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div style={{ flex: 1, padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          {/* Portal Switcher */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', borderBottom: '2px solid #F1F5F9' }}>
            <div 
              onClick={() => { setActivePortal('UNIT'); setLoginType('USER'); }}
              style={{ padding: '0.75rem 0', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: activePortal === 'UNIT' ? '#059669' : '#94A3B8', borderBottom: activePortal === 'UNIT' ? '2px solid #059669' : 'none', marginBottom: '-2px' }}
            >
              Unit Portal
            </div>
            <div 
              onClick={() => setActivePortal('MASTER')}
              style={{ padding: '0.75rem 0', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: activePortal === 'MASTER' ? '#059669' : '#94A3B8', borderBottom: activePortal === 'MASTER' ? '2px solid #059669' : 'none', marginBottom: '-2px' }}
            >
              Master Admin
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#1F2937' }}>Welcome Back</h3>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
              {activePortal === 'MASTER' ? 'Access global system settings.' : 'Enter your credentials to access your unit.'}
            </p>
          </div>

          {activePortal === 'UNIT' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '0.25rem', borderRadius: '0.75rem' }}>
              {['USER', 'UNIT_ADMIN'].map((type) => (
                <div 
                  key={type}
                  onClick={() => setLoginType(type)}
                  style={{
                    flex: 1, textAlign: 'center', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '0.5rem', cursor: 'pointer',
                    backgroundColor: loginType === type ? '#FFF' : 'transparent',
                    color: loginType === type ? '#059669' : '#64748B',
                    boxShadow: loginType === type ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {type === 'USER' ? 'Employee' : 'Unit Admin'}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                {activePortal === 'MASTER' ? 'Admin Login ID' : loginType === 'UNIT_ADMIN' ? 'Unit Login ID' : 'Employee ID'}
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" value={id} onChange={(e) => setId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '2px solid #F1F5F9', borderRadius: '0.75rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} 
                  placeholder="Enter ID..."
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = '#F1F5F9'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '2px solid #F1F5F9', borderRadius: '0.75rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} 
                  placeholder="••••••••"
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = '#F1F5F9'}
                />
              </div>
            </div>

            {error && <div style={{ color: '#DC2626', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>{error}</div>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', borderRadius: '0.75rem', backgroundColor: '#059669', border: 'none', fontWeight: 700, fontSize: '1rem' }}>
              Continue <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
            </button>
          </form>

          {activePortal === 'UNIT' && loginType === 'USER' && (
            <button 
              onClick={handleQRLogin}
              style={{ width: '100%', marginTop: '1rem', padding: '0.875rem', borderRadius: '0.75rem', border: '2px solid #D1FAE5', backgroundColor: '#ECFDF5', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <QrCode size={18} /> Login via QR Scan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
