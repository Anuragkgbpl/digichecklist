import React, { useState, useMemo, useEffect } from 'react';
import { Shield, Plus, Search, X, UserCheck } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function ReviewersMaster() {
  const { checklists = [], employees = [], reviewers = [], updateFirebase } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivityType, setSelectedActivityType] = useState('');
  const [editingLine, setEditingLine] = useState(null);
  const [activeModalLevel, setActiveModalLevel] = useState('L1'); // 'L1' | 'L2' | 'L3'
  const [empSearch, setEmpSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // 1. Get all unique dynamic Activity Types
  const dynamicActivityTypes = useMemo(() => {
    const unique = [...new Set(checklists.map(c => c.Type_of_Activity).filter(Boolean))];
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [checklists]);

  // Auto-select first activity type if none selected
  useEffect(() => {
    if (dynamicActivityTypes.length > 0 && !selectedActivityType) {
      setSelectedActivityType(dynamicActivityTypes[0]);
    }
  }, [dynamicActivityTypes, selectedActivityType]);

  const activeActivityType = selectedActivityType || dynamicActivityTypes[0] || '';

  // 2. Get all unique Lines relevant specifically to the active activity type
  const dynamicLines = useMemo(() => {
    if (!activeActivityType) return [];
    const unique = [...new Set(
      checklists
        .filter(c => c.Type_of_Activity === activeActivityType)
        .map(c => c.Line_Equipment)
        .filter(Boolean)
    )];
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [checklists, activeActivityType]);

  // 3. Match reviewers mapping using compound key "activity_type|line_equipment"
  const reviewersByCombo = useMemo(() => {
    const map = {};
    reviewers.forEach(r => {
      const at = String(r.activity_type || '').trim().toLowerCase();
      const le = String(r.line_equipment || '').trim().toLowerCase();
      if (le) {
        // Store key as activity|line for specific, or just line for global fallback
        const key = at ? `${at}|${le}` : le;
        map[key] = {
          L1: r.reviewerIdsL1 || r.reviewerIds || [],
          L2: r.reviewerIdsL2 || [],
          L3: r.reviewerIdsL3 || []
        };
      }
    });
    return map;
  }, [reviewers]);

  // Utility to look up current assignments for active activity type + selected line
  const getAssignedForLine = (line) => {
    const at = activeActivityType.trim().toLowerCase();
    const le = line.trim().toLowerCase();
    // Prioritize specific combination, fallback to line-level global if specific doesn't exist
    return reviewersByCombo[`${at}|${le}`] || reviewersByCombo[le] || { L1: [], L2: [], L3: [] };
  };

  // Filter lines based on top search box
  const filteredLines = useMemo(() => {
    return dynamicLines.filter(line => 
      line.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dynamicLines, searchTerm]);

  // Filter employee list for autocomplete in modal
  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim() || !editingLine) return [];
    const s = empSearch.toLowerCase();
    const assigned = getAssignedForLine(editingLine);
    const currentAssigned = assigned[activeModalLevel] || [];
    
    return employees.filter(emp => {
      const isAlreadyAssigned = currentAssigned.includes(emp.Employee_ID);
      const matches = (emp.Employee_ID?.toLowerCase().includes(s) || 
                       emp.Employee_Name?.toLowerCase().includes(s));
      return matches && !isAlreadyAssigned && emp.Status === 'Active';
    }).slice(0, 5);
  }, [employees, empSearch, editingLine, reviewersByCombo, activeModalLevel, activeActivityType]);

  // Add a reviewer
  const handleAddReviewer = async (empId) => {
    if (!editingLine) return;
    const assigned = getAssignedForLine(editingLine);
    const currentAssigned = assigned[activeModalLevel] || [];
    if (currentAssigned.includes(empId)) return;

    const updatedAssigned = [...currentAssigned, empId];
    await saveReviewersForLine(editingLine, activeModalLevel, updatedAssigned);
    setEmpSearch('');
    setShowDropdown(false);
  };

  // Remove a reviewer
  const handleRemoveReviewer = async (line, level, empId) => {
    const assigned = getAssignedForLine(line);
    const currentAssigned = assigned[level] || [];
    const updatedAssigned = currentAssigned.filter(id => id !== empId);
    await saveReviewersForLine(line, level, updatedAssigned);
  };

  // Utility to persist to Firebase specifically for this combination
  const saveReviewersForLine = async (line, targetLevel, updatedIds) => {
    const at = activeActivityType;
    const le = line;
    
    // Find exact matching record in reviewers for BOTH activity_type and line_equipment
    const existingIndex = reviewers.findIndex(r => 
      String(r.activity_type || '').trim().toLowerCase() === at.trim().toLowerCase() && 
      String(r.line_equipment || '').trim().toLowerCase() === le.trim().toLowerCase()
    );
    
    let updatedReviewers;
    const currentRec = existingIndex > -1 ? reviewers[existingIndex] : null;
    
    // If creating fresh for this combo, pull initial mappings from global fallback (if any) to minimize disruption
    const fallbackRec = reviewers.find(r => 
      !r.activity_type && String(r.line_equipment || '').trim().toLowerCase() === le.trim().toLowerCase()
    );

    const getBaseArray = (lvl) => {
      if (currentRec) {
        if (lvl === 'L1') return currentRec.reviewerIdsL1 || currentRec.reviewerIds || [];
        if (lvl === 'L2') return currentRec.reviewerIdsL2 || [];
        if (lvl === 'L3') return currentRec.reviewerIdsL3 || [];
      }
      if (fallbackRec) {
        if (lvl === 'L1') return fallbackRec.reviewerIdsL1 || fallbackRec.reviewerIds || [];
        if (lvl === 'L2') return fallbackRec.reviewerIdsL2 || [];
        if (lvl === 'L3') return fallbackRec.reviewerIdsL3 || [];
      }
      return [];
    };

    const l1 = targetLevel === 'L1' ? updatedIds : getBaseArray('L1');
    const l2 = targetLevel === 'L2' ? updatedIds : getBaseArray('L2');
    const l3 = targetLevel === 'L3' ? updatedIds : getBaseArray('L3');
    
    const updatedObj = {
      ...(currentRec || {
        id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      }),
      activity_type: at,
      line_equipment: le,
      reviewerIdsL1: l1,
      reviewerIdsL2: l2,
      reviewerIdsL3: l3,
      reviewerIds: l1 // support legacy
    };

    if (existingIndex > -1) {
      updatedReviewers = reviewers.map((r, i) => i === existingIndex ? updatedObj : r);
    } else {
      updatedReviewers = [...reviewers, updatedObj];
    }
    await updateFirebase('reviewers', updatedReviewers);
  };

  // Helper to map Emp IDs to full info
  const getEmployeeDetails = (empId) => {
    return employees.find(e => e.Employee_ID === empId) || { Employee_ID: empId, Employee_Name: 'Unknown' };
  };

  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} /> Reviewers Management
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Assign customized reviewers per Line / Equipment under each Activity Type.
          </p>
        </div>
        
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Search Line / Equipment..." 
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.875rem' }} 
          />
        </div>
      </div>

      {/* Subnested Activity Type Horizontal Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', paddingBottom: '1px' }}>
        {dynamicActivityTypes.map(type => (
          <button
            key={type}
            onClick={() => { setSelectedActivityType(type); setEditingLine(null); }}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: activeActivityType === type ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              borderBottom: activeActivityType === type ? '3px solid var(--primary-light)' : '3px solid transparent',
              color: activeActivityType === type ? 'var(--primary-light)' : 'var(--text-secondary)',
              fontWeight: activeActivityType === type ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {type}
          </button>
        ))}
        {dynamicActivityTypes.length === 0 && (
          <div style={{ padding: '0.5rem 0', color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.85rem' }}>No activity types configured.</div>
        )}
      </div>

      {/* Lines Table */}
      <div className="card" style={{ padding: '0', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: 600, width: '22%' }}>Line / Equipment</th>
                <th style={{ padding: '1rem', fontWeight: 600, width: '22%' }}>Assigned Reviewers - L1</th>
                <th style={{ padding: '1rem', fontWeight: 600, width: '22%' }}>Assigned Reviewers - L2</th>
                <th style={{ padding: '1rem', fontWeight: 600, width: '22%' }}>Assigned Reviewers - L3</th>
                <th style={{ padding: '1rem', fontWeight: 600, width: '12%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLines.map(line => {
                const assigned = getAssignedForLine(line);
                return (
                  <tr key={line} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
                      {line}
                    </td>
                    
                    {['L1', 'L2', 'L3'].map(lvl => {
                      const assignedIds = assigned[lvl] || [];
                      return (
                        <td key={lvl} style={{ padding: '1rem' }}>
                          {assignedIds.length === 0 ? (
                            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                              None
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {assignedIds.map(id => {
                                const details = getEmployeeDetails(id);
                                return (
                                  <div 
                                    key={id} 
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'space-between',
                                      gap: '0.25rem', 
                                      padding: '0.25rem 0.5rem', 
                                      backgroundColor: lvl === 'L1' ? '#EEF2FF' : lvl === 'L2' ? '#ECFDF5' : '#FFFBEB', 
                                      color: lvl === 'L1' ? '#4338CA' : lvl === 'L2' ? '#059669' : '#B45309', 
                                      borderRadius: '4px', 
                                      fontSize: '0.72rem', 
                                      fontWeight: 500,
                                      border: `1px solid ${lvl === 'L1' ? '#C7D2FE' : lvl === 'L2' ? '#A7F3D0' : '#FDE68A'}`
                                    }}
                                  >
                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      {details.Employee_Name} ({details.Employee_ID})
                                    </span>
                                    <button 
                                      onClick={() => handleRemoveReviewer(line, lvl, id)} 
                                      style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        color: 'inherit', 
                                        cursor: 'pointer', 
                                        padding: 0, 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        opacity: 0.7
                                      }}
                                      title="Remove"
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => { setEditingLine(line); setActiveModalLevel('L1'); setEmpSearch(''); setShowDropdown(false); }}
                        className="btn btn-secondary" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <Plus size={14} /> Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {filteredLines.length === 0 && activeActivityType && (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    {searchTerm ? 'No matching Line / Equipment found.' : `No Lines configured under activity type '${activeActivityType}'.`}
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
            
            <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 650, textTransform: 'uppercase' }}>Activity Type</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', marginTop: '0.15rem' }}>{activeActivityType}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 650, textTransform: 'uppercase' }}>Line / Equipment</div>
                <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginTop: '0.15rem' }}>{editingLine}</div>
              </div>
            </div>

            {/* Tabs inside the Modal */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              {['L1', 'L2', 'L3'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => { setActiveModalLevel(lvl); setEmpSearch(''); setShowDropdown(false); }}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeModalLevel === lvl ? '3px solid var(--primary-light)' : 'none',
                    color: activeModalLevel === lvl ? 'var(--primary-light)' : 'var(--text-secondary)',
                    fontWeight: activeModalLevel === lvl ? 700 : 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Level {lvl}
                </button>
              ))}
            </div>

            {/* Current Assigned In Modal for active level */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Assigned Reviewers - {activeModalLevel}</label>
              <div style={{ minHeight: '40px', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', backgroundColor: '#FAFAFA' }}>
                {((getAssignedForLine(editingLine)[activeModalLevel]) || []).length === 0 ? (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', fontStyle: 'italic' }}>None</div>
                ) : (
                  ((getAssignedForLine(editingLine)[activeModalLevel]) || []).map(id => {
                    const details = getEmployeeDetails(id);
                    return (
                      <div 
                        key={id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem', 
                          padding: '0.25rem 0.5rem', 
                          backgroundColor: activeModalLevel === 'L1' ? '#E0E7FF' : activeModalLevel === 'L2' ? '#D1FAE5' : '#FEF3C7', 
                          color: activeModalLevel === 'L1' ? '#4338CA' : activeModalLevel === 'L2' ? '#065F46' : '#92400E', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600
                        }}
                      >
                        <span>{details.Employee_Name}</span>
                        <button 
                          onClick={() => handleRemoveReviewer(editingLine, activeModalLevel, id)} 
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
