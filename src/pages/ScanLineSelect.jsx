import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layers, ChevronRight, ArrowLeft, CheckCircle, MapPin, Box } from 'lucide-react';
import { useData } from '../context/DataContext';

const ScanLineSelect = () => {
  const { user } = useAuth();
  const { checklists: cloudChecklists = [], loading: dataLoading } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const activityType = queryParams.get('activityType') || '';
  const preSelectedLine = queryParams.get('line') || '';

  const [step, setStep] = useState(preSelectedLine ? 2 : 1); // 1=Line, 2=Sub-Line, 3=Component
  const [selectedLine, setSelectedLine] = useState(preSelectedLine);
  const [selectedSubLine, setSelectedSubLine] = useState('');
  const [lines, setLines] = useState([]);
  const [subLines, setSubLines] = useState([]);
  const [components, setComponents] = useState([]);

  useEffect(() => {
    if (dataLoading) return;

    // Helper to check if a user has access to a specific activity type
    const hasAccess = (actType) => {
      const allowed = user?.allowedActivity;
      if (!allowed) return true; // No restriction
      // Handle string 'ALL'
      if (typeof allowed === 'string') {
        return allowed === 'ALL' || String(allowed).trim().toLowerCase() === String(actType).trim().toLowerCase();
      }
      // Handle array
      if (Array.isArray(allowed)) {
        return allowed.includes('ALL') || allowed.some(a => String(a).trim().toLowerCase() === String(actType).trim().toLowerCase());
      }
      return true;
    };

    let relevant = cloudChecklists.filter(c => c.Status !== 'Inactive');

    // Filter by scanned activity type first
    if (activityType) {
      relevant = relevant.filter(c =>
        String(c.Type_of_Activity || '').trim().toLowerCase() === String(activityType).trim().toLowerCase()
      );
    }

    // Apply user access control
    relevant = relevant.filter(c => hasAccess(c.Type_of_Activity));

    // 1. Set Line options
    const uniqueLines = [...new Set(relevant.map(c => c.Line_Equipment).filter(Boolean))];
    setLines(uniqueLines);

    // 2. If Line is selected, filter subline options
    let lineFiltered = relevant;
    if (selectedLine) {
      lineFiltered = relevant.filter(c => String(c.Line_Equipment || '').trim().toLowerCase() === String(selectedLine).trim().toLowerCase());
    }
    const uniqueSubs = [...new Set(lineFiltered.map(c => c.Sub_Line_Equipment).filter(Boolean))];
    setSubLines(uniqueSubs);

    // 3. Filter component options
    let subLineFiltered = lineFiltered;
    if (selectedSubLine) {
      subLineFiltered = lineFiltered.filter(c => String(c.Sub_Line_Equipment || '').trim().toLowerCase() === String(selectedSubLine).trim().toLowerCase());
    }
    const uniqueComps = [...new Set(subLineFiltered.map(c => c.Component).filter(Boolean))];
    setComponents(uniqueComps);

  }, [activityType, selectedLine, selectedSubLine, user, cloudChecklists, dataLoading]);

  const handleLineSelect = (line) => {
    setSelectedLine(line);
    setSelectedSubLine(''); // reset subline on new line choice
    const relevant = (activityType ? cloudChecklists.filter(c => String(c.Type_of_Activity || '').trim().toLowerCase() === String(activityType).trim().toLowerCase()) : cloudChecklists)
                    .filter(c => String(c.Line_Equipment || '').trim().toLowerCase() === String(line).trim().toLowerCase());
    const subs = [...new Set(relevant.map(c => c.Sub_Line_Equipment).filter(Boolean))];
    if (subs.length === 0) {
      // If no sub-lines, step straight to component
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleSubLineSelect = (subLine) => {
    setSelectedSubLine(subLine);
    setStep(3);
  };

  const handleSkipSubLine = () => {
    setSelectedSubLine('');
    setStep(3);
  };

  const handleComponentSelect = (component) => {
    const params = new URLSearchParams();
    if (activityType) params.set('activityType', activityType);
    if (selectedLine) params.set('line', selectedLine);
    if (selectedSubLine) params.set('subLine', selectedSubLine);
    if (component) params.set('component', component);
    navigate(`/user/execute?${params.toString()}`);
  };

  const handleSkipComponent = () => {
    const params = new URLSearchParams();
    if (activityType) params.set('activityType', activityType);
    if (selectedLine) params.set('line', selectedLine);
    if (selectedSubLine) params.set('subLine', selectedSubLine);
    navigate(`/user/execute?${params.toString()}`);
  };

  const cardStyle = (selected = false) => ({
    padding: '1.25rem 1.5rem',
    border: `2px solid ${selected ? 'var(--primary-light)' : 'var(--border-color)'}`,
    borderRadius: 'var(--border-radius-md)',
    backgroundColor: selected ? '#EFF6FF' : 'var(--surface-color)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    transition: 'all 0.15s ease',
  });

  if (dataLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', backgroundColor: 'var(--bg-color)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTop: '3px solid var(--primary-light)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Syncing with cloud...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>

        {/* Header handled by Layout */}


        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          {['Line', 'Sub-Line', 'Component'].map((label, i) => (
            <React.Fragment key={label}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', backgroundColor: step > i + 1 ? '#10B981' : step === i + 1 ? 'var(--primary-light)' : '#E2E8F0', color: step >= i + 1 ? '#fff' : 'var(--text-tertiary)' }}>
                  {step > i + 1 ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: '0.65rem', marginTop: '0.3rem', color: step === i + 1 ? 'var(--primary-light)' : 'var(--text-tertiary)', fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
              </div>
              {i < 2 && <div style={{ flex: 1.5, height: '2px', backgroundColor: step > i + 1 ? '#10B981' : '#E2E8F0', margin: '0 0.2rem', marginBottom: '1rem' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1 — Select Line */}
        {step === 1 && (
          <div className="card">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Choose the production line for this checklist:
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {lines.map(line => (
                <div key={line} style={cardStyle()} onClick={() => handleLineSelect(line)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-light)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={16} color="var(--primary-light)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{line}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Production Line</div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-tertiary)" />
                </div>
              ))}
              {lines.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No lines found for this activity type.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Select Sub-Line */}
        {step === 2 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <button onClick={() => { setStep(1); setSelectedLine(''); setSelectedSubLine(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}>
                <ArrowLeft size={16} /> Back
              </button>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>/ {selectedLine}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Select a sub-line for <strong>{selectedLine}</strong>:
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {subLines.map(sub => (
                <div key={sub} style={cardStyle()} onClick={() => handleSubLineSelect(sub)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-light)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={16} color="#059669" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sub}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Sub-Line of {selectedLine}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-tertiary)" />
                </div>
              ))}
              <button onClick={handleSkipSubLine} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.25rem' }}>
                Skip Sub-Line
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Select Component */}
        {step === 3 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <button onClick={() => { setStep(subLines.length > 0 ? 2 : 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}>
                <ArrowLeft size={16} /> Back
              </button>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>/ {selectedLine} {selectedSubLine && `/ ${selectedSubLine}`}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Select a specific component to load checklists:
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {components.map(comp => (
                <div key={comp} style={cardStyle()} onClick={() => handleComponentSelect(comp)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-light)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Box size={16} color="var(--primary-light)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{comp}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Component / Module</div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-tertiary)" />
                </div>
              ))}
              {components.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No specific components found.
                </div>
              )}
              <button onClick={handleSkipComponent} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Load All Components
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanLineSelect;

