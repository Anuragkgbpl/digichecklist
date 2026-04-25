import React, { useState, useEffect } from 'react';
import { FileClock, Search, List, ShieldCheck, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const Logs = () => {
  const [activeTab, setActiveTab] = useState('submissions');
  const [submissions, setSubmissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSubmissions(JSON.parse(localStorage.getItem('pcms_submitted_checklists') || '[]').reverse());
    setAuditLogs(JSON.parse(localStorage.getItem('pcms_logs') || '[]').reverse());
  }, []);

  const getFilteredSubmissions = () => {
    return submissions.filter(sub => {
      const q = searchQuery.toLowerCase();
      return (
        (sub.Type_of_Activity || '').toLowerCase().includes(q) ||
        (sub.Line_Equipment || '').toLowerCase().includes(q) ||
        (sub.Component || '').toLowerCase().includes(q) ||
        (sub.Submitted_By || '').toLowerCase().includes(q) ||
        (sub.Status || '').toLowerCase().includes(q)
      );
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
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: '#FFF', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.4rem 0.75rem' }}>
            <Search size={16} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
            <input type="text" placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.875rem' }} />
          </div>
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
    </div>
  );
};

export default Logs;
