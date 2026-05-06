import React, { useState, useMemo, useRef } from 'react';
import { Inbox, CheckCircle, AlertTriangle, Send, Shield, Camera, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const PhotoLightbox = ({ src, onClose }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
    <img src={src} alt="Attachment" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
  </div>
);

const SupportInbox = () => {
  const { user } = useAuth();
  const { supportInbox = [], updateFirebase, employees = [] } = useData();
  const [adminReply, setAdminReply] = useState({});
  const [userReply, setUserReply] = useState({});
  const [userAction, setUserAction] = useState({});
  const [photos, setPhotos] = useState({});
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const photoInputRefs = useRef({});

  // Admin filters
  const [adminDurationFilter, setAdminDurationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const isAdmin = user?.role === 'UNIT_ADMIN' || user?.role === 'MASTER_ADMIN';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'all' : 'allocated_by_me');

  const getDuration = (start, end) => {
    if (!start) return '-';
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const diffHours = Math.max(0, e - s) / 36e5;
    if (diffHours < 24) return `${Math.floor(diffHours)}h ${Math.floor((diffHours % 1) * 60)}m`;
    return `${Math.floor(diffHours / 24)}d ${Math.floor(diffHours % 24)}h`;
  };

  const getDurationHours = (start, end) => {
    if (!start) return 0;
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    return Math.max(0, e - s) / 36e5;
  };

  const inbox = useMemo(() => {
    let list = supportInbox;
    
    // 1. Tab-based base list
    if (activeTab === 'all' && isAdmin) {
      // all items
    } else if (activeTab === 'allocated_to_me') {
      list = list.filter(req => req.assignedTo === user?.name || req.assignedTo === user?.id);
    } else if (activeTab === 'allocated_by_me') {
      list = list.filter(req => req.submittedById === user?.id);
    }

    // 2. Search/Name filter
    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      list = list.filter(req => 
        (req.assignedTo || '').toLowerCase().includes(q) || 
        (req.submittedBy || '').toLowerCase().includes(q) ||
        (req.location || '').toLowerCase().includes(q)
      );
    }

    // 3. Status filter
    if (statusFilter !== 'all') {
      list = list.filter(req => req.status === statusFilter);
    }

    // 4. Date filter
    if (dateFilter) {
      list = list.filter(req => req.timestamp?.startsWith(dateFilter));
    }
    
    // 5. Legacy Admin duration filter
    if (activeTab === 'all' && isAdmin && adminDurationFilter !== 'all') {
      const threshold = parseInt(adminDurationFilter, 10);
      list = list.filter(req => req.status !== 'Resolved' && getDurationHours(req.timestamp) > threshold);
    }
    
    return list;
  }, [supportInbox, activeTab, isAdmin, user, adminDurationFilter, dateFilter, nameFilter, statusFilter]);

  const handleResolve = async (entryId) => {
    const updated = supportInbox.map(req => {
      if (req.id === entryId) {
        return {
          ...req,
          status: 'Resolved',
          resolvedAt: new Date().toISOString(),
          adminNote: adminReply[entryId] || req.adminNote || ''
        };
      }
      return req;
    });
    await updateFirebase('support_inbox', updated);
    setAdminReply(prev => ({ ...prev, [entryId]: '' }));
  };

  const handleAdminJobAllocate = async (entryId) => {
    const updated = supportInbox.map(req => {
      if (req.id === entryId) {
        return {
          ...req,
          status: 'Pending', // changed from In Progress
          adminNote: adminReply[entryId] || '',
          jobAllocatedAt: new Date().toISOString()
        };
      }
      return req;
    });
    await updateFirebase('support_inbox', updated);
    setAdminReply(prev => ({ ...prev, [entryId]: '' }));
  };

  const handlePhotoCapture = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhotos(prev => ({ ...prev, [id]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleUserUpdate = async (entryId, statusUpdate = null) => {
    const reply = userReply[entryId] || '';
    const photo = photos[entryId] || null;
    
    const req = supportInbox.find(r => r.id === entryId);
    if (!req) return;

    let newStatus = statusUpdate || req.status;
    let isCritical = req.isCritical || false;
    let sCount = req.supportCount || 0;
    let pCount = req.postponeCount || 0;

    // Default status in "allocated_to_me" is Pending unless set.
    if (!req.status || req.status === 'Open') newStatus = 'Pending';
    if (statusUpdate) newStatus = statusUpdate;

    if (newStatus === 'Support Required') {
      sCount += 1;
      if (sCount >= 2) isCritical = true;
    } else if (newStatus === 'Postpone') {
      pCount += 1;
      if (pCount >= 1) isCritical = true;
    }

    if (newStatus === 'Done') {
      newStatus = 'Resolved';
    }

    const updated = supportInbox.map(r => {
      if (r.id === entryId) {
        const updates = r.userUpdates || [];
        const newUpdate = [];
        if (reply.trim() || statusUpdate) {
          newUpdate.push({
            text: reply.trim() || `Changed status to ${newStatus}`,
            timestamp: new Date().toISOString(),
            by: user?.name || user?.id,
            photo: photo
          });
        }
        return {
          ...r,
          status: isCritical ? 'Critical' : newStatus,
          isCritical,
          supportCount: sCount,
          postponeCount: pCount,
          resolvedAt: newStatus === 'Resolved' ? new Date().toISOString() : r.resolvedAt,
          userUpdates: [...updates, ...newUpdate]
        };
      }
      return r;
    });
    await updateFirebase('support_inbox', updated);
    setUserReply(prev => ({ ...prev, [entryId]: '' }));
    setPhotos(prev => ({ ...prev, [entryId]: null }));
    setUserAction(prev => ({ ...prev, [entryId]: '' }));
  };

  const getStatusStyle = (status) => {
    const styles = {
      'Open': { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
      'Pending': { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
      'In Progress': { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
      'Resolved': { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7' },
      'Critical': { color: '#7F1D1D', bg: '#FECACA', border: '#EF4444' },
      'Hold': { color: '#64748B', bg: '#F8FAFC', border: '#CBD5E1' },
      'Support Required': { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
      'Postpone': { color: '#8B5CF6', bg: '#F5F3FF', border: '#C4B5FD' }
    };
    return styles[status] || styles['Open'];
  };

  // Admin Top Stats
  const adminStats = useMemo(() => {
    if (!isAdmin) return null;
    const unresolved = supportInbox.filter(r => r.status !== 'Resolved');
    
    // Employee with most pending jobs
    const pendingCount = {};
    unresolved.forEach(r => {
      if (r.assignedTo) {
        pendingCount[r.assignedTo] = (pendingCount[r.assignedTo] || 0) + 1;
      }
    });
    const mostPendingEmp = Object.keys(pendingCount).sort((a,b) => pendingCount[b] - pendingCount[a])[0];

    // Who is allocating most jobs
    const allocateCount = {};
    supportInbox.forEach(r => {
      if (r.submittedBy) {
        allocateCount[r.submittedBy] = (allocateCount[r.submittedBy] || 0) + 1;
      }
    });
    const topAllocator = Object.keys(allocateCount).sort((a,b) => allocateCount[b] - allocateCount[a])[0];

    // Repeatability of jobs (by activity type)
    const actCount = {};
    supportInbox.forEach(r => {
      if (r.activity) actCount[r.activity] = (actCount[r.activity] || 0) + 1;
    });
    const mostRepeatedJob = Object.keys(actCount).sort((a,b) => actCount[b] - actCount[a])[0];

    return { mostPendingEmp: mostPendingEmp || 'N/A', topAllocator: topAllocator || 'N/A', mostRepeatedJob: mostRepeatedJob || 'N/A' };
  }, [supportInbox, isAdmin]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Inbox /> Support Inbox
        </h2>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#EFF6FF', padding: '0.4rem 0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
            <Shield size={14} /> Admin View — All Requests
          </div>
        )}
      </div>

      {isAdmin && activeTab === 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Most Pending Jobs</span>
            <strong style={{ color: '#DC2626' }}>{adminStats.mostPendingEmp}</strong>
          </div>
          <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Top Allocator</span>
            <strong style={{ color: '#059669' }}>{adminStats.topAllocator}</strong>
          </div>
          <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Most Repeated Issue</span>
            <strong style={{ color: '#2563EB' }}>{adminStats.mostRepeatedJob}</strong>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)' }}>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('all')}
            style={{ background: 'none', border: 'none', borderBottom: activeTab === 'all' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'all' ? 'var(--primary-light)' : 'var(--text-secondary)', padding: '0.5rem 1rem', fontWeight: activeTab === 'all' ? 700 : 500, cursor: 'pointer', marginBottom: '-2px' }}
          >
            All Requests
          </button>
        )}
        <button 
          onClick={() => setActiveTab('allocated_by_me')}
          style={{ background: 'none', border: 'none', borderBottom: activeTab === 'allocated_by_me' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'allocated_by_me' ? 'var(--primary-light)' : 'var(--text-secondary)', padding: '0.5rem 1rem', fontWeight: activeTab === 'allocated_by_me' ? 700 : 500, cursor: 'pointer', marginBottom: '-2px' }}
        >
          Allocated By Me
        </button>
        <button 
          onClick={() => setActiveTab('allocated_to_me')}
          style={{ background: 'none', border: 'none', borderBottom: activeTab === 'allocated_to_me' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'allocated_to_me' ? 'var(--primary-light)' : 'var(--text-secondary)', padding: '0.5rem 1rem', fontWeight: activeTab === 'allocated_to_me' ? 700 : 500, cursor: 'pointer', marginBottom: '-2px' }}
        >
          Allocated To Me
        </button>
      </div>

      {/* Unified Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Search Name / Location</label>
          <input 
            type="text" 
            placeholder="Search..." 
            value={nameFilter} 
            onChange={e => setNameFilter(e.target.value)} 
            className="login-input" 
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }} 
          />
        </div>
        
        <div style={{ width: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Filter Date</label>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)} 
            className="login-input" 
            style={{ padding: '0.35rem 0.5rem', fontSize: '0.875rem' }} 
          />
        </div>

        <div style={{ width: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Status</label>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            className="select-input" 
            style={{ padding: '0.4rem 0.5rem', fontSize: '0.875rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved / Done</option>
            <option value="Hold">Hold</option>
            <option value="Support Required">Support Required</option>
            <option value="Postpone">Postpone</option>
          </select>
        </div>

        {isAdmin && activeTab === 'all' && (
          <div style={{ width: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Duration (Admin)</label>
            <select 
              value={adminDurationFilter} 
              onChange={e => setAdminDurationFilter(e.target.value)} 
              className="select-input" 
              style={{ padding: '0.4rem 0.5rem', fontSize: '0.875rem' }}
            >
              <option value="all">All Items</option>
              <option value="24">Pending &gt; 24 Hours</option>
              <option value="48">Pending &gt; 48 Hours</option>
              <option value="72">Pending &gt; 3 Days</option>
              <option value="168">Pending &gt; 1 Week</option>
            </select>
          </div>
        )}

        <button 
          onClick={() => { setDateFilter(''); setNameFilter(''); setStatusFilter('all'); setAdminDurationFilter('all'); }}
          style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
        >
          Reset Filters
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Location / Issue</th>
                
                {activeTab === 'allocated_by_me' && (
                  <>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Assigned Name/ID</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Pending Since</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  </>
                )}
                
                {activeTab === 'allocated_to_me' && (
                  <>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Allocated By</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Pending Since</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Duration</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '250px' }}>Action</th>
                  </>
                )}

                {activeTab === 'all' && (
                  <>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Allocated By -&gt; To</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Pending Since</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Duration</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '250px' }}>Admin Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {inbox.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No support requests found.</td>
                </tr>
              ) : inbox.map((req) => {
                const statusStyle = getStatusStyle(req.status === 'Open' && activeTab === 'allocated_to_me' ? 'Pending' : req.status);
                
                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: req.isCritical ? '#FEF2F2' : 'transparent' }}>
                    
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.location}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{req.component || '-'} • {req.remark || req.activityDescription}</div>
                      {req.isCritical && <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700, marginTop: '0.2rem' }}>⚠️ CRITICAL ESCALATION</div>}
                    </td>

                    {activeTab === 'allocated_by_me' && (
                      <>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{req.assignedTo || 'Unassigned'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{req.department}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {new Date(req.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}>
                            {req.status}
                          </span>
                        </td>
                      </>
                    )}

                    {activeTab === 'allocated_to_me' && (
                      <>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{req.submittedBy}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {new Date(req.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: req.status === 'Resolved' ? '#059669' : '#D97706', fontWeight: 600 }}>
                          {getDuration(req.timestamp, req.resolvedAt)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}>
                            {req.status === 'Open' ? 'Pending' : req.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {req.status !== 'Resolved' && req.status !== 'Critical' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <select 
                                  value={userAction[req.id] || ''} 
                                  onChange={e => setUserAction(prev => ({...prev, [req.id]: e.target.value}))}
                                  className="select-input" 
                                  style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem' }}
                                >
                                  <option value="">Update Status...</option>
                                  <option value="Done">Done</option>
                                  <option value="Hold">Hold</option>
                                  <option value="Support Required">Support Required</option>
                                  <option value="Postpone">Postpone</option>
                                </select>
                                
                                {userAction[req.id] === 'Done' && (
                                  <>
                                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} ref={el => photoInputRefs.current[req.id] = el} onChange={e => handlePhotoCapture(req.id, e.target.files[0])} />
                                    <button onClick={() => photoInputRefs.current[req.id]?.click()} title="Attach Photo" style={{ background: photos[req.id] ? '#ECFDF5' : '#F8FAFC', border: `1px solid ${photos[req.id] ? '#6EE7B7' : 'var(--border-color)'}`, borderRadius: '6px', padding: '0.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: photos[req.id] ? '#059669' : 'var(--text-tertiary)' }}>
                                      <Camera size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <input type="text" placeholder="Remarks..." value={userReply[req.id] || ''} onChange={e => setUserReply({ ...userReply, [req.id]: e.target.value })} style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                                <button onClick={() => handleUserUpdate(req.id, userAction[req.id])} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', backgroundColor: '#059669', color: '#fff', border: 'none' }}>Save</button>
                              </div>
                            </div>
                          )}
                          {req.status === 'Critical' && <span style={{ fontSize: '0.75rem', color: '#DC2626' }}>Locked - Requires Admin</span>}
                        </td>
                      </>
                    )}

                    {activeTab === 'all' && (
                      <>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{req.submittedBy}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>to {req.assignedTo || 'Unassigned'}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {new Date(req.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: req.status === 'Resolved' ? '#059669' : '#D97706', fontWeight: 600 }}>
                          {getDuration(req.timestamp, req.resolvedAt)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}>
                            {req.status}
                          </span>
                          <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.2rem' }}>
                            {req.supportCount > 0 && <span style={{ fontSize: '0.65rem', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Sup x{req.supportCount}</span>}
                            {req.postponeCount > 0 && <span style={{ fontSize: '0.65rem', backgroundColor: '#F5F3FF', color: '#8B5CF6', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Pos x{req.postponeCount}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {req.status !== 'Resolved' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              <input type="text" placeholder="Admin note/Discard reason..." value={adminReply[req.id] || ''} onChange={e => setAdminReply({ ...adminReply, [req.id]: e.target.value })} style={{ width: '100%', padding: '0.3rem', fontSize: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box' }} />
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button onClick={() => handleResolve(req.id)} className="btn btn-primary" style={{ flex: 1, padding: '0.2rem', fontSize: '0.7rem', backgroundColor: '#059669', borderColor: '#059669' }}>{req.isCritical ? 'Resolve Escalation' : 'Resolve'}</button>
                                {req.status === 'Open' && <button onClick={() => handleAdminJobAllocate(req.id)} className="btn btn-secondary" style={{ padding: '0.2rem', fontSize: '0.7rem' }}>Allocate</button>}
                              </div>
                            </div>
                          )}
                        </td>
                      </>
                    )}

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {lightboxPhoto && <PhotoLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />}
    </div>
  );
};

export default SupportInbox;
