import React, { useState } from 'react';
import { Plus, Trash2, Settings, Calendar, Clock, Repeat, Activity } from 'lucide-react';
import { useData } from '../context/DataContext';

const PREBUILT_FREQUENCIES = [
  { id: 'shift-wise', name: 'Shift-wise', type: 'Prebuilt', description: 'Triggers at assigned shift start, expires at end.' },
  { id: 'daily', name: 'Daily', type: 'Prebuilt', description: 'Starts at Shift A start (06:00 AM). Restores next day.' },
  { id: 'weekly', name: 'Weekly', type: 'Prebuilt', description: 'Every Monday at 06:00 AM.' },
  { id: 'fortnightly', name: 'Fortnightly', type: 'Prebuilt', description: '1st and 15th of each month at 06:00 AM.' },
  { id: 'monthly', name: 'Monthly', type: 'Prebuilt', description: '1st of each month at 06:00 AM.' },
  { id: 'quarterly', name: 'Quarterly', type: 'Prebuilt', description: '1st of quarter at 06:00 AM.' },
  { id: 'yearly', name: 'Yearly', type: 'Prebuilt', description: '1st of year at 06:00 AM.' },
];

export default function FrequencyMaster() {
  const { frequencies = [], shifts = [], updateFirebase } = useData();
  const [isAdding, setIsAdding] = useState(false);

  // Resolve dynamic Shift A Start Time
  const shiftMaster = React.useMemo(() => {
    const obj = {};
    shifts.forEach(s => { if (s.id) obj[s.id] = s; });
    return obj;
  }, [shifts]);

  const shiftAStart = shiftMaster['A']?.start || '06:00';
  const formatTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
  };
  const dynamicAStart = formatTime(shiftAStart);

  const prebuiltFormatted = [
    { id: 'shift-wise', name: 'Shift-wise', type: 'Prebuilt', description: 'Triggers at assigned shift start, expires at end.' },
    { id: 'daily', name: 'Daily', type: 'Prebuilt', description: `Starts at Shift A start (${dynamicAStart}). Restores next day.` },
    { id: 'weekly', name: 'Weekly', type: 'Prebuilt', description: `Every Monday at ${dynamicAStart}.` },
    { id: 'fortnightly', name: 'Fortnightly', type: 'Prebuilt', description: `1st and 15th of each month at ${dynamicAStart}.` },
    { id: 'monthly', name: 'Monthly', type: 'Prebuilt', description: `1st of each month at ${dynamicAStart}.` },
    { id: 'quarterly', name: 'Quarterly', type: 'Prebuilt', description: `1st of quarter at ${dynamicAStart}.` },
    { id: 'yearly', name: 'Yearly', type: 'Prebuilt', description: `1st of year at ${dynamicAStart}.` },
  ];

  const [newFreq, setNewFreq] = useState({
    name: '',
    type: 'Interval Based',
    value: '',
    shiftAlignment: 'A',
    correctionRule: 'Next Working Day'
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newFreq.name || !newFreq.value) {
      alert('Please fill Name and Value');
      return;
    }
    const item = { 
      ...newFreq, 
      id: 'custom_' + Date.now(), 
      isCustom: true 
    };
    await updateFirebase('frequencies', [...frequencies, item]);
    setNewFreq({ name: '', type: 'Interval Based', value: '', shiftAlignment: 'A', correctionRule: 'Next Working Day' });
    setIsAdding(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this custom frequency?')) {
      const updated = frequencies.filter(f => f.id !== id);
      await updateFirebase('frequencies', updated);
    }
  };

  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} /> Frequency Logic Configuration
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage prebuilt logics and create custom scheduling frequencies aligned to Shift Times.
          </p>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
          <Plus size={16} /> Add Custom Frequency
        </button>
      </div>

      {/* Prebuilt Table */}
      <div style={{ marginBottom: '2rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', marginTop: 0 }}>System Prebuilt Frequencies</h4>
        <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: '#F8FAFC' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Logic Description</th>
                <th style={{ padding: '0.75rem 1rem' }}>Standard Alignment</th>
              </tr>
            </thead>
            <tbody>
              {prebuiltFormatted.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--primary-dark)' }}>{f.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{f.description}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Shift A / Cycle Start</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Table */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', marginTop: 0 }}>Custom Frequencies</h4>
        {frequencies.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', border: '2px dashed #E2E8F0', borderRadius: '8px', color: 'var(--text-tertiary)' }}>
            No custom frequencies defined yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#F8FAFC' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Value / Detail</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Trigger Shift</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Holiday Rule</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {frequencies.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{f.name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#E0E7FF', color: '#4338CA', fontWeight: 600 }}>{f.type}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{f.value}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Shift {f.shiftAlignment}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{f.correctionRule}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button onClick={() => handleDelete(f.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.25rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={20} color="var(--primary-light)" /> Add Custom Frequency</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Frequency Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Every 10 Days" 
                  value={newFreq.name} 
                  onChange={e => setNewFreq({...newFreq, name: e.target.value})} 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} 
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Frequency Type</label>
                <select 
                  value={newFreq.type} 
                  onChange={e => setNewFreq({...newFreq, type: e.target.value, value: ''})} 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', width: '100%' }}>
                  <option value="Interval Based">Interval Based (Every X Days)</option>
                  <option value="Calendar Based">Calendar Based (Specific Dates)</option>
                  <option value="Usage Based">Usage Based (Threshold)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {newFreq.type === 'Interval Based' && "Enter Number of Days"}
                  {newFreq.type === 'Calendar Based' && "Comma separated Dates (e.g., 5, 15, 25)"}
                  {newFreq.type === 'Usage Based' && "Threshold (e.g., Running Hours)"}
                </label>
                <input 
                  type="text" 
                  value={newFreq.value} 
                  onChange={e => setNewFreq({...newFreq, value: e.target.value})} 
                  placeholder={newFreq.type === 'Interval Based' ? "e.g. 10" : newFreq.type === 'Usage Based' ? "e.g. 500" : "e.g. 1, 15"} 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} 
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Shift Alignment</label>
                  <select value={newFreq.shiftAlignment} onChange={e => setNewFreq({...newFreq, shiftAlignment: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                    <option value="A">Shift A (06:00)</option>
                    <option value="B">Shift B (14:00)</option>
                    <option value="C">Shift C (22:00)</option>
                    <option value="G">Shift G (09:00)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Holiday Rule</label>
                  <select value={newFreq.correctionRule} onChange={e => setNewFreq({...newFreq, correctionRule: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                    <option value="Next Working Day">Next Working Day</option>
                    <option value="Strict Day">Strict Day</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAdding(false)} className="btn" style={{ padding: '0.5rem 1rem', border: '1px solid #CBD5E1' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Save Frequency</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
