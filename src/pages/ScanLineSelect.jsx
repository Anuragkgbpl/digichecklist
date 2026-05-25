import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layers, ChevronRight, ArrowLeft, CheckCircle, MapPin, Box, Flame, Map, Tag, Compass } from 'lucide-react';
import { useData } from '../context/DataContext';

const ScanLineSelect = () => {
  const { user } = useAuth();
  const { checklists: cloudChecklists = [], loading: dataLoading } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const activityType = queryParams.get('activityType') || '';
  const preSelectedLine = queryParams.get('line') || '';

  const isFireSafety = activityType.trim().toLowerCase() === 'fire safety';
  const steps = isFireSafety 
    ? ['Line', 'Sub-Line', 'Area', 'Category', 'Asset ID', 'Component']
    : ['Line', 'Sub-Line', 'Component'];

  const [step, setStep] = useState(preSelectedLine ? 2 : 1);
  const [selectedLine, setSelectedLine] = useState(preSelectedLine);
  const [selectedSubLine, setSelectedSubLine] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');

  const [lines, setLines] = useState([]);
  const [subLines, setSubLines] = useState([]);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assetIds, setAssetIds] = useState([]);
  const [components, setComponents] = useState([]);

  useEffect(() => {
    if (dataLoading) return;

    // Helper to check if a user has access to a specific activity type
    const hasAccess = (actType) => {
      const allowed = user?.allowedActivity;
      if (!allowed) return true; // No restriction
      if (typeof allowed === 'string') {
        return allowed === 'ALL' || String(allowed).trim().toLowerCase() === String(actType).trim().toLowerCase();
      }
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

    // 2. Filter subline options
    let lineFiltered = relevant;
    if (selectedLine) {
      lineFiltered = relevant.filter(c => String(c.Line_Equipment || '').trim().toLowerCase() === String(selectedLine).trim().toLowerCase());
    }
    const uniqueSubs = [...new Set(lineFiltered.map(c => c.Sub_Line_Equipment).filter(Boolean))];
    setSubLines(uniqueSubs);

    if (isFireSafety) {
      // 3. Filter Area options
      let subLineFiltered = lineFiltered;
      if (selectedSubLine) {
        subLineFiltered = lineFiltered.filter(c => String(c.Sub_Line_Equipment || '').trim().toLowerCase() === String(selectedSubLine).trim().toLowerCase());
      }
      const uniqueAreas = [...new Set(subLineFiltered.map(c => c.Area_Zone || c.Area).filter(Boolean))];
      setAreas(uniqueAreas);

      // 4. Filter Category options
      let areaFiltered = subLineFiltered;
      if (selectedArea) {
        areaFiltered = subLineFiltered.filter(c => String(c.Area_Zone || c.Area || '').trim().toLowerCase() === String(selectedArea).trim().toLowerCase());
      }
      const uniqueCats = [...new Set(areaFiltered.map(c => c.Equipment_Category).filter(Boolean))];
      setCategories(uniqueCats);

      // 5. Filter Asset ID options
      let catFiltered = areaFiltered;
      if (selectedCategory) {
        catFiltered = areaFiltered.filter(c => String(c.Equipment_Category || '').trim().toLowerCase() === String(selectedCategory).trim().toLowerCase());
      }
      const uniqueAssets = [...new Set(catFiltered.map(c => c.Asset_ID).filter(Boolean))];
      setAssetIds(uniqueAssets);

      // 6. Filter Component options
      let assetFiltered = catFiltered;
      if (selectedAssetId) {
        assetFiltered = catFiltered.filter(c => String(c.Asset_ID || '').trim().toLowerCase() === String(selectedAssetId).trim().toLowerCase());
      }
      const uniqueComps = [...new Set(assetFiltered.map(c => c.Component).filter(Boolean))];
      setComponents(uniqueComps);
    } else {
      // Standard Flow: Component options (dependent on Subline)
      let subLineFiltered = lineFiltered;
      if (selectedSubLine) {
        subLineFiltered = lineFiltered.filter(c => String(c.Sub_Line_Equipment || '').trim().toLowerCase() === String(selectedSubLine).trim().toLowerCase());
      }
      const uniqueComps = [...new Set(subLineFiltered.map(c => c.Component).filter(Boolean))];
      setComponents(uniqueComps);
    }

  }, [activityType, selectedLine, selectedSubLine, selectedArea, selectedCategory, selectedAssetId, user, cloudChecklists, dataLoading, isFireSafety]);

  const handleLineSelect = (line) => {
    setSelectedLine(line);
    setSelectedSubLine('');
    setStep(2);
  };

  const handleSubLineSelect = (subLine) => {
    setSelectedSubLine(subLine);
    setStep(3);
  };

  const handleSkipSubLine = () => {
    setSelectedSubLine('');
    setStep(3);
  };

  const handleAreaSelect = (area) => {
    setSelectedArea(area);
    setStep(4);
  };

  const handleSkipArea = () => {
    setSelectedArea('');
    setStep(4);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setStep(5);
  };

  const handleSkipCategory = () => {
    setSelectedCategory('');
    setStep(5);
  };

  const handleAssetSelect = (assetId) => {
    setSelectedAssetId(assetId);
    setStep(6);
  };

  const handleSkipAsset = () => {
    setSelectedAssetId('');
    setStep(6);
  };

  const handleComponentSelect = (component) => {
    setSelectedComponent(component);
    navigateToExecute(component);
  };

  const handleSkipComponent = () => {
    navigateToExecute('');
  };

  const navigateToExecute = (finalComponent) => {
    const params = new URLSearchParams();
    if (activityType) params.set('activityType', activityType);
    if (selectedLine) params.set('line', selectedLine);
    if (selectedSubLine) params.set('subLine', selectedSubLine);

    if (isFireSafety) {
      if (selectedArea) params.set('area', selectedArea);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedAssetId) params.set('assetId', selectedAssetId);
    }
    
    const comp = finalComponent || selectedComponent;
    if (comp) params.set('component', comp);

    navigate(`/user/execute?${params.toString()}`);
  };

  const primaryColor = isFireSafety ? '#EF4444' : 'var(--primary-light)';
  const lightBgColor = isFireSafety ? '#FEF2F2' : '#EFF6FF';

  const cardStyle = (selected = false) => ({
    padding: '1.25rem 1.5rem',
    border: `2px solid ${selected ? primaryColor : 'var(--border-color)'}`,
    borderRadius: 'var(--border-radius-md)',
    backgroundColor: selected ? lightBgColor : 'var(--surface-color)',
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
        <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTop: `3px solid ${primaryColor}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Syncing with cloud...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '550px' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {isFireSafety ? <Flame size={28} color="#EF4444" style={{ animation: 'pulse 2s infinite' }} /> : <Layers size={28} color="var(--primary-light)" />}
            {isFireSafety ? 'Fire Safety Checklist Wizard' : 'Checklist Selection'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {isFireSafety ? 'Configure location & fire equipment details' : 'Configure location & activity'}
          </p>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2.5rem', overflowX: 'auto', padding: '0.5rem 0' }}>
          {steps.map((label, i) => (
            <React.Fragment key={label}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: '60px' }}>
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 700, 
                  fontSize: '0.75rem', 
                  backgroundColor: step > i + 1 ? '#10B981' : step === i + 1 ? primaryColor : '#E2E8F0', 
                  color: step >= i + 1 ? '#fff' : 'var(--text-tertiary)',
                  boxShadow: step === i + 1 ? `0 0 0 4px ${isFireSafety ? '#FEF2F2' : '#EFF6FF'}` : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {step > i + 1 ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: '0.65rem', marginTop: '0.4rem', color: step === i + 1 ? primaryColor : 'var(--text-tertiary)', fontWeight: step === i + 1 ? 700 : 400, whiteSpace: 'nowrap' }}>{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ 
                  flex: '1 1 auto', 
                  height: '2px', 
                  backgroundColor: step > i + 1 ? '#10B981' : '#E2E8F0', 
                  margin: '0 0.2rem', 
                  marginBottom: '1.2rem',
                  minWidth: '20px',
                  transition: 'all 0.3s ease'
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1 — Select Line */}
        {step === 1 && (
          <div className="card" style={{ backdropFilter: 'blur(16px)', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Choose the plant line/equipment group:
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {lines.map(line => (
                <div key={line} style={cardStyle()} onClick={() => handleLineSelect(line)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = primaryColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: isFireSafety ? '#FEF2F2' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={16} color={primaryColor} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{line}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Main Plant Area</div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-tertiary)" />
                </div>
              ))}
              {lines.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No active lines found for this activity type.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Select Sub-Line */}
        {step === 2 && (
          <div className="card" style={{ backdropFilter: 'blur(16px)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button onClick={() => { setStep(1); setSelectedLine(''); setSelectedSubLine(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: primaryColor, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}>
                <ArrowLeft size={16} /> Back
              </button>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>/ {selectedLine}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Select a sub-line for <strong>{selectedLine}</strong>:
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {subLines.map(sub => (
                <div key={sub} style={cardStyle()} onClick={() => handleSubLineSelect(sub)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = primaryColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: isFireSafety ? '#FEF2F2' : '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={16} color={isFireSafety ? '#EF4444' : '#059669'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sub}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Sub-Line / Module</div>
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

        {/* Step 3 — Area (Fire Safety Only) */}
        {step === 3 && isFireSafety && (
          <div className="card" style={{ backdropFilter: 'blur(16px)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button onClick={() => { setStep(2); setSelectedSubLine(''); setSelectedArea(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: primaryColor, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}>
                <ArrowLeft size={16} /> Back
              </button>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>/ {selectedLine} {selectedSubLine && `> ${selectedSubLine}`}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Select specific <strong>Area / Zone</strong>:
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {areas.map(area => (
                <div key={area} style={cardStyle()} onClick={() => handleAreaSelect(area)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = primaryColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Map size={16} color="#EF4444" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{area}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Area / Zone</div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-tertiary)" />
                </div>
              ))}
              <button onClick={handleSkipArea} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.25rem' }}>
                Skip Area / Zone
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Category (Fire Safety Only) */}
        {step === 4 && isFireSafety && (
          <div className="card" style={{ backdropFilter: 'blur(16px)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button onClick={() => { setStep(3); setSelectedArea(''); setSelectedCategory(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: primaryColor, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}>
                <ArrowLeft size={16} /> Back
              </button>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>/ {selectedLine} {selectedArea && `> ${selectedArea}`}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Select <strong>Equipment Category</strong>:
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {categories.map(cat => (
                <div key={cat} style={cardStyle()} onClick={() => handleCategorySelect(cat)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = primaryColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Flame size={16} color="#EF4444" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Category</div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-tertiary)" />
                </div>
              ))}
              <button onClick={handleSkipCategory} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.25rem' }}>
                Skip Category
              </button>
            </div>
          </div>
        )}

        {/* Step 5 — Asset ID (Fire Safety Only) */}
        {step === 5 && isFireSafety && (
          <div className="card" style={{ backdropFilter: 'blur(16px)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button onClick={() => { setStep(4); setSelectedCategory(''); setSelectedAssetId(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: primaryColor, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}>
                <ArrowLeft size={16} /> Back
              </button>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>/ {selectedLine} {selectedCategory && `> ${selectedCategory}`}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Select <strong>Asset ID</strong>:
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {assetIds.map(assetId => (
                <div key={assetId} style={cardStyle()} onClick={() => handleAssetSelect(assetId)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = primaryColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Tag size={16} color="#EF4444" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{assetId}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Asset ID</div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-tertiary)" />
                </div>
              ))}
              <button onClick={handleSkipAsset} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.25rem' }}>
                Skip Asset ID
              </button>
            </div>
          </div>
        )}

        {/* Step 3 (Standard) or Step 6 (Fire Safety) — Select Component */}
        {((step === 3 && !isFireSafety) || (step === 6 && isFireSafety)) && (
          <div className="card" style={{ backdropFilter: 'blur(16px)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button onClick={() => { setStep(isFireSafety ? 5 : subLines.length > 0 ? 2 : 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: primaryColor, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, padding: 0 }}>
                <ArrowLeft size={16} /> Back
              </button>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                / {selectedLine} {isFireSafety ? (selectedAssetId && `> ${selectedAssetId}`) : (selectedSubLine && `> ${selectedSubLine}`)}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Select a specific component to load activities:
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {components.map(comp => (
                <div key={comp} style={cardStyle()} onClick={() => handleComponentSelect(comp)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = primaryColor}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: isFireSafety ? '#FEF2F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Box size={16} color={primaryColor} />
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
              <button onClick={handleSkipComponent} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: primaryColor, borderColor: primaryColor }}>
                Load All Components
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ScanLineSelect;


