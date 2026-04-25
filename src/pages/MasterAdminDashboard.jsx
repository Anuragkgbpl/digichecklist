import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Settings, Save, RefreshCw, Building2 } from 'lucide-react';
import { useData } from '../context/DataContext';

const MasterAdminDashboard = () => {
  const { units: rawUnits, activities: rawActivities, updateFirebase } = useData();
  const [units, setUnits] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [newUnit, setNewUnit] = useState({ name: '', parentCompany: '', plantLocation: '', district: '', state: '', pincode: '', password: '' });
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');

  useEffect(() => {
    if (rawUnits && rawUnits.length > 0) {
      setUnits(rawUnits);
    } else {
      setUnits([
        { id: 'UNIT-001', name: 'Pune Manufacturing Facility', parentCompany: 'Acme Corp', state: 'Maharashtra', district: 'Pune' }
      ]);
    }

    if (rawActivities && rawActivities.length > 0) {
      setActivityTypes(rawActivities);
    } else {
      setActivityTypes([
        { id: 'ACT-01', name: 'GMP', editable: false },
        { id: 'ACT-02', name: 'Line Clearance', editable: false },
        { id: 'ACT-03', name: 'Fire Safety', editable: false },
        { id: 'ACT-04', name: 'Preventive Maintenance', editable: false }
      ]);
    }
  }, [rawUnits, rawActivities]);

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!newUnit.name || (!newUnit.password && !editingUnitId)) return alert('Name and Password are required');
    
    let updatedUnits;
    if (editingUnitId) {
      updatedUnits = units.map(u => u.id === editingUnitId ? { ...u, ...newUnit, password: newUnit.password || u.password } : u);
    } else {
      const unitToAdd = {
        ...newUnit,
        id: `UNIT-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
      };
      updatedUnits = [...units, unitToAdd];
    }
    
    await updateFirebase('units', updatedUnits);
    setIsAddingUnit(false);
    setEditingUnitId(null);
    setNewUnit({ name: '', parentCompany: '', plantLocation: '', district: '', state: '', pincode: '', password: '' });
  };

  const handleEditUnit = (unit) => {
    setNewUnit({
      name: unit.name,
      parentCompany: unit.parentCompany || '',
      plantLocation: unit.plantLocation || '',
      district: unit.district || '',
      state: unit.state || '',
      pincode: unit.pincode || '',
      password: '' // Keep empty to avoid displaying it
    });
    setEditingUnitId(unit.id);
    setIsAddingUnit(true);
  };

  const handleDeleteUnit = async (id) => {
    if (window.confirm('Are you sure you want to delete this unit?')) {
      const updated = units.filter(u => u.id !== id);
      await updateFirebase('units', updated);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivityName.trim()) return;
    const newAct = {
      id: `ACT-${Math.floor(Math.random() * 1000)}`,
      name: newActivityName.trim(),
      editable: true
    };
    const updatedActivities = [...activityTypes, newAct];
    await updateFirebase('activities', updatedActivities);
    setNewActivityName('');
    setIsAddingActivity(false);
  };

  const handleDeleteActivity = async (id) => {
    const updatedActivities = activityTypes.filter(a => a.id !== id);
    await updateFirebase('activities', updatedActivities);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>Master Administration</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage global units and configure master activity types.</p>
        </div>
        <button onClick={() => {
          setEditingUnitId(null);
          setNewUnit({ name: '', parentCompany: '', plantLocation: '', district: '', state: '', pincode: '', password: '' });
          setIsAddingUnit(true);
        }} className="btn btn-primary"><Plus size={18} /> Add New Unit</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Units */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.125rem' }}>
            <Building2Icon size={20} color="var(--primary-light)" /> 
            Registered Units
          </h3>

          {isAddingUnit && (
            <div style={{ backgroundColor: '#F8FAFC', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>{editingUnitId ? 'Edit Unit' : 'Add New Unit'}</h4>
              <form onSubmit={handleSaveUnit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Unit Name (Auto Login ID) *</label>
                  <input type="text" required value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Password {editingUnitId ? '(Leave blank to keep)' : '*'}</label>
                  <input type="password" required={!editingUnitId} value={newUnit.password} onChange={e => setNewUnit({...newUnit, password: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Parent Company</label>
                  <input type="text" value={newUnit.parentCompany} onChange={e => setNewUnit({...newUnit, parentCompany: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Plant Location</label>
                  <input type="text" value={newUnit.plantLocation} onChange={e => setNewUnit({...newUnit, plantLocation: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>State</label>
                  <input type="text" value={newUnit.state} onChange={e => setNewUnit({...newUnit, state: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>District</label>
                  <input type="text" value={newUnit.district} onChange={e => setNewUnit({...newUnit, district: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsAddingUnit(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary"><Save size={16} /> Save Unit</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Unit Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Login ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Password</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Location</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{u.parentCompany}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontFamily: 'monospace', backgroundColor: '#F1F5F9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{u.id}</span></td>
                    <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontFamily: 'monospace' }}>{u.password || '••••••••'}</span></td>
                    <td style={{ padding: '0.75rem 1rem' }}>{u.district ? `${u.district}, ${u.state}` : 'N/A'}</td>
                    <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleEditUnit(u)} title="Edit Unit"><Edit size={14} /></button>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: '#D97706' }} onClick={() => { if(window.confirm(`Reset password for ${u.name}?`)) { const updated = units.map(unit => unit.id === u.id ? {...unit, password: 'Unit@123'} : unit); setUnits(updated); localStorage.setItem('pcms_units', JSON.stringify(updated)); } }} title="Reset Password"><RefreshCw size={14} /></button>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--status-rejected)' }} onClick={() => handleDeleteUnit(u.id)} title="Delete Unit"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {units.length === 0 && (
                  <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No units found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Configurations */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.125rem' }}>
            <Settings size={20} color="var(--primary-light)" /> 
            Activity Types
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Global checklist activity types available to all units.</p>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activityTypes.map(act => (
              <li key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                <span style={{ fontWeight: 500 }}>{act.name}</span>
                {act.editable ? (
                  <button className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none', background: 'transparent' }} onClick={() => handleDeleteActivity(act.id)}><Trash2 size={16} color="var(--status-rejected)" /></button>
                ) : (
                  <Shield size={16} color="var(--status-verified)" title="System Default" />
                )}
              </li>
            ))}
          </ul>
          
          {isAddingActivity ? (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <input type="text" value={newActivityName} onChange={e => setNewActivityName(e.target.value)} placeholder="Type name..." style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }} />
              <button className="btn btn-primary" onClick={handleAddActivity}>Save</button>
              <button className="btn btn-secondary" onClick={() => setIsAddingActivity(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => setIsAddingActivity(true)} style={{ width: '100%', marginTop: '1rem', justifyContent: 'center', borderStyle: 'dashed' }}>
              <Plus size={16} /> Add Custom Type
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper icon component
const Building2Icon = ({ size, color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4" />
  </svg>
);

export default MasterAdminDashboard;
