import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ScanRedirect = () => {
  const { level, name } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate everyone to the new QR landing page to enter Employee ID
    navigate(`/scan-landing/${encodeURIComponent(level)}/${encodeURIComponent(name)}`);
  }, [level, name, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTop: '3px solid var(--primary-light)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Processing QR Code...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ScanRedirect;
