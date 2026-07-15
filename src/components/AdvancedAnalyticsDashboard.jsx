import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, Clock, CheckCircle, AlertTriangle, ShieldCheck, Users, 
  Layers, Activity, FileClock, Search, Calendar, Zap, Map, Settings,
  ChevronUp, ChevronDown, Filter, RefreshCw, Award, Shield, ClipboardList
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  ScatterChart, ZAxis, Scatter, ComposedChart
} from 'recharts';
import { useData } from '../context/DataContext';
import { getProductionDate, getFrequencyPeriodRange, getCurrentShift } from '../utils/shiftUtils';
import AllInOneOperationsMatrix from './AllInOneOperationsMatrix';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
const STATUS_COLORS = { Done: '#10B981', WIP: '#3B82F6', Hold: '#F59E0B', Overdue: '#EF4444', Pending: '#94A3B8' };

// Helper Component for Shuffling Frequency Trend Line Graphs (Extracted to Top Level to prevent re-creation cycles)
const DynamicDimensionTrend = ({ title, pivotKey, icon: Icon, submissions, checklists }) => {
  const [filterActType, setFilterActType] = useState('ALL');
  const [trendDays, setTrendDays] = useState(7);
  const [activeFreq, setActiveFreq] = useState('ALL');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSubLine, setFilterSubLine] = useState('ALL');
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showLocalFilters, setShowLocalFilters] = useState(true);

  const actTypes = useMemo(() => [...new Set(submissions.map(s => s.Type_of_Activity).filter(Boolean))].sort(), [submissions]);
  const lines = useMemo(() => [...new Set(submissions.filter(s => filterActType === 'ALL' || s.Type_of_Activity === filterActType).map(s => s.Line_Equipment).filter(Boolean))].sort(), [submissions, filterActType]);
  const subLines = useMemo(() => [...new Set(submissions.filter(s => (filterActType === 'ALL' || s.Type_of_Activity === filterActType) && (filterLine === 'ALL' || s.Line_Equipment === filterLine)).map(s => s.Sub_Line_Equipment).filter(Boolean))].sort(), [submissions, filterActType, filterLine]);
  const components = useMemo(() => [...new Set(submissions.filter(s => (filterActType === 'ALL' || s.Type_of_Activity === filterActType) && (filterLine === 'ALL' || s.Line_Equipment === filterLine) && (filterSubLine === 'ALL' || s.Sub_Line_Equipment === filterSubLine)).map(s => s.Component).filter(Boolean))].sort(), [submissions, filterActType, filterLine, filterSubLine]);
  const freqs = useMemo(() => {
    return [...new Set([
      'Daily', 'Shift-wise', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly',
      ...submissions.map(s => s.Frequency),
      ...(checklists || []).map(c => c.Frequency)
    ].filter(Boolean))].sort();
  }, [submissions, checklists]);

  useEffect(() => { if(filterLine !== 'ALL' && !lines.includes(filterLine)) setFilterLine('ALL'); }, [lines, filterLine]);
  useEffect(() => { if(filterSubLine !== 'ALL' && !subLines.includes(filterSubLine)) setFilterSubLine('ALL'); }, [subLines, filterSubLine]);
  useEffect(() => { if(filterComponent !== 'ALL' && !components.includes(filterComponent)) setFilterComponent('ALL'); }, [components, filterComponent]);

  const trend = useMemo(() => {
    const dates = Array.from({ length: trendDays }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - ((trendDays - 1) - i));
      return d.toISOString().split('T')[0];
    });

    let source = submissions;
    
    if (filterActType !== 'ALL') source = source.filter(s => s.Type_of_Activity === filterActType);
    if (activeFreq && activeFreq !== 'ALL') source = source.filter(s => String(s.Frequency || '').trim().toLowerCase() === activeFreq.trim().toLowerCase());
    if (filterLine !== 'ALL') source = source.filter(s => s.Line_Equipment === filterLine);
    if (filterSubLine !== 'ALL') source = source.filter(s => s.Sub_Line_Equipment === filterSubLine);
    if (filterComponent !== 'ALL') source = source.filter(s => s.Component === filterComponent);
    if (filterStatus && filterStatus !== 'ALL') source = source.filter(s => s.Status === filterStatus);

    const counts = {};
    source.forEach(s => {
      const val = s[pivotKey];
      if (val && val !== '-' && val !== 'Unknown') counts[val] = (counts[val] || 0) + 1;
    });
    const topEntities = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);

    const chartData = dates.map(dt => {
      const dayLogs = source.filter(s => {
        const checkDate = (s.Date_Timestamp || s.Date || '').split('T')[0];
        return checkDate === dt;
      });
      const label = dt.split('-').reverse().slice(0, 2).join('/');
      const row = { name: label, fullDate: dt };
      
      topEntities.forEach(ent => {
        if (filterStatus && filterStatus !== 'ALL') {
          row[ent] = dayLogs.filter(l => l[pivotKey] === ent).length;
        } else {
          row[ent] = dayLogs.filter(l => l[pivotKey] === ent && (l.Status === 'Done' || l.Status === 'OK')).length;
        }
      });
      return row;
    });

    return { chartData, topEntities };
  }, [filterActType, activeFreq, trendDays, filterLine, filterSubLine, filterComponent, filterStatus, submissions, pivotKey]);

  const localSelectStyle = { 
    width: '100%', 
    padding: '0.45rem 0.6rem', 
    borderRadius: '8px', 
    border: '1px solid #CBD5E1', 
    fontSize: '0.75rem', 
    color: '#1E293B', 
    backgroundColor: '#FFF', 
    outline: 'none',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  };

  return (
    <div className="card" style={{ minHeight: '440px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
            <div style={{ padding: '0.4rem', backgroundColor: '#EEF2FF', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              {Icon && <Icon size={20} color="#6366F1" />}
            </div>
            {title}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => setShowLocalFilters(!showLocalFilters)} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid #6366F1',
                backgroundColor: showLocalFilters ? '#6366F1' : '#FFF',
                color: showLocalFilters ? '#FFF' : '#6366F1',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Filter size={13} /> {showLocalFilters ? 'Hide In-Graph Filters' : 'Layout Filters'}
              {showLocalFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button 
              onClick={() => {
                setFilterActType('ALL');
                setTrendDays(7);
                setActiveFreq('ALL');
                setFilterLine('ALL');
                setFilterSubLine('ALL');
                setFilterComponent('ALL');
                setFilterStatus('ALL');
              }} 
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                color: '#475569',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>

        {showLocalFilters && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: '#EEF2FF',
            borderRadius: '12px',
            border: '1px solid #E0E7FF',
            marginTop: '0.5rem'
          }}>
            {/* 1. Activity Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', marginBottom: '0.3rem' }}>1. Activity Type</label>
              <select value={filterActType} onChange={e => setFilterActType(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Activity Types</option>
                {actTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* 2. Trend Duration */}
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', marginBottom: '0.3rem' }}>2. Trend Duration</label>
              <select value={trendDays} onChange={e => setTrendDays(Number(e.target.value))} style={localSelectStyle}>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>

            {/* 3. Frequency */}
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', marginBottom: '0.3rem' }}>3. Frequency</label>
              <select value={activeFreq} onChange={e => setActiveFreq(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Frequencies</option>
                {freqs.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* 4. Line Equipment */}
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', marginBottom: '0.3rem' }}>4. Line Equipment</label>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Lines</option>
                {lines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* 5. Sub Line */}
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', marginBottom: '0.3rem' }}>5. Sub Line</label>
              <select value={filterSubLine} onChange={e => setFilterSubLine(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Sub-Lines</option>
                {subLines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* 6. Component */}
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', marginBottom: '0.3rem' }}>6. Component</label>
              <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Components</option>
                {components.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Statuses</option>
                {[...new Set([
                  'Done', 'WIP', 'Hold', 'Pending', 'Support Required', 'Support',
                  ...submissions.map(d => d.Status)
                ].filter(Boolean))].map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
      
      {trend.topEntities.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.85rem', fontStyle: 'italic', minHeight: '220px' }}>
          No trend data matched for selected criteria. Adjust filters to view completion performance.
        </div>
      ) : (
        <div style={{ height: '280px', width: '100%', marginTop: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend.chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <defs>
                {trend.topEntities.map((ent, i) => (
                  <linearGradient key={`grad-${i}`} id={`gradLevel4-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ backgroundColor: '#0F172A', color: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', border: '1px solid #334155' }}>
                      <div style={{ fontWeight: 800, marginBottom: '0.4rem', borderBottom: '1px solid #334155', paddingBottom: '0.3rem', color: '#38BDF8' }}>Date: {label}</div>
                      {payload.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', margin: '0.2rem 0', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#E2E8F0' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color, display: 'inline-block' }} />
                            {p.name}:
                          </span>
                          <strong style={{ color: p.color, fontSize: '0.8rem' }}>{p.value} Done</strong>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '15px' }} />
              {trend.topEntities.map((ent, i) => (
                <Area key={ent} type="monotone" dataKey={ent} stroke={COLORS[i % COLORS.length]} fill={`url(#gradLevel4-${i})`} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#FFF' }} activeDot={{ r: 6, strokeWidth: 0, fill: COLORS[i % COLORS.length] }} name={ent} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const Section4DocReadiness = ({ submissions, checklists }) => {
  const [filterActType, setFilterActType] = useState('ALL');
  const [trendDays, setTrendDays] = useState(7);
  const [activeFreq, setActiveFreq] = useState('ALL');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSubLine, setFilterSubLine] = useState('ALL');
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showLocalFilters, setShowLocalFilters] = useState(true);

  const actTypes = useMemo(() => [...new Set(submissions.map(s => s.Type_of_Activity).filter(Boolean))].sort(), [submissions]);
  const lines = useMemo(() => [...new Set(submissions.filter(s => filterActType === 'ALL' || s.Type_of_Activity === filterActType).map(s => s.Line_Equipment).filter(Boolean))].sort(), [submissions, filterActType]);
  const subLines = useMemo(() => [...new Set(submissions.filter(s => (filterActType === 'ALL' || s.Type_of_Activity === filterActType) && (filterLine === 'ALL' || s.Line_Equipment === filterLine)).map(s => s.Sub_Line_Equipment).filter(Boolean))].sort(), [submissions, filterActType, filterLine]);
  const components = useMemo(() => [...new Set(submissions.filter(s => (filterActType === 'ALL' || s.Type_of_Activity === filterActType) && (filterLine === 'ALL' || s.Line_Equipment === filterLine) && (filterSubLine === 'ALL' || s.Sub_Line_Equipment === filterSubLine)).map(s => s.Component).filter(Boolean))].sort(), [submissions, filterActType, filterLine, filterSubLine]);
  const freqs = useMemo(() => [...new Set([...submissions.map(s => s.Frequency), ...(checklists || []).map(c => c.Frequency)].filter(Boolean))].sort(), [submissions, checklists]);

  const docCompliance = useMemo(() => {
    let source = submissions;
    if (filterActType !== 'ALL') source = source.filter(s => s.Type_of_Activity === filterActType);
    if (activeFreq && activeFreq !== 'ALL') source = source.filter(s => String(s.Frequency || '').trim().toLowerCase() === activeFreq.trim().toLowerCase());
    if (filterLine !== 'ALL') source = source.filter(s => s.Line_Equipment === filterLine);
    if (filterSubLine !== 'ALL') source = source.filter(s => s.Sub_Line_Equipment === filterSubLine);
    if (filterComponent !== 'ALL') source = source.filter(s => s.Component === filterComponent);
    if (filterStatus && filterStatus !== 'ALL') source = source.filter(s => s.Status === filterStatus);
    if (trendDays !== 9999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - trendDays);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      source = source.filter(s => (s.Date_Timestamp || s.Date || '').split('T')[0] >= cutoffStr);
    }

    const docs = [...new Set(source.map(s => s.Document_Number).filter(d => d && d !== '-'))];
    return docs.slice(0, 10).map(d => {
      const logs = source.filter(s => s.Document_Number === d);
      const sample = logs[0] || {};
      const rev = sample.Revision_Number || sample.Rev || sample.Revision || '0';
      const done = logs.filter(s => s.Status === 'Done' || s.Status === 'OK').length;
      return {
        doc: `${d} (Rev:${rev})`,
        rawDoc: d,
        rev: rev,
        rate: logs.length > 0 ? Math.round((done / logs.length) * 100) : 0,
        done,
        total: logs.length
      };
    });
  }, [submissions, filterActType, activeFreq, filterLine, filterSubLine, filterComponent, filterStatus, trendDays]);

  const localSelectStyle = { width: '100%', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.75rem', color: '#1E293B', backgroundColor: '#FFF', outline: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };

  return (
    <div className="card" style={{ minHeight: '440px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
            <div style={{ padding: '0.4rem', backgroundColor: '#EEF2FF', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <ShieldCheck size={20} color="#10B981" />
            </div>
            Section 4: Document / SOP Wise Audit Readiness (Effectiveness & Revision Tracking)
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowLocalFilters(!showLocalFilters)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px', border: '1px solid #10B981', backgroundColor: showLocalFilters ? '#10B981' : '#FFF', color: showLocalFilters ? '#FFF' : '#10B981', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <Filter size={13} /> {showLocalFilters ? 'Hide In-Graph Filters' : 'Layout Filters'}
              {showLocalFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button
              onClick={() => { setFilterActType('ALL'); setTrendDays(7); setActiveFreq('ALL'); setFilterLine('ALL'); setFilterSubLine('ALL'); setFilterComponent('ALL'); setFilterStatus('ALL'); }}
              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '0.4rem 0.75rem', borderRadius: '8px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Reset Filters
            </button>
          </div>
        </div>

        {showLocalFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', padding: '1rem', backgroundColor: '#ECFDF5', borderRadius: '12px', border: '1px solid #D1FAE5', marginTop: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '0.3rem' }}>1. Activity Type</label>
              <select value={filterActType} onChange={e => setFilterActType(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Activity Types</option>
                {actTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '0.3rem' }}>2. Trend Duration</label>
              <select value={trendDays} onChange={e => setTrendDays(Number(e.target.value))} style={localSelectStyle}>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
                <option value={9999}>All Time</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '0.3rem' }}>3. Frequency</label>
              <select value={activeFreq} onChange={e => setActiveFreq(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Frequencies</option>
                {freqs.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '0.3rem' }}>4. Line Equipment</label>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Lines</option>
                {lines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '0.3rem' }}>5. Sub Line</label>
              <select value={filterSubLine} onChange={e => setFilterSubLine(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Sub-Lines</option>
                {subLines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '0.3rem' }}>6. Component</label>
              <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Components</option>
                {components.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: '0.3rem' }}>7. Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Statuses</option>
                {[...new Set(['Done', 'WIP', 'Hold', 'Pending', 'Support Required', ...submissions.map(d => d.Status)].filter(Boolean))].map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {docCompliance.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.85rem', fontStyle: 'italic', minHeight: '220px' }}>
          No document compliance records found for selected criteria.
        </div>
      ) : (
        <div style={{ height: '280px', width: '100%', marginTop: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={docCompliance} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="doc" fontSize={10} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} angle={-15} textAnchor="end" height={50} />
              <YAxis fontSize={11} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{ backgroundColor: '#1E293B', color: '#FFF', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div style={{ fontWeight: 800, marginBottom: '0.3rem', color: '#38BDF8' }}>Doc: {data.rawDoc}</div>
                      <div>Revision Number: <strong style={{ color: '#FCE7F3' }}>Rev {data.rev}</strong></div>
                      <div style={{ marginTop: '0.4rem', borderTop: '1px solid #334155', paddingTop: '0.4rem' }}>
                        Effectiveness Rate: <strong style={{ color: data.rate >= 80 ? '#4ADE80' : '#F87171' }}>{data.rate}%</strong>
                      </div>
                      <div style={{ color: '#94A3B8', fontSize: '0.7rem' }}>Completed: {data.done} / {data.total} checks</div>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={45}>
                {docCompliance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.rate >= 85 ? '#10B981' : entry.rate >= 70 ? '#3B82F6' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const Section5PeakExecutionHours = ({ submissions, checklists, employees = [] }) => {
  const [filterActType, setFilterActType] = useState('ALL');
  const [trendDays, setTrendDays] = useState(7);
  const [activeFreq, setActiveFreq] = useState('ALL');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSubLine, setFilterSubLine] = useState('ALL');
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterUsername, setFilterUsername] = useState('');
  const [showLocalFilters, setShowLocalFilters] = useState(true);

  const actTypes = useMemo(() => [...new Set(submissions.map(s => s.Type_of_Activity).filter(Boolean))].sort(), [submissions]);
  const lines = useMemo(() => [...new Set(submissions.filter(s => filterActType === 'ALL' || s.Type_of_Activity === filterActType).map(s => s.Line_Equipment).filter(Boolean))].sort(), [submissions, filterActType]);
  const subLines = useMemo(() => [...new Set(submissions.filter(s => (filterActType === 'ALL' || s.Type_of_Activity === filterActType) && (filterLine === 'ALL' || s.Line_Equipment === filterLine)).map(s => s.Sub_Line_Equipment).filter(Boolean))].sort(), [submissions, filterActType, filterLine]);
  const components = useMemo(() => [...new Set(submissions.filter(s => (filterActType === 'ALL' || s.Type_of_Activity === filterActType) && (filterLine === 'ALL' || s.Line_Equipment === filterLine) && (filterSubLine === 'ALL' || s.Sub_Line_Equipment === filterSubLine)).map(s => s.Component).filter(Boolean))].sort(), [submissions, filterActType, filterLine, filterSubLine]);
  const freqs = useMemo(() => [...new Set([...submissions.map(s => s.Frequency), ...(checklists || []).map(c => c.Frequency)].filter(Boolean))].sort(), [submissions, checklists]);
  const departments = useMemo(() => [...new Set([...employees.map(e => e.Department || e.department), ...submissions.map(s => s.Department)].filter(d => d && d !== '-' && d !== 'Unknown'))].sort(), [employees, submissions]);

  const computedHourlyPeak = useMemo(() => {
    let source = submissions;
    if (filterActType !== 'ALL') source = source.filter(s => s.Type_of_Activity === filterActType);
    if (activeFreq && activeFreq !== 'ALL') source = source.filter(s => String(s.Frequency || '').trim().toLowerCase() === activeFreq.trim().toLowerCase());
    if (filterLine !== 'ALL') source = source.filter(s => s.Line_Equipment === filterLine);
    if (filterSubLine !== 'ALL') source = source.filter(s => s.Sub_Line_Equipment === filterSubLine);
    if (filterComponent !== 'ALL') source = source.filter(s => s.Component === filterComponent);
    if (filterStatus && filterStatus !== 'ALL') source = source.filter(s => s.Status === filterStatus);
    if (trendDays !== 9999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - trendDays);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      source = source.filter(s => (s.Date_Timestamp || s.Date || '').split('T')[0] >= cutoffStr);
    }
    if (filterDepartment !== 'ALL') {
      source = source.filter(s => {
        let dept = s.Department;
        if (!dept || dept === '-' || dept === 'Unknown') {
          let u = s.Submitted_By || '';
          const match = u.match(/\((.*?)\)/);
          if (match) {
            const emp = employees.find(e => String(e.Employee_ID) === String(match[1].trim()));
            if (emp) dept = emp.Department || emp.department;
          }
        }
        return dept === filterDepartment;
      });
    }
    if (filterUsername.trim() !== '') {
      const q = filterUsername.trim().toLowerCase();
      source = source.filter(s => (s.Submitted_By || '').toLowerCase().includes(q));
    }

    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, count: 0 }));
    source.forEach(r => {
      const rawTS = r.Date_Timestamp || r.timestamp || r.Date;
      if (rawTS) {
        const parsed = new Date(rawTS);
        if (!isNaN(parsed.getTime())) {
          const h = parsed.getHours();
          if (h >= 0 && h < 24) hours[h].count++;
        }
      }
    });
    return hours;
  }, [submissions, filterActType, activeFreq, filterLine, filterSubLine, filterComponent, filterStatus, trendDays, filterDepartment, filterUsername, employees]);

  const localSelectStyle = { width: '100%', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.75rem', color: '#1E293B', backgroundColor: '#FFF', outline: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };

  return (
    <div className="card" style={{ minHeight: '440px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
            <div style={{ padding: '0.4rem', backgroundColor: '#F3E8FF', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <Clock size={20} color="#8B5CF6" />
            </div>
            Section 5: Peak Execution Hours (Time Distribution)
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowLocalFilters(!showLocalFilters)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px', border: '1px solid #8B5CF6', backgroundColor: showLocalFilters ? '#8B5CF6' : '#FFF', color: showLocalFilters ? '#FFF' : '#8B5CF6', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <Filter size={13} /> {showLocalFilters ? 'Hide In-Graph Filters' : 'Layout Filters'}
              {showLocalFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button
              onClick={() => { setFilterActType('ALL'); setTrendDays(7); setActiveFreq('ALL'); setFilterLine('ALL'); setFilterSubLine('ALL'); setFilterComponent('ALL'); setFilterStatus('ALL'); setFilterDepartment('ALL'); setFilterUsername(''); }}
              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '0.4rem 0.75rem', borderRadius: '8px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Reset Filters
            </button>
          </div>
        </div>

        {showLocalFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', padding: '1rem', backgroundColor: '#FAF5FF', borderRadius: '12px', border: '1px solid #E9D5FF', marginTop: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>1. Activity Type</label>
              <select value={filterActType} onChange={e => setFilterActType(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Activity Types</option>
                {actTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>2. Trend Duration</label>
              <select value={trendDays} onChange={e => setTrendDays(Number(e.target.value))} style={localSelectStyle}>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
                <option value={9999}>All Time</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>3. Frequency</label>
              <select value={activeFreq} onChange={e => setActiveFreq(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Frequencies</option>
                {freqs.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>4. Line Equipment</label>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Lines</option>
                {lines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>5. Sub Line</label>
              <select value={filterSubLine} onChange={e => setFilterSubLine(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Sub-Lines</option>
                {subLines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>6. Component</label>
              <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Components</option>
                {components.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>7. Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Statuses</option>
                {[...new Set(['Done', 'WIP', 'Hold', 'Pending', 'Support Required', ...submissions.map(d => d.Status)].filter(Boolean))].map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>8. Department</label>
              <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>9. User Search</label>
              <input
                type="text"
                placeholder="Search & type user..."
                value={filterUsername}
                onChange={e => setFilterUsername(e.target.value)}
                style={{ ...localSelectStyle, padding: '0.42rem 0.6rem' }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ height: '280px', width: '100%', marginTop: 'auto' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={computedHourlyPeak} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="colorHourPeakAdvSection5" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="hour" fontSize={11} axisLine={false} tickLine={false} />
            <YAxis fontSize={11} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorHourPeakAdvSection5)" name="Submissions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Section6TopPerformers = ({ submissions, checklists, employees = [] }) => {
  const [filterActType, setFilterActType] = useState('ALL');
  const [trendDays, setTrendDays] = useState(7);
  const [activeFreq, setActiveFreq] = useState('ALL');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSubLine, setFilterSubLine] = useState('ALL');
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterUsername, setFilterUsername] = useState('');
  const [showLocalFilters, setShowLocalFilters] = useState(true);

  const actTypes = useMemo(() => [...new Set(submissions.map(s => s.Type_of_Activity).filter(Boolean))].sort(), [submissions]);
  const lines = useMemo(() => [...new Set(submissions.filter(s => filterActType === 'ALL' || s.Type_of_Activity === filterActType).map(s => s.Line_Equipment).filter(Boolean))].sort(), [submissions, filterActType]);
  const subLines = useMemo(() => [...new Set(submissions.filter(s => (filterActType === 'ALL' || s.Type_of_Activity === filterActType) && (filterLine === 'ALL' || s.Line_Equipment === filterLine)).map(s => s.Sub_Line_Equipment).filter(Boolean))].sort(), [submissions, filterActType, filterLine]);
  const components = useMemo(() => [...new Set(submissions.filter(s => (filterActType === 'ALL' || s.Type_of_Activity === filterActType) && (filterLine === 'ALL' || s.Line_Equipment === filterLine) && (filterSubLine === 'ALL' || s.Sub_Line_Equipment === filterSubLine)).map(s => s.Component).filter(Boolean))].sort(), [submissions, filterActType, filterLine, filterSubLine]);
  const freqs = useMemo(() => [...new Set([...submissions.map(s => s.Frequency), ...(checklists || []).map(c => c.Frequency)].filter(Boolean))].sort(), [submissions, checklists]);
  const departments = useMemo(() => [...new Set([...employees.map(e => e.Department || e.department), ...submissions.map(s => s.Department)].filter(d => d && d !== '-' && d !== 'Unknown'))].sort(), [employees, submissions]);

  const userStats = useMemo(() => {
    let source = submissions;
    if (filterActType !== 'ALL') source = source.filter(s => s.Type_of_Activity === filterActType);
    if (activeFreq && activeFreq !== 'ALL') source = source.filter(s => String(s.Frequency || '').trim().toLowerCase() === activeFreq.trim().toLowerCase());
    if (filterLine !== 'ALL') source = source.filter(s => s.Line_Equipment === filterLine);
    if (filterSubLine !== 'ALL') source = source.filter(s => s.Sub_Line_Equipment === filterSubLine);
    if (filterComponent !== 'ALL') source = source.filter(s => s.Component === filterComponent);
    if (filterStatus && filterStatus !== 'ALL') source = source.filter(s => s.Status === filterStatus);
    if (trendDays !== 9999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - trendDays);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      source = source.filter(s => (s.Date_Timestamp || s.Date || '').split('T')[0] >= cutoffStr);
    }
    if (filterDepartment !== 'ALL') {
      source = source.filter(s => {
        let dept = s.Department;
        if (!dept || dept === '-' || dept === 'Unknown') {
          let u = s.Submitted_By || '';
          const match = u.match(/\((.*?)\)/);
          if (match) {
            const emp = employees.find(e => String(e.Employee_ID) === String(match[1].trim()));
            if (emp) dept = emp.Department || emp.department;
          }
        }
        return dept === filterDepartment;
      });
    }
    if (filterUsername.trim() !== '') {
      const q = filterUsername.trim().toLowerCase();
      source = source.filter(s => (s.Submitted_By || '').toLowerCase().includes(q));
    }

    const map = {};
    source.forEach(s => {
      let u = s.Submitted_By || '';
      u = u.trim();
      if (!u || u === '()') u = 'System/Anon';

      if (!map[u]) {
        let name = '';
        let empId = '';
        const match = u.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          name = match[1].trim();
          empId = match[2].trim();
        } else {
          name = u;
        }

        if (!name && empId) {
          const empRecord = employees.find(e => String(e.Employee_ID) === String(empId));
          if (empRecord && empRecord.Employee_Name) {
            name = empRecord.Employee_Name;
          } else {
            name = `Employee ID: ${empId}`;
          }
        }
        if (!name) name = 'System/Anon';

        let department = 'Operations';
        if (empId) {
          const empRecord = employees.find(e => String(e.Employee_ID) === String(empId));
          if (empRecord && (empRecord.Department || empRecord.department)) {
            department = empRecord.Department || empRecord.department;
          }
        }
        if (department === 'Operations' && name) {
          const empRecord = employees.find(e => String(e.Employee_Name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase());
          if (empRecord && (empRecord.Department || empRecord.department)) {
            department = empRecord.Department || empRecord.department;
          }
        }
        if (s.Department && s.Department !== '-' && s.Department !== 'Unknown') department = s.Department;

        map[u] = { name, department, completed: 0, total: 0 };
      }

      map[u].total++;
      if (s.Status === 'Done' || s.Status === 'OK') map[u].completed++;
    });
    return Object.values(map).sort((a, b) => b.completed - a.completed).slice(0, 20);
  }, [submissions, filterActType, activeFreq, filterLine, filterSubLine, filterComponent, filterStatus, trendDays, filterDepartment, filterUsername, employees]);

  const localSelectStyle = { width: '100%', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.75rem', color: '#1E293B', backgroundColor: '#FFF', outline: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };

  return (
    <div className="card" style={{ minHeight: '440px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
            <div style={{ padding: '0.4rem', backgroundColor: '#DCFCE7', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <Users size={20} color="#10B981" />
            </div>
            Section 6: Top Performers Productivity Table
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowLocalFilters(!showLocalFilters)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px', border: '1px solid #10B981', backgroundColor: showLocalFilters ? '#10B981' : '#FFF', color: showLocalFilters ? '#FFF' : '#10B981', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <Filter size={13} /> {showLocalFilters ? 'Hide In-Graph Filters' : 'Layout Filters'}
              {showLocalFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button
              onClick={() => { setFilterActType('ALL'); setTrendDays(7); setActiveFreq('ALL'); setFilterLine('ALL'); setFilterSubLine('ALL'); setFilterComponent('ALL'); setFilterStatus('ALL'); setFilterDepartment('ALL'); setFilterUsername(''); }}
              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '0.4rem 0.75rem', borderRadius: '8px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Reset Filters
            </button>
          </div>
        </div>

        {showLocalFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', padding: '1rem', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', marginTop: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.3rem' }}>1. Activity Type</label>
              <select value={filterActType} onChange={e => setFilterActType(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Activity Types</option>
                {actTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.3rem' }}>2. Trend Duration</label>
              <select value={trendDays} onChange={e => setTrendDays(Number(e.target.value))} style={localSelectStyle}>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
                <option value={9999}>All Time</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.3rem' }}>3. Frequency</label>
              <select value={activeFreq} onChange={e => setActiveFreq(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Frequencies</option>
                {freqs.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.3rem' }}>4. Line Equipment</label>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Lines</option>
                {lines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.3rem' }}>5. Sub Line</label>
              <select value={filterSubLine} onChange={e => setFilterSubLine(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Sub-Lines</option>
                {subLines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.3rem' }}>6. Component</label>
              <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Components</option>
                {components.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.3rem' }}>7. Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Statuses</option>
                {[...new Set(['Done', 'WIP', 'Hold', 'Pending', 'Support Required', ...submissions.map(d => d.Status)].filter(Boolean))].map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.3rem' }}>8. Department</label>
              <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.3rem' }}>9. User Search</label>
              <input
                type="text"
                placeholder="Search & type user..."
                value={filterUsername}
                onChange={e => setFilterUsername(e.target.value)}
                style={{ ...localSelectStyle, padding: '0.42rem 0.6rem' }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '100%', overflowX: 'hidden', overflowY: 'auto', maxHeight: '380px', marginTop: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', tableLayout: 'auto' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#F8FAFC' }}>
            <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
              <th style={{ padding: '0.65rem 0.5rem', fontWeight: 800 }}>Name</th>
              <th style={{ padding: '0.65rem 0.5rem', fontWeight: 800 }}>Department</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 800 }}>Tasks</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 800 }}>Resolution</th>
            </tr>
          </thead>
          <tbody>
            {userStats.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                  No user productivity records found matching filters.
                </td>
              </tr>
            ) : (
              userStats.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#1E293B', wordBreak: 'break-word' }}>{u.name}</td>
                  <td style={{ padding: '0.65rem 0.5rem', color: '#64748B', fontWeight: 600, wordBreak: 'break-word' }}>
                    <span style={{ backgroundColor: '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                      {u.department}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#334155' }}>{u.total}</td>
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#10B981', fontWeight: 800 }}>{u.completed} Done</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SingleLevel4Chart = ({ submissions, checklists }) => {
  const pivotKey = 'Frequency';
  const IconComponent = Calendar;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <DynamicDimensionTrend title="Section 7: Trend - Frequency Performance & Activity Completion" pivotKey={pivotKey} icon={IconComponent} submissions={submissions} checklists={checklists} />
    </div>
  );
};

// ================= SECTION 8: AVERAGE SUPPORT TURNAROUND TIME (TAT) TABLE (BEST 5 & WORST 5) =================
const Section8SupportTAT = ({ submissions, checklists, employees }) => {
  const [filterActType, setFilterActType] = useState('ALL');
  const [trendDays, setTrendDays] = useState(7);
  const [activeFreq, setActiveFreq] = useState('ALL');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSubLine, setFilterSubLine] = useState('ALL');
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterUsername, setFilterUsername] = useState('');
  const [showLocalFilters, setShowLocalFilters] = useState(true);

  const actTypes = useMemo(() => [...new Set(submissions.map(s => s.Type_of_Activity).filter(Boolean))].sort(), [submissions]);
  const lines = useMemo(() => [...new Set(submissions.map(s => s.Line_Equipment).filter(Boolean))].sort(), [submissions]);
  const subLines = useMemo(() => [...new Set(submissions.map(s => s.Sub_Line_Equipment).filter(Boolean))].sort(), [submissions]);
  const components = useMemo(() => [...new Set(submissions.map(s => s.Component).filter(Boolean))].sort(), [submissions]);
  const freqs = useMemo(() => [...new Set([...submissions.map(s => s.Frequency), ...(checklists || []).map(c => c.Frequency)].filter(Boolean))].sort(), [submissions, checklists]);
  const departments = useMemo(() => [...new Set(employees.map(e => e.Department).filter(Boolean))].sort(), [employees]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      if (filterActType !== 'ALL' && s.Type_of_Activity !== filterActType) return false;
      if (activeFreq !== 'ALL' && s.Frequency !== activeFreq) return false;
      if (filterLine !== 'ALL' && s.Line_Equipment !== filterLine) return false;
      if (filterSubLine !== 'ALL' && s.Sub_Line_Equipment !== filterSubLine) return false;
      if (filterComponent !== 'ALL' && s.Component !== filterComponent) return false;
      if (filterStatus !== 'ALL' && s.Status !== filterStatus) return false;
      if (filterUsername && filterUsername.trim() !== '') {
        const u = `${s.Submitted_By || ''} ${s.Assigned_To || ''} ${s.Support_Required_From || ''}`.toLowerCase();
        if (!u.includes(filterUsername.toLowerCase())) return false;
      }
      return true;
    });
  }, [submissions, filterActType, activeFreq, filterLine, filterSubLine, filterComponent, filterStatus, filterUsername]);

  const supportStats = useMemo(() => {
    const map = {};
    filteredSubmissions.forEach(s => {
      const isSupport = s.Status === 'Support Required' || s.Support_Required_From || s.Assigned_To || (s.Status === 'Done' && s.Assigned_To);
      if (!isSupport) return;

      const resolverName = s.Support_Required_From || s.Assigned_To || s.Submitted_By || 'Unknown Resolver';
      if (!map[resolverName]) {
        const emp = employees.find(e => e.Employee_Name === resolverName || String(e.Employee_ID) === String(resolverName));
        map[resolverName] = {
          name: resolverName,
          department: emp?.Department || (filterDepartment !== 'ALL' ? filterDepartment : 'General / Operations'),
          totalTasks: 0,
          resolvedTasks: 0,
          totalTatHrs: 0
        };
      }

      if (filterDepartment !== 'ALL' && map[resolverName].department !== filterDepartment) return;

      map[resolverName].totalTasks += 1;
      const isDone = s.Status === 'Done' || s.Status === 'OK';
      if (isDone) {
        map[resolverName].resolvedTasks += 1;
        let hrs = s.Support_TAT_Hours || s.Resolution_Time_Hours;
        if (!hrs) {
          const tEnd = new Date(s.Date_Timestamp || new Date());
          const tStart = new Date(s.Date || s.Submission_Date || tEnd.getTime() - 36e5 * 3);
          hrs = Math.max(0.5, (tEnd - tStart) / 36e5);
        }
        map[resolverName].totalTatHrs += Number(hrs) || 2.5;
      } else {
        // Unresolved support task adds age to TAT
        const diffHrs = Math.max(1, (new Date() - new Date(s.Date_Timestamp || s.Date || new Date())) / 36e5);
        map[resolverName].totalTatHrs += diffHrs;
      }
    });

    const list = Object.values(map)
      .filter(item => filterDepartment === 'ALL' || item.department === filterDepartment)
      .map(item => ({
        ...item,
        avgTat: Math.round((item.totalTatHrs / Math.max(1, item.totalTasks)) * 10) / 10
      }))
      .sort((a, b) => a.avgTat - b.avgTat);

    return {
      best5: list.slice(0, 5),
      worst5: [...list].sort((a, b) => b.avgTat - a.avgTat).slice(0, 5)
    };
  }, [filteredSubmissions, employees, filterDepartment]);

  return (
    <div className="card" style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem', fontWeight: 800, color: '#1E293B' }}>
          <Clock size={20} color="#3B82F6" /> Section 8: Average Support Turnaround Time (TAT) Table (Best & Worst 5)
        </div>
        <button onClick={() => setShowLocalFilters(!showLocalFilters)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
          <Filter size={14} /> {showLocalFilters ? 'Hide In-Graph Filters' : 'Show In-Graph Filters'}
        </button>
      </div>

      {showLocalFilters && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>1. ACTIVITY TYPE</label>
            <select value={filterActType} onChange={e => setFilterActType(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Types</option>
              {actTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>2. TREND DURATION</label>
            <select value={trendDays} onChange={e => setTrendDays(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value={7}>7 Days</option>
              <option value={15}>15 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>3. FREQUENCY</label>
            <select value={activeFreq} onChange={e => setActiveFreq(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Frequencies</option>
              {freqs.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>4. LINE EQUIPMENT</label>
            <select value={filterLine} onChange={e => setFilterLine(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Lines</option>
              {lines.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>5. SUB LINE</label>
            <select value={filterSubLine} onChange={e => setFilterSubLine(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Sub-Lines</option>
              {subLines.map(sl => <option key={sl} value={sl}>{sl}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>6. COMPONENT</label>
            <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Components</option>
              {components.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>7. STATUS</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Statuses</option>
              <option value="Done">Done</option>
              <option value="WIP">WIP</option>
              <option value="Support Required">Support Required</option>
              <option value="Hold">Hold</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>8. DEPARTMENT</label>
            <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>9. USER SEARCH</label>
            <input type="text" placeholder="Search resolver name..." value={filterUsername} onChange={e => setFilterUsername(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Best 5 Table */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#ECFDF5', padding: '0.75rem 1rem', borderBottom: '1px solid #D1FAE5', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#065F46', fontSize: '0.9rem' }}>
            <CheckCircle size={18} color="#10B981" /> Top 5 Fastest Turnaround Performers (Best TAT)
          </div>
          <div className="table-container-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Rank</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Name</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Department</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Avg TAT</th>
                </tr>
              </thead>
              <tbody>
                {supportStats.best5.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8' }}>No support resolution data found.</td></tr>
                ) : (
                  supportStats.best5.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, color: '#10B981' }}>#{idx + 1}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#1E293B' }}>{row.name}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#64748B', fontSize: '0.75rem' }}>{row.department}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{row.avgTat} Hrs</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Worst 5 Table */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#FEF2F2', padding: '0.75rem 1rem', borderBottom: '1px solid #FEE2E2', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#991B1B', fontSize: '0.9rem' }}>
            <AlertTriangle size={18} color="#EF4444" /> Top 5 Slowest Turnaround Performers (Worst TAT)
          </div>
          <div className="table-container-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Rank</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Name</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Department</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Avg TAT</th>
                </tr>
              </thead>
              <tbody>
                {supportStats.worst5.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8' }}>No support resolution data found.</td></tr>
                ) : (
                  supportStats.worst5.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, color: '#EF4444' }}>#{idx + 1}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#1E293B' }}>{row.name}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#64748B', fontSize: '0.75rem' }}>{row.department}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#DC2626' }}>{row.avgTat} Hrs</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================= SECTION 9: ACTIVITY & COMPLIANCE MATRIX =================
const Section9ActivityCompliance = ({ submissions, checklists, employees }) => {
  const [filterActType, setFilterActType] = useState('ALL');
  const [trendDays, setTrendDays] = useState(7);
  const [activeFreq, setActiveFreq] = useState('ALL');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSubLine, setFilterSubLine] = useState('ALL');
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterUsername, setFilterUsername] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = Best Complied, asc = Worst Complied
  const [showLocalFilters, setShowLocalFilters] = useState(true);

  const actTypes = useMemo(() => [...new Set(submissions.map(s => s.Type_of_Activity).filter(Boolean))].sort(), [submissions]);
  const lines = useMemo(() => [...new Set(submissions.map(s => s.Line_Equipment).filter(Boolean))].sort(), [submissions]);
  const subLines = useMemo(() => [...new Set(submissions.map(s => s.Sub_Line_Equipment).filter(Boolean))].sort(), [submissions]);
  const components = useMemo(() => [...new Set(submissions.map(s => s.Component).filter(Boolean))].sort(), [submissions]);
  const freqs = useMemo(() => [...new Set([...submissions.map(s => s.Frequency), ...(checklists || []).map(c => c.Frequency)].filter(Boolean))].sort(), [submissions, checklists]);
  const departments = useMemo(() => [...new Set(employees.map(e => e.Department).filter(Boolean))].sort(), [employees]);

  const complianceMatrix = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      if (filterActType !== 'ALL' && s.Type_of_Activity !== filterActType) return;
      if (activeFreq !== 'ALL' && s.Frequency !== activeFreq) return;
      if (filterLine !== 'ALL' && s.Line_Equipment !== filterLine) return;
      if (filterSubLine !== 'ALL' && s.Sub_Line_Equipment !== filterSubLine) return;
      if (filterComponent !== 'ALL' && s.Component !== filterComponent) return;
      if (filterStatus !== 'ALL' && s.Status !== filterStatus) return;
      if (filterUsername && filterUsername.trim() !== '') {
        const u = `${s.Submitted_By || ''} ${s.Assigned_To || ''}`.toLowerCase();
        if (!u.includes(filterUsername.toLowerCase())) return;
      }

      const l = s.Line_Equipment || 'Unknown Line';
      const sl = s.Sub_Line_Equipment || 'Unknown Sub-Line';
      const c = s.Component || 'General Component';
      const key = `${l}|${sl}|${c}`;

      if (!map[key]) {
        const emp = employees.find(e => e.Employee_Name === s.Submitted_By || e.Employee_Name === s.Assigned_To);
        map[key] = {
          line: l,
          subLine: sl,
          component: c,
          department: emp?.Department || 'Operations',
          allocated: 0,
          completed: 0
        };
      }

      if (filterDepartment !== 'ALL' && map[key].department !== filterDepartment) return;

      map[key].allocated += 1;
      if (s.Status === 'Done' || s.Status === 'OK') {
        map[key].completed += 1;
      }
    });

    return Object.values(map)
      .filter(item => item.allocated > 0)
      .map(item => ({
        ...item,
        compliancePct: Math.round((item.completed / item.allocated) * 100)
      }))
      .sort((a, b) => sortOrder === 'desc' ? b.compliancePct - a.compliancePct : a.compliancePct - b.compliancePct);
  }, [submissions, filterActType, activeFreq, filterLine, filterSubLine, filterComponent, filterStatus, filterDepartment, filterUsername, sortOrder, employees]);

  return (
    <div className="card" style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem', fontWeight: 800, color: '#1E293B' }}>
          <ClipboardList size={20} color="#10B981" /> Section 9: Activity & Compliance Matrix (Line / Sub-Line / Component)
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: sortOrder === 'desc' ? '#ECFDF5' : '#FEF2F2', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: sortOrder === 'desc' ? '#065F46' : '#991B1B' }}>
            {sortOrder === 'desc' ? '🏆 Showing Best Complied First' : '⚠️ Showing Worst Complied First'}
          </button>
          <button onClick={() => setShowLocalFilters(!showLocalFilters)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
            <Filter size={14} /> {showLocalFilters ? 'Hide In-Graph Filters' : 'Show In-Graph Filters'}
          </button>
        </div>
      </div>

      {showLocalFilters && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>1. ACTIVITY TYPE</label>
            <select value={filterActType} onChange={e => setFilterActType(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Types</option>
              {actTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>2. TREND DURATION</label>
            <select value={trendDays} onChange={e => setTrendDays(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value={7}>7 Days</option>
              <option value={15}>15 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>3. FREQUENCY</label>
            <select value={activeFreq} onChange={e => setActiveFreq(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Frequencies</option>
              {freqs.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>4. LINE EQUIPMENT</label>
            <select value={filterLine} onChange={e => setFilterLine(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Lines</option>
              {lines.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>5. SUB LINE</label>
            <select value={filterSubLine} onChange={e => setFilterSubLine(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Sub-Lines</option>
              {subLines.map(sl => <option key={sl} value={sl}>{sl}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>6. COMPONENT</label>
            <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Components</option>
              {components.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>7. STATUS</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Statuses</option>
              <option value="Done">Done</option>
              <option value="WIP">WIP</option>
              <option value="Hold">Hold</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>8. DEPARTMENT</label>
            <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>9. USER SEARCH</label>
            <input type="text" placeholder="Search user..." value={filterUsername} onChange={e => setFilterUsername(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
          </div>
        </div>
      )}

      <div className="table-container-responsive" style={{ overflowX: 'auto', maxHeight: '450px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', textAlign: 'left', borderBottom: '2px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
              <th style={{ padding: '0.75rem 1rem' }}>Line Equipment</th>
              <th style={{ padding: '0.75rem 1rem' }}>Sub-Line Equipment</th>
              <th style={{ padding: '0.75rem 1rem' }}>Component</th>
              <th style={{ padding: '0.75rem 1rem' }}>Department / Area</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Allocated</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Completed</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', minWidth: '180px' }}>Compliance Rate (%)</th>
            </tr>
          </thead>
          <tbody>
            {complianceMatrix.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No compliance activity data matches current filters.</td></tr>
            ) : (
              complianceMatrix.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#1E293B' }}>{row.line}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 600 }}>{row.subLine}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>{row.component}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{row.department}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>{row.allocated}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#10B981' }}>{row.completed}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ flex: 1, backgroundColor: '#E2E8F0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, row.compliancePct)}%`, backgroundColor: row.compliancePct >= 85 ? '#10B981' : row.compliancePct >= 65 ? '#F59E0B' : '#EF4444', height: '100%' }} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.8rem', minWidth: '42px', textAlign: 'right', color: row.compliancePct >= 85 ? '#059669' : row.compliancePct >= 65 ? '#D97706' : '#DC2626' }}>{row.compliancePct}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ================= SECTION 10: UNRESOLVED TASKS AGING MATRIX & REPORT =================
const Section10AgingReport = ({ submissions }) => {
  const [searchLine, setSearchLine] = useState('');
  const [searchSubLine, setSearchSubLine] = useState('');
  const [searchEquip, setSearchEquip] = useState('');
  const [searchComp, setSearchComp] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchFreq, setSearchFreq] = useState('');
  const [searchAllocatedBy, setSearchAllocatedBy] = useState('');
  const [searchAllocatedTo, setSearchAllocatedTo] = useState('');
  const [searchDesc, setSearchDesc] = useState('');

  const agingRows = useMemo(() => {
    return submissions
      .filter(r => r.Status !== 'Done' && r.Status !== 'OK')
      .filter(r => {
        if (searchLine && !String(r.Line_Equipment || '').toLowerCase().includes(searchLine.toLowerCase())) return false;
        if (searchSubLine && !String(r.Sub_Line_Equipment || '').toLowerCase().includes(searchSubLine.toLowerCase())) return false;
        if (searchEquip && !String(r.Equipment || r.Sub_Line_Equipment || '').toLowerCase().includes(searchEquip.toLowerCase())) return false;
        if (searchComp && !String(r.Component || '').toLowerCase().includes(searchComp.toLowerCase())) return false;
        if (searchType && !String(r.Type_of_Activity || '').toLowerCase().includes(searchType.toLowerCase())) return false;
        if (searchFreq && !String(r.Frequency || '').toLowerCase().includes(searchFreq.toLowerCase())) return false;
        if (searchAllocatedBy && !String(r.Allocated_By || r.Assigned_By || r.Submitted_By || '').toLowerCase().includes(searchAllocatedBy.toLowerCase())) return false;
        if (searchAllocatedTo && !String(r.Allocated_To || r.Assigned_To || r.User_Name || r.Employee_Name || '').toLowerCase().includes(searchAllocatedTo.toLowerCase())) return false;
        if (searchDesc && !String(r.Activity_Description || '').toLowerCase().includes(searchDesc.toLowerCase())) return false;
        return true;
      })
      .map(r => {
        const diffHrs = Math.max(1, (new Date() - new Date(r.Date_Timestamp || r.Date || new Date())) / 36e5);
        return {
          ...r,
          diffHrs,
          b1: diffHrs < 8 ? 1 : 0,
          b2: diffHrs >= 8 && diffHrs < 168 ? 1 : 0,
          b3: diffHrs >= 168 && diffHrs < 720 ? 1 : 0,
          b4: diffHrs >= 720 && diffHrs < 4320 ? 1 : 0,
          b5: diffHrs >= 4320 ? 1 : 0
        };
      })
      .sort((a, b) => b.diffHrs - a.diffHrs);
  }, [submissions, searchLine, searchSubLine, searchEquip, searchComp, searchType, searchFreq, searchAllocatedBy, searchAllocatedTo, searchDesc]);

  return (
    <div className="card" style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem', fontWeight: 800, color: '#1E293B' }}>
          <FileClock size={20} color="#DC2626" /> Section 10: Unresolved Tasks Aging Report Matrix (&lt; 8 HR to &gt; 6 MO)
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#FEF2F2', color: '#991B1B', padding: '0.3rem 0.75rem', borderRadius: '999px' }}>
          Total Unresolved Tasks: {agingRows.length}
        </span>
      </div>

      {/* In-Graph Search Bar for All Columns */}
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>SEARCH LINE</label>
          <input type="text" placeholder="Line equipment..." value={searchLine} onChange={e => setSearchLine(e.target.value)} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>SEARCH SUB-LINE</label>
          <input type="text" placeholder="Sub-Line..." value={searchSubLine} onChange={e => setSearchSubLine(e.target.value)} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>SEARCH EQUIPMENT</label>
          <input type="text" placeholder="Equipment..." value={searchEquip} onChange={e => setSearchEquip(e.target.value)} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>SEARCH COMPONENT</label>
          <input type="text" placeholder="Component..." value={searchComp} onChange={e => setSearchComp(e.target.value)} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>SEARCH TYPE</label>
          <input type="text" placeholder="Activity type..." value={searchType} onChange={e => setSearchType(e.target.value)} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>SEARCH FREQUENCY</label>
          <input type="text" placeholder="Frequency..." value={searchFreq} onChange={e => setSearchFreq(e.target.value)} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>SEARCH ALLOCATED BY</label>
          <input type="text" placeholder="Allocated by..." value={searchAllocatedBy} onChange={e => setSearchAllocatedBy(e.target.value)} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>SEARCH ALLOCATED TO</label>
          <input type="text" placeholder="Allocated to..." value={searchAllocatedTo} onChange={e => setSearchAllocatedTo(e.target.value)} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>SEARCH DESCRIPTION</label>
          <input type="text" placeholder="Description..." value={searchDesc} onChange={e => setSearchDesc(e.target.value)} style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }} />
        </div>
      </div>

      <div className="table-container-responsive" style={{ overflowX: 'auto', maxHeight: '480px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', borderBottom: '2px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
              <th style={{ padding: '0.6rem 0.75rem' }}>Line Equipment</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Sub-Line</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Equipment</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Component</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Activity Type</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Frequency</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Allocated By</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Allocated To</th>
              <th style={{ padding: '0.6rem 0.75rem', minWidth: '240px' }}>Activity Description</th>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#64748B' }}>&lt; 8 HR</th>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#D97706' }}>1-7 DAY</th>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#EA580C' }}>8-30 DAY</th>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#DC2626' }}>1-6 MO</th>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#991B1B' }}>&gt; 6 MO</th>
            </tr>
          </thead>
          <tbody>
            {agingRows.length === 0 ? (
              <tr><td colSpan={14} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No unresolved tasks match the specified aging search filters.</td></tr>
            ) : (
              agingRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: row.b5 ? '#FEF2F2' : row.b4 ? '#FFF5F5' : 'transparent' }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#1E293B' }}>{row.Line_Equipment || '-'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: '#475569' }}>{row.Sub_Line_Equipment || '-'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: '#475569' }}>{row.Equipment || row.Sub_Line_Equipment || '-'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#334155' }}>{row.Component || '-'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: '#64748B' }}>{row.Type_of_Activity || '-'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: '#64748B' }}>{row.Frequency || '-'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#475569' }}>{row.Allocated_By || row.Assigned_By || row.Submitted_By || '-'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#1E293B' }}>{row.Allocated_To || row.Assigned_To || row.User_Name || row.Employee_Name || '-'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', minWidth: '240px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4', color: '#1E293B', fontWeight: 600 }}>{row.Activity_Description || '-'}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: row.b1 ? 800 : 400, color: row.b1 ? '#1E293B' : '#E2E8F0' }}>{row.b1 ? '1' : '-'}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: row.b2 ? 800 : 400, color: row.b2 ? '#D97706' : '#E2E8F0' }}>{row.b2 ? '1' : '-'}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: row.b3 ? 800 : 400, color: row.b3 ? '#EA580C' : '#E2E8F0' }}>{row.b3 ? '1' : '-'}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: row.b4 ? 900 : 400, color: row.b4 ? '#DC2626' : '#E2E8F0' }}>{row.b4 ? '1' : '-'}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: row.b5 ? 900 : 400, color: row.b5 ? '#991B1B' : '#E2E8F0' }}>{row.b5 ? '1' : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ================= SECTION 11: REVIEWER PERFORMANCE & SUMMARY GRAPHS =================
const Section11ReviewerPerformance = ({ submissions = [], checklists = [], employees = [], reviewers: propReviewers = [] }) => {
  const { reviewers: contextReviewers = [] } = useData();
  const masterReviewers = (propReviewers && propReviewers.length) ? propReviewers : contextReviewers;

  const [filterActType, setFilterActType] = useState('ALL');
  const [trendDays, setTrendDays] = useState(7);
  const [activeFreq, setActiveFreq] = useState('ALL');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSubLine, setFilterSubLine] = useState('ALL');
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterReviewerName, setFilterReviewerName] = useState('ALL');
  const [showLocalFilters, setShowLocalFilters] = useState(true);

  const actTypes = useMemo(() => [...new Set(submissions.map(s => s.Type_of_Activity).filter(Boolean))].sort(), [submissions]);
  const lines = useMemo(() => [...new Set(submissions.map(s => s.Line_Equipment).filter(Boolean))].sort(), [submissions]);
  const subLines = useMemo(() => [...new Set(submissions.map(s => s.Sub_Line_Equipment).filter(Boolean))].sort(), [submissions]);
  const components = useMemo(() => [...new Set(submissions.map(s => s.Component).filter(Boolean))].sort(), [submissions]);
  const freqs = useMemo(() => [...new Set([...submissions.map(s => s.Frequency), ...(checklists || []).map(c => c.Frequency)].filter(Boolean))].sort(), [submissions, checklists]);
  const departments = useMemo(() => [...new Set(employees.map(e => e.Department).filter(Boolean))].sort(), [employees]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      if (filterActType !== 'ALL' && s.Type_of_Activity !== filterActType) return false;
      if (activeFreq !== 'ALL' && s.Frequency !== activeFreq) return false;
      if (filterLine !== 'ALL' && s.Line_Equipment !== filterLine) return false;
      if (filterSubLine !== 'ALL' && s.Sub_Line_Equipment !== filterSubLine) return false;
      if (filterComponent !== 'ALL' && s.Component !== filterComponent) return false;
      if (filterStatus !== 'ALL' && s.Status !== filterStatus) return false;
      return true;
    });
  }, [submissions, filterActType, activeFreq, filterLine, filterSubLine, filterComponent, filterStatus]);

  // Extract Reviewers and their exact Level (L1, L2, L3) directly from Reviewers Master
  const reviewerStats = useMemo(() => {
    const revMap = {};
    (masterReviewers || []).forEach(r => {
      const at = r.activity_type || '';
      const le = r.line_equipment || '';
      
      const addRev = (empId, lvl) => {
        if (!empId) return;
        const strId = String(empId).trim();
        if (!strId) return;
        if (!revMap[strId]) {
          const emp = employees.find(e => String(e.Employee_ID || '').trim() === strId || String(e.Employee_Name || '').trim().toLowerCase() === strId.toLowerCase());
          revMap[strId] = {
            id: strId,
            name: emp ? emp.Employee_Name : strId,
            department: emp?.Department || 'Quality / Operations',
            levels: new Set(),
            lines: new Set(),
            actTypes: new Set()
          };
        }
        if (lvl) revMap[strId].levels.add(lvl);
        if (le) revMap[strId].lines.add(le);
        if (at) revMap[strId].actTypes.add(at);
      };

      if (Array.isArray(r.reviewerIdsL1 || r.reviewerIds)) {
        (r.reviewerIdsL1 || r.reviewerIds).forEach(id => addRev(id, 'L1'));
      }
      if (Array.isArray(r.reviewerIdsL2)) {
        r.reviewerIdsL2.forEach(id => addRev(id, 'L2'));
      }
      if (Array.isArray(r.reviewerIdsL3)) {
        r.reviewerIdsL3.forEach(id => addRev(id, 'L3'));
      }
      // Also check flat or legacy reviewer definitions
      if (typeof r.Reviewer_Name === 'string' || typeof r.reviewer_name === 'string' || typeof r.Reviewer === 'string' || typeof r.Employee_Name === 'string') {
        const flatName = r.Reviewer_Name || r.reviewer_name || r.Reviewer || r.Employee_Name;
        if (flatName) {
          const flatLvl = r.Level || r.Reviewer_Level || r.level || 'L1';
          addRev(flatName, flatLvl);
        }
      }
    });

    // Safe fallback: if no reviewers are configured in Reviewers Master, derive from submissions
    if (Object.keys(revMap).length === 0) {
      filteredSubmissions.forEach(s => {
        const rName = s.Reviewed_By || s.Assigned_Reviewer || s.Submitted_By;
        if (rName && !revMap[rName]) {
          const emp = employees.find(e => e.Employee_Name === rName);
          revMap[rName] = {
            id: rName,
            name: rName,
            department: emp?.Department || 'Quality / Operations',
            levels: new Set(['L1']),
            lines: new Set(),
            actTypes: new Set()
          };
        }
      });
    }

    // Now compute allocated vs reviewed statistics per reviewer
    const statsList = Object.values(revMap).map(rev => {
      // Find matching submissions for this reviewer based on name/id assignment or assigned lines/actTypes
      let revSubs = filteredSubmissions.filter(s => {
        const isDirect = String(s.Reviewed_By || '').trim().toLowerCase() === rev.name.toLowerCase() ||
                         String(s.Assigned_Reviewer || '').trim().toLowerCase() === rev.name.toLowerCase() ||
                         String(s.Reviewed_By || '').trim().toLowerCase() === rev.id.toLowerCase();
        if (isDirect) return true;
        if (rev.lines.size > 0 && rev.lines.has(s.Line_Equipment)) return true;
        if (rev.actTypes.size > 0 && rev.actTypes.has(s.Type_of_Activity)) return true;
        return false;
      });

      // If no direct or line match, check if they are the primary department reviewer
      if (revSubs.length === 0 && rev.lines.size === 0 && rev.actTypes.size === 0) {
        revSubs = filteredSubmissions.filter(s => (s.Reviewed_By || s.Assigned_Reviewer) === rev.name);
      }

      const allocated = revSubs.length;
      const done = revSubs.filter(s => (s.Review_Status && s.Review_Status !== 'Pending') || s.Status === 'Done' || s.Status === 'OK').length;
      const pending = Math.max(0, allocated - done);
      const compliancePct = allocated > 0 ? Math.round((done / allocated) * 100) : 100;

      return {
        ...rev,
        levelStr: Array.from(rev.levels).sort().join(', ') || 'L1',
        allocated,
        done,
        pending,
        compliancePct
      };
    });

    return statsList
      .filter(item => filterDepartment === 'ALL' || item.department === filterDepartment)
      .filter(item => filterReviewerName === 'ALL' || item.name === filterReviewerName)
      .sort((a, b) => b.allocated - a.allocated);
  }, [masterReviewers, employees, filteredSubmissions, filterDepartment, filterReviewerName]);

  const reviewerNames = useMemo(() => {
    return [...new Set(reviewerStats.map(r => r.name))].sort();
  }, [reviewerStats]);

  const deptSummaryGraphData = useMemo(() => {
    const deptMap = {};
    reviewerStats.forEach(r => {
      if (!deptMap[r.department]) deptMap[r.department] = { department: r.department, Allocated: 0, Done: 0, Pending: 0 };
      deptMap[r.department].Allocated += r.allocated;
      deptMap[r.department].Done += r.done;
      deptMap[r.department].Pending += r.pending;
    });
    return Object.values(deptMap);
  }, [reviewerStats]);

  const reviewTrendDaysData = useMemo(() => {
    const dates = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates.map(date => {
      const daySub = filteredSubmissions.filter(s => String(s.Date || s.Date_Timestamp || '').startsWith(date));
      const allocated = daySub.length;
      const done = daySub.filter(s => (s.Review_Status && s.Review_Status !== 'Pending') || s.Status === 'Done' || s.Status === 'OK').length;
      return { date, Allocated: allocated, Reviewed: done };
    });
  }, [filteredSubmissions, trendDays]);

  return (
    <div className="card" style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem', fontWeight: 800, color: '#1E293B' }}>
          <ShieldCheck size={20} color="#6366F1" /> Section 11: Reviewer Performance & Summary Graphs
        </div>
        <button onClick={() => setShowLocalFilters(!showLocalFilters)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
          <Filter size={14} /> {showLocalFilters ? 'Hide In-Graph Filters' : 'Show In-Graph Filters'}
        </button>
      </div>

      {showLocalFilters && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>1. ACTIVITY TYPE</label>
            <select value={filterActType} onChange={e => setFilterActType(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Types</option>
              {actTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>2. TREND DURATION</label>
            <select value={trendDays} onChange={e => setTrendDays(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value={7}>7 Days</option>
              <option value={15}>15 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>3. FREQUENCY</label>
            <select value={activeFreq} onChange={e => setActiveFreq(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Frequencies</option>
              {freqs.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>4. LINE EQUIPMENT</label>
            <select value={filterLine} onChange={e => setFilterLine(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Lines</option>
              {lines.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>5. SUB LINE</label>
            <select value={filterSubLine} onChange={e => setFilterSubLine(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Sub-Lines</option>
              {subLines.map(sl => <option key={sl} value={sl}>{sl}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>6. COMPONENT</label>
            <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Components</option>
              {components.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>7. STATUS</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Statuses</option>
              <option value="Done">Done</option>
              <option value="WIP">WIP</option>
              <option value="Hold">Hold</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>8. DEPARTMENT</label>
            <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem' }}>
              <option value="ALL">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6366F1', display: 'block', marginBottom: '0.2rem' }}>9. REVIEWER NAME</label>
            <select value={filterReviewerName} onChange={e => setFilterReviewerName(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #6366F1', fontSize: '0.75rem', fontWeight: 700 }}>
              <option value="ALL">All Reviewers</option>
              {reviewerNames.map(rn => <option key={rn} value={rn}>{rn}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Reviewer Performance Table with Vertical Scroll Bar after 10 rows (approx 440px) */}
      <div className="table-container-responsive" style={{ overflowX: 'auto', maxHeight: '450px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', borderBottom: '2px solid #E2E8F0', textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
              <th style={{ padding: '0.75rem 1rem' }}>User Name (Reviewer)</th>
              <th style={{ padding: '0.75rem 1rem' }}>Level</th>
              <th style={{ padding: '0.75rem 1rem' }}>Department</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Allocated Activity for Review</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#10B981' }}>Done (Reviewed)</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#F59E0B' }}>Pending (Queue)</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Review Rate (%)</th>
            </tr>
          </thead>
          <tbody>
            {reviewerStats.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No reviewer performance records match current filters.</td></tr>
            ) : (
              reviewerStats.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#1E293B' }}>{r.name}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#6366F1' }}><span style={{ backgroundColor: '#EEF2FF', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #C7D2FE', fontSize: '0.75rem' }}>{r.levelStr}</span></td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}><span style={{ backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{r.department}</span></td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800 }}>{r.allocated}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#10B981' }}>{r.done}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#F59E0B' }}>{r.pending}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: r.compliancePct >= 85 ? '#059669' : '#D97706' }}>{r.compliancePct}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Graphs Grid: Department Comparison & Allocated vs Reviewed Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', background: '#FFF' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} color="#3B82F6" /> Department Review Summary (Best & Worst Review Performance)
          </h4>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptSummaryGraphData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="department" fontSize={10} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Done" name="Reviewed / Approved" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" name="Pending Review" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', background: '#FFF' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="#6366F1" /> {trendDays}-Day Review Trend (Allocated vs Actual Reviewed)
          </h4>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reviewTrendDaysData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorRevAlloc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="Allocated" stroke="#6366F1" fill="url(#colorRevAlloc)" name="Allocated for Review" strokeWidth={2.5} />
                <Area type="monotone" dataKey="Reviewed" stroke="#10B981" fill="url(#colorRevDone)" name="Actual Reviewed" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdvancedAnalyticsDashboard = ({ preFilteredData, baseChecklists, backlogTrend, hourlyPeak }) => {
  const { submissions: rawAllSub = [], checklists: rawAllCheck = [], shifts = [], employees = [] } = useData();
  // Use props passed from filtered parent dashboard, fallback safely
  const submissions = preFilteredData !== undefined ? preFilteredData : rawAllSub;
  const checklists = baseChecklists !== undefined ? baseChecklists : rawAllCheck;

  const computedBacklogTrend = useMemo(() => {
    if (backlogTrend && backlogTrend.length > 0) return backlogTrend;
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates.map(date => {
      const dayLogs = submissions.filter(r => r.Date === date);
      const pendingCount = dayLogs.filter(r => r.Status === 'Pending' || r.Status === 'WIP').length;
      const resolvedCount = dayLogs.filter(r => r.Status === 'Done' || r.Status === 'OK').length;
      return { date, Backlog: pendingCount, Resolved: resolvedCount };
    });
  }, [backlogTrend, submissions]);

  const computedHourlyPeak = useMemo(() => {
    if (hourlyPeak && hourlyPeak.length > 0) return hourlyPeak;
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, count: 0 }));
    submissions.forEach(r => {
      const rawTS = r.Date_Timestamp || r.timestamp || r.Date;
      if (rawTS) {
        const parsed = new Date(rawTS);
        if (!isNaN(parsed.getTime())) {
          const h = parsed.getHours();
          if (h >= 0 && h < 24) hours[h].count++;
        }
      }
    });
    return hours;
  }, [hourlyPeak, submissions]);

  const [trendPivot, setTrendPivot] = useState('shift');

  const [lineEquipFilterFreq, setLineEquipFilterFreq] = useState('ALL');
  const [lineEquipFilterActType, setLineEquipFilterActType] = useState('ALL');
  const [lineEquipFilterSubLine, setLineEquipFilterSubLine] = useState('ALL');
  const [lineEquipFilterComponent, setLineEquipFilterComponent] = useState('ALL');

  const [trendCenterFilterLine, setTrendCenterFilterLine] = useState('ALL');
  const [trendCenterFilterActType, setTrendCenterFilterActType] = useState('ALL');
  const [trendCenterFilterSubLine, setTrendCenterFilterSubLine] = useState('ALL');
  const [trendCenterFilterComponent, setTrendCenterFilterComponent] = useState('ALL');

  const tcFilterOptions = useMemo(() => {
    const allData = [...checklists, ...submissions];
    const lines = [...new Set(allData.map(d => d.Line_Equipment).filter(Boolean))].sort();
    
    let dataForActType = allData;
    if (trendCenterFilterLine !== 'ALL') dataForActType = dataForActType.filter(d => d.Line_Equipment === trendCenterFilterLine);
    const actTypes = [...new Set(dataForActType.map(d => d.Type_of_Activity).filter(Boolean))].sort();
    
    let dataForSubLine = dataForActType;
    if (trendCenterFilterActType !== 'ALL') dataForSubLine = dataForSubLine.filter(d => d.Type_of_Activity === trendCenterFilterActType);
    const subLines = [...new Set(dataForSubLine.map(d => d.Sub_Line_Equipment).filter(Boolean))].sort();
    
    let dataForComp = dataForSubLine;
    if (trendCenterFilterSubLine !== 'ALL') dataForComp = dataForComp.filter(d => d.Sub_Line_Equipment === trendCenterFilterSubLine);
    const components = [...new Set(dataForComp.map(d => d.Component).filter(Boolean))].sort();

    return { lines, actTypes, subLines, components };
  }, [checklists, submissions, trendCenterFilterLine, trendCenterFilterActType, trendCenterFilterSubLine]);

  useEffect(() => { if (trendCenterFilterActType !== 'ALL' && !tcFilterOptions.actTypes.includes(trendCenterFilterActType)) setTrendCenterFilterActType('ALL'); }, [tcFilterOptions.actTypes, trendCenterFilterActType]);
  useEffect(() => { if (trendCenterFilterSubLine !== 'ALL' && !tcFilterOptions.subLines.includes(trendCenterFilterSubLine)) setTrendCenterFilterSubLine('ALL'); }, [tcFilterOptions.subLines, trendCenterFilterSubLine]);
  useEffect(() => { if (trendCenterFilterComponent !== 'ALL' && !tcFilterOptions.components.includes(trendCenterFilterComponent)) setTrendCenterFilterComponent('ALL'); }, [tcFilterOptions.components, trendCenterFilterComponent]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const shiftMaster = useMemo(() => {
    const obj = {};
    shifts.forEach(s => { if (s.id) obj[s.id] = s; });
    return obj;
  }, [shifts]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const prodDateStr = useMemo(() => getProductionDate(new Date(), shiftMaster), [shiftMaster]);

  // --- Data Aggregators ---

  // 1. CORE OPERATIONAL 
  const coreStats = useMemo(() => {
    // Replaced internal today-override to fully allow Drill Down derived from Layout Filters
    const activeDataSet = submissions;
    const done = activeDataSet.filter(s => s.Status === 'Done').length;
    const pending = activeDataSet.filter(s => s.Status === 'Pending').length;
    const triggered = activeDataSet.length;
    
    // Activity Type Level Metrics (Target vs Actuals breakdown)
    const types = [...new Set([...checklists.map(c => c.Type_of_Activity), ...submissions.map(s => s.Type_of_Activity)].filter(Boolean))];
    const activityDetailGrid = types.map(t => {
      const alloc = checklists.filter(c => c.Type_of_Activity === t).length;
      const acts = submissions.filter(s => s.Type_of_Activity === t);
      return {
        name: t,
        allocated: alloc,
        done: acts.filter(a => a.Status === 'Done').length,
        pending: acts.filter(a => a.Status === 'Pending').length,
        wip: acts.filter(a => a.Status === 'WIP').length,
        hold: acts.filter(a => a.Status === 'Hold').length,
        support: acts.filter(a => a.Status === 'Support Required' || a.Status === 'Support').length
      };
    }).sort((a,b) => b.allocated - a.allocated);

    // Frequency-Wise Details Grid requested by USER
    const freqs = [...new Set([...checklists.map(c => c.Frequency), ...submissions.map(s => s.Frequency)].filter(Boolean))];
    const freqOrder = ['Shift-wise', 'Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Yearly'];
    const sortedFreqs = freqs.sort((a, b) => {
      const idxA = freqOrder.indexOf(a);
      const idxB = freqOrder.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    const frequencyDetailGrid = sortedFreqs.map(f => {
      const acts = submissions.filter(s => s.Frequency === f);
      const uniqueActsMap = {};
      acts.forEach(act => {
          const key = act.Document_Number || act.Checklist_ID || `${act.Line_Equipment}-${act.Type_of_Activity}-${act.Sub_Line_Equipment}-${act.Component}-${act.Activity_Description}`;
          if (!uniqueActsMap[key] || new Date(act.Date_Timestamp || act.Date) > new Date(uniqueActsMap[key].Date_Timestamp || uniqueActsMap[key].Date)) {
              uniqueActsMap[key] = act;
          }
      });
      const uniqueActs = Object.values(uniqueActsMap);
      
      const done = uniqueActs.filter(a => a.Status === 'Done').length;
      const wip = uniqueActs.filter(a => a.Status === 'WIP').length;
      const hold = uniqueActs.filter(a => a.Status === 'Hold').length;
      const support = uniqueActs.filter(a => a.Status === 'Support Required' || a.Status === 'Support').length;
      
      let alloc = checklists.filter(c => c.Frequency === f).length;
      alloc = Math.max(alloc, uniqueActs.length);
      const pending = alloc - (done + wip + hold + support);

      return {
        name: f,
        allocated: alloc,
        done,
        pending,
        wip,
        hold,
        support,
        isCumulative: false
      };
    });

    // Cumulative logic for frequency Detail
    const cumDone = frequencyDetailGrid.reduce((sum, r) => sum + r.done, 0);
    const cumWip = frequencyDetailGrid.reduce((sum, r) => sum + r.wip, 0);
    const cumHold = frequencyDetailGrid.reduce((sum, r) => sum + r.hold, 0);
    const cumSupport = frequencyDetailGrid.reduce((sum, r) => sum + r.support, 0);
    const cumAlloc = frequencyDetailGrid.reduce((sum, r) => sum + r.allocated, 0);
    const cumPending = cumAlloc - (cumDone + cumWip + cumHold + cumSupport);

    frequencyDetailGrid.push({
      name: 'Cumulative (Total)',
      allocated: cumAlloc,
      done: cumDone,
      pending: cumPending,
      wip: cumWip,
      hold: cumHold,
      support: cumSupport,
      isCumulative: true
    });

    // Shift Distribution
    const shiftDist = ['A','B','C','G'].map(s => ({
      shift: `Shift ${s}`,
      count: activeDataSet.filter(d => d.Shift === s || (s === 'G' && d.Shift === 'General')).length,
      done: activeDataSet.filter(d => (d.Shift === s || (s === 'G' && d.Shift === 'General')) && d.Status === 'Done').length
    }));

    // Type Distribution simple for small charts
    const typeBreakdown = activityDetailGrid.slice(0, 5).map(x => ({ name: x.name, count: x.done }));

    return { done, pending, triggered, shiftDist, typeBreakdown, activityDetailGrid, frequencyDetailGrid };
  }, [submissions, checklists, prodDateStr]);

  const lineEquipStats = useMemo(() => {
    let leChecklists = checklists;
    let leSubmissions = submissions;

    if (lineEquipFilterFreq !== 'ALL') {
      leChecklists = leChecklists.filter(c => c.Frequency === lineEquipFilterFreq);
      leSubmissions = leSubmissions.filter(s => s.Frequency === lineEquipFilterFreq);
    }
    if (lineEquipFilterActType !== 'ALL') {
      leChecklists = leChecklists.filter(c => c.Type_of_Activity === lineEquipFilterActType);
      leSubmissions = leSubmissions.filter(s => s.Type_of_Activity === lineEquipFilterActType);
    }
    if (lineEquipFilterSubLine !== 'ALL') {
      leChecklists = leChecklists.filter(c => c.Sub_Line_Equipment === lineEquipFilterSubLine);
      leSubmissions = leSubmissions.filter(s => s.Sub_Line_Equipment === lineEquipFilterSubLine);
    }
    if (lineEquipFilterComponent !== 'ALL') {
      leChecklists = leChecklists.filter(c => c.Component === lineEquipFilterComponent);
      leSubmissions = leSubmissions.filter(s => s.Component === lineEquipFilterComponent);
    }

    const lines = [...new Set([...leChecklists.map(c => c.Line_Equipment), ...leSubmissions.map(s => s.Line_Equipment)].filter(Boolean))].sort();

    const lineEquipDetailGrid = lines.map(line => {
      const acts = leSubmissions.filter(s => s.Line_Equipment === line);
      const uniqueActsMap = {};
      acts.forEach(act => {
          const key = act.Document_Number || act.Checklist_ID || `${act.Line_Equipment}-${act.Type_of_Activity}-${act.Sub_Line_Equipment}-${act.Component}-${act.Activity_Description}`;
          if (!uniqueActsMap[key] || new Date(act.Date_Timestamp || act.Date) > new Date(uniqueActsMap[key].Date_Timestamp || uniqueActsMap[key].Date)) {
              uniqueActsMap[key] = act;
          }
      });
      const uniqueActs = Object.values(uniqueActsMap);

      const done = uniqueActs.filter(a => a.Status === 'Done').length;
      const wip = uniqueActs.filter(a => a.Status === 'WIP').length;
      const hold = uniqueActs.filter(a => a.Status === 'Hold').length;
      const support = uniqueActs.filter(a => a.Status === 'Support Required' || a.Status === 'Support').length;

      let alloc = leChecklists.filter(c => c.Line_Equipment === line).length;
      alloc = Math.max(alloc, uniqueActs.length);
      const pending = alloc - (done + wip + hold + support);

      return {
        name: line,
        allocated: alloc,
        done,
        pending,
        wip,
        hold,
        support,
        isCumulative: false
      };
    }).sort((a, b) => b.allocated - a.allocated);

    const cumDoneLE = lineEquipDetailGrid.reduce((sum, r) => sum + r.done, 0);
    const cumWipLE = lineEquipDetailGrid.reduce((sum, r) => sum + r.wip, 0);
    const cumHoldLE = lineEquipDetailGrid.reduce((sum, r) => sum + r.hold, 0);
    const cumSupportLE = lineEquipDetailGrid.reduce((sum, r) => sum + r.support, 0);
    const cumAllocLE = lineEquipDetailGrid.reduce((sum, r) => sum + r.allocated, 0);
    const cumPendingLE = cumAllocLE - (cumDoneLE + cumWipLE + cumHoldLE + cumSupportLE);

    lineEquipDetailGrid.push({
      name: 'Cumulative (Total)',
      allocated: cumAllocLE,
      done: cumDoneLE,
      pending: cumPendingLE,
      wip: cumWipLE,
      hold: cumHoldLE,
      support: cumSupportLE,
      isCumulative: true
    });

    return { lineEquipDetailGrid };
  }, [checklists, submissions, lineEquipFilterFreq, lineEquipFilterActType, lineEquipFilterSubLine, lineEquipFilterComponent]);

  const filterOptions = useMemo(() => {
    const allData = [...checklists, ...submissions];
    const freqs = [...new Set(allData.map(d => d.Frequency).filter(Boolean))].sort();
    const actTypes = [...new Set(allData.map(d => d.Type_of_Activity).filter(Boolean))].sort();
    
    // Filter data for sub-lines based on selected activity type
    let dataForSubLine = allData;
    if (lineEquipFilterActType !== 'ALL') {
      dataForSubLine = dataForSubLine.filter(d => d.Type_of_Activity === lineEquipFilterActType);
    }
    const subLines = [...new Set(dataForSubLine.map(d => d.Sub_Line_Equipment).filter(Boolean))].sort();
    
    // Filter data for components based on selected activity type and sub-line
    let dataForComponent = dataForSubLine;
    if (lineEquipFilterSubLine !== 'ALL') {
      dataForComponent = dataForComponent.filter(d => d.Sub_Line_Equipment === lineEquipFilterSubLine);
    }
    const components = [...new Set(dataForComponent.map(d => d.Component).filter(Boolean))].sort();

    return { freqs, actTypes, subLines, components };
  }, [checklists, submissions, lineEquipFilterActType, lineEquipFilterSubLine]);

  // Handle cascading filter resets
  useEffect(() => {
    if (lineEquipFilterSubLine !== 'ALL' && !filterOptions.subLines.includes(lineEquipFilterSubLine)) {
      setLineEquipFilterSubLine('ALL');
    }
  }, [filterOptions.subLines, lineEquipFilterSubLine]);

  useEffect(() => {
    if (lineEquipFilterComponent !== 'ALL' && !filterOptions.components.includes(lineEquipFilterComponent)) {
      setLineEquipFilterComponent('ALL');
    }
  }, [filterOptions.components, lineEquipFilterComponent]);

  // 3. FREQUENCY COMPLIANCE
  const freqCompliance = useMemo(() => {
    const allUniqueFreqs = [...new Set([
      ...checklists.map(c => c.Frequency),
      ...submissions.map(s => s.Frequency)
    ].filter(Boolean))];

    return allUniqueFreqs.map(f => {
      const total = checklists.filter(c => c.Frequency === f).length;
      const compData = submissions.filter(s => s.Frequency === f && s.Status === 'Done').length;
      // Rough relative scale comparison, real fallback to calculated
      const rate = total > 0 ? Math.min(100, Math.round((compData / total) * 100)) : 0;
      return { name: f, rate, total, completed: compData };
    }).sort((a,b) => b.total - a.total);
  }, [submissions, checklists]);

  // 4. USER PRODUCTIVITY
  const userStats = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      let u = s.Submitted_By || '';
      u = u.trim();
      if (!u || u === '()') u = 'System/Anon';
      
      if (!map[u]) {
        let name = '';
        let empId = '';
        const match = u.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          name = match[1].trim();
          empId = match[2].trim();
        } else {
          name = u;
        }
        
        if (!name && empId) {
          const empRecord = employees.find(e => String(e.Employee_ID) === String(empId));
          if (empRecord && empRecord.Employee_Name) {
            name = empRecord.Employee_Name;
          } else {
            name = `Employee ID: ${empId}`;
          }
        }
        
        if (!name) name = 'System/Anon';

        let department = 'Operations';
        if (empId) {
          const empRecord = employees.find(e => String(e.Employee_ID) === String(empId));
          if (empRecord && (empRecord.Department || empRecord.department)) {
            department = empRecord.Department || empRecord.department;
          }
        }
        if (department === 'Operations' && name) {
          const empRecord = employees.find(e => String(e.Employee_Name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase());
          if (empRecord && (empRecord.Department || empRecord.department)) {
            department = empRecord.Department || empRecord.department;
          }
        }
        if (s.Department && s.Department !== '-' && s.Department !== 'Unknown') department = s.Department;

        map[u] = { name, department, completed: 0, total: 0 };
      }
      
      map[u].total++;
      if (s.Status === 'Done' || s.Status === 'OK') map[u].completed++;
    });
    return Object.values(map).sort((a,b) => b.completed - a.completed).slice(0, 6);
  }, [submissions, employees]);

  // 5. DOCUMENT LEVEL COMPLIANCE (With revision number for effectiveness tracking)
  const docCompliance = useMemo(() => {
    const docs = [...new Set(submissions.map(s => s.Document_Number).filter(d => d && d !== '-'))];
    return docs.slice(0, 8).map(d => {
      const logs = submissions.filter(s => s.Document_Number === d);
      const sample = logs[0] || {};
      const rev = sample.Revision_Number || sample.Rev || sample.Revision || '0';
      const done = logs.filter(s => s.Status === 'Done' || s.Status === 'OK').length;
      return { 
        doc: `${d} (Rev:${rev})`, 
        rawDoc: d, 
        rev: rev, 
        rate: logs.length > 0 ? Math.round((done / logs.length) * 100) : 0, 
        done, 
        total: logs.length 
      };
    });
  }, [submissions]);

  // 6. HOURLY HEATMAP LOGIC (TIME BASED)
  const hourlyHeatMap = useMemo(() => {
    const heat = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, submissions: 0 }));
    submissions.forEach(s => {
      if(s.Date_Timestamp) {
        const h = new Date(s.Date_Timestamp).getHours();
        heat[h].submissions++;
      }
    });
    return heat;
  }, [submissions]);

  // 7. LINE RELIABILITY (Real mathematical execution efficiency: Completed triggered submissions / Total triggered submissions)
  const lineReliability = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      const ln = s.Line_Equipment || 'Unknown';
      if(!map[ln]) map[ln] = { line: ln, total: 0, completed: 0 };
      map[ln].total++;
      if(s.Status === 'Done') map[ln].completed++;
    });
    return Object.values(map).map(l => ({
      ...l,
      efficiency: l.total > 0 ? Math.round((l.completed / l.total) * 100) : 0
    })).sort((a,b) => a.efficiency - b.efficiency).slice(0, 5);
  }, [submissions]);

  // 8. EXCEPTION STATS
  const exceptionStats = useMemo(() => {
    const shiftCOverlapCount = submissions.filter(s => {
      const t = new Date(s.Date_Timestamp || s.Date);
      return t.getHours() >= 0 && t.getHours() < 6;
    }).length;
    const stuckCount = submissions.filter(s => s.Status === 'WIP').length;
    return { shiftCOverlapCount, stuckCount };
  }, [submissions]);

  // 8b. LAGGING ACTIVITIES (BACKWARD HIERARCHY PENDING CLUSTERS)
  const laggingActivities = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      const key = `${s.Type_of_Activity}|${s.Line_Equipment}|${s.Sub_Line_Equipment}|${s.Component}|${s.Activity_Description}`.toLowerCase().trim();
      if (!map[key]) {
        map[key] = { 
          type: s.Type_of_Activity || 'Unspecified Type',
          line: s.Line_Equipment || 'Unspecified Line',
          subLine: s.Sub_Line_Equipment || 'Unspecified Sub-line',
          comp: s.Component || 'Unspecified Component',
          desc: s.Activity_Description || 'Unspecified Activity',
          total: 0,
          done: 0
        };
      }
      map[key].total++;
      if (s.Status === 'Done') map[key].done++;
    });

    return Object.values(map)
      .map(item => {
        const pendingCount = item.total - item.done;
        const failPct = Math.round((pendingCount / item.total) * 100);
        return { ...item, pendingCount, failPct };
      })
      .filter(item => item.failPct > 30 && item.total > 1)
      .sort((a, b) => b.failPct - a.failPct || b.pendingCount - a.pendingCount)
      .slice(0, 5);
  }, [submissions]);

  // 9. GLOBAL KPI SUMMARY
  const globalKPI = useMemo(() => {
    const done = submissions.filter(s => s.Status === 'Done').length;
    const total = submissions.length;
    const complPct = total ? Math.round((done / total) * 100) : 100;
    
    const shiftsPerf = ['A','B','C'].map(s => {
      const data = submissions.filter(d => d.Shift === s);
      const doneSub = data.filter(d => d.Status === 'Done').length;
      return { s, rate: data.length ? Math.round((doneSub / data.length) * 100) : 0 };
    });
    const bestShift = shiftsPerf.sort((a,b) => b.rate - a.rate)[0]?.s || 'A';
    const worstLine = lineReliability[0]?.line || 'N/A';

    return { complPct, bestShift, worstLine, overdue: total - done };
  }, [submissions, lineReliability]);

  const cardHeaderStyle = { display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem', color: '#1E293B' };
  const subTitleStyle = { fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, color: '#64748B', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem', width: '100%', overflowX: 'hidden' }}>
      
      {/* SECTIONS 1, 2, 3: All-in-One Operations Matrix Dashboard */}
      <AllInOneOperationsMatrix submissions={submissions} checklists={checklists} />

      {/* SECTION 4: Document / SOP Wise Audit Readiness (Effectiveness & Revision Tracking) */}
      <Section4DocReadiness submissions={submissions} checklists={checklists} />

      {/* SECTION 5: Peak Execution Hours (Time Distribution) */}
      <Section5PeakExecutionHours submissions={submissions} checklists={checklists} employees={employees} />

      {/* SECTION 6: Top Performers Productivity Table */}
      <Section6TopPerformers submissions={submissions} checklists={checklists} employees={employees} />

      {/* SECTION 7: Trend - Frequency Performance & Activity Completion */}
      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <SingleLevel4Chart submissions={submissions} checklists={checklists} />
      </div>

      {/* SECTION 8: Average Support Turnaround Time (TAT) Table (Best & Worst 5) */}
      <Section8SupportTAT submissions={submissions} checklists={checklists} employees={employees} />

      {/* SECTION 9: Activity & Compliance Matrix (Line / Sub-Line / Component) */}
      <Section9ActivityCompliance submissions={submissions} checklists={checklists} employees={employees} />
    </div>
  );
};

export { Section10AgingReport, Section11ReviewerPerformance };
export default AdvancedAnalyticsDashboard;
