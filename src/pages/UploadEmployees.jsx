import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, AlertCircle, CheckCircle2, XCircle, Users, Download, List, Trash2, UserMinus, UserCheck, Shield, Key, RefreshCw, Save, Eye, EyeOff, Clock, ChevronDown, Settings, Info, Search } from 'lucide-react';
import { parseCSV, validateEmployees } from '../utils/csvParser';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';

const UploadEmployees = () => {
  const { employees = [], shifts: cloudShifts = [], checklists = [], updateFirebase } = useData();
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  // Login allocation tab state
  const [editingPasswords, setEditingPasswords] = useState({});
  const [showPasswords, setShowPasswords] = useState({});
  const [savedNotice, setSavedNotice] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null); // empId
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    Employee_ID: '', Employee_Name: '', Designation: '', Department: '',
    Mobile_Number: '', Shift: '', Status: 'Active', Allowed_Activity: ['ALL']
  });
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  // Dynamically fetch unique activity types from Checklist Master
  const dynamicActivities = useMemo(() => {
    if (!checklists) return [];
    return [...new Set(checklists.map(c => c.Type_of_Activity).filter(Boolean))];
  }, [checklists]);

  // Use shifts from useData or defaults
  const shiftList = useMemo(() => {
    if (cloudShifts && cloudShifts.length > 0) {
      return cloudShifts;
    }
    return [
      { id: 'A', start: '06:00', end: '14:00' },
      { id: 'B', start: '14:00', end: '22:00' },
      { id: 'C', start: '22:00', end: '06:00' },
      { id: 'G', start: '09:00', end: '18:00' }
    ];
  }, [cloudShifts]);

  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    const isExcel = selectedFile.name.match(/\.(xlsx|xls|csv)$/i);
    if (!isExcel) { alert('Please upload a valid Excel or CSV file.'); return; }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        setValidationResult(validateEmployees(data));
      } catch (error) {
        setValidationResult({ parseErrors: ['Failed to parse file. Ensure it is correctly formatted.'] });
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (!validationResult || validationResult.errors.length > 0) return;
    try {
      const withDefaults = validationResult.validData.map(emp => ({
        ...emp,
        password: emp.password || emp.Employee_ID,
        Status: emp.Status || 'Active'
      }));
      await updateFirebase('employees', [...employees, ...withDefaults]);
      setFile(null);
      setValidationResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('view');
    } catch (e) {
      alert('Upload failed: ' + e.message);
    }
  };

  const downloadTemplate = () => {
    const csv = "Employee_ID,Employee_Name,Designation,Department,Mobile_Number\nEMP-001,John Doe,Operator,Packaging,9876543210\n";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Employee_Master_Template.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleStatus = async (id) => {
    const updated = employees.map(emp =>
      emp.Employee_ID === id ? { ...emp, Status: emp.Status === 'Active' ? 'Inactive' : 'Active' } : emp
    );
    await updateFirebase('employees', updated);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employee?')) return;
    const updated = employees.filter(emp => emp.Employee_ID !== id);
    await updateFirebase('employees', updated);
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!newEmployee.Employee_ID || !newEmployee.Employee_Name || !newEmployee.Department) {
      alert('Please fill in required fields: ID, Name, and Department.');
      return;
    }
    const emp = { ...newEmployee, password: newEmployee.Employee_ID };
    await updateFirebase('employees', [...employees, emp]);
    setIsManualModalOpen(false);
    setNewEmployee({
      Employee_ID: '', Employee_Name: '', Designation: '', Department: '',
      Mobile_Number: '', Shift: '', Status: 'Active', Allowed_Activity: ['ALL']
    });
  };

  const handleSaveAllocation = async () => {
    const updated = employees.map(emp =>
      emp.Employee_ID === editingEmployee.Employee_ID ? { ...editingEmployee } : emp
    );
    await updateFirebase('employees', updated);
    setEditingEmployee(null);
  };

  // --- Login Allocation Tab helpers ---
  const handlePasswordEdit = (empId, value) => {
    setEditingPasswords(prev => ({ ...prev, [empId]: value }));
  };

  const handlePasswordSave = async (emp) => {
    const newPwd = editingPasswords[emp.Employee_ID];
    if (!newPwd || !newPwd.trim()) return;
    const updated = employees.map(e =>
      e.Employee_ID === emp.Employee_ID ? { ...e, password: newPwd.trim() } : e
    );
    await updateFirebase('employees', updated);
    setEditingPasswords(prev => {
      const copy = { ...prev };
      delete copy[emp.Employee_ID];
      return copy;
    });
    setSavedNotice(emp.Employee_ID);
    setTimeout(() => setSavedNotice(null), 2000);
  };

  const handleResetPassword = async (emp) => {
    if (!window.confirm(`Reset password for ${emp.Employee_Name} to their Employee ID (${emp.Employee_ID})?`)) return;
    const updated = employees.map(e =>
      e.Employee_ID === emp.Employee_ID ? { ...e, password: emp.Employee_ID } : e
    );
    await updateFirebase('employees', updated);
    setSavedNotice(emp.Employee_ID);
    setTimeout(() => setSavedNotice(null), 2000);
  };

  const toggleShowPassword = (empId) => {
    setShowPasswords(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  const handleUpdateShiftTiming = async (index, field, value) => {
    const currentShifts = cloudShifts && cloudShifts.length > 0 ? [...cloudShifts] : [
      { id: 'A', start: '06:00', end: '14:00' },
      { id: 'B', start: '14:00', end: '22:00' },
      { id: 'C', start: '22:00', end: '06:00' },
      { id: 'G', start: '09:00', end: '18:00' }
    ];
    currentShifts[index] = { ...currentShifts[index], [field]: value };
    await updateFirebase('shifts', currentShifts);
  };

  const handleDeleteAll = async () => {
    if (window.confirm('WARNING: Are you sure you want to delete ALL employees? This action cannot be undone.')) {
      if (window.confirm('Please confirm again. Type OK to proceed.')) {
        await updateFirebase('employees', []);
      }
    }
  };

  const tabs = [
    { id: 'upload', icon: <Upload size={16} />, label: 'Upload Employees' },
    { id: 'view', icon: <List size={16} />, label: 'View Employees' },
    { id: 'shift', icon: <Clock size={16} />, label: 'Shift Timings' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Users /> Unit Employee Master</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleDeleteAll} className="btn" style={{ padding: '0.5rem 1rem', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', fontWeight: 600 }}>
            Delete All
          </button>
          <button onClick={() => setIsManualModalOpen(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            + Add Employee
          </button>
          <button onClick={downloadTemplate} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            <Download size={16} /> Download Template
          </button>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Manage employees, upload records, and configure user login credentials.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1rem',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-light)' : 'none',
              color: activeTab === tab.id ? 'var(--primary-light)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {tab.icon} {tab.label}
          </div>
        ))}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="card">
          <div
            style={{ border: `2px dashed ${isDragging ? 'var(--primary-light)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius-lg)', padding: '3rem', textAlign: 'center', backgroundColor: isDragging ? '#EEF2FF' : 'var(--bg-color)' }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}
          >
            <Upload size={48} color="var(--primary-light)" style={{ marginBottom: '1rem' }} />
            <h3>Drag & drop your Excel/CSV file here</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{file ? `Selected: ${file.name}` : 'or click to browse from your computer'}</p>
            <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} ref={fileInputRef} onChange={(e) => processFile(e.target.files[0])} />
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>Browse Files</button>
          </div>

          {validationResult && (
            <div style={{ marginTop: '2rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Validation Report</h3>
              {validationResult.parseErrors ? (
                <div style={{ color: 'var(--status-rejected)' }}>{validationResult.parseErrors.join(', ')}</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
                    <div>Total: <strong>{validationResult.totalRows}</strong></div>
                    <div style={{ color: 'var(--status-completed)' }}>Valid: <strong>{validationResult.validData.length}</strong></div>
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
            <strong>Required Columns:</strong> Employee_ID, Employee_Name, Designation, Department, Mobile_Number
            <br /><span style={{ color: 'var(--text-secondary)' }}>Note: Default login password is set to Employee_ID upon upload.</span>
          </div>
        </div>
      )}

      {/* View Tab */}
      {activeTab === 'view' && (
        <div className="card">
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Search by ID, Name, Department or Designation..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }} 
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  {['ID', 'Name', 'Designation', 'Department', 'Mobile', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees
                  .filter(emp => {
                    const s = searchTerm.toLowerCase();
                    return !s || 
                      emp.Employee_ID?.toLowerCase().includes(s) || 
                      emp.Employee_Name?.toLowerCase().includes(s) || 
                      emp.Department?.toLowerCase().includes(s) || 
                      emp.Designation?.toLowerCase().includes(s);
                  })
                  .map((emp, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{emp.Employee_ID}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{emp.Employee_Name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{emp.Designation}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{emp.Department}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{emp.Mobile_Number}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.75rem', fontWeight: 600, backgroundColor: emp.Status === 'Active' ? '#ECFDF5' : '#FEF2F2', color: emp.Status === 'Active' ? 'var(--status-completed)' : 'var(--status-rejected)' }}>
                        {emp.Status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--primary-dark)' }} onClick={() => setEditingEmployee(emp)} title="Edit Allocation"><Shield size={14} /></button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => toggleStatus(emp.Employee_ID)} title={emp.Status === 'Active' ? 'Mark Inactive' : 'Mark Active'}>
                          {emp.Status === 'Active' ? <UserMinus size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--status-rejected)' }} onClick={() => handleDelete(emp.Employee_ID)} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No employees found. Please upload a CSV or Excel file.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shift Allocation Tab */}
      {activeTab === 'shift' && (
        <div className="card">
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={18} /> Configure Shift Master Timings</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {shiftList.map((s, idx) => (
                <div key={idx} style={{ padding: '1.5rem', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-dark)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Shift {s.id} <Clock size={18} />
                  </div>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Shift Name / Code</label>
                      <input 
                        type="text" value={s.id} 
                        onChange={e => handleUpdateShiftTiming(idx, 'id', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Start Time</label>
                      <input 
                        type="time" value={s.start} 
                        onChange={e => handleUpdateShiftTiming(idx, 'start', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>End Time</label>
                      <input 
                        type="time" value={s.end} 
                        onChange={e => handleUpdateShiftTiming(idx, 'end', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#F0F9FF', borderRadius: '12px', border: '1px solid #BAE6FD', color: '#0369A1' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Info size={20} />
              <div style={{ fontSize: '0.875rem' }}>
                <strong>Note:</strong> Shift assignments are made during Employee Upload or via the "Edit Allocation" tool in the View Employees tab.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Allocate Modal */}
      {editingEmployee && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '1rem', padding: '2rem', borderRadius: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={20} color="var(--primary-light)" /> Access Control: {editingEmployee.Employee_Name}</h3>
            
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Login ID (Fixed)</label>
                <div style={{ padding: '0.6rem 0.75rem', backgroundColor: '#F1F5F9', borderRadius: '0.5rem', fontFamily: 'monospace', fontWeight: 600 }}>{editingEmployee.Employee_ID}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Allowed Activities (Multi-Select)</label>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', backgroundColor: '#F8FAFC', borderRadius: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editingEmployee.Allowed_Activity?.includes('ALL')} onChange={(e) => {
                      const next = e.target.checked ? ['ALL'] : [];
                      setEditingEmployee({ ...editingEmployee, Allowed_Activity: next });
                    }} />
                    <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>ALL (Unrestricted)</span>
                  </label>
                  
                  {dynamicActivities.map(actName => (
                    <label key={actName} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        disabled={editingEmployee.Allowed_Activity?.includes('ALL')}
                        checked={editingEmployee.Allowed_Activity?.includes(actName)} 
                        onChange={(e) => {
                          const current = editingEmployee.Allowed_Activity || [];
                          const next = e.target.checked ? [...current, actName] : current.filter(x => x !== actName);
                          setEditingEmployee({ ...editingEmployee, Allowed_Activity: next });
                        }} 
                      />
                      <span style={{ fontSize: '0.875rem' }}>{actName}</span>
                    </label>
                  ))}
                </div>
                <small style={{ color: 'var(--text-tertiary)', marginTop: '0.5rem', display: 'block' }}>User will be able to update and execute checklists for these selected activities.</small>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setEditingEmployee(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAllocation}>Update Access</button>
            </div>
          </div>
        </div>
      )}
      {/* Manual Addition Modal */}
      {isManualModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '550px', margin: '1rem', padding: '2rem', borderRadius: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserCheck size={20} color="var(--primary-light)" /> Add New Employee</h3>
              <button onClick={() => setIsManualModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleManualAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Employee ID *</label>
                <input type="text" required value={newEmployee.Employee_ID} onChange={e => setNewEmployee({...newEmployee, Employee_ID: e.target.value})} placeholder="EMP-001" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Employee Name *</label>
                <input type="text" required value={newEmployee.Employee_Name} onChange={e => setNewEmployee({...newEmployee, Employee_Name: e.target.value})} placeholder="Full name" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Designation</label>
                <input type="text" value={newEmployee.Designation} onChange={e => setNewEmployee({...newEmployee, Designation: e.target.value})} placeholder="Role" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Department *</label>
                <input type="text" required value={newEmployee.Department} onChange={e => setNewEmployee({...newEmployee, Department: e.target.value})} placeholder="Dept" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Mobile Number</label>
                <input type="text" value={newEmployee.Mobile_Number} onChange={e => setNewEmployee({...newEmployee, Mobile_Number: e.target.value})} placeholder="Contact" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Initial Shift</label>
                <select value={newEmployee.Shift} onChange={e => setNewEmployee({...newEmployee, Shift: e.target.value})} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <option value="">No Shift</option>
                  {shiftList.map(s => (
                    <option key={s.id} value={s.id}>Shift {s.id}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsManualModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadEmployees;
