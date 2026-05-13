import React, { useState, useEffect } from 'react';
import { FileClock, Search, List, ShieldCheck, Download, Camera, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';

const PhotoLightbox = ({ src, onClose }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
    <img src={src} alt="Uploaded Proof" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
  </div>
);

const Logs = () => {
  const { submissions: cloudSubmissions, logs: cloudLogs } = useData();
  const [submissions, setSubmissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('submissions');
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced filters for submissions
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [lineFilter, setLineFilter] = useState('all');
  const [subLineFilter, setSubLineFilter] = useState('all');
  const [freqFilter, setFreqFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  useEffect(() => {
    setSubmissions([...cloudSubmissions].reverse());
    setAuditLogs([...cloudLogs].reverse());
  }, [cloudSubmissions, cloudLogs]);

  const getFilteredSubmissions = () => {
    return submissions.filter(sub => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = (
          (sub.Type_of_Activity || '').toLowerCase().includes(q) ||
          (sub.Line_Equipment || '').toLowerCase().includes(q) ||
          (sub.Component || '').toLowerCase().includes(q) ||
          (sub.Submitted_By || '').toLowerCase().includes(q) ||
          (sub.Status || '').toLowerCase().includes(q) ||
          (sub.Activity_Description || '').toLowerCase().includes(q)
        );
        if (!matchesSearch) return false;
      }

      // 2. Status
      if (statusFilter !== 'all' && sub.Status !== statusFilter) return false;

      // 3. Date
      if (dateFilter && sub.Date !== dateFilter) return false;

      // 4. Shift
      if (shiftFilter !== 'all') {
        const s = sub.Shift || 'Gen';
        if (s !== shiftFilter) return false;
      }

      // 5. Line
      if (lineFilter !== 'all' && sub.Line_Equipment !== lineFilter) return false;

      // 6. Sub-Line
      if (subLineFilter !== 'all' && sub.Sub_Line_Equipment !== subLineFilter) return false;

      // 7. Frequency
      if (freqFilter !== 'all' && sub.Frequency !== freqFilter) return false;

      // 8. Doc No / Rev
      if (docFilter) {
        const q = docFilter.toLowerCase();
        const matchesDoc = (sub.Document_Number || '').toLowerCase().includes(q) || (String(sub.Revision) || '').toLowerCase().includes(q);
        if (!matchesDoc) return false;
      }

      // 9. Updated By
      if (userFilter) {
        const q = userFilter.toLowerCase();
        if (!(sub.Submitted_By || '').toLowerCase().includes(q)) return false;
      }

      return true;
    });
  };

  const getFilteredAudit = () => {
    return auditLogs.filter(log => {
      const q = searchQuery.toLowerCase();
      return (
        (log.user || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.type || '').toLowerCase().includes(q)
      );
    });
  };

  const exportToExcel = () => {
    const data = activeTab === 'submissions' ? getFilteredSubmissions() : getFilteredAudit();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logs');
    XLSX.writeFile(wb, `${activeTab}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusColor = (s) => ({ 'Pending': '#94A3B8', 'Done': '#10B981', 'WIP': '#F59E0B', 'Hold': '#64748B', 'Postponed': '#8B5CF6', 'Support Required': '#EF4444' }[s] || '#94A3B8');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><FileClock /> System Logs & Audit Trail</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
            Complete historical record of checklists and system access.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={16} /> Export to Excel
        </button>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', padding: '0 1.5rem', backgroundColor: '#F8FAFC' }}>
          <div onClick={() => setActiveTab('submissions')} style={{ padding: '1rem', borderBottom: activeTab === 'submissions' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'submissions' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'submissions' ? 600 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <List size={16} /> Submission Logs
          </div>
          <div onClick={() => setActiveTab('audit')} style={{ padding: '1rem', borderBottom: activeTab === 'audit' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'audit' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'audit' ? 600 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} /> Audit Trail
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#fff' }}>
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.4rem 0.75rem' }}>
            <Search size={16} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
            <input type="text" placeholder="Search activities, components..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.875rem' }} />
          </div>

          {activeTab === 'submissions' && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', flex: 1 }}>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select-input" style={{ width: 'auto', minWidth: '120px', fontSize: '0.75rem', padding: '0.35rem' }}>
                  <option value="all">All Status</option>
                  {['Pending', 'Done', 'WIP', 'Hold', 'Postponed', 'Support Required'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="select-input" style={{ width: 'auto', fontSize: '0.75rem', padding: '0.35rem' }} />

                <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)} className="select-input" style={{ width: 'auto', fontSize: '0.75rem', padding: '0.35rem' }}>
                  <option value="all">All Shifts</option>
                  {['A', 'B', 'C', 'G', 'Gen'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select value={freqFilter} onChange={e => setFreqFilter(e.target.value)} className="select-input" style={{ width: 'auto', fontSize: '0.75rem', padding: '0.35rem' }}>
                  <option value="all">All Freq</option>
                  {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Shift'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <input type="text" placeholder="Doc No..." value={docFilter} onChange={e => setDocFilter(e.target.value)} className="select-input" style={{ width: '100px', fontSize: '0.75rem', padding: '0.35rem' }} />
                <input type="text" placeholder="Updated By..." value={userFilter} onChange={e => setUserFilter(e.target.value)} className="select-input" style={{ width: '120px', fontSize: '0.75rem', padding: '0.35rem' }} />

                <button 
                  onClick={() => {
                    setStatusFilter('all'); setDateFilter(''); setShiftFilter('all'); 
                    setFreqFilter('all'); setLineFilter('all'); setSubLineFilter('all');
                    setDocFilter(''); setUserFilter(''); setSearchQuery('');
                  }}
                  style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </div>

        {/* Data Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left', whiteSpace: 'nowrap' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F8FAFC', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              {activeTab === 'submissions' ? (
                <tr style={{ color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Shift</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Line</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Sub-Line</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Component</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Freq</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Doc No / Rev</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Updated By</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Review Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Reviewed By</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Remarks</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Photo</th>
                </tr>
              ) : (
                <tr style={{ color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>User / Actor</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '100%' }}>Action & Details</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === 'submissions' && getFilteredSubmissions().map((sub, i) => (
                <tr key={sub.id || i} style={{ borderBottom: '1px solid var(--border-color)', '&:hover': { backgroundColor: '#F8FAFC' } }}>
                  <td style={{ padding: '0.75rem 1rem' }}>{sub.Date || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{sub.Shift || 'Gen'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--primary-dark)' }}>{sub.Type_of_Activity || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{sub.Line_Equipment || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{sub.Sub_Line_Equipment || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{sub.Component || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.Activity_Description || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{sub.Frequency || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>{sub.Document_Number || '-'} / R{sub.Revision || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ backgroundColor: getStatusColor(sub.Status), color: '#FFF', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>{sub.Status || 'Done'}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{sub.Submitted_By || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>{new Date(sub.Date_Timestamp || Date.now()).toLocaleTimeString()}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {sub.Review_Status ? (
                      <span style={{ 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        backgroundColor: sub.Review_Status === 'Approved' ? '#ECFDF5' : '#FEF2F2', 
                        color: sub.Review_Status === 'Approved' ? '#059669' : '#DC2626',
                        border: `1px solid ${sub.Review_Status === 'Approved' ? '#10B98133' : '#EF444433'}`
                      }}>{sub.Review_Status}</span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Pending Review</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{sub.Reviewed_By || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontStyle: 'italic', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sub.Review_Remarks}>{sub.Review_Remarks || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {sub.Photo ? (
                      <button 
                        onClick={() => setLightboxPhoto(sub.Photo)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                        title="View Proof Photo"
                      >
                        <Camera size={18} />
                      </button>
                    ) : (
                      <span style={{ color: '#CBD5E1' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}

              {activeTab === 'audit' && getFilteredAudit().map((log, i) => (
                <tr key={log.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{log.type || 'System'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{log.user || 'System Auto'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{log.action} {log.details ? `— ${log.details}` : ''}</td>
                </tr>
              ))}

              {(activeTab === 'submissions' ? getFilteredSubmissions() : getFilteredAudit()).length === 0 && (
                <tr>
                  <td colSpan="12" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {lightboxPhoto && <PhotoLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />}
    </div>
  );
};

export default Logs;
