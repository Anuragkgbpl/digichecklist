import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QrCode, Lock, User, Leaf, Shield, ArrowRight, TreePine } from 'lucide-react';
import { useData } from '../context/DataContext';
import { checkSystemConfig, isSystemKey } from '../utils/crypto';

const Login = () => {
  const { employees: cloudEmployees, units: cloudUnits, updateFirebase } = useData();


  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [unitBranding, setUnitBranding] = useState(null);

  useEffect(() => {
    const inputId = id.trim();
    if (inputId) {
      const unit = cloudUnits.find(u => u.id === inputId || u.name === inputId || u.unitLoginId === inputId);
      if (unit) {
        setUnitBranding({
          logo: unit.logo,
          scale: unit.logoScale || 1,
          border: unit.logoBorder || false,
          color: unit.themeColor || '#10B981'
        });
      } else {
        setUnitBranding(null);
      }
    } else {
      setUnitBranding(null);
    }
  }, [id, cloudUnits]);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!id || !password) {
      setError('Please enter ID and Password');
      return;
    }

    const inputId = id.trim();
    const inputPass = password.trim();

    let actualUser = null;
    let role = null;

    // 1. Check Master Admin First
    if (isSystemKey(inputId)) {
      if (!checkSystemConfig(inputId, inputPass)) {
        setError('Incorrect password.');
        return;
      }
      role = 'MASTER_ADMIN';
      actualUser = { id: 'MASTER_ADMIN', name: 'Master Admin', role: 'MASTER_ADMIN', unit: null, allowedActivity: 'ALL' };
    }
    // 2. Check Unit Admin Second
    else {
      // Attempt to find unit in cloud data
      let unit = cloudUnits.find(u => u.id === inputId || u.name === inputId || u.unitLoginId === inputId);
      if (unit) {
        if (unit.password && unit.password !== inputPass) {
          setError('Incorrect password.');
          return;
        }
        role = 'UNIT_ADMIN';
        actualUser = { id: unit.id, name: unit.name, role: 'UNIT_ADMIN', unit: unit.name, allowedActivity: 'ALL' };
      } else {
        // Attempt to find employee in cloud data
        let emp = cloudEmployees.find(e => e.Employee_ID === inputId);
        if (emp) {
          if (emp.Status === 'Inactive') {
            setError('This account is marked as Inactive.');
            return;
          }
          const storedPassword = emp.password || emp.Employee_ID;
          if (storedPassword !== inputPass) {
            setError('Incorrect password.');
            return;
          }
          role = 'USER';
          actualUser = {
            id: emp.Employee_ID,
            name: emp.Employee_Name,
            role: 'USER',
            unit: 'Unit A', // Default or derived from unit configuration in the future
            allowedActivity: emp.Allowed_Activity || 'ALL'
          };
        } else {
          setError('Invalid ID. User not found in system.');
          return;
        }
      }
    }

    const success = login(inputId, inputPass, role, actualUser);

    if (!success) {
      setError('Login failed. Please try again.');
      return;
    }

    // Clear any previous QR session data when logging in via main login page
    localStorage.removeItem('qr_mode');
    localStorage.removeItem('qr_scan_level');
    localStorage.removeItem('qr_scan_name');

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
            <div style={{ backgroundColor: '#FFF', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #D1FAE5', overflow: 'hidden' }}>
              <img src="/logo.png" alt="Brand" style={{ height: '42px', width: '42px', objectFit: 'cover' }} />
            </div>
            <span style={{ fontWeight: 800, color: '#065F46', fontSize: '1.25rem' }}>Digital checklist</span>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 900, lineHeight: 1.1, color: '#065F46', marginBottom: '1.5rem' }}>
            Digitizing for a <br /><span style={{ color: '#10B981' }}>Greener Future.</span>
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
        <div className="login-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {unitBranding && unitBranding.logo ? (
            <div style={{
              marginBottom: '2rem',
              transform: `scale(${unitBranding.scale})`,
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <img
                src={unitBranding.logo}
                alt="Unit Logo"
                style={{
                  height: '80px',
                  maxWidth: '200px',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  padding: unitBranding.border ? '8px' : '0',
                  border: unitBranding.border ? `2px solid ${unitBranding.color}` : 'none',
                  backgroundColor: unitBranding.border ? '#fff' : 'transparent',
                  boxShadow: unitBranding.border ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none'
                }}
              />
            </div>
          ) : (
            <div style={{ backgroundColor: '#FFF', borderRadius: '1.5rem', marginBottom: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #E2E8F0', overflow: 'hidden' }}>
              <img src="/logo.png" alt="App Logo" style={{ height: '96px', width: '96px', objectFit: 'cover' }} />
            </div>
          )}

          <div style={{ marginBottom: '2.5rem', textAlign: 'center', width: '100%' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#1F2937' }}>Welcome Back</h3>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>
              Please enter your credentials to continue.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '350px' }}>
            <div className="input-group">
              <label className="input-label" style={{ textAlign: 'left' }}>Login ID</label>
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
              <label className="input-label" style={{ textAlign: 'left' }}>Password</label>
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
        </div>
      </div>
    </div>
  );
};

export default Login;
