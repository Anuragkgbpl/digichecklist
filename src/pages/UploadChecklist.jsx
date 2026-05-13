import React, { useState, useRef, useMemo } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, ClipboardList, Download, List, Trash2, Power, PowerOff, Search, X, Filter, Settings, Shield } from 'lucide-react';
import FrequencyMaster from '../components/FrequencyMaster';
import ReviewersMaster from '../components/ReviewersMaster';
import { parseCSV, validateChecklist } from '../utils/csvParser';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';

const UploadChecklist = () => {
  const { checklists, frequencies, updateFirebase } = useData();
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);

  // Filter state
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterSubLine, setFilterSubLine] = useState('');
  const [filterComponent, setFilterComponent] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');

  const activityTypes = useMemo(() => [...new Set(checklists.map(c => c.Type_of_Activity).filter(Boolean))], [checklists]);
  const lines = useMemo(() => [...new Set(checklists.map(c => c.Line_Equipment).filter(Boolean))], [checklists]);
  const subLines = useMemo(() => [...new Set(checklists.filter(c => !filterLine || c.Line_Equipment === filterLine).map(c => c.Sub_Line_Equipment).filter(Boolean))], [checklists, filterLine]);
  const components = useMemo(() => [...new Set(checklists.map(c => c.Component).filter(Boolean))], [checklists]);
  
  const PREBUILT_FREQ_NAMES = ['Daily', 'Shift-wise', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Yearly'];
  const dynamicFreqs = useMemo(() => {
    const fromChecklists = checklists.map(c => c.Frequency).filter(Boolean);
    const fromMaster = (frequencies || []).map(f => f.name);
    return [...new Set([...PREBUILT_FREQ_NAMES, ...fromChecklists, ...fromMaster])];
  }, [checklists, frequencies]);

  const filteredChecklists = useMemo(() => checklists.filter(c => {
    const txt = filterText.toLowerCase();
    const matchText = !txt ||
      String(c.Activity_Description || '').toLowerCase().includes(txt) ||
      String(c.Document_Number || '').toLowerCase().includes(txt) ||
      String(c.Revision || '').toLowerCase().includes(txt);
    return matchText
      && (!filterType || c.Type_of_Activity === filterType)
      && (!filterLine || c.Line_Equipment === filterLine)
      && (!filterSubLine || c.Sub_Line_Equipment === filterSubLine)
      && (!filterComponent || c.Component === filterComponent)
      && (!filterFrequency || c.Frequency === filterFrequency);
  }), [checklists, filterText, filterType, filterLine, filterSubLine, filterComponent, filterFrequency]);

  const hasActiveFilters = filterText || filterType || filterLine || filterSubLine || filterComponent || filterFrequency;
  const resetFilters = () => { setFilterText(''); setFilterType(''); setFilterLine(''); setFilterSubLine(''); setFilterComponent(''); setFilterFrequency(''); };
  const [isDragging, setIsDragging] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    Type_of_Activity: '',
    Line_Equipment: '',
    Sub_Line_Equipment: '',
    Component: '',
    Activity_Description: '',
    Frequency: 'Daily',
    Status: 'Active',
    Document_Number: '',
    Revision: '',
    Last_Revised_Date: ''
  });
  const fileInputRef = useRef(null);

  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    const isExcel = selectedFile.name.match(/\.(xlsx|xls|csv)$/i);
    if (!isExcel) { alert('Please upload a valid Excel or CSV file.'); return; }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        setValidationResult(validateChecklist(data));
      } catch (error) {
        setValidationResult({ parseErrors: ['Failed to parse Excel file. Ensure it is correctly formatted.'] });
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (!validationResult || validationResult.errors.length > 0) return;
    try {
      await updateFirebase('checklists', [...checklists, ...validationResult.validData]);
      setFile(null);
      setValidationResult(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('view');
    } catch (e) {
      alert('Upload failed: ' + e.message);
    }
  };

  const downloadTemplate = () => {
    const headers = "Type_of_Activity,Line_Equipment,Sub_Line_Equipment,Component,Activity_Description,Frequency,Status,Document_Number,Revision,Last_Revised_Date\n";
    const sample = "GMP,Packaging Line 1,Cartoning Machine,Sensors,Check and clean optical sensors,Daily,Active,DOC-123,1.0,2026-04-01\n";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Checklist_Master_Template.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this checklist item?')) {
      const updated = checklists.filter(chk => chk.id !== id);
      await updateFirebase('checklists', updated);
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('WARNING: Are you sure you want to delete ALL checklist items? This action cannot be undone.')) {
      if (window.confirm('Please confirm again. Type OK to proceed.')) {
        await updateFirebase('checklists', []);
      }
    }
  };

  const toggleStatus = async (id) => {
    const updated = checklists.map(chk => {
      if (chk.id === id) {
        return { ...chk, Status: chk.Status === 'Active' ? 'Inactive' : 'Active' };
      }
      return chk;
    });
    await updateFirebase('checklists', updated);
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!newActivity.Type_of_Activity || !newActivity.Component || !newActivity.Activity_Description) {
      alert('Please fill in required fields: Activity Type, Component, and Description.');
      return;
    }
    const item = { ...newActivity, id: Date.now() };
    await updateFirebase('checklists', [...checklists, item]);
    setIsManualModalOpen(false);
    setNewActivity({
      Type_of_Activity: '', Line_Equipment: '', Sub_Line_Equipment: '', Component: '',
      Activity_Description: '', Frequency: 'Daily', Status: 'Active',
      Document_Number: '', Revision: '', Last_Revised_Date: ''
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><ClipboardList /> Unit Checklist Master</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleDeleteAll} className="btn" style={{ padding: '0.5rem 1rem', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', fontWeight: 600 }}>
            Delete All
          </button>
          <button onClick={() => setIsManualModalOpen(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            + Add Activity
          </button>
          <button onClick={downloadTemplate} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            <Download size={16} /> Download Template
          </button>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Upload the master checklist configuring Type, Line, Sub-Line, and Frequency, or view existing ones.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <div 
          onClick={() => setActiveTab('upload')}
          style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'upload' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'upload' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'upload' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Upload size={18} /> Upload Checklists
        </div>
        <div 
          onClick={() => setActiveTab('view')}
          style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'view' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'view' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'view' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <List size={18} /> View Checklists
        </div>
        <div 
          onClick={() => setActiveTab('freq')}
          style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'freq' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'freq' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'freq' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={18} /> Frequency Master
        </div>
        <div 
          onClick={() => setActiveTab('reviewers')}
          style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'reviewers' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'reviewers' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'reviewers' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={18} /> Reviewers Master
        </div>
      </div>

      {activeTab === 'freq' && <FrequencyMaster />}
      {activeTab === 'reviewers' && <ReviewersMaster />}

      {activeTab === 'upload' && (
        <div className="card">
          <div 
            style={{ border: `2px dashed ${isDragging ? 'var(--primary-light)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius-lg)', padding: '3rem', textAlign: 'center', backgroundColor: isDragging ? '#EEF2FF' : 'var(--bg-color)' }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}
          >
            <Upload size={48} color="var(--primary-light)" style={{ marginBottom: '1rem' }} />
            <h3>Drag & drop your Excel/CSV file here</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{file ? `Selected: ${file.name}` : 'or click to browse'}</p>
            <input type="file" accept=".csv, .xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={(e) => processFile(e.target.files[0])} />
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>Browse Files</button>
          </div>

          {validationResult && (
            <div style={{ marginTop: '2rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Validation Report</h3>
              {validationResult.parseErrors ? (
                 <div style={{ color: 'var(--status-rejected)' }}><strong>Parse Errors:</strong> {validationResult.parseErrors.join(', ')}</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
                    <div>Total Rows: <strong>{validationResult.totalRows}</strong></div>
                    <div style={{ color: 'var(--status-completed)' }}>Successful: <strong>{validationResult.validData.length}</strong></div>
                    <div style={{ color: 'var(--status-rejected)' }}>Errors: <strong>{validationResult.errors.length}</strong></div>
                  </div>

                  {validationResult.errors.length > 0 && (
                    <div style={{ backgroundColor: '#FEF2F2', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem' }}>
                      <h4 style={{ color: 'var(--status-rejected)' }}><XCircle size={16} /> Failed Rows</h4>
                      <ul>{validationResult.errors.slice(0, 5).map((err, i) => <li key={i}>Row {err.row}: {err.messages.join(', ')}</li>)}</ul>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" disabled={validationResult.errors.length > 0} onClick={handleUpload}>Confirm & Upload</button>
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ marginTop: '2rem', backgroundColor: '#EEF2FF', padding: '1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.875rem' }}>
            <strong>Required Columns:</strong> Type_of_Activity, Line_Equipment, Sub_Line_Equipment, Component, Activity_Description, Frequency, Status<br/><br/>
            <strong>Optional Columns:</strong> Document_Number, Revision, Last_Revised_Date
          </div>
        </div>
      )}

      {activeTab === 'view' && (
        <div className="card">
          {/* Filter Bar */}
          <div style={{ marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <Filter size={18} /> Filter Results
              </div>
              {hasActiveFilters && (
                <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: 'var(--status-rejected)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <X size={14} /> Reset All Filters
                </button>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              {/* Search Bar */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>SEARCH CRITERIA</label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input 
                    type="text" 
                    value={filterText} 
                    onChange={e => setFilterText(e.target.value)} 
                    placeholder="Desc / Doc / Rev..." 
                    style={{ width: '100%', padding: '0.45rem 0.5rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }} 
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>ACTIVITY TYPE</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <option value="">All Activity Types</option>
                  {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Line Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>LINE EQUIPMENT</label>
                <select value={filterLine} onChange={e => { setFilterLine(e.target.value); setFilterSubLine(''); }} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <option value="">All Lines</option>
                  {lines.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Sub-Line Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>SUB-LINE EQUIPMENT</label>
                <select value={filterSubLine} onChange={e => setFilterSubLine(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <option value="">All Sub-Lines</option>
                  {subLines.map(sl => <option key={sl} value={sl}>{sl}</option>)}
                </select>
              </div>

              {/* Component Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>COMPONENT</label>
                <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <option value="">All Components</option>
                  {components.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Frequency Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>FREQUENCY</label>
                <select value={filterFrequency} onChange={e => setFilterFrequency(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <option value="">All Frequencies</option>
                  {dynamicFreqs.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Line</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Sub-Line</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Component</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Freq</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Doc No</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Rev</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Last Rev Date</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChecklists.map((chk, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{chk.Type_of_Activity}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Line_Equipment}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Sub_Line_Equipment}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Component}</td>
                    <td style={{ padding: '0.75rem 1rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={chk.Activity_Description}>{chk.Activity_Description}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Frequency}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Document_Number || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Revision || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Last_Revised_Date || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: 'var(--border-radius-sm)', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        backgroundColor: chk.Status === 'Active' ? '#ECFDF5' : '#FEF2F2',
                        color: chk.Status === 'Active' ? 'var(--status-completed)' : 'var(--status-rejected)'
                      }}>
                        {chk.Status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem' }}
                        onClick={() => toggleStatus(chk.id)}
                        title={chk.Status === 'Active' ? 'Mark Inactive' : 'Mark Active'}
                      >
                        {chk.Status === 'Active' ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', color: 'var(--status-rejected)' }}
                        onClick={() => handleDelete(chk.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredChecklists.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      {hasActiveFilters ? 'No activities match your current filters.' : 'No checklists found. Please upload a CSV or Excel file.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    
    {/* Manual Addition Modal */}
    {isManualModalOpen && (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '600px', margin: '1rem', padding: '2rem', borderRadius: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ClipboardList size={20} color="var(--primary-light)" /> Add New Activity</h3>
            <button onClick={() => setIsManualModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><XCircle size={24} /></button>
          </div>
          
          <form onSubmit={handleManualAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Activity Type *</label>
              <input type="text" required value={newActivity.Type_of_Activity} onChange={e => setNewActivity({...newActivity, Type_of_Activity: e.target.value})} placeholder="e.g., GMP, Maintenance" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Line / Equipment</label>
              <input type="text" value={newActivity.Line_Equipment} onChange={e => setNewActivity({...newActivity, Line_Equipment: e.target.value})} placeholder="Line name" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Sub-Line / Area</label>
              <input type="text" value={newActivity.Sub_Line_Equipment} onChange={e => setNewActivity({...newActivity, Sub_Line_Equipment: e.target.value})} placeholder="Sub-area" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Component *</label>
              <input type="text" required value={newActivity.Component} onChange={e => setNewActivity({...newActivity, Component: e.target.value})} placeholder="Component name" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Frequency *</label>
              <select value={newActivity.Frequency} onChange={e => setNewActivity({...newActivity, Frequency: e.target.value})} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                {dynamicFreqs.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Activity Description *</label>
              <textarea required value={newActivity.Activity_Description} onChange={e => setNewActivity({...newActivity, Activity_Description: e.target.value})} placeholder="Describe the check to be performed..." style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', minHeight: '80px', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Document No.</label>
              <input type="text" value={newActivity.Document_Number} onChange={e => setNewActivity({...newActivity, Document_Number: e.target.value})} placeholder="DOC-000" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Revision</label>
              <input type="text" value={newActivity.Revision} onChange={e => setNewActivity({...newActivity, Revision: e.target.value})} placeholder="1.0" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsManualModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Activity</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
};

export default UploadChecklist;
