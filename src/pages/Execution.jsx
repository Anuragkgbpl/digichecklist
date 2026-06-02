import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlayCircle, Camera, X, Inbox, Info, CheckCircle, AlertCircle, Image, ZoomIn, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { validateChecklistTiming, getCurrentShift, getCurrentDailyCycleRange, getShiftRange, getFrequencyPeriodRange, getProductionDate } from '../utils/shiftUtils';


// ── Progress Bar ──────────────────────────────────────────────
const ProgressBar = ({ items, statusUpdates }) => {
  const total = items.length;
  if (total === 0) return null;
  const done = Object.values(statusUpdates).filter(s => s === 'Done' || s === 'OK').length;
  const wip = Object.values(statusUpdates).filter(s => s === 'WIP').length;
  const support = Object.values(statusUpdates).filter(s => s === 'Support Required' || s === 'Not OK').length;
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

// ── AutoComplete Employee ─────────────────────────────────────
const AutoCompleteEmployee = ({ employees, value, onChange, placeholder = "Search Person..." }) => {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = query ? employees.filter(e => 
    e.Employee_Name?.toLowerCase().includes(query.toLowerCase()) || 
    e.Employee_ID?.toLowerCase().includes(query.toLowerCase())
  ) : employees;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', marginTop: '0.25rem', flex: 1, minWidth: '160px' }}>
      <input 
        type="text" 
        value={query} 
        onChange={e => { 
          const val = e.target.value;
          setQuery(val); 
          onChange(val);
          setIsOpen(true); 
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #FCA5A5', fontSize: '0.8rem', color: '#991B1B', outline: 'none', boxSizing: 'border-box' }}
      />
      {isOpen && (
        <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto', zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#94A3B8' }}>No matches</div>
          ) : filtered.map(e => (
            <div 
              key={e._fbKey || `${e.Employee_ID}-${e.Employee_Name}`} 
              style={{ padding: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}
              onClick={() => { onChange(e.Employee_Name); setQuery(e.Employee_Name); setIsOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ fontWeight: 600, color: '#0F172A' }}>{e.Employee_Name}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{e.Employee_ID} • {e.Designation}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Execution = () => {
  const { user } = useAuth();
  const { 
    checklists: cloudChecklists = [], 
    submissions: cloudSubmissions = [], 
    supportInbox: cloudSupport = [], 
    logs: cloudLogs = [],
    updateFirebase, 
    appendFirebase,
    employees = [],
    shifts: cloudShifts = [],
    loading: dataLoading
  } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const scanLevel = queryParams.get('scanLevel');
  const scanName = queryParams.get('scanName');
  const urlActivityType = queryParams.get('activityType');
  const urlLine = queryParams.get('line');
  const urlSubLine = queryParams.get('subLine');
  const urlArea = queryParams.get('area');
  const urlCategory = queryParams.get('category');
  const urlAssetId = queryParams.get('assetId');
  const urlComponent = queryParams.get('component');
  const urlFrequency = queryParams.get('frequency');

  const [checklists, setChecklists] = useState([]);
  const [selectedFrequency, setSelectedFrequency] = useState(urlFrequency || 'ALL');
  const [selectedComponent, setSelectedComponent] = useState(urlComponent || 'ALL');
  const [filteredChecklists, setFilteredChecklists] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [remarks, setRemarks] = useState({});
  const [supportDetails, setSupportDetails] = useState({});
  const [photos, setPhotos] = useState({});
  const [postponeDates, setPostponeDates] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const photoInputRefs = useRef({});

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAllActivities = useMemo(() => {
    return user?.allowedActivity === 'ALL' || (Array.isArray(user?.allowedActivity) && user.allowedActivity.includes('ALL'));
  }, [user]);

  // Build shift master from cloud data or defaults
  const shiftMaster = useMemo(() => {
    if (cloudShifts && cloudShifts.length > 0) {
      const obj = {};
      cloudShifts.forEach(s => { if (s.id) obj[s.id] = s; });
      return obj;
    }
    return {
      'A': { id: 'A', start: '06:00', end: '14:00' },
      'B': { id: 'B', start: '14:00', end: '22:00' },
      'C': { id: 'C', start: '22:00', end: '06:00' },
      'G': { id: 'G', start: '09:00', end: '18:00' }
    };
  }, [cloudShifts]);

  // Find the current user's employee record to get their Shift assignment
  const employeeRecord = useMemo(() => {
    if (!user?.id || !employees) return null;
    return employees.find(e => e.Employee_ID === user.id) || null;
  }, [user, employees]);

  const employeeShift = employeeRecord?.Shift || null;

  // Current active shift
  const activeShiftNow = useMemo(() => getCurrentShift(shiftMaster), [shiftMaster]);

  const departments = useMemo(() => (employees || []).length > 0 ? [...new Set((employees || []).map(e => e.Department).filter(Boolean))] : [], [employees]);

  const activityType = useMemo(() => {
    if (!user || user.allowedActivity === 'ALL') return null;
    if (Array.isArray(user.allowedActivity)) {
      if (user.allowedActivity.includes('ALL')) return null;
      return user.allowedActivity.join(', ');
    }
    return user.allowedActivity;
  }, [user]);

  useEffect(() => {
    if (dataLoading) return;
    if (!cloudChecklists) return;
    let accessible = cloudChecklists;
    
    // 1. Role-based filtering
    // Only apply access filter for regular users. Admins see everything.
    if (user?.role === 'USER') {
      const allowed = user.allowedActivity;
      const isAllowed = !allowed 
        || (typeof allowed === 'string' && allowed === 'ALL')
        || (Array.isArray(allowed) && allowed.includes('ALL'));

      if (!isAllowed) {
        const allowedList = Array.isArray(allowed)
          ? allowed.map(a => String(a).trim().toLowerCase())
          : [String(allowed).trim().toLowerCase()];
        accessible = cloudChecklists.filter(c =>
          allowedList.includes(String(c.Type_of_Activity || '').trim().toLowerCase())
        );
      }
    }

    // 2. Scan-level filtering (Legacy/Direct)
    if (scanLevel && scanName) {
      const target = String(scanName).trim().toLowerCase();
      if (scanLevel === 'activitytype') {
        accessible = accessible.filter(c => String(c.Type_of_Activity || '').trim().toLowerCase() === target);
      } else if (scanLevel === 'line') {
        accessible = accessible.filter(c => String(c.Line_Equipment || '').trim().toLowerCase() === target);
      } else if (scanLevel === 'sub-line') {
        accessible = accessible.filter(c => String(c.Sub_Line_Equipment || '').trim().toLowerCase() === target);
      }
    }

    // 3. New Granular Filters
    if (urlActivityType) {
      accessible = accessible.filter(c => String(c.Type_of_Activity || '').trim().toLowerCase() === String(urlActivityType).trim().toLowerCase());
    }
    if (urlLine) {
      accessible = accessible.filter(c => String(c.Line_Equipment || '').trim().toLowerCase() === String(urlLine).trim().toLowerCase());
    }
    if (urlSubLine) {
      accessible = accessible.filter(c => String(c.Sub_Line_Equipment || '').trim().toLowerCase() === String(urlSubLine).trim().toLowerCase());
    }
    if (urlArea) {
      accessible = accessible.filter(c => String(c.Area_Zone || c.Area || '').trim().toLowerCase() === String(urlArea).trim().toLowerCase());
    }
    if (urlCategory) {
      accessible = accessible.filter(c => String(c.Equipment_Category || '').trim().toLowerCase() === String(urlCategory).trim().toLowerCase());
    }
    if (urlAssetId) {
      accessible = accessible.filter(c => String(c.Asset_ID || '').trim().toLowerCase() === String(urlAssetId).trim().toLowerCase());
    }

    // 4. Strict Deduplication (Frequency Integrity)
    // Ensure each unique activity (Type+Line+SubLine+Component+Description) only appears ONCE
    // This prevents duplicates if the same activity was uploaded multiple times or has multiple frequency bindings
    const uniqueMap = new Map();
    accessible.forEach(chk => {
      const key = `${chk.Type_of_Activity}|${chk.Line_Equipment}|${chk.Sub_Line_Equipment}|${chk.Component}|${chk.Activity_Description}`.toLowerCase().trim();
      
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, chk);
      } else if (urlFrequency && String(chk.Frequency).toLowerCase() === urlFrequency.toLowerCase()) {
        uniqueMap.set(key, chk);
      }
    });

    const deduplicated = Array.from(uniqueMap.values());
    
    // Filter out completed "Done" items or future postponed items
    const dailyRange = getCurrentDailyCycleRange(shiftMaster);
    const now = new Date();
    const filteredByDone = deduplicated.filter(chk => {
      const freq = String(chk.Frequency || '').trim().toLowerCase();
      
      // 1. Filter out postponed items whose target date is in the future
      const isPostponed = (cloudSubmissions || []).some(sub => {
        const matchesKey = 
          String(sub.Type_of_Activity || '').trim().toLowerCase() === String(chk.Type_of_Activity || '').trim().toLowerCase() &&
          String(sub.Line_Equipment || '').trim().toLowerCase() === String(chk.Line_Equipment || '').trim().toLowerCase() &&
          String(sub.Sub_Line_Equipment || '').trim().toLowerCase() === String(chk.Sub_Line_Equipment || '').trim().toLowerCase() &&
          String(sub.Component || '').trim().toLowerCase() === String(chk.Component || '').trim().toLowerCase() &&
          String(sub.Activity_Description || '').trim().toLowerCase() === String(chk.Activity_Description || '').trim().toLowerCase();

        if (!matchesKey) return false;
        if (sub.Status !== 'Postponed' && sub.Status !== 'Postpone') return false;
        if (!sub.Postponed_To_Date) return false;

        const todayStr = now.toISOString().split('T')[0];
        return todayStr < sub.Postponed_To_Date;
      });

      if (isPostponed) return false;

      // 2. Filter out completed "Done" items based on frequency logical window
      const isDone = (cloudSubmissions || []).some(sub => {
        const matchesKey = 
          String(sub.Type_of_Activity || '').trim().toLowerCase() === String(chk.Type_of_Activity || '').trim().toLowerCase() &&
          String(sub.Line_Equipment || '').trim().toLowerCase() === String(chk.Line_Equipment || '').trim().toLowerCase() &&
          String(sub.Sub_Line_Equipment || '').trim().toLowerCase() === String(chk.Sub_Line_Equipment || '').trim().toLowerCase() &&
          String(sub.Component || '').trim().toLowerCase() === String(chk.Component || '').trim().toLowerCase() &&
          String(sub.Activity_Description || '').trim().toLowerCase() === String(chk.Activity_Description || '').trim().toLowerCase();

        if (!matchesKey) return false;
        if (sub.Status !== 'Done' && sub.Status !== 'OK') return false;

        const subTime = sub.Date_Timestamp ? new Date(sub.Date_Timestamp) : new Date(sub.Date || Date.now());
        
        if (freq === 'shift' || freq === 'shift-wise') {
          const currentShiftId = getCurrentShift(shiftMaster);
          if (!currentShiftId) return false;
          const shiftRange = getShiftRange(currentShiftId, shiftMaster);
          if (!shiftRange) return false;
          return subTime >= shiftRange.start && subTime < shiftRange.end;
        }

        // Use generic period range logic for Daily, Weekly, Fortnightly, Monthly, etc.
        const range = getFrequencyPeriodRange(chk.Frequency, shiftMaster);
        return subTime >= range.start && subTime < range.end;
      });

      return !isDone;
    });

    setChecklists(filteredByDone);

    // Smart default frequency: honor URL or pick best available
    if (accessible.length > 0) {
      const availableFreqs = [...new Set(accessible.map(c => c.Frequency).filter(Boolean))];
      
      if (urlFrequency && availableFreqs.includes(urlFrequency)) {
        setSelectedFrequency(urlFrequency);
      } else if (selectedFrequency !== 'ALL' && availableFreqs.length > 0 && !availableFreqs.includes(selectedFrequency)) {
        if (availableFreqs.includes('Shift') && activeShiftNow) {
          setSelectedFrequency('Shift');
        } else {
          setSelectedFrequency(availableFreqs[0]);
        }
      } else if (selectedFrequency === 'ALL' && !urlFrequency) {
         // Keep 'ALL' if it was selected or default, but if there's only 1 frequency, auto-select it
         if (availableFreqs.length === 1) {
           setSelectedFrequency(availableFreqs[0]);
         }
      }
    }
  }, [user, scanLevel, scanName, urlActivityType, urlLine, urlSubLine, urlArea, urlCategory, urlAssetId, urlComponent, urlFrequency, isAllActivities, cloudChecklists, dataLoading, cloudSubmissions, shiftMaster]);

  // Validate timing for selected frequency
  const timingValidation = useMemo(() => {
    return validateChecklistTiming(selectedFrequency, employeeShift, shiftMaster);
  }, [selectedFrequency, employeeShift, shiftMaster]);

  useEffect(() => {
    let filtered = checklists;
    if (selectedFrequency !== 'ALL') {
      filtered = filtered.filter(c => 
        String(c.Frequency || '').trim().toLowerCase() === String(selectedFrequency || '').trim().toLowerCase()
      );
    }
    if (selectedComponent !== 'ALL') {
      filtered = filtered.filter(c => String(c.Component || '').trim().toLowerCase() === String(selectedComponent).trim().toLowerCase());
    }
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
  }, [selectedFrequency, selectedComponent, checklists]);

  const availableComponents = useMemo(() => {
    const comps = [...new Set(checklists.map(c => c.Component).filter(Boolean))];
    return ['ALL', ...comps];
  }, [checklists]);

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
    const submittedItems = filteredChecklists.filter(c => {
      const s = statusUpdates[c.id] || 'Pending';
      return s !== 'Pending';
    });
    
    if (submittedItems.length === 0) {
      alert("Please update at least one activity status to non-Pending before submitting.");
      return;
    }

    const confirmSubmit = window.confirm(`Confirm Submission: Are you sure you want to save these ${submittedItems.length} activity record(s)?`);
    if (!confirmSubmit) return;

    setIsSubmitting(true);
    const now = new Date();

    try {

      const currentShiftId = getCurrentShift(shiftMaster) || 'General';
      const productionDate = getProductionDate(now, shiftMaster);

      const submissionIdMap = {};
      const newRecords = submittedItems.map(c => {
        const generatedId = `${Date.now()}-${c.id}`;
        submissionIdMap[c.id] = generatedId;
        return {
          id: generatedId,
          Date: productionDate,
          Type_of_Activity: c.Type_of_Activity,
          Line_Equipment: c.Line_Equipment,
          Sub_Line_Equipment: c.Sub_Line_Equipment,
          Area_Zone: c.Area_Zone || c.Area || '',
          Equipment_Category: c.Equipment_Category || '',
          Asset_ID: c.Asset_ID || '',
          Standard: c.Standard || '',
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
          Submitted_By: employeeRecord ? `${employeeRecord.Employee_Name} (${employeeRecord.Employee_ID})` : ((user?.name || '') + ' (' + (user?.id || '') + ')'),
          Submitted_By_ID: user?.id || '',
          Date_Timestamp: now.toISOString(),
          Shift: currentShiftId
        };
      });

      const supportItems = filteredChecklists.filter(c => statusUpdates[c.id] === 'Support Required' || statusUpdates[c.id] === 'Not OK');
      const newSupport = supportItems.map(c => ({
        id: `support-${Date.now()}-${c.id}`,
        status: 'Open',
        submissionId: submissionIdMap[c.id] || null,
        location: c.Line_Equipment || c.Sub_Line_Equipment || 'Unknown',
        Area_Zone: c.Area_Zone || c.Area || '',
        Equipment_Category: c.Equipment_Category || '',
        Asset_ID: c.Asset_ID || '',
        Standard: c.Standard || '',
        activity: c.Type_of_Activity,
        taskId: c.id,
        component: c.Component,
        activityDescription: c.Activity_Description,
        remark: remarks[c.id] || 'No remarks.',
        photo: photos[c.id] || null,
        department: supportDetails[c.id]?.dept || '',
        assignedTo: supportDetails[c.id]?.assignedTo || '',
        submittedBy: employeeRecord ? `${employeeRecord.Employee_Name} (${employeeRecord.Employee_ID})` : ((user?.name || '') + ' (' + (user?.id || '') + ')'),
        submittedById: user?.id || '',
        timestamp: now.toISOString()
      }));

      // Submit all to Firebase atomically without full rewrite
      if (newRecords.length > 0) {
        await appendFirebase('submissions', newRecords);
      }
      if (newSupport.length > 0) {
        await appendFirebase('support_inbox', newSupport);
      }

      // Log the action atomically
      const actionLog = {
        id: `${Date.now()}`,
        user: user?.name || user?.id || 'System',
        action: `Submitted ${newRecords.length} ${selectedFrequency} checklists`,
        timestamp: now.toISOString(),
        type: 'Execution'
      };
      await appendFirebase('logs', [actionLog]);

      setIsSubmitting(false);
      setSubmitSuccess(true);
    } catch (e) {
      console.error('Submission failed', e);
      alert('Error submitting checklist: ' + e.message);
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (s) => ({ 'Pending': '#94A3B8', 'Done': '#10B981', 'WIP': '#F59E0B', 'Hold': '#64748B', 'Postponed': '#8B5CF6', 'Support Required': '#EF4444', 'OK': '#10B981', 'Not OK': '#EF4444' }[s] || '#94A3B8');

  const supportCount = Object.values(statusUpdates).filter(s => s === 'Support Required' || s === 'Not OK').length;

  useEffect(() => {
    if (!scanLevel || !scanName) return;
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        alert('Session expired. Please rescan the QR code to continue.');
        if (user) {
          navigate('/dashboard');
        } else {
          navigate(-1); // Go back to selection page
        }
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

  if (dataLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', backgroundColor: 'var(--bg-color)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTop: '3px solid var(--primary-light)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Syncing checklists from cloud...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      {/* Header handled by Layout in QR Mode */}

      {activityType && (
        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: 'var(--border-radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Info size={16} color="#2563EB" />
          <span style={{ fontSize: '0.875rem', color: '#1D4ED8' }}><strong>Activity Filter:</strong> {activityType}</span>
        </div>
      )}

      {urlLine && (() => {
        const isFS = urlActivityType?.trim().toLowerCase() === 'fire safety';
        return (
          <div style={{
            backgroundColor: isFS ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${isFS ? '#FCA5A5' : '#86EFAC'}`,
            borderRadius: 'var(--border-radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isFS ? '#991B1B' : '#166534' }}>
                📍 {urlLine} 
                {urlSubLine && ` > ${urlSubLine}`} 
                {isFS && urlArea && ` > ${urlArea}`} 
                {isFS && urlCategory && ` > ${urlCategory}`} 
                {isFS && urlAssetId && ` > ${urlAssetId}`} 
                {urlComponent && ` > ${urlComponent}`}
              </span>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => {
                const params = new URLSearchParams();
                if (urlActivityType) params.set('activityType', urlActivityType);
                navigate(`/user/scan-select?${params.toString()}`);
              }}>Clear Selection</button>
            </div>
            <div style={{ fontSize: '0.75rem', color: isFS ? '#B91C1C' : '#15803d' }}>
              Frequency: <strong>{selectedFrequency}</strong>
            </div>
          </div>
        );
      })()}

      {scanLevel && !urlLine && (
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
            {['ALL', ...new Set(checklists.map(c => c.Frequency).filter(Boolean))].map(freq => (
              <div key={freq} onClick={() => { setSelectedFrequency(freq); setSelectedComponent('ALL'); }} style={{ padding: '0.5rem 1rem', borderBottom: selectedFrequency === freq ? '2px solid var(--primary-light)' : 'none', color: selectedFrequency === freq ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: selectedFrequency === freq ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{freq}</div>
            ))}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Component:</span>
            <select 
              value={selectedComponent} 
              onChange={e => setSelectedComponent(e.target.value)}
              style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem', backgroundColor: '#F8FAFC', minWidth: '120px', outline: 'none' }}
            >
              {availableComponents.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Components' : c}</option>)}
            </select>
          </div>
        </div>

        {/* Shift Timing Validation Banner */}
        {selectedFrequency === 'Shift' && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: timingValidation.valid ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${timingValidation.valid ? '#6EE7B7' : '#FCA5A5'}`
          }}>
            <Clock size={18} color={timingValidation.valid ? '#059669' : '#DC2626'} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: timingValidation.valid ? '#065F46' : '#991B1B' }}>
                {timingValidation.valid ? 'Shift Active — You may submit' : 'Outside Your Shift Window'}
              </div>
              <div style={{ fontSize: '0.75rem', color: timingValidation.valid ? '#047857' : '#B91C1C', marginTop: '0.15rem' }}>
                {timingValidation.message}
                {employeeShift && ` | Your Shift: ${employeeShift}`}
                {activeShiftNow && ` | Now Active: Shift ${activeShiftNow}`}
              </div>
            </div>
          </div>
        )}

        <ProgressBar items={filteredChecklists} statusUpdates={statusUpdates} />

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredChecklists.map((chk, idx) => {
              const status = statusUpdates[chk.id] || 'Pending';
              const isSupport = status === 'Support Required' || status === 'Not OK';
              const sColor = getStatusColor(status);
              const isFS = String(chk.Type_of_Activity || '').toLowerCase() === 'fire safety';
              return (
                <div 
                  key={chk.id} 
                  style={{ 
                    border: `1px solid ${isSupport ? '#FCA5A5' : 'var(--border-color)'}`, 
                    borderRadius: '12px', 
                    padding: '1rem', 
                    backgroundColor: isSupport ? '#FFF5F5' : '#FFFFFF',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  {/* Card Header: Item # and Type info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>TASK #{idx + 1}</span>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, backgroundColor: isFS ? '#FEE2E2' : '#F1F5F9', color: isFS ? '#991B1B' : 'inherit', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{chk.Type_of_Activity}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{chk.Frequency}</span>
                    </div>
                  </div>

                  {/* Component & Description */}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>{chk.Activity_Description}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 600 }}>
                      Component: {chk.Component} {chk.Standard && ` | Standard: ${chk.Standard}`}
                    </div>
                  </div>

                  {/* Location info */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', backgroundColor: '#F8FAFC', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                    <strong>📍 Location:</strong> {chk.Line_Equipment} {chk.Sub_Line_Equipment && `• ${chk.Sub_Line_Equipment}`}
                    {isFS && (
                      <>
                        {chk.Area_Zone && ` • ${chk.Area_Zone}`}
                        {chk.Equipment_Category && ` • ${chk.Equipment_Category}`}
                        {chk.Asset_ID && ` • ${chk.Asset_ID}`}
                      </>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>UPDATE STATUS:</label>
                    <select 
                      value={status} 
                      onChange={e => setStatusUpdates(p => ({ ...p, [chk.id]: e.target.value }))} 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: `1.5px solid ${sColor}`, backgroundColor: `${sColor}15`, color: sColor, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
                    >
                      {isFS ? (
                        <>
                          <option value="Pending">Pending</option>
                          <option value="OK">OK</option>
                          <option value="Not OK">Not OK</option>
                        </>
                      ) : (
                        <>
                          <option value="Pending">Pending</option>
                          <option value="Done">Done</option>
                          <option value="WIP">In Progress</option>
                          <option value="Hold">Hold</option>
                          <option value="Support Required">Support Required</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Remarks & Photos */}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder={isSupport ? 'Describe issue...' : 'Optional remark...'} 
                      value={remarks[chk.id] || ''} 
                      onChange={e => setRemarks(p => ({ ...p, [chk.id]: e.target.value }))} 
                      style={{ flex: 1, padding: '0.45rem', borderRadius: '8px', border: `1px solid ${isSupport ? '#FCA5A5' : 'var(--border-color)'}`, fontSize: '0.8rem', outline: 'none', minWidth: 0 }} 
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      style={{ display: 'none' }} 
                      ref={el => photoInputRefs.current[chk.id] = el} 
                      onChange={e => handlePhotoCapture(chk.id, e.target.files[0])} 
                    />
                    <button 
                      onClick={() => photoInputRefs.current[chk.id]?.click()} 
                      title="Attach Photo" 
                      style={{ background: photos[chk.id] ? '#ECFDF5' : '#F8FAFC', border: `1px solid ${photos[chk.id] ? '#6EE7B7' : 'var(--border-color)'}`, borderRadius: '8px', padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: photos[chk.id] ? '#059669' : 'var(--text-tertiary)', flexShrink: 0 }}
                    >
                      <Camera size={16} />
                    </button>
                    {photos[chk.id] && (
                      <button 
                        onClick={() => setLightboxPhoto(photos[chk.id])} 
                        title="View Photo" 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', flexShrink: 0 }}
                      >
                        <img src={photos[chk.id]} alt="thumb" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #6EE7B7' }} />
                      </button>
                    )}
                  </div>

                  {/* Support Details section */}
                  {isSupport && (
                    <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626' }}>🔧 Support Allocation Details:</span>
                      <select 
                        value={supportDetails[chk.id]?.dept || ''} 
                        onChange={e => handleSupportChange(chk.id, 'dept', e.target.value)} 
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #FCA5A5', fontSize: '0.8rem', color: '#991B1B' }}
                      >
                        <option value="">-- Select Department --</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <AutoCompleteEmployee 
                        employees={(employees || []).filter(e => !supportDetails[chk.id]?.dept || e.Department === supportDetails[chk.id]?.dept)}
                        value={supportDetails[chk.id]?.assignedTo || ''}
                        onChange={(val) => handleSupportChange(chk.id, 'assignedTo', val)}
                        placeholder="Type name or ID..."
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {filteredChecklists.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <AlertCircle size={32} style={{ display: 'block', margin: '0 auto 0.5rem', opacity: 0.4 }} />
                {checklists.length === 0 ? 'No checklists available.' : 'No activities found.'}
              </div>
            )}
          </div>
        ) : (
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
                  const isSupport = status === 'Support Required' || status === 'Not OK';
                  const sColor = getStatusColor(status);
                  const isFS = String(chk.Type_of_Activity || '').toLowerCase() === 'fire safety';
                  return (
                    <React.Fragment key={chk.id}>
                      <tr style={{ borderBottom: isSupport ? 'none' : '1px solid var(--border-color)', backgroundColor: isSupport ? '#FFF5F5' : 'transparent' }}>
                        <td style={{ padding: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{chk.Activity_Description}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem', fontWeight: 600 }}>
                            Component: {chk.Component} {chk.Standard && ` | Standard: ${chk.Standard}`}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div>{chk.Line_Equipment}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {chk.Sub_Line_Equipment}
                            {isFS && (
                              <>
                                {chk.Area_Zone && ` > ${chk.Area_Zone}`}
                                {chk.Equipment_Category && ` > ${chk.Equipment_Category}`}
                                {chk.Asset_ID && ` > ${chk.Asset_ID}`}
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, backgroundColor: isFS ? '#FEE2E2' : '#F1F5F9', color: isFS ? '#991B1B' : 'inherit', padding: '0.2rem 0.5rem', borderRadius: '4px', width: 'fit-content' }}>{chk.Type_of_Activity}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.15rem 0.4rem', borderRadius: '4px', width: 'fit-content' }}>{chk.Frequency}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <select value={status} onChange={e => setStatusUpdates(p => ({ ...p, [chk.id]: e.target.value }))} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: `1.5px solid ${sColor}`, backgroundColor: `${sColor}15`, color: sColor, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                            {isFS ? (
                              <>
                                <option value="Pending">Pending</option>
                                <option value="OK">OK</option>
                                <option value="Not OK">Not OK</option>
                              </>
                            ) : (
                              <>
                                <option value="Pending">Pending</option>
                                <option value="Done">Done</option>
                                <option value="WIP">In Progress</option>
                                <option value="Hold">Hold</option>
                                <option value="Support Required">Support Required</option>
                              </>
                            )}
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
                              <AutoCompleteEmployee 
                                employees={(employees || []).filter(e => !supportDetails[chk.id]?.dept || e.Department === supportDetails[chk.id]?.dept)}
                                value={supportDetails[chk.id]?.assignedTo || ''}
                                onChange={(val) => handleSupportChange(chk.id, 'assignedTo', val)}
                                placeholder="Type name or ID..."
                              />
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
                    {checklists.length === 0 ? 'No checklists available. Upload a Checklist Master first.' : 
                     selectedComponent !== 'ALL' ? `No activities found for Frequency "${selectedFrequency}" and Component "${selectedComponent}".` :
                     `No activities found for Frequency "${selectedFrequency}".`}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {supportCount > 0 && !submitSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626', fontSize: '0.875rem' }}>
              <AlertCircle size={16} />{supportCount} item{supportCount > 1 ? 's' : ''} flagged — support request will be auto-raised.
            </div>
          )}
          {!submitSuccess && (
            <button
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', marginLeft: 'auto', opacity: !timingValidation.valid ? 0.5 : 1 }}
              disabled={filteredChecklists.length === 0 || isSubmitting || !timingValidation.valid}
              onClick={!timingValidation.valid ? () => alert(timingValidation.message) : handleSubmitAll}
            >
              {isSubmitting ? 'Submitting...' : !timingValidation.valid ? `⏰ Shift ${employeeShift} Not Active` : 'Submit All Records'}
            </button>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {lightboxPhoto && <PhotoLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />}
    </div>
  );
};

export default Execution;
