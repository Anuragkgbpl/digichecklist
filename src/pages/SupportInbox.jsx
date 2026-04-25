import React, { useState, useEffect } from 'react';
import { Inbox, Clock, CheckCircle, AlertTriangle, User, MessageSquare, Send, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SupportInbox = () => {
  const { user } = useAuth();
  const [inbox, setInbox] = useState([]);
  const [adminReply, setAdminReply] = useState({});
  const [userReply, setUserReply] = useState({});

  const isAdmin = user?.role === 'UNIT_ADMIN' || user?.role === 'MASTER_ADMIN';

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = () => {
    const loadedInbox = JSON.parse(localStorage.getItem('pcms_support_inbox') || '[]');
    
    // USERs only see their own requests
    if (!isAdmin) {
      const myInbox = loadedInbox.filter(req => req.submittedById === user?.id);
      setInbox(myInbox);
    } else {
      setInbox(loadedInbox);
    }
  };

  const handleResolve = (entryId) => {
    const allInbox = JSON.parse(localStorage.getItem('pcms_support_inbox') || '[]');
    const updated = allInbox.map(req => {
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
    localStorage.setItem('pcms_support_inbox', JSON.stringify(updated));
    loadInbox();
    setAdminReply(prev => ({ ...prev, [entryId]: '' }));
  };

  const handleAdminJobAllocate = (entryId) => {
    const allInbox = JSON.parse(localStorage.getItem('pcms_support_inbox') || '[]');
    const updated = allInbox.map(req => {
      if (req.id === entryId) {
        return {
          ...req,
          status: 'In Progress',
          adminNote: adminReply[entryId] || '',
          jobAllocatedAt: new Date().toISOString()
        };
      }
      return req;
    });
    localStorage.setItem('pcms_support_inbox', JSON.stringify(updated));
    loadInbox();
    setAdminReply(prev => ({ ...prev, [entryId]: '' }));
  };

  const handleUserUpdate = (entryId) => {
    const allInbox = JSON.parse(localStorage.getItem('pcms_support_inbox') || '[]');
    const reply = userReply[entryId];
    if (!reply || !reply.trim()) return;

    const updated = allInbox.map(req => {
      if (req.id === entryId) {
        const updates = req.userUpdates || [];
        return {
          ...req,
          userUpdates: [...updates, {
            text: reply.trim(),
            timestamp: new Date().toISOString(),
            by: user?.name || user?.id
          }]
        };
      }
      return req;
    });
    localStorage.setItem('pcms_support_inbox', JSON.stringify(updated));
    loadInbox();
    setUserReply(prev => ({ ...prev, [entryId]: '' }));
  };

  const getStatusStyle = (status) => {
    const styles = {
      'Open': { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
      'In Progress': { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
      'Resolved': { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7' }
    };
    return styles[status] || styles['Open'];
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Inbox /> Support Inbox
        </h2>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#EFF6FF', padding: '0.4rem 0.75rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
            <Shield size={14} /> Admin View — All Requests
          </div>
        )}
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        {isAdmin
          ? 'All support requests from the shop floor. Allocate jobs or mark as resolved.'
          : 'Your support requests and their current status. You can add updates to open requests.'}
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Date & Time</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Location / Activity</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Component / Issue</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Submitted By</th>}
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '250px' }}>Updates & Actions</th>
              </tr>
            </thead>
            <tbody>
              {inbox.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No support requests found.</td>
                </tr>
              ) : inbox.map((req) => {
                const statusStyle = getStatusStyle(req.status);
                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(req.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.location}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{req.activity}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.component || '-'}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{req.remark || req.activityDescription}</div>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{req.submittedBy}</td>
                    )}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color,
                        border: `1px solid ${statusStyle.border}`,
                        display: 'inline-flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap'
                      }}>
                        {req.status === 'Open' ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {/* Existing notes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
                        {req.adminNote && (
                          <div style={{ fontSize: '0.75rem', backgroundColor: '#EFF6FF', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #BFDBFE', color: 'var(--primary-dark)' }}>
                            <strong>Admin:</strong> {req.adminNote}
                          </div>
                        )}
                        {req.userUpdates?.map((upd, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', backgroundColor: '#F1F5F9', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                            <strong>{upd.by}:</strong> {upd.text}
                          </div>
                        ))}
                      </div>

                      {/* User Actions */}
                      {!isAdmin && (req.status === 'Open' || req.status === 'In Progress') && (
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <input type="text" placeholder="Reply..." value={userReply[req.id] || ''} onChange={e => setUserReply({ ...userReply, [req.id]: e.target.value })} style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} onKeyDown={e => e.key === 'Enter' && handleUserUpdate(req.id)} />
                          <button onClick={() => handleUserUpdate(req.id)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }}><Send size={12} /></button>
                        </div>
                      )}

                      {/* Admin Actions */}
                      {isAdmin && req.status !== 'Resolved' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <input type="text" placeholder="Add note..." value={adminReply[req.id] || ''} onChange={e => setAdminReply({ ...adminReply, [req.id]: e.target.value })} style={{ width: '100%', padding: '0.3rem', fontSize: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box' }} />
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {req.status === 'Open' && <button onClick={() => handleAdminJobAllocate(req.id)} className="btn btn-secondary" style={{ flex: 1, padding: '0.2rem', fontSize: '0.7rem', color: '#D97706', borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}>Allocate</button>}
                            <button onClick={() => handleResolve(req.id)} className="btn btn-primary" style={{ flex: 1, padding: '0.2rem', fontSize: '0.7rem', backgroundColor: '#059669', borderColor: '#059669' }}>Resolve</button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupportInbox;
