import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlayCircle, Camera, X, Inbox, Info, CheckCircle, AlertCircle, Image, ZoomIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Progress Bar ──────────────────────────────────────────────
const ProgressBar = ({ items, statusUpdates }) => {
  const total = items.length;
  if (total === 0) return null;
  const done = Object.values(statusUpdates).filter(s => s === 'Done').length;
  const wip = Object.values(statusUpdates).filter(s => s === 'WIP').length;
  const support = Object.values(statusUpdates).filter(s => s === 'Support Required').length;
  const hold = Object.values(statusUpdates).filter(s => s === 'Hold' || s === 'Postponed').length;
  const pct = (n) => `${Math.round((n / total) * 100)}%`;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Progress: {done} of {total} Done
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {Math.round((done / total) * 100)}% Completed
        </span>
      </div>
      <div style={{ height: '10px', borderRadius: '999px', backgroundColor: '#E2E8F0', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: pct(done), backgroundColor: '#10B981', transition: 'width 0.4s ease' }} title={`Done: ${done}`} />
        <div style={{ width: pct(wip), backgroundColor: '#F59E0B', transition: 'width 0.4s ease' }} title={`WIP: ${wip}`} />
        <div style={{ width: pct(support), backgroundColor: '#EF4444', transition: 'width 0.4s ease' }} title={`Support: ${support}`} />
        <div style={{ width: pct(hold), backgroundColor: '#94A3B8', transition: 'width 0.4s ease' }} title={`Hold/Postponed: ${hold}`} />
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
        {[['#10B981', `Done (${done})`], ['#F59E0B', `WIP (${wip})`], ['#EF4444', `Support (${support})`], ['#94A3B8', `Hold/Postponed (${hold})`]].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Photo Lightbox ─────────────────────────────────────────────
const PhotoLightbox = ({ src, onClose }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
    <img src={src} alt="Attachment" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
  </div>
);

const Execution = () => {
  const { user } = useAuth();
  const { 
    checklists: cloudChecklists = [], 
    submissions: cloudSubmissions = [], 
    supportInbox: cloudSupport = [], 
    logs: cloudLogs = [],
    updateFirebase, 
    employees = [] 
  } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const scanLevel = queryParams.get('scanLevel');
  const scanName = queryParams.get('scanName');

  const [checklists, setChecklists] = useState([]);
  const [selectedFrequency, setSelectedFrequency] = useState('Daily');
  const [filteredChecklists, setFilteredChecklists] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [remarks, setRemarks] = useState({});
  const [supportDetails, setSupportDetails] = useState({});
  const [photos, setPhotos] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const photoInputRefs = useRef({});

  const isAllActivities = useMemo(() => {
    return user?.allowedActivity === 'ALL' || (Array.isArray(user?.allowedActivity) && user.allowedActivity.includes('ALL'));
  }, [user]);

  const departments = useMemo(() => [...new Set(employees.map(e => e.Department).filter(Boolean))], [employees]);

  const activityType = useMemo(() => {
    if (!user || user.allowedActivity === 'ALL') return null;
    if (Array.isArray(user.allowedActivity)) {
      if (user.allowedActivity.includes('ALL')) return null;
      return user.allowedActivity.join(', ');
    }
    return user.allowedActivity;
  }, [user]);

  useEffect(() => {
    let accessible = cloudChecklists;
    
    if (user?.role === 'USER' && !isAllActivities) {
      const allowed = Array.isArray(user.allowedActivity) ? user.allowedActivity : [user.allowedActivity || ''];
      accessible = cloudChecklists.filter(c => allowed.includes(c.Type_of_Activity));
    }

    if (scanLevel && scanName) {
      if (scanLevel === 'activitytype') accessible = accessible.filter(c => c.Type_of_Activity === scanName);
      else if (scanLevel === 'line') accessible = accessible.filter(c => c.Line_Equipment === scanName);
      else if (scanLevel === 'sub-line') accessible = accessible.filter(c => c.Sub_Line_Equipment === scanName);
    }
    setChecklists(accessible);
  }, [user, scanLevel, scanName, isAllActivities, cloudChecklists]);

  useEffect(() => {
    const filtered = checklists.filter(c => c.Frequency === selectedFrequency);
    setFilteredChecklists(filtered);
    const initStatus = {};
    const initRemarks = {};
    const initSupport = {};
    const initPhotos = {};
    
    checklists.forEach(c => {
      initStatus[c.id] = 'Pending';
      initRemarks[c.id] = '';
      initSupport[c.id] = { dept: '', assignedTo: '' };
      initPhotos[c.id] = null;
    });

    setStatusUpdates(initStatus);
    setRemarks(initRemarks);
    setSupportDetails(initSupport);
    setPhotos(initPhotos);
  }, [selectedFrequency, checklists]);

  const handlePhotoCapture = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhotos(prev => ({ ...prev, [id]: e.target.result }));
    reader.readAsDataURL(file);
  };
  
  const handleSupportChange = (id, field, value) => {
    setSupportDetails(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { dept: '', assignedTo: '' }), [field]: value }
    }));
  };

  const handleSubmitAll = async () => {
    if (filteredChecklists.length === 0) return;
    setIsSubmitting(true);
    const now = new Date();

    try {
      const newRecords = filteredChecklists.map(c => ({
        id: `${Date.now()}-${c.id}`,
        Date: now.toISOString().split('T')[0],
        Type_of_Activity: c.Type_of_Activity,
        Line_Equipment: c.Line_Equipment,
        Sub_Line_Equipment: c.Sub_Line_Equipment,
        Component: c.Component,
        Activity_Description: c.Activity_Description,
        Frequency: c.Frequency,
        Status: statusUpdates[c.id] || 'Pending',
        Remark: remarks[c.id] || '',
        Photo: photos[c.id] || null,
        SupportDept: supportDetails[c.id]?.dept || '',
        SupportAssignedTo: supportDetails[c.id]?.assignedTo || '',
        Document_Number: c.Document_Number || '-',
        Revision: c.Revision || '-',
        Last_Revised_Date: c.Last_Revised_Date || '-',
        Submitted_By: (user?.name || '') + ' (' + (user?.id || '') + ')',
        Submitted_By_ID: user?.id || '',
        Date_Timestamp: now.toISOString()
      }));

      const supportItems = filteredChecklists.filter(c => statusUpdates[c.id] === 'Support Required');
      const newSupport = supportItems.map(c => ({
        id: `support-${Date.now()}-${c.id}`,
        status: 'Open',
        location: c.Line_Equipment || c.Sub_Line_Equipment || 'Unknown',
        activity: c.Type_of_Activity,
        taskId: c.id,
        component: c.Component,
        activityDescription: c.Activity_Description,
        remark: remarks[c.id] || 'No remarks.',
        photo: photos[c.id] || null,
        department: supportDetails[c.id]?.dept || '',
        assignedTo: supportDetails[c.id]?.assignedTo || '',
        submittedBy: (user?.name || '') + ' (' + (user?.id || '') + ')',
        submittedById: user?.id || '',
        timestamp: now.toISOString()
      }));

      // Submit all to Firebase
      if (newRecords.length > 0) {
        await updateFirebase('submissions', [...cloudSubmissions, ...newRecords]);
      }
      if (newSupport.length > 0) {
        await updateFirebase('support_inbox', [...cloudSupport, ...newSupport]);
      }

      // Log the action
      const newLogs = [...(cloudLogs || []), {
        id: Date.now(),
        user: user?.name,
        action: `Submitted ${newRecords.length} ${selectedFrequency} checklists`,
        timestamp: now.toISOString(),
        type: 'Execution'
      }];
      await updateFirebase('logs', newLogs);

      setIsSubmitting(false);
      setSubmitSuccess(true);
    } catch (e) {
      console.error('Submission failed', e);
      alert('Error submitting checklist: ' + e.message);
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (s) => ({ 'Pending': '#94A3B8', 'Done': '#10B981', 'WIP': '#F59E0B', 'Hold': '#64748B', 'Postponed': '#8B5CF6', 'Support Required': '#EF4444' }[s] || '#94A3B8');

  const supportCount = Object.values(statusUpdates).filter(s => s === 'Support Required').length;

  useEffect(() => {
    if (!scanLevel || !scanName) return;
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        alert('Session expired. Please rescan the QR code to continue.');
        navigate('/dashboard');
      }, 20 * 60 * 1000);
    };
    resetTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [scanLevel, scanName, navigate]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><PlayCircle /> Checklist Execution</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Home</button>
          <button onClick={() => setIsScanning(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Camera size={18} /> Scan QR</button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => navigate('/user/support-inbox')}><Inbox size={18} /> Support Inbox</button>
        </div>
      </div>

      {activityType && (
        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: 'var(--border-radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Info size={16} color="#2563EB" />
          <span style={{ fontSize: '0.875rem', color: '#1D4ED8' }}><strong>Activity Filter:</strong> {activityType}</span>
        </div>
      )}

      {scanLevel && (
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 'var(--border-radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534' }}>📍 Scanned: {scanLevel.toUpperCase()} → {scanName}</span>
          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => navigate('/user/execute')}>Clear Scan</button>
        </div>
      )}

      {submitSuccess && (
        <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 'var(--border-radius-md)', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle size={20} color="#059669" />
          <div>
            <div style={{ fontWeight: 600, color: '#065F46' }}>Records submitted successfully!</div>
            {supportCount > 0 && <div style={{ fontSize: '0.875rem', color: '#047857' }}>{supportCount} support request{supportCount > 1 ? 's' : ''} raised in the Support Inbox.</div>}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto' }}>
          {['Daily', 'Weekly', 'Monthly', 'Shift-wise', 'Quarterly'].map(freq => (
            <div key={freq} onClick={() => setSelectedFrequency(freq)} style={{ padding: '0.75rem 1rem', borderBottom: selectedFrequency === freq ? '2px solid var(--primary-light)' : 'none', color: selectedFrequency === freq ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: selectedFrequency === freq ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>{freq}</div>
          ))}
        </div>

        <ProgressBar items={filteredChecklists} statusUpdates={statusUpdates} />

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>#</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Component / Activity</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Line / Sub-Line</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600, minWidth: '160px' }}>Status</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600, minWidth: '200px' }}>Remark & Photo</th>
              </tr>
            </thead>
            <tbody>
              {filteredChecklists.map((chk, idx) => {
                const status = statusUpdates[chk.id] || 'Pending';
                const isSupport = status === 'Support Required';
                const sColor = getStatusColor(status);
                return (
                  <React.Fragment key={chk.id}>
                    <tr style={{ borderBottom: isSupport ? 'none' : '1px solid var(--border-color)', backgroundColor: isSupport ? '#FFF5F5' : 'transparent' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>{chk.Component}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{chk.Activity_Description}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div>{chk.Line_Equipment}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{chk.Sub_Line_Equipment}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{chk.Type_of_Activity}</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <select value={status} onChange={e => setStatusUpdates(p => ({ ...p, [chk.id]: e.target.value }))} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: `1.5px solid ${sColor}`, backgroundColor: `${sColor}15`, color: sColor, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                          <option value="Pending">Pending</option>
                          <option value="Done">Done</option>
                          <option value="WIP">In Progress</option>
                          <option value="Hold">Hold</option>
                          <option value="Postponed">Postponed</option>
                          <option value="Support Required">Support Required</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <input type="text" placeholder={isSupport ? 'Describe issue...' : 'Optional remark...'} value={remarks[chk.id] || ''} onChange={e => setRemarks(p => ({ ...p, [chk.id]: e.target.value }))} style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: '6px', border: `1px solid ${isSupport ? '#FCA5A5' : 'var(--border-color)'}`, fontSize: '0.8rem', outline: 'none', minWidth: 0 }} />
                          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} ref={el => photoInputRefs.current[chk.id] = el} onChange={e => handlePhotoCapture(chk.id, e.target.files[0])} />
                          <button onClick={() => photoInputRefs.current[chk.id]?.click()} title="Attach Photo" style={{ background: photos[chk.id] ? '#ECFDF5' : '#F8FAFC', border: `1px solid ${photos[chk.id] ? '#6EE7B7' : 'var(--border-color)'}`, borderRadius: '6px', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: photos[chk.id] ? '#059669' : 'var(--text-tertiary)', flexShrink: 0 }}>
                            <Camera size={15} />
                          </button>
                          {photos[chk.id] && (
                            <button onClick={() => setLightboxPhoto(photos[chk.id])} title="View Photo" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', flexShrink: 0 }}>
                              <img src={photos[chk.id]} alt="thumb" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #6EE7B7' }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isSupport && (
                      <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: '#FFF5F5' }}>
                        <td />
                        <td colSpan="5" style={{ padding: '0 0.75rem 0.75rem 0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0.6rem 0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', whiteSpace: 'nowrap' }}>🔧 Support Details:</span>
                            <select value={supportDetails[chk.id]?.dept || ''} onChange={e => handleSupportChange(chk.id, 'dept', e.target.value)} style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #FCA5A5', fontSize: '0.8rem', color: '#991B1B', flex: 1, minWidth: '140px' }}>
                              <option value="">-- Allocate Department --</option>
                              {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select className="select-input" style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} value={supportDetails[chk.id]?.assignedTo || ''} onChange={(e) => handleSupportChange(chk.id, 'assignedTo', e.target.value)}>
                              <option value="">Select Person</option>
                              {employees.filter(e => !supportDetails[chk.id]?.dept || e.Department === supportDetails[chk.id]?.dept).map(e => (
                                <option key={e.Employee_ID} value={e.Employee_Name}>{e.Employee_Name} ({e.Designation})</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredChecklists.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <AlertCircle size={32} style={{ display: 'block', margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  {checklists.length === 0 ? 'No checklists available. Upload a Checklist Master first.' : `No ${selectedFrequency} checklists for your activity type.`}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {supportCount > 0 && !submitSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626', fontSize: '0.875rem' }}>
              <AlertCircle size={16} />{supportCount} item{supportCount > 1 ? 's' : ''} flagged — support request will be auto-raised.
            </div>
          )}
          {!submitSuccess && (
            <button className="btn btn-primary" style={{ padding: '0.75rem 2rem', marginLeft: 'auto' }} disabled={filteredChecklists.length === 0 || isSubmitting} onClick={handleSubmitAll}>
              {isSubmitting ? 'Submitting...' : 'Submit All Records'}
            </button>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {lightboxPhoto && <PhotoLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />}

      {/* QR Scan Modal */}
      {isScanning && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', color: 'white' }}>
              <h3 style={{ margin: 0 }}>Scan QR Code</h3>
              <button onClick={() => setIsScanning(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '1rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, transparent 20%, #000 120%)' }} />
              <div style={{ width: '70%', height: '70%', border: '2px solid var(--primary-light)', position: 'relative' }}>
                {[['top','-2px','left','-2px'], ['top','-2px','right','-2px'], ['bottom','-2px','left','-2px'], ['bottom','-2px','right','-2px']].map(([v, vv, h, hh], i) => (
                  <div key={i} style={{ position: 'absolute', [v]: vv, [h]: hh, width: '20px', height: '20px', [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]: '4px solid var(--primary-light)', [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]: '4px solid var(--primary-light)' }} />
                ))}
                <div style={{ width: '100%', height: '2px', backgroundColor: 'var(--primary-light)', position: 'absolute', animation: 'scan 2s infinite linear', boxShadow: '0 0 10px var(--primary-light)' }} />
              </div>
            </div>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: '2rem' }}>Align the QR code within the frame...</p>
          </div>
          <style>{`@keyframes scan { 0%{top:0%;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }`}</style>
        </div>
      )}
    </div>
  );
};

export default Execution;
