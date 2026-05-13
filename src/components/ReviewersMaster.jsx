import React, { useState, useMemo } from 'react';
import { Shield, Plus, Search, X, UserCheck, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function ReviewersMaster() {
  const { checklists = [], employees = [], reviewers = [], updateFirebase } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLine, setEditingLine] = useState(null);
  const [empSearch, setEmpSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // 1. Get all unique dynamic Line_Equipments
  const dynamicLines = useMemo(() => {
    const unique = [...new Set(checklists.map(c => c.Line_Equipment).filter(Boolean))];
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [checklists]);

  // 2. Match reviewers mapping to local state representation
  // format of firebase collection 'reviewers': Array of { id: string, line_equipment: string, reviewerIds: string[] }
  const reviewersByLine = useMemo(() => {
    const map = {};
    reviewers.forEach(r => {
      if (r.line_equipment) {
        map[r.line_equipment] = r.reviewerIds || [];
      }
    });
    return map;
  }, [reviewers]);

  // Filter lines based on top search box
  const filteredLines = useMemo(() => {
    return dynamicLines.filter(line => 
      line.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dynamicLines, searchTerm]);

  // Filter employee list for autocomplete
  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return [];
    const s = empSearch.toLowerCase();
    // Exclude already added reviewers for this editing line
    const currentAssigned = reviewersByLine[editingLine] || [];
    return employees.filter(emp => {
      const isAlreadyAssigned = currentAssigned.includes(emp.Employee_ID);
      const matches = (emp.Employee_ID?.toLowerCase().includes(s) || 
                       emp.Employee_Name?.toLowerCase().includes(s));
      return matches && !isAlreadyAssigned && emp.Status === 'Active';
    }).slice(0, 5);
  }, [employees, empSearch, editingLine, reviewersByLine]);

  // Add a reviewer
  const handleAddReviewer = async (empId) => {
    if (!editingLine) return;
    const currentAssigned = reviewersByLine[editingLine] || [];
    if (currentAssigned.includes(empId)) return;

    const updatedAssigned = [...currentAssigned, empId];
    await saveReviewersForLine(editingLine, updatedAssigned);
    setEmpSearch('');
    setShowDropdown(false);
  };

  // Remove a reviewer
  const handleRemoveReviewer = async (line, empId) => {
    const currentAssigned = reviewersByLine[line] || [];
    const updatedAssigned = currentAssigned.filter(id => id !== empId);
    await saveReviewersForLine(line, updatedAssigned);
  };

  // Utility to persist to Firebase
  const saveReviewersForLine = async (line, reviewerIds) => {
    // Find existing record in firebase collection 'reviewers'
    const existingIndex = reviewers.findIndex(r => r.line_equipment === line);
    let updatedReviewers;
    
    if (existingIndex > -1) {
      updatedReviewers = reviewers.map((r, i) => 
        i === existingIndex ? { ...r, reviewerIds } : r
      );
    } else {
      updatedReviewers = [
        ...reviewers,
        {
          id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          line_equipment: line,
          reviewerIds
        }
      ];
    }
    await updateFirebase('reviewers', updatedReviewers);
  };

  // Helper to map Emp IDs to full info
  const getEmployeeDetails = (empId) => {
    return employees.find(e => e.Employee_ID === empId) || { Employee_ID: empId, Employee_Name: 'Unknown' };
  };

  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} /> Reviewers Management
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Assign multiple reviewers against Line / Equipment. System auto-syncs from your dynamic Checklist Master.
          </p>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Search Line/Equipment..." 
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.875rem' }} 
          />
        </div>
      </div>

      {/* Lines Table */}
      <div className="card" style={{ padding: '0', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: 600, width: '30%' }}>Line / Equipment</th>
                <th style={{ padding: '1rem', fontWeight: 600, width: '50%' }}>Assigned Reviewers</th>
                <th style={{ padding: '1rem', fontWeight: 600, width: '20%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.map(line => {
                const assignedIds = reviewersByLine[line] || [];
                return (
                  <tr key={line} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
                      {line}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {assignedIds.length === 0 ? (
                        <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.8125rem' }}>
                          No reviewers assigned yet
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {assignedIds.map(id => {
                            const details = getEmployeeDetails(id);
                            return (
                              <div 
                                key={id} 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.25rem', 
                                  padding: '0.25rem 0.5rem', 
                                  backgroundColor: '#EEF2FF', 
                                  color: '#4338CA', 
                                  borderRadius: '6px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 500,
                                  border: '1px solid #C7D2FE'
                                }}
                              >
                                <span>{details.Employee_Name} ({details.Employee_ID})</span>
                                <button 
                                  onClick={() => handleRemoveReviewer(line, id)} 
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#4F46E5', 
                                    cursor: 'pointer', 
                                    padding: 0, 
                                    display: 'flex', 
                                    alignItems: 'center' 
                                  }}
                                  title="Remove"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => { setEditingLine(line); setEmpSearch(''); setShowDropdown(false); }}
                        className="btn btn-secondary" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <Plus size={14} /> Manage Reviewers
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {filteredLines.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    {searchTerm ? 'No matching Line/Equipment found.' : 'Please upload checklists to see Line / Equipment here.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      {editingLine && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={20} color="var(--primary-light)" /> Manage Reviewers
              </h3>
              <button 
                onClick={() => setEditingLine(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Line / Equipment</div>
              <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '1.05rem', marginTop: '0.15rem' }}>{editingLine}</div>
            </div>

            {/* Current Assigned In Modal */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Currently Assigned</label>
              <div style={{ minHeight: '40px', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', backgroundColor: '#FAFAFA' }}>
                {(reviewersByLine[editingLine] || []).length === 0 ? (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', fontStyle: 'italic' }}>None</div>
                ) : (
                  (reviewersByLine[editingLine] || []).map(id => {
                    const details = getEmployeeDetails(id);
                    return (
                      <div 
                        key={id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem', 
                          padding: '0.25rem 0.5rem', 
                          backgroundColor: '#E0E7FF', 
                          color: '#4338CA', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600
                        }}
                      >
                        <span>{details.Employee_Name}</span>
                        <button 
                          onClick={() => handleRemoveReviewer(editingLine, id)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 0, display: 'flex' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Search Employee (ID or Name)</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input 
                  type="text" 
                  placeholder="Type Employee ID or Name to add..." 
                  value={empSearch} 
                  onChange={e => {
                    setEmpSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem' }} 
                />
              </div>
              
              {/* Suggestions Dropdown */}
              {showDropdown && empSearch.trim() && (
                <div style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: 0, 
                  right: 0, 
                  backgroundColor: 'white', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  marginTop: '4px', 
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                  zIndex: 10,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map(emp => (
                      <div 
                        key={emp.Employee_ID} 
                        onClick={() => handleAddReviewer(emp.Employee_ID)}
                        style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', fontSize: '0.875rem' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.Employee_Name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {emp.Employee_ID} | {emp.Department}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                      No active matching employees found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button 
                onClick={() => setEditingLine(null)} 
                className="btn btn-primary" 
                style={{ padding: '0.5rem 1.5rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
