import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Save, RefreshCw, Upload, X } from 'lucide-react';
import { useData } from '../context/DataContext';

const MasterAdminDashboard = () => {
  const { units: rawUnits, updateFirebase } = useData();
  const [units, setUnits] = useState([]);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [newUnit, setNewUnit] = useState({ name: '', parentCompany: '', plantLocation: '', district: '', state: '', logo: '', logoScale: 1, logoBorder: false, themeColor: '#10B981', unitLoginId: '', password: '' });
  const logoInputRef = useRef(null);

  const handleLogoUpload = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please select an image file (PNG, JPG, SVG etc.)');
    if (file.size > 500 * 1024) return alert('Image must be under 500 KB. Please compress it first.');
    const reader = new FileReader();
    reader.onload = (e) => setNewUnit(prev => ({ ...prev, logo: e.target.result }));
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (rawUnits && rawUnits.length > 0) {
      setUnits(rawUnits);
    } else {
      setUnits([
        { id: 'UNIT-001', name: 'Pune Manufacturing Facility', parentCompany: 'Acme Corp', plantLocation: 'Pune East', district: 'Pune', state: 'Maharashtra', logo: '', themeColor: '#10B981', unitLoginId: 'pune_admin', password: 'password123' }
      ]);
    }
  }, [rawUnits]);

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!newUnit.name || !newUnit.unitLoginId || (!newUnit.password && !editingUnitId)) {
      return alert('Unit Name, Login ID, and Password are required');
    }
    
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
    setNewUnit({ name: '', parentCompany: '', plantLocation: '', district: '', state: '', logo: '', logoScale: 1, logoBorder: false, themeColor: '#10B981', unitLoginId: '', password: '' });
  };

  const handleEditUnit = (unit) => {
    setNewUnit({
      name: unit.name || '',
      parentCompany: unit.parentCompany || '',
      plantLocation: unit.plantLocation || '',
      district: unit.district || '',
      state: unit.state || '',
      logo: unit.logo || '',
      logoScale: unit.logoScale || 1,
      logoBorder: unit.logoBorder || false,
      themeColor: unit.themeColor || '#10B981',
      unitLoginId: unit.unitLoginId || unit.id || '', // Fallback to id if login id not set
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>Master Administration</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage global units.</p>
        </div>
        <button onClick={() => {
          setEditingUnitId(null);
          setNewUnit({ name: '', parentCompany: '', plantLocation: '', district: '', state: '', logo: '', logoScale: 1, logoBorder: false, themeColor: '#10B981', unitLoginId: '', password: '' });
          setIsAddingUnit(true);
        }} className="btn btn-primary"><Plus size={18} /> Add New Unit</button>
      </div>

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
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Unit Name *</label>
                <input type="text" required value={newUnit.name} onChange={e => setNewUnit({...newUnit, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Unit Login ID *</label>
                <input type="text" required value={newUnit.unitLoginId} onChange={e => setNewUnit({...newUnit, unitLoginId: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Password {editingUnitId ? '(Leave blank to keep)' : '*'}</label>
                <input type="password" required={!editingUnitId} value={newUnit.password} onChange={e => setNewUnit({...newUnit, password: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Unit Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', backgroundColor: '#F8FAFC' }}>
                  {newUnit.logo ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={newUnit.logo} alt="Logo preview" style={{ height: '64px', maxWidth: '160px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: '#fff', padding: '4px' }} />
                      <button type="button" onClick={() => setNewUnit(prev => ({ ...prev, logo: '' }))} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#EF4444', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><X size={12} /></button>
                    </div>
                  ) : (
                    <div style={{ width: '64px', height: '64px', backgroundColor: '#E2E8F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.65rem', textAlign: 'center' }}>No Logo</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Upload size={14} /> {newUnit.logo ? 'Replace Image' : 'Upload Logo'}
                    </button>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>PNG, JPG, SVG — max 500 KB. Stored as Base64.</div>
                    <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleLogoUpload(e.target.files[0])} />
                  </div>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Theme Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="color" value={newUnit.themeColor} onChange={e => setNewUnit({...newUnit, themeColor: e.target.value})} style={{ width: '40px', height: '36px', padding: '0', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }} />
                  <input type="text" value={newUnit.themeColor} onChange={e => setNewUnit({...newUnit, themeColor: e.target.value})} style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxSizing: 'border-box' }} placeholder="#10B981" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Logo Scaling ({newUnit.logoScale}x)</label>
                  <input type="range" min="0.5" max="2" step="0.1" value={newUnit.logoScale} onChange={e => setNewUnit({...newUnit, logoScale: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '36px' }}>
                  <input type="checkbox" id="logoBorder" checked={newUnit.logoBorder} onChange={e => setNewUnit({...newUnit, logoBorder: e.target.checked})} />
                  <label htmlFor="logoBorder" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Show Border</label>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Parent Company</label>
                <input type="text" value={newUnit.parentCompany} onChange={e => setNewUnit({...newUnit, parentCompany: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Plant Location</label>
                <input type="text" value={newUnit.plantLocation} onChange={e => setNewUnit({...newUnit, plantLocation: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>State</label>
                <input type="text" value={newUnit.state} onChange={e => setNewUnit({...newUnit, state: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>District</label>
                <input type="text" value={newUnit.district} onChange={e => setNewUnit({...newUnit, district: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', boxSizing: 'border-box' }} />
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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Logo</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Unit Name</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Login ID</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Location</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {u.logo ? (
                      <img src={u.logo} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', backgroundColor: '#E2E8F0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#64748B' }}>No Logo</div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{u.parentCompany}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontFamily: 'monospace', backgroundColor: '#F1F5F9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{u.unitLoginId || u.id}</span></td>
                  <td style={{ padding: '0.75rem 1rem' }}>{u.district ? `${u.district}, ${u.state}` : 'N/A'}</td>
                  <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleEditUnit(u)} title="Edit Unit"><Edit size={14} /></button>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: '#D97706' }} onClick={() => { if(window.confirm(`Reset password for ${u.name}?`)) { const updated = units.map(unit => unit.id === u.id ? {...unit, password: 'Unit@123'} : unit); setUnits(updated); updateFirebase('units', updated); } }} title="Reset Password"><RefreshCw size={14} /></button>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: 'var(--status-rejected)' }} onClick={() => handleDeleteUnit(u.id)} title="Delete Unit"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No units found.</td></tr>
              )}
            </tbody>
          </table>
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

