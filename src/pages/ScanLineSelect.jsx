import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layers, ChevronRight, ArrowLeft, CheckCircle, MapPin } from 'lucide-react';

const ScanLineSelect = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const activityType = queryParams.get('activityType') || '';
  const preSelectedLine = queryParams.get('line') || '';

  const [step, setStep] = useState(preSelectedLine ? 2 : 1); // 1 = pick line, 2 = pick sub-line
  const [selectedLine, setSelectedLine] = useState(preSelectedLine);
  const [lines, setLines] = useState([]);
  const [subLines, setSubLines] = useState([]);

  useEffect(() => {
    const checklists = JSON.parse(localStorage.getItem('pcms_checklists') || '[]');
    let relevant = activityType
      ? checklists.filter(c => c.Type_of_Activity === activityType)
      : checklists;

    // Apply user activity filter
    if (user?.allowedActivity && user.allowedActivity !== 'ALL') {
      relevant = relevant.filter(c => c.Type_of_Activity === user.allowedActivity);
    }

    const uniqueLines = [...new Set(relevant.map(c => c.Line_Equipment).filter(Boolean))];
    setLines(uniqueLines);

    if (preSelectedLine) {
      const subs = [...new Set(relevant.filter(c => c.Line_Equipment === preSelectedLine).map(c => c.Sub_Line_Equipment).filter(Boolean))];
      setSubLines(subs);
    }
  }, [activityType, preSelectedLine, user]);

  const handleLineSelect = (line) => {
    setSelectedLine(line);
    const checklists = JSON.parse(localStorage.getItem('pcms_checklists') || '[]');
    let relevant = activityType ? checklists.filter(c => c.Type_of_Activity === activityType) : checklists;
    const subs = [...new Set(relevant.filter(c => c.Line_Equipment === line).map(c => c.Sub_Line_Equipment).filter(Boolean))];
    setSubLines(subs);
    if (subs.length === 0) {
      // No sub-lines — go directly to execution
      navigate(`/user/execute?scanLevel=line&scanName=${encodeURIComponent(line)}`);
    } else {
      setStep(2);
    }
  };

  const handleSubLineSelect = (subLine) => {
    navigate(`/user/execute?scanLevel=sub-line&scanName=${encodeURIComponent(subLine)}`);
  };

  const handleSkipSubLine = () => {
    navigate(`/user/execute?scanLevel=line&scanName=${encodeURIComponent(selectedLine)}`);
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#EFF6FF', border: '2px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Layers size={26} color="var(--primary-light)" />
          </div>
          <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
            {step === 1 ? 'Select Line' : 'Select Sub-Line'}
          </h2>
          {activityType && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: '999px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
              Activity: {activityType}
            </div>
          )}
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          {['Select Line', 'Select Sub-Line', 'Execute'].map((label, i) => (
            <React.Fragment key={label}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', backgroundColor: step > i + 1 ? '#10B981' : step === i + 1 ? 'var(--primary-light)' : '#E2E8F0', color: step >= i + 1 ? '#fff' : 'var(--text-tertiary)' }}>
                  {step > i + 1 ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span style={{ fontSize: '0.7rem', marginTop: '0.3rem', color: step === i + 1 ? 'var(--primary-light)' : 'var(--text-tertiary)', fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
              </div>
              {i < 2 && <div style={{ flex: 2, height: '2px', backgroundColor: step > i + 1 ? '#10B981' : '#E2E8F0', margin: '0 0.25rem', marginBottom: '1.25rem' }} />}
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
              <button onClick={() => { setStep(1); setSelectedLine(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}>
                <ArrowLeft size={16} /> Back
              </button>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>/ {selectedLine}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Select a sub-line or load all checklists for <strong>{selectedLine}</strong>:
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
                Load All Checklists for {selectedLine}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanLineSelect;
