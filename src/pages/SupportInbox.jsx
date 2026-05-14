import React, { useState, useMemo, useRef } from 'react';
import { Inbox, CheckCircle, AlertTriangle, Send, Shield, Camera, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const PhotoLightbox = ({ src, onClose }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
    <img src={src} alt="Attachment" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
  </div>
);

const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  const clean = String(dateStr).split('T')[0];
  if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return clean.split('-').reverse().join('/');
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch (e) {
    return dateStr;
  }
};

const SupportInbox = () => {
  const { user } = useAuth();
  const { supportInbox = [], updateFirebase, patchFirebase, appendFirebase, employees = [], submissions = [], reviewers = [], logs = [] } = useData();
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

  // Review Inbox multi-level state mapping
  const reviewerRoles = useMemo(() => {
    if (!user?.id) return { L1: [], L2: [], L3: [], originalLines: [] };
    const L1 = [];
    const L2 = [];
    const L3 = [];
    const originalLines = [];
    reviewers.forEach(r => {
      if (!r.line_equipment) return;
      const hasL1 = (r.reviewerIdsL1 || r.reviewerIds || []).includes(user.id);
      const hasL2 = (r.reviewerIdsL2 || []).includes(user.id);
      const hasL3 = (r.reviewerIdsL3 || []).includes(user.id);
      
      if (hasL1 || hasL2 || hasL3) {
        originalLines.push(r.line_equipment);
      }
      const cleanLine = String(r.line_equipment).trim().toLowerCase();
      if (hasL1) L1.push(cleanLine);
      if (hasL2) L2.push(cleanLine);
      if (hasL3) L3.push(cleanLine);
    });
    return { L1, L2, L3, originalLines: [...new Set(originalLines)] };
  }, [reviewers, user]);
  
  const reviewerLines = reviewerRoles.originalLines;
  const isReviewer = reviewerLines.length > 0;

  // Centralized logic to determine if a submission belongs in the user's review workflow queue
  const isVisibleInReviewInbox = (sub) => {
    const cleanLine = String(sub.Line_Equipment || '').trim().toLowerCase();
    const currentStatus = sub.Review_Status || 'Pending';

    // 1. Security clearance
    const isL1 = reviewerRoles.L1.includes(cleanLine);
    const isL2 = reviewerRoles.L2.includes(cleanLine);
    const isL3 = reviewerRoles.L3.includes(cleanLine);
    if (!isL1 && !isL2 && !isL3) return false;

    // 2. Workflow level-alignment (Action required at my active level)
    let isPendingAtMyLevel = false;
    if (isL1 && currentStatus === 'Pending') isPendingAtMyLevel = true;
    if (isL2 && currentStatus === 'L1 Approved') isPendingAtMyLevel = true;
    if (isL3 && currentStatus === 'L2 Approved') isPendingAtMyLevel = true;

    // 3. History tracking (Did I personally act on this)
    const iReviewedIt = sub.Reviewed_By_ID === user?.id || 
                        (sub.Review_History || []).some(h => h.by_id === user?.id);

    // 4. Evaluation of the status filters
    if (revStatusFilter === 'all') {
      return isPendingAtMyLevel || iReviewedIt;
    }
    
    if (revStatusFilter === 'Pending') {
      return isPendingAtMyLevel;
    }
    
    if (revStatusFilter === 'Approved') {
      const isApprovedState = ['L1 Approved', 'L2 Approved', 'Approved'].includes(currentStatus);
      return isApprovedState && iReviewedIt;
    }
    
    if (revStatusFilter === 'Needs Correction') {
      return currentStatus === 'Needs Correction' && iReviewedIt;
    }

    return false;
  };
  
  const [revFreqFilter, setRevFreqFilter] = useState('all');
  const [revTypeFilter, setRevTypeFilter] = useState('all');
  const [revLineFilter, setRevLineFilter] = useState('all');
  const [revStatusFilter, setRevStatusFilter] = useState('all');
  const [revRemarks, setRevRemarks] = useState({});
  const [revActions, setRevActions] = useState({});

  // Summary and Bulk Approvals states
  const [revViewMode, setRevViewMode] = useState('summary'); // 'summary' | 'detail'
  const [expandedReviewGroup, setExpandedReviewGroup] = useState(null); // GroupKey being drilled down
  const [bulkRemarksInput, setBulkRemarksInput] = useState({}); // { groupKey: text }

  // Submission logs states and filters
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [logShiftFilter, setLogShiftFilter] = useState('all');
  const [logDocFilter, setLogDocFilter] = useState('');
  const [logSubmittedByFilter, setLogSubmittedByFilter] = useState('');
  const [logDescFilter, setLogDescFilter] = useState('');
  const [logActivityTypeFilter, setLogActivityTypeFilter] = useState('all');
  const [logLineFilter, setLogLineFilter] = useState('');
  const [logSubLineFilter, setLogSubLineFilter] = useState('');
  const [logComponentFilter, setLogComponentFilter] = useState('');
  const [logFreqFilter, setLogFreqFilter] = useState('all');
  const [logStatusFilter, setLogStatusFilter] = useState('all');

  const activityTypes = useMemo(() => {
    return ['all', ...new Set(submissions.map(s => s.Type_of_Activity).filter(Boolean))];
  }, [submissions]);

  const computeNextReviewStatus = (sub, requestedStatus) => {
    if (requestedStatus !== 'Approved') return requestedStatus; // e.g. 'Needs Correction'
    
    const cleanLine = String(sub.Line_Equipment || '').trim().toLowerCase();
    const currentStatus = sub.Review_Status || 'Pending';
    
    if (currentStatus === 'Pending' && reviewerRoles.L1.includes(cleanLine)) {
      return 'L1 Approved';
    }
    if (currentStatus === 'L1 Approved' && reviewerRoles.L2.includes(cleanLine)) {
      return 'L2 Approved';
    }
    if (currentStatus === 'L2 Approved' && reviewerRoles.L3.includes(cleanLine)) {
      return 'Approved';
    }
    
    return 'Approved'; // Fallback fallback if direct or admin approval
  };

  const handleSaveReview = async (submissionId, status) => {
    const remark = revRemarks[submissionId] || '';
    if (!status) { alert('Please choose review status'); return; }
    
    const targetSub = submissions.find(sub => {
      const subKey = sub.id || (sub.Date_Timestamp + '_' + sub.Submitted_By);
      return subKey === submissionId;
    });

    if (!targetSub) {
      alert('Record could not be found.');
      return;
    }

    const nextStatus = computeNextReviewStatus(targetSub, status);
    const now = new Date().toISOString();
    const fbKey = targetSub._fbKey;

    if (fbKey === undefined) {
      alert('Operational Error: Record location key is not indexed. Full reload recommended.');
      return;
    }

    const newHistItem = {
      status: nextStatus,
      remark: remark,
      by: user?.name || user?.id,
      by_id: user?.id,
      date: now
    };

    const patchPayload = {
      [`${fbKey}/Review_Status`]: nextStatus,
      [`${fbKey}/Review_Remarks`]: remark,
      [`${fbKey}/Reviewed_By`]: user?.name || user?.id,
      [`${fbKey}/Reviewed_By_ID`]: user?.id,
      [`${fbKey}/Reviewed_Date`]: now,
      [`${fbKey}/Review_History`]: [...(targetSub.Review_History || []), newHistItem]
    };

    const newLog = {
      id: 'log_' + Date.now(),
      timestamp: now,
      type: 'Review Update',
      user: user?.name || user?.id,
      action: `Reviewed activity on ${targetSub.Line_Equipment}: ${nextStatus}`,
      details: `Remarks: ${remark}. Component: ${targetSub.Component}.`
    };

    await patchFirebase('submissions', patchPayload);
    await appendFirebase('logs', [newLog]);

    // Clear UI state for that submission
    setRevRemarks(prev => {
      const c = { ...prev };
      delete c[submissionId];
      return c;
    });
    setRevActions(prev => {
      const c = { ...prev };
      delete c[submissionId];
      return c;
    });
    alert('Review updated successfully.');
  };

  const handleBulkApprove = async (groupKey, items) => {
    const remark = bulkRemarksInput[groupKey] || '';
    const now = new Date().toISOString();
    const patchPayload = {};
    let validKeysCount = 0;

    items.forEach(item => {
      const cleanLine = String(item.Line_Equipment || '').trim().toLowerCase();
      const currentStatus = item.Review_Status || 'Pending';
      const isL1 = reviewerRoles.L1.includes(cleanLine);
      const isL2 = reviewerRoles.L2.includes(cleanLine);
      const isL3 = reviewerRoles.L3.includes(cleanLine);
      
      let isPendingAtMyLevel = false;
      if (isL1 && currentStatus === 'Pending') isPendingAtMyLevel = true;
      if (isL2 && currentStatus === 'L1 Approved') isPendingAtMyLevel = true;
      if (isL3 && currentStatus === 'L2 Approved') isPendingAtMyLevel = true;

      if (isPendingAtMyLevel && item._fbKey !== undefined) {
        const nextStatus = computeNextReviewStatus(item, 'Approved');
        const fbKey = item._fbKey;
        const newHistItem = {
          status: nextStatus,
          remark: remark || 'Approved in bulk',
          by: user?.name || user?.id,
          by_id: user?.id,
          date: now
        };

        patchPayload[`${fbKey}/Review_Status`] = nextStatus;
        patchPayload[`${fbKey}/Review_Remarks`] = remark || item.Review_Remarks || 'Approved in bulk';
        patchPayload[`${fbKey}/Reviewed_By`] = user?.name || user?.id;
        patchPayload[`${fbKey}/Reviewed_By_ID`] = user?.id;
        patchPayload[`${fbKey}/Reviewed_Date`] = now;
        patchPayload[`${fbKey}/Review_History`] = [...(item.Review_History || []), newHistItem];
        validKeysCount++;
      }
    });

    if (validKeysCount === 0) {
      alert('No pending items found at your validation level.');
      return;
    }

    const auditLog = {
      id: 'log_' + Date.now(),
      timestamp: now,
      type: 'Bulk Review',
      user: user?.name || user?.id,
      action: `Bulk Approved ${validKeysCount} items on ${items[0]?.Line_Equipment || 'Line'}`,
      details: `Date: ${items[0]?.Date}, Shift: ${items[0]?.Shift}, Remarks: ${remark}`
    };

    await patchFirebase('submissions', patchPayload);
    await appendFirebase('logs', [auditLog]);
    
    setBulkRemarksInput(prev => {
      const copy = {...prev};
      delete copy[groupKey];
      return copy;
    });
    alert(`Bulk approved ${validKeysCount} activities.`);
  };

  const filteredReviewSubmissions = useMemo(() => {
    if (activeTab !== 'review_inbox') return [];
    return submissions.filter(sub => {
      // 1. Apply multi-level access and workflow engine
      if (!isVisibleInReviewInbox(sub)) return false;
      
      // 2. Apply Case-Agnostic / Trim-Agnostic quick filters
      if (revFreqFilter !== 'all') {
        if (String(sub.Frequency || '').trim().toLowerCase() !== revFreqFilter.toLowerCase()) return false;
      }
      if (revTypeFilter !== 'all') {
        if (String(sub.Type_of_Activity || '').trim().toLowerCase() !== String(revTypeFilter).trim().toLowerCase()) return false;
      }
      if (revLineFilter !== 'all') {
        if (String(sub.Line_Equipment || '').trim().toLowerCase() !== String(revLineFilter).trim().toLowerCase()) return false;
      }
      return true;
    }).reverse();
  }, [submissions, activeTab, revFreqFilter, revTypeFilter, revLineFilter, isVisibleInReviewInbox]);

  const reviewSummaryGroups = useMemo(() => {
    if (activeTab !== 'review_inbox') return [];
    
    // Use the same robust workflow filter context
    const baseData = submissions.filter(sub => {
      if (!isVisibleInReviewInbox(sub)) return false;
      
      if (revFreqFilter !== 'all') {
        if (String(sub.Frequency || '').trim().toLowerCase() !== revFreqFilter.toLowerCase()) return false;
      }
      if (revTypeFilter !== 'all') {
        if (String(sub.Type_of_Activity || '').trim().toLowerCase() !== String(revTypeFilter).trim().toLowerCase()) return false;
      }
      if (revLineFilter !== 'all') {
        if (String(sub.Line_Equipment || '').trim().toLowerCase() !== String(revLineFilter).trim().toLowerCase()) return false;
      }
      return true;
    });

    const groups = {};
    baseData.forEach(sub => {
      const key = `${sub.Date}_${sub.Shift || 'Gen'}_${sub.Line_Equipment}_${sub.Frequency || 'Daily'}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          date: sub.Date,
          shift: sub.Shift || 'Gen',
          line: sub.Line_Equipment,
          frequency: sub.Frequency || 'Daily',
          items: [],
          users: new Set()
        };
      }
      groups[key].items.push(sub);
      if (sub.Submitted_By) groups[key].users.add(sub.Submitted_By);
    });

    return Object.values(groups).map(g => {
      // Dynamically calculate what is truly 'Pending' at this specific user's level!
      const pendingCount = g.items.filter(i => {
        const cleanLine = String(i.Line_Equipment || '').trim().toLowerCase();
        const currentStatus = i.Review_Status || 'Pending';
        const isL1 = reviewerRoles.L1.includes(cleanLine);
        const isL2 = reviewerRoles.L2.includes(cleanLine);
        const isL3 = reviewerRoles.L3.includes(cleanLine);
        
        if (isL1 && currentStatus === 'Pending') return true;
        if (isL2 && currentStatus === 'L1 Approved') return true;
        if (isL3 && currentStatus === 'L2 Approved') return true;
        return false;
      }).length;

      const approvedCount = g.items.filter(i => ['L1 Approved', 'L2 Approved', 'Approved'].includes(i.Review_Status)).length;
      const rejectedCount = g.items.filter(i => i.Review_Status === 'Needs Correction').length;
      
      return {
        ...g,
        users: Array.from(g.users),
        pendingCount,
        approvedCount,
        rejectedCount,
        totalCount: g.items.length,
        statusSummary: pendingCount > 0 ? 'Pending Review' : (rejectedCount > 0 ? 'Action Required' : 'Approved')
      };
    }).sort((a, b) => b.date.localeCompare(a.date)); // Recent dates first
  }, [submissions, activeTab, reviewerRoles, revFreqFilter, revTypeFilter, revLineFilter, isVisibleInReviewInbox]);

  const getReviewStatusBadgeStyle = (st) => {
    if (st === 'Approved') return { bg: '#ECFDF5', fg: '#059669' };
    if (st === 'L1 Approved' || st === 'L2 Approved') return { bg: '#EFF6FF', fg: '#2563EB' };
    if (st === 'Needs Correction') return { bg: '#FEF2F2', fg: '#DC2626' };
    return { bg: '#FFFBEB', fg: '#D97706' };
  };

  const filteredSubmissions = useMemo(() => {
    if (activeTab !== 'submission_logs') return [];
    
    return submissions.filter(sub => {
      // Description filter
      if (logDescFilter) {
        const q = logDescFilter.toLowerCase();
        const descMatch = (sub.Activity_Description || '').toLowerCase().includes(q) ||
                          (sub.Component || '').toLowerCase().includes(q);
        if (!descMatch) return false;
      }
      
      // Activity Type filter
      if (logActivityTypeFilter !== 'all') {
        if (sub.Type_of_Activity !== logActivityTypeFilter) return false;
      }
      
      // Shift filter
      if (logShiftFilter !== 'all') {
        const s = sub.Shift || 'Gen';
        if (s !== logShiftFilter) return false;
      }
      
      // Doc Number filter
      if (logDocFilter) {
        const q = logDocFilter.toLowerCase();
        if (!(sub.Document_Number || '').toLowerCase().includes(q)) return false;
      }
      
      // Submitted By filter
      if (logSubmittedByFilter) {
        const q = logSubmittedByFilter.toLowerCase();
        if (!(sub.Submitted_By || '').toLowerCase().includes(q)) return false;
      }

      // Line filter
      if (logLineFilter) {
        const q = logLineFilter.toLowerCase();
        if (!(sub.Line_Equipment || '').toLowerCase().includes(q)) return false;
      }

      // Sub-Line filter
      if (logSubLineFilter) {
        const q = logSubLineFilter.toLowerCase();
        if (!(sub.Sub_Line_Equipment || '').toLowerCase().includes(q)) return false;
      }

      // Component filter
      if (logComponentFilter) {
        const q = logComponentFilter.toLowerCase();
        if (!(sub.Component || '').toLowerCase().includes(q)) return false;
      }

      // Freq filter
      if (logFreqFilter !== 'all') {
        if (String(sub.Frequency || '').trim().toLowerCase() !== logFreqFilter.toLowerCase()) return false;
      }

      // Status filter
      if (logStatusFilter !== 'all') {
        if (String(sub.Status || '').trim().toLowerCase() !== logStatusFilter.toLowerCase()) return false;
      }
      
      // Date Custom Ranges filter
      const subDateStr = sub.Date;
      if (subDateStr) {
        if (logStartDate && subDateStr < logStartDate) return false;
        if (logEndDate && subDateStr > logEndDate) return false;
      }
      
      return true;
    }).reverse();
  }, [submissions, activeTab, logStartDate, logEndDate, logShiftFilter, logDocFilter, logSubmittedByFilter, logDescFilter, logActivityTypeFilter, logLineFilter, logSubLineFilter, logComponentFilter, logFreqFilter, logStatusFilter]);

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

  // Map Support Inbox status onto the main Checklist status fields
  const mapSupportToChecklistStatus = (supportStatus) => {
    switch(supportStatus) {
      case 'Resolved': return 'Done';
      case 'In Progress': return 'WIP';
      case 'Hold': return 'Hold';
      case 'Postpone': return 'Postponed';
      case 'Critical': return 'Support Required';
      case 'Support Required': return 'Support Required';
      case 'Pending': return 'WIP'; // Allocated means it is active Work-in-progress
      default: return null;
    }
  };

  // Generates updated submissions list keeping statuses in sync
  const getSyncedSubmissions = (targetReq, nextSupportStatus) => {
    const nextChecklistStatus = mapSupportToChecklistStatus(nextSupportStatus);
    if (!nextChecklistStatus) return submissions; // Return unchanged if state doesn't map

    return submissions.map(sub => {
      let isMatch = false;
      if (targetReq.submissionId && sub.id === targetReq.submissionId) {
        isMatch = true;
      } else {
        // Heuristic match fallback for existing/legacy support entries
        const actMatch = String(sub.Type_of_Activity || '').trim().toLowerCase() === String(targetReq.activity || '').trim().toLowerCase();
        const compMatch = String(sub.Component || '').trim().toLowerCase() === String(targetReq.component || '').trim().toLowerCase();
        const reqDate = targetReq.timestamp ? targetReq.timestamp.split('T')[0] : '';
        const subDate = (sub.Date_Timestamp || sub.timestamp || sub.Date || '').split('T')[0];
        const dateMatch = reqDate && subDate && reqDate === subDate;
        isMatch = actMatch && compMatch && dateMatch;
      }

      if (isMatch) {
        return { 
          ...sub, 
          Status: nextChecklistStatus,
          Last_Synced_Status_Update: new Date().toISOString(),
          Synced_From_Support_Status: nextSupportStatus
        };
      }
      return sub;
    });
  };

  const handleResolve = async (entryId) => {
    const reqItem = supportInbox.find(r => r.id === entryId);
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

    // Sync back state updating Checklist Submissions to Done
    if (reqItem) {
      const updatedSubmissions = getSyncedSubmissions(reqItem, 'Resolved');
      await updateFirebase('submissions', updatedSubmissions);
    }

    setAdminReply(prev => ({ ...prev, [entryId]: '' }));
  };

  const handleAdminJobAllocate = async (entryId) => {
    const reqItem = supportInbox.find(r => r.id === entryId);
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

    // Sync state backward updating Checklist Submissions to WIP
    if (reqItem) {
      const updatedSubmissions = getSyncedSubmissions(reqItem, 'Pending');
      await updateFirebase('submissions', updatedSubmissions);
    }

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

    const finalCalculatedStatus = isCritical ? 'Critical' : newStatus;

    const updated = supportInbox.map(r => {
      if (r.id === entryId) {
        const updates = r.userUpdates || [];
        const newUpdate = [];
        if (reply.trim() || statusUpdate) {
          newUpdate.push({
            text: reply.trim() || `Changed status to ${finalCalculatedStatus}`,
            timestamp: new Date().toISOString(),
            by: user?.name || user?.id,
            photo: photo
          });
        }
        return {
          ...r,
          status: finalCalculatedStatus,
          isCritical,
          supportCount: sCount,
          postponeCount: pCount,
          resolvedAt: finalCalculatedStatus === 'Resolved' ? new Date().toISOString() : r.resolvedAt,
          userUpdates: [...updates, ...newUpdate]
        };
      }
      return r;
    });
    
    await updateFirebase('support_inbox', updated);

    // Push the precise status update backward to linked Checklist Submissions
    const updatedSubmissions = getSyncedSubmissions(req, finalCalculatedStatus);
    await updateFirebase('submissions', updatedSubmissions);

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

  const exportToExcel = () => {
    let rawData = [];
    let sheetName = 'Data';
    let sanitizedData = [];

    if (activeTab === 'submission_logs') {
      rawData = filteredSubmissions;
      sheetName = 'Submission Logs';
      sanitizedData = rawData.map(item => ({
        'Date': formatDateDDMMYYYY(item.Date),
        'Shift': item.Shift || 'Gen',
        'Type of Activity': item.Type_of_Activity || '-',
        'Component': item.Component || '-',
        'Activity Description': item.Activity_Description || '-',
        'Doc Number': item.Document_Number || '-',
        'Revision': item.Revision || '-',
        'Status': item.Status || '-',
        'Submitted By': item.Submitted_By || '-',
        'Timestamp': item.Date_Timestamp ? new Date(item.Date_Timestamp).toLocaleString() : '-',
        'Review Status': item.Review_Status || 'Pending',
        'Reviewed By': item.Reviewed_By || '-',
        'Review Remarks': item.Review_Remarks || '-',
        'Has Photo': item.Photo ? 'Yes' : 'No'
      }));
    } else if (activeTab === 'review_inbox') {
      rawData = revViewMode === 'summary' ? reviewSummaryGroups : filteredReviewSubmissions;
      sheetName = 'Review Inbox';
      if (revViewMode === 'summary') {
        sanitizedData = rawData.map(g => ({
          'Date': formatDateDDMMYYYY(g.date),
          'Shift': g.shift || 'Gen',
          'Line/Equipment': g.line || '-',
          'Frequency': g.frequency || '-',
          'Total Activities': g.totalCount || 0,
          'Approved Count': g.approvedCount || 0,
          'Rejected Count': g.rejectedCount || 0,
          'Pending Count': g.pendingCount || 0,
          'Submitted By Users': (g.users || []).join(', '),
          'Overall Status': g.statusSummary
        }));
      } else {
        sanitizedData = rawData.map(sub => ({
          'Date': formatDateDDMMYYYY(sub.Date),
          'Shift': sub.Shift || 'Gen',
          'Frequency': sub.Frequency || '-',
          'Line': sub.Line_Equipment || '-',
          'Component': sub.Component || '-',
          'Activity Description': sub.Activity_Description || '-',
          'Submitted By': sub.Submitted_By || '-',
          'Current Review Status': sub.Review_Status || 'Pending',
          'Reviewed By': sub.Reviewed_By || '-',
          'Review Remarks': sub.Review_Remarks || '-',
          'Has Photo': sub.Photo ? 'Yes' : 'No'
        }));
      }
    } else {
      rawData = inbox;
      sheetName = activeTab.replace(/_/g, ' ').toUpperCase();
      sanitizedData = rawData.map(req => ({
        'Timestamp': req.timestamp ? new Date(req.timestamp).toLocaleString() : '-',
        'Location': req.location || '-',
        'Activity': req.activity || '-',
        'Component': req.component || '-',
        'Activity Description': req.activityDescription || '-',
        'Status': req.status || 'Open',
        'Department': req.department || '-',
        'Assigned To': req.assignedTo || '-',
        'Submitted By': req.submittedBy || '-',
        'Remark': req.remark || '-',
        'Admin Note': req.adminNote || '-',
        'Resolved At': req.resolvedAt ? new Date(req.resolvedAt).toLocaleString() : '-',
        'Is Critical': req.isCritical ? 'Yes' : 'No',
        'Has Photo': req.photo ? 'Yes' : 'No'
      }));
    }

    if (sanitizedData.length === 0) {
      alert('No records found to export.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(sanitizedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `SupportInbox_${activeTab}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Inbox /> Support Inbox
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            <Download size={16} /> Export to Excel
          </button>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#EFF6FF', padding: '0.4rem 0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
              <Shield size={14} /> Admin View — All Requests
            </div>
          )}
        </div>
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
        <button 
          onClick={() => setActiveTab('submission_logs')}
          style={{ background: 'none', border: 'none', borderBottom: activeTab === 'submission_logs' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'submission_logs' ? 'var(--primary-light)' : 'var(--text-secondary)', padding: '0.5rem 1rem', fontWeight: activeTab === 'submission_logs' ? 700 : 500, cursor: 'pointer', marginBottom: '-2px' }}
        >
          Submitted Logs
        </button>
        {isReviewer && (
          <button 
            onClick={() => setActiveTab('review_inbox')}
            style={{ background: 'none', border: 'none', borderBottom: activeTab === 'review_inbox' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'review_inbox' ? 'var(--primary-light)' : 'var(--text-secondary)', padding: '0.5rem 1rem', fontWeight: activeTab === 'review_inbox' ? 700 : 500, cursor: 'pointer', marginBottom: '-2px' }}
          >
            Review Inbox
          </button>
        )}
      </div>

      {/* Unified Filters */}
      {activeTab !== 'submission_logs' && activeTab !== 'review_inbox' && (
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
      )}

      {/* Review Inbox Filters */}
      {activeTab === 'review_inbox' && (
        <div className="card" style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '100%', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', display: 'flex', gap: '1.25rem', paddingBottom: '0.6rem' }}>
            <button 
              onClick={() => { setRevViewMode('summary'); setExpandedReviewGroup(null); }}
              style={{ background: 'none', border: 'none', borderBottom: revViewMode === 'summary' ? '2px solid var(--primary-light)' : 'none', color: revViewMode === 'summary' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: revViewMode === 'summary' ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', paddingBottom: '0.2rem', marginBottom: '-0.7rem', transition: 'all 0.2s' }}
            >
              📊 Quick Summary & Bulk Approvals
            </button>
            <button 
              onClick={() => setRevViewMode('detail')}
              style={{ background: 'none', border: 'none', borderBottom: revViewMode === 'detail' ? '2px solid var(--primary-light)' : 'none', color: revViewMode === 'detail' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: revViewMode === 'detail' ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', paddingBottom: '0.2rem', marginBottom: '-0.7rem', transition: 'all 0.2s' }}
            >
              📋 Detailed Activity List
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>LINE / EQUIPMENT</label>
              <select 
                value={revLineFilter} 
                onChange={e => setRevLineFilter(e.target.value)} 
                className="select-input" 
                style={{ padding: '0.45rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
              >
                <option value="all">All My Assigned Lines</option>
                {reviewerLines.map(line => <option key={line} value={line}>{line}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>FREQUENCY</label>
              <select 
                value={revFreqFilter} 
                onChange={e => setRevFreqFilter(e.target.value)} 
                className="select-input" 
                style={{ padding: '0.45rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
              >
                <option value="all">All Frequencies</option>
                {['Daily', 'Shift-wise', 'Weekly', 'Monthly'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>ACTIVITY TYPE</label>
              <select 
                value={revTypeFilter} 
                onChange={e => setRevTypeFilter(e.target.value)} 
                className="select-input" 
                style={{ padding: '0.45rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
              >
                {activityTypes.map(type => (
                  <option key={type} value={type}>{type === 'all' ? 'All Activities' : type}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>REVIEW STATUS</label>
              <select 
                value={revStatusFilter} 
                onChange={e => setRevStatusFilter(e.target.value)} 
                className="select-input" 
                style={{ padding: '0.45rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Needs Correction">Needs Correction</option>
              </select>
            </div>

            <button 
              onClick={() => { setRevFreqFilter('all'); setRevTypeFilter('all'); setRevLineFilter('all'); setRevStatusFilter('all'); }}
              style={{ height: '34px', padding: '0 1rem', fontSize: '0.75rem', color: '#EF4444', border: '1px dashed #FCA5A5', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', background: '#FEF2F2' }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Submission Logs Filters */}
      {activeTab === 'submission_logs' && (
        <div className="card" style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>DESCRIPTION SEARCH</label>
              <input 
                type="text" 
                placeholder="Search description..." 
                value={logDescFilter} 
                onChange={e => setLogDescFilter(e.target.value)} 
                className="login-input" 
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', width: '100%' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>ACTIVITY TYPE</label>
              <select 
                value={logActivityTypeFilter} 
                onChange={e => setLogActivityTypeFilter(e.target.value)} 
                className="select-input" 
                style={{ padding: '0.45rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
              >
                {activityTypes.map(type => (
                  <option key={type} value={type}>{type === 'all' ? 'All Activities' : type}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>SHIFT</label>
              <select 
                value={logShiftFilter} 
                onChange={e => setLogShiftFilter(e.target.value)} 
                className="select-input" 
                style={{ padding: '0.45rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
              >
                <option value="all">All Shifts</option>
                <option value="A">Shift A</option>
                <option value="B">Shift B</option>
                <option value="C">Shift C</option>
                <option value="G">Shift G</option>
                <option value="Gen">Gen</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>DOC NUMBER</label>
              <input 
                type="text" 
                placeholder="Doc No..." 
                value={logDocFilter} 
                onChange={e => setLogDocFilter(e.target.value)} 
                className="login-input" 
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', width: '100%' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>SUBMITTED BY</label>
              <input 
                type="text" 
                placeholder="Name or ID..." 
                value={logSubmittedByFilter} 
                onChange={e => setLogSubmittedByFilter(e.target.value)} 
                className="login-input" 
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', width: '100%' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>LINE</label>
              <input 
                type="text" 
                placeholder="Line..." 
                value={logLineFilter} 
                onChange={e => setLogLineFilter(e.target.value)} 
                className="login-input" 
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', width: '100%' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>SUB-LINE</label>
              <input 
                type="text" 
                placeholder="Sub-Line..." 
                value={logSubLineFilter} 
                onChange={e => setLogSubLineFilter(e.target.value)} 
                className="login-input" 
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', width: '100%' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>COMPONENT</label>
              <input 
                type="text" 
                placeholder="Component..." 
                value={logComponentFilter} 
                onChange={e => setLogComponentFilter(e.target.value)} 
                className="login-input" 
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', width: '100%' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>FREQUENCY</label>
              <select 
                value={logFreqFilter} 
                onChange={e => setLogFreqFilter(e.target.value)} 
                className="select-input" 
                style={{ padding: '0.45rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
              >
                <option value="all">All Frequencies</option>
                <option value="daily">Daily</option>
                <option value="shift">Shift</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>STATUS</label>
              <select 
                value={logStatusFilter} 
                onChange={e => setLogStatusFilter(e.target.value)} 
                className="select-input" 
                style={{ padding: '0.45rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
              >
                <option value="all">All Status</option>
                <option value="done">Done</option>
                <option value="wip">In Progress</option>
                <option value="hold">Hold</option>
                <option value="support required">Support Required</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>START DATE</label>
              <input 
                type="date" 
                value={logStartDate} 
                onChange={e => setLogStartDate(e.target.value)} 
                className="login-input" 
                style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem', width: '100%' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>END DATE</label>
              <input 
                type="date" 
                value={logEndDate} 
                onChange={e => setLogEndDate(e.target.value)} 
                className="login-input" 
                style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem', width: '100%' }} 
              />
            </div>

            <button 
              onClick={() => { 
                setLogStartDate(''); 
                setLogEndDate(''); 
                setLogShiftFilter('all'); 
                setLogDocFilter(''); 
                setLogSubmittedByFilter(''); 
                setLogDescFilter(''); 
                setLogActivityTypeFilter('all'); 
                setLogLineFilter(''); 
                setLogSubLineFilter(''); 
                setLogComponentFilter(''); 
                setLogFreqFilter('all'); 
                setLogStatusFilter('all');
              }}
              style={{ height: '34px', padding: '0 1rem', fontSize: '0.75rem', color: '#EF4444', border: '1px dashed #FCA5A5', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', background: '#FEF2F2' }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <tr>
                {activeTab !== 'submission_logs' && activeTab !== 'review_inbox' && (
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Location / Issue</th>
                )}
                
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

                {activeTab === 'submission_logs' && (
                  <>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Shift</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Type of Activity</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Component</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Doc No / Rev</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Submitted By</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Review Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Reviewed By</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Review Remarks</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Photo</th>
                  </>
                )}

                {activeTab === 'review_inbox' && (
                  revViewMode === 'summary' ? (
                    <>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date & Shift</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Line & Frequency</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Submissions Summary</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Overall Status</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '320px' }}>Bulk Actions / Drill Down</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date / Freq</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Line & Component</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Activity Details</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Submitted By</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Current Review</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '300px' }}>Action</th>
                    </>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'submission_logs' ? (
                filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No submission logs found.</td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub, i) => {
                    const getStatusColor = (s) => ({ 'Pending': '#94A3B8', 'Done': '#10B981', 'WIP': '#F59E0B', 'Hold': '#64748B', 'Postponed': '#8B5CF6', 'Support Required': '#EF4444' }[s] || '#94A3B8');
                    return (
                      <tr key={sub.id || i} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'transparent' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>{formatDateDDMMYYYY(sub.Date)}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{sub.Shift || 'Gen'}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--primary-dark)' }}>{sub.Type_of_Activity || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{sub.Component || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }}>{sub.Activity_Description || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>{sub.Document_Number || '-'} / R{sub.Revision || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ backgroundColor: getStatusColor(sub.Status), color: '#FFF', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>{sub.Status || 'Done'}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>{sub.Submitted_By || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>{sub.Date_Timestamp ? new Date(sub.Date_Timestamp).toLocaleTimeString() : '-'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {sub.Review_Status ? (
                            (() => {
                              const badge = getReviewStatusBadgeStyle(sub.Review_Status);
                              return (
                                <span style={{ 
                                  padding: '0.15rem 0.4rem', 
                                  borderRadius: '3px', 
                                  fontSize: '0.65rem', 
                                  fontWeight: 700, 
                                  backgroundColor: badge.bg, 
                                  color: badge.fg,
                                  border: `1px solid ${badge.fg}33`
                                }}>
                                  {sub.Review_Status}
                                </span>
                              );
                            })()
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.7rem' }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem' }}>{sub.Reviewed_By || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', whiteSpace: 'normal', maxWidth: '150px' }}>{sub.Review_Remarks || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {sub.Photo ? (
                            <button 
                              onClick={() => setLightboxPhoto(sub.Photo)}
                              style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                              title="View Photo Capture"
                            >
                              <Camera size={18} />
                            </button>
                          ) : (
                            <span style={{ color: '#CBD5E1' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )
              ) : activeTab === 'review_inbox' ? (
                revViewMode === 'summary' ? (
                  reviewSummaryGroups.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No review summary buckets identified for your assigned lines.</td></tr>
                  ) : (
                    reviewSummaryGroups.map((group, idx) => {
                      const isExpanded = expandedReviewGroup === group.key;
                      
                      return (
                        <React.Fragment key={group.key || idx}>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isExpanded ? '#F8FAFC' : 'transparent' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: 700 }}>{formatDateDDMMYYYY(group.date)}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Shift: {group.shift}</div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{group.line}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Freq: {group.frequency}</div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{group.totalCount} Activities</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                By: {group.users.join(', ') || 'Unknown'}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {group.approvedCount > 0 && <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>{group.approvedCount} Approved</span>}
                                {group.rejectedCount > 0 && <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>{group.rejectedCount} Fail</span>}
                                {group.pendingCount > 0 && <span style={{ backgroundColor: '#FFFBEB', color: '#D97706', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>{group.pendingCount} Pend</span>}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {group.pendingCount > 0 && (
                                  <>
                                    <input 
                                      type="text" 
                                      placeholder="Bulk remarks..."
                                      value={bulkRemarksInput[group.key] || ''}
                                      onChange={e => setBulkRemarksInput({...bulkRemarksInput, [group.key]: e.target.value})}
                                      style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                    />
                                    <button 
                                      onClick={() => handleBulkApprove(group.key, group.items)}
                                      className="btn"
                                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: '#059669', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', borderRadius: '4px' }}
                                    >
                                      ✓ Approve All
                                    </button>
                                  </>
                                )}
                                {group.pendingCount === 0 && (
                                  <div style={{ flex: 1, fontSize: '0.75rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    ✓ Fully Reviewed
                                  </div>
                                )}
                                <button 
                                  onClick={() => setExpandedReviewGroup(isExpanded ? null : group.key)}
                                  className="btn"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'var(--primary-light)', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', borderRadius: '4px' }}
                                >
                                  {isExpanded ? '▲ Close' : '▼ Drill Down'}
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Drilled down list inside accordion */}
                          {isExpanded && (
                            <tr style={{ backgroundColor: '#F8FAFC' }}>
                              <td colSpan={5} style={{ padding: '1rem 1.5rem', borderLeft: '4px solid var(--primary-light)' }}>
                                <div style={{ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                  <div style={{ backgroundColor: '#F1F5F9', padding: '0.6rem 0.8rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)' }}>📑 Activity Drill Down — {group.line} ({formatDateDDMMYYYY(group.date)})</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{group.items.length} Submissions</span>
                                  </div>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead style={{ backgroundColor: '#F8FAFC' }}>
                                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Component / Description</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Submitted By</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Review State</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Individual Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.items.map((sub, i) => {
                                        const subKey = sub.id || (sub.Date_Timestamp + '_' + sub.Submitted_By);
                                        const itmStyle = getReviewStatusBadgeStyle(sub.Review_Status || 'Pending');
                                        return (
                                          <tr key={subKey || i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '0.6rem 0.5rem' }}>
                                              <div style={{ fontWeight: 700, color: '#1E293B' }}>{sub.Component}</div>
                                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }} title={sub.Activity_Description}>{sub.Activity_Description}</div>
                                            </td>
                                            <td style={{ padding: '0.6rem 0.5rem' }}>
                                              <div>{sub.Submitted_By}</div>
                                              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>{sub.Date_Timestamp ? new Date(sub.Date_Timestamp).toLocaleTimeString() : '-'}</div>
                                            </td>
                                            <td style={{ padding: '0.6rem 0.5rem' }}>
                                              <span style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, backgroundColor: itmStyle.bg, color: itmStyle.fg, border: `1px solid ${itmStyle.fg}33` }}>
                                                {sub.Review_Status || 'Pending'}
                                              </span>
                                              {sub.Review_Remarks && <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.65rem', marginTop: '0.15rem' }}>"{sub.Review_Remarks}"</div>}
                                            </td>
                                            <td style={{ padding: '0.6rem 0.5rem' }}>
                                              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                <select 
                                                  value={revActions[subKey] || ''} 
                                                  onChange={e => setRevActions(prev => ({...prev, [subKey]: e.target.value}))}
                                                  style={{ padding: '0.25rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                                >
                                                  <option value="">Action...</option>
                                                  <option value="Approved">Approve</option>
                                                  <option value="Needs Correction">Needs Correction</option>
                                                </select>
                                                <input 
                                                  type="text"
                                                  placeholder="Remarks..."
                                                  value={revRemarks[subKey] || ''}
                                                  onChange={e => setRevRemarks({...revRemarks, [subKey]: e.target.value})}
                                                  style={{ padding: '0.25rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--border-color)', width: '120px' }}
                                                />
                                                <button 
                                                  onClick={() => handleSaveReview(subKey, revActions[subKey])}
                                                  style={{ backgroundColor: '#059669', color: '#FFF', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 700 }}
                                                >
                                                  Save
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )
                ) : (
                  filteredReviewSubmissions.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No submissions found for your assigned lines.</td></tr>
                  ) : (
                    filteredReviewSubmissions.map((sub, i) => {
                      const subKey = sub.id || (sub.Date_Timestamp + '_' + sub.Submitted_By);
                      const style = getReviewStatusBadgeStyle(sub.Review_Status || 'Pending');
                      return (
                        <tr key={subKey || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 600 }}>{formatDateDDMMYYYY(sub.Date)}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{sub.Frequency || 'Daily'} • Shift {sub.Shift || 'Gen'}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{sub.Line_Equipment}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{sub.Component}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }}>
                            <div style={{ fontWeight: 600 }}>{sub.Type_of_Activity}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub.Activity_Description}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 500 }}>{sub.Submitted_By}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{sub.Date_Timestamp ? new Date(sub.Date_Timestamp).toLocaleTimeString() : '-'}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: style.bg, color: style.fg, border: `1px solid ${style.fg}33` }}>
                              {sub.Review_Status || 'Pending Review'}
                            </span>
                            {sub.Review_Remarks && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontStyle: 'italic' }}>"{sub.Review_Remarks}"</div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <select 
                                  value={revActions[subKey] || ''} 
                                  onChange={e => setRevActions(prev => ({...prev, [subKey]: e.target.value}))}
                                  className="select-input" 
                                  style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem' }}
                                >
                                  <option value="">Select Review Action...</option>
                                  <option value="Approved">Approve</option>
                                  <option value="Needs Correction">Needs Correction</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <input 
                                  type="text" 
                                  placeholder="Add review remarks..." 
                                  value={revRemarks[subKey] || ''} 
                                  onChange={e => setRevRemarks({ ...revRemarks, [subKey]: e.target.value })} 
                                  style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} 
                                />
                                <button 
                                  onClick={() => handleSaveReview(subKey, revActions[subKey])} 
                                  className="btn btn-primary" 
                                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', backgroundColor: '#059669', border: 'none', color: '#FFF' }}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )
                )
              ) : (
                inbox.length === 0 ? (
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {lightboxPhoto && <PhotoLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />}
    </div>
  );
};

export default SupportInbox;
