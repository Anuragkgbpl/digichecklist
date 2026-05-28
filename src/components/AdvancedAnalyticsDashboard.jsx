import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, Clock, CheckCircle, AlertTriangle, ShieldCheck, Users, 
  Layers, Activity, FileClock, Search, Calendar, Zap, Map, Settings,
  ChevronUp, ChevronDown, Filter
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  ScatterChart, ZAxis, Scatter, ComposedChart
} from 'recharts';
import { useData } from '../context/DataContext';
import { getProductionDate, getFrequencyPeriodRange, getCurrentShift } from '../utils/shiftUtils';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
const STATUS_COLORS = { Done: '#10B981', WIP: '#3B82F6', Hold: '#F59E0B', Overdue: '#EF4444', Pending: '#94A3B8' };

// Helper Component for Shuffling Frequency Trend Line Graphs (Extracted to Top Level to prevent re-creation cycles)
const DynamicDimensionTrend = ({ title, pivotKey, icon: Icon, submissions, checklists }) => {
  const [activeFreq, setActiveFreq] = useState('ALL');
  const [trendDays, setTrendDays] = useState(7);
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSubLine, setFilterSubLine] = useState('ALL');
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showLocalFilters, setShowLocalFilters] = useState(true);

  const lines = useMemo(() => [...new Set(submissions.map(s => s.Line_Equipment).filter(Boolean))].sort(), [submissions]);
  const subLines = useMemo(() => [...new Set(submissions.filter(s => (filterLine === 'ALL' || s.Line_Equipment === filterLine)).map(s => s.Sub_Line_Equipment).filter(Boolean))].sort(), [submissions, filterLine]);
  const components = useMemo(() => [...new Set(submissions.filter(s => (filterLine === 'ALL' || s.Line_Equipment === filterLine) && (filterSubLine === 'ALL' || s.Sub_Line_Equipment === filterSubLine)).map(s => s.Component).filter(Boolean))].sort(), [submissions, filterLine, filterSubLine]);
  const freqs = useMemo(() => {
    return [...new Set([
      'Daily', 'Shift-wise', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly',
      ...submissions.map(s => s.Frequency),
      ...(checklists || []).map(c => c.Frequency)
    ].filter(Boolean))].sort();
  }, [submissions, checklists]);

  useEffect(() => { if(filterSubLine !== 'ALL' && !subLines.includes(filterSubLine)) setFilterSubLine('ALL'); }, [subLines, filterSubLine]);
  useEffect(() => { if(filterComponent !== 'ALL' && !components.includes(filterComponent)) setFilterComponent('ALL'); }, [components, filterComponent]);

  const trend = useMemo(() => {
    const dates = Array.from({ length: trendDays }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - ((trendDays - 1) - i));
      return d.toISOString().split('T')[0];
    });

    let source = submissions;
    
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
      const row = { name: label };
      
      const targetStatus = (filterStatus && filterStatus !== 'ALL') ? filterStatus : 'Done';
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
  }, [activeFreq, trendDays, filterLine, filterSubLine, filterComponent, filterStatus, submissions, pivotKey]);

  const localSelectStyle = { 
    width: '100%', 
    padding: '0.4rem', 
    borderRadius: '6px', 
    border: '1px solid #CBD5E1', 
    fontSize: '0.75rem', 
    color: '#334155', 
    backgroundColor: '#FFF', 
    outline: 'none',
    fontWeight: 600,
    cursor: 'pointer'
  };

  return (
    <div className="card" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 800, color: '#1E293B' }}>
            {Icon && <Icon size={18} color="#6366F1" />} {title}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => setShowLocalFilters(!showLocalFilters)} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: showLocalFilters ? '#6366F1' : '#FFF',
                color: showLocalFilters ? '#FFF' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Filter size={12} /> {showLocalFilters ? 'Hide Filters' : 'Layout Filters'}
              {showLocalFilters ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            <button 
              onClick={() => {
                setTrendDays(7);
                setActiveFreq('ALL');
                setFilterLine('ALL');
                setFilterSubLine('ALL');
                setFilterComponent('ALL');
                setFilterStatus('ALL');
              }} 
              style={{
                background: 'none',
                border: 'none',
                color: '#6366F1',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {showLocalFilters && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            marginTop: '0.5rem'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Trend Duration</label>
              <select value={trendDays} onChange={e => setTrendDays(Number(e.target.value))} style={localSelectStyle}>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Frequency</label>
              <select value={activeFreq} onChange={e => setActiveFreq(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Frequencies</option>
                {freqs.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Line / Equip</label>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Lines</option>
                {lines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Sub-Line</label>
              <select value={filterSubLine} onChange={e => setFilterSubLine(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Sub-Lines</option>
                {subLines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Component</label>
              <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)} style={localSelectStyle}>
                <option value="ALL">All Components</option>
                {components.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Status</label>
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic' }}>
          No trend data identified for selected filters.
        </div>
      ) : (
        <div style={{ height: '220px', width: '100%', marginTop: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.chartData} margin={{ top: 5, right: 10, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
              {trend.topEntities.map((ent, i) => (
                <Line key={ent} type="monotone" dataKey={ent} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name={ent} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const SingleLevel4Chart = ({ submissions, checklists }) => {
  const pivotKey = 'Frequency';
  const IconComponent = Calendar;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <DynamicDimensionTrend title="Trend: Frequency" pivotKey={pivotKey} icon={IconComponent} submissions={submissions} checklists={checklists} />
    </div>
  );
};

const AdvancedAnalyticsDashboard = ({ preFilteredData, baseChecklists }) => {
  const { submissions: rawAllSub = [], checklists: rawAllCheck = [], shifts = [], employees = [] } = useData();
  // Use props passed from filtered parent dashboard, fallback safely
  const submissions = preFilteredData !== undefined ? preFilteredData : rawAllSub;
  const checklists = baseChecklists !== undefined ? baseChecklists : rawAllCheck;

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
        map[u] = { name, completed: 0, total: 0 };
      }
      
      map[u].total++;
      if (s.Status === 'Done') map[u].completed++;
    });
    return Object.values(map).sort((a,b) => b.completed - a.completed).slice(0, 6);
  }, [submissions, employees]);

  // 5. DOCUMENT LEVEL COMPLIANCE
  const docCompliance = useMemo(() => {
    const docs = [...new Set(submissions.map(s => s.Document_Number).filter(d => d && d !== '-'))];
    return docs.slice(0, 8).map(d => {
      const logs = submissions.filter(s => s.Document_Number === d);
      const done = logs.filter(s => s.Status === 'Done').length;
      return { doc: d, rate: Math.round((done / logs.length) * 100) };
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
      
      {/* ================= LEVEL 1: MANAGEMENT SCORECARD ================= */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Zap size={22} fill="#6366F1" color="#6366F1" />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>LEVEL 1: Executive Command Scorecard</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ background: 'white', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <span style={subTitleStyle}>Best Performing Shift</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1E293B' }}>Shift {globalKPI.bestShift}</div>
            <div style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem' }}>🏆 Leading efficiency</div>
          </div>

          <div className="card" style={{ background: 'white', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
            <span style={subTitleStyle}>Worst Reliability Line</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EF4444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{globalKPI.worstLine}</div>
            <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '0.5rem' }}>⚠️ Action required immediately</div>
          </div>

          <div className="card" style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', padding: '1.5rem' }}>
            <span style={{ ...subTitleStyle, color: '#991B1B' }}>Accumulated Overdue</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#DC2626' }}>{globalKPI.overdue}</div>
            <div style={{ color: '#B91C1C', fontSize: '0.8rem', marginTop: '0.5rem' }}>Tasks behind schedule</div>
          </div>
        </div>

        {/* Frequency Compliance & Detailed Backlog */}
        <div className="card" style={{ marginTop: '1.5rem', borderTop: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <div style={{ ...cardHeaderStyle, border: 'none', padding: 0, marginBottom: '1rem' }}>
            <Layers size={18} color="#6366F1" /> Frequency-Wise Realization & Detailed Backlog 
          </div>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {coreStats.frequencyDetailGrid.map(row => {
                const completedRate = Math.min(100, row.allocated > 0 ? Math.round((row.done / row.allocated) * 100) : 0);
                const isCum = row.isCumulative;
                return (
                  <div key={row.name} style={{ border: isCum ? '2px solid #3B82F6' : '1px solid #E2E8F0', borderRadius: '10px', padding: '0.85rem', backgroundColor: isCum ? '#EFF6FF' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontWeight: isCum ? 800 : 700, fontSize: '0.85rem', color: isCum ? '#1E3A8A' : '#334155' }}>{row.name}</span>
                      <span style={{ fontSize: '0.75rem', color: isCum ? '#1D4ED8' : '#64748B', fontWeight: 800 }}>{completedRate}% Done</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <div style={{ width: `${completedRate}%`, height: '100%', backgroundColor: isCum ? '#2563EB' : '#6366F1' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                      <div style={{ background: '#F8FAFC', padding: '0.4rem', borderRadius: '6px' }}><div style={{color: '#64748B', fontSize: '0.6rem'}}>Alloc</div>{row.allocated}</div>
                      <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.4rem', borderRadius: '6px' }}><div style={{fontSize: '0.6rem'}}>Done</div>{row.done} <span style={{display: 'block', fontSize: '0.55rem', opacity: 0.8}}>({row.allocated > 0 ? Math.round((row.done/row.allocated)*100) : 0}%)</span></div>
                      <div style={{ background: '#EFF6FF', color: '#2563EB', padding: '0.4rem', borderRadius: '6px' }}><div style={{fontSize: '0.6rem'}}>WIP</div>{row.wip || 0} <span style={{display: 'block', fontSize: '0.55rem', opacity: 0.8}}>({row.allocated > 0 ? Math.round((row.wip/row.allocated)*100) : 0}%)</span></div>
                      <div style={{ background: '#FFFBEB', color: '#D97706', padding: '0.4rem', borderRadius: '6px' }}><div style={{fontSize: '0.6rem'}}>Hold</div>{row.hold || 0} <span style={{display: 'block', fontSize: '0.55rem', opacity: 0.8}}>({row.allocated > 0 ? Math.round((row.hold/row.allocated)*100) : 0}%)</span></div>
                      <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.4rem', borderRadius: '6px' }}><div style={{fontSize: '0.6rem'}}>Support</div>{row.support || 0} <span style={{display: 'block', fontSize: '0.55rem', opacity: 0.8}}>({row.allocated > 0 ? Math.round((row.support/row.allocated)*100) : 0}%)</span></div>
                      <div style={{ background: '#F8FAFC', color: '#64748B', padding: '0.4rem', borderRadius: '6px' }}><div style={{fontSize: '0.6rem'}}>Pend</div>{row.pending || 0} <span style={{display: 'block', fontSize: '0.55rem', opacity: 0.8}}>({row.allocated > 0 ? Math.round((row.pending/row.allocated)*100) : 0}%)</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="table-container-responsive" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', color: '#475569' }}>
                    <th style={{ padding: '0.6rem 1rem', borderRadius: '6px 0 0 6px' }}>Frequency / Period</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center' }}>Allocated (Baseline)</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', color: '#10B981' }}>Completed</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', color: '#3B82F6' }}>WIP</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', color: '#F59E0B' }}>Hold</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', color: '#EF4444' }}>Support Req.</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', color: '#94A3B8' }}>Pending</th>
                    <th style={{ padding: '0.6rem 1rem', textAlign: 'right', borderRadius: '0 6px 6px 0' }}>Effort Share</th>
                  </tr>
                </thead>
                <tbody>
                  {coreStats.frequencyDetailGrid.map(row => {
                    const completedRate = Math.min(100, row.allocated > 0 ? Math.round((row.done / row.allocated) * 100) : 0);
                    const isCum = row.isCumulative;
                    return (
                      <tr key={row.name} style={{ 
                        borderBottom: isCum ? 'none' : '1px solid #F1F5F9', 
                        backgroundColor: isCum ? '#EFF6FF' : 'transparent',
                        fontWeight: isCum ? 700 : 400,
                        borderTop: isCum ? '2px solid #3B82F6' : 'none'
                      }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: isCum ? '#1E3A8A' : '#334155' }}>{row.name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>{row.allocated}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
                            <span style={{ background: '#DCFCE7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>{row.done}</span>
                            <span style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 600 }}>({row.allocated > 0 ? Math.round((row.done / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', color: row.wip > 0 ? '#2563EB' : '#CBD5E1', fontWeight: row.wip > 0 ? 700 : 400 }}>
                            <span>{row.wip || 0}</span>
                            <span style={{ fontSize: '0.65rem' }}>({row.allocated > 0 ? Math.round((row.wip / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', color: row.hold > 0 ? '#D97706' : '#CBD5E1', fontWeight: row.hold > 0 ? 700 : 400 }}>
                            <span>{row.hold || 0}</span>
                            <span style={{ fontSize: '0.65rem' }}>({row.allocated > 0 ? Math.round((row.hold / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', color: row.support > 0 ? '#DC2626' : '#CBD5E1', fontWeight: row.support > 0 ? 700 : 400 }}>
                            <span>{row.support || 0}</span>
                            <span style={{ fontSize: '0.65rem' }}>({row.allocated > 0 ? Math.round((row.support / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', color: isCum ? '#1E3A8A' : '#64748B', fontWeight: 600 }}>
                            <span>{row.pending || 0}</span>
                            <span style={{ fontSize: '0.65rem' }}>({row.allocated > 0 ? Math.round((row.pending / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <div style={{ width: '60px', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${completedRate}%`, height: '100%', backgroundColor: isCum ? '#2563EB' : '#6366F1' }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: isCum ? '#1E3A8A' : '#64748B', width: '30px' }}>{completedRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Line / Equip Wise Realization & Detailed Backlog */}
        <div className="card" style={{ marginTop: '1.5rem', borderTop: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <div style={{ ...cardHeaderStyle, border: 'none', padding: 0, marginBottom: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Layers size={18} color="#10B981" /> Line / Equip-Wise Realization & Detailed Backlog
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select 
                value={lineEquipFilterFreq} 
                onChange={e => setLineEquipFilterFreq(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFF', minWidth: '120px' }}
              >
                <option value="ALL">Frequency: ALL</option>
                {filterOptions.freqs.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <select 
                value={lineEquipFilterActType} 
                onChange={e => setLineEquipFilterActType(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFF', minWidth: '120px' }}
              >
                <option value="ALL">Activity Type: ALL</option>
                {filterOptions.actTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <select 
                value={lineEquipFilterSubLine} 
                onChange={e => setLineEquipFilterSubLine(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFF', minWidth: '120px' }}
              >
                <option value="ALL">Sub-Line: ALL</option>
                {filterOptions.subLines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <select 
                value={lineEquipFilterComponent} 
                onChange={e => setLineEquipFilterComponent(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFF', minWidth: '120px' }}
              >
                <option value="ALL">Component: ALL</option>
                {filterOptions.components.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {lineEquipStats.lineEquipDetailGrid.map(row => {
                const completedRate = Math.min(100, row.allocated > 0 ? Math.round((row.done / row.allocated) * 100) : 0);
                const isCum = row.isCumulative;
                return (
                  <div key={row.name} style={{ border: isCum ? '2px solid #10B981' : '1px solid #E2E8F0', borderRadius: '10px', padding: '0.85rem', backgroundColor: isCum ? '#ECFDF5' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontWeight: isCum ? 800 : 700, fontSize: '0.85rem', color: isCum ? '#065F46' : '#334155' }}>{row.name}</span>
                      <span style={{ fontSize: '0.75rem', color: isCum ? '#047857' : '#64748B', fontWeight: 800 }}>{completedRate}% Done</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <div style={{ width: `${completedRate}%`, height: '100%', backgroundColor: isCum ? '#059669' : '#10B981' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                      <div style={{ background: '#F8FAFC', padding: '0.4rem', borderRadius: '6px' }}><div style={{color: '#64748B', fontSize: '0.6rem'}}>Alloc</div>{row.allocated}</div>
                      <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.4rem', borderRadius: '6px' }}><div style={{fontSize: '0.6rem'}}>Done</div>{row.done} <span style={{display: 'block', fontSize: '0.55rem', opacity: 0.8}}>({row.allocated > 0 ? Math.round((row.done/row.allocated)*100) : 0}%)</span></div>
                      <div style={{ background: '#EFF6FF', color: '#2563EB', padding: '0.4rem', borderRadius: '6px' }}><div style={{fontSize: '0.6rem'}}>WIP</div>{row.wip || 0} <span style={{display: 'block', fontSize: '0.55rem', opacity: 0.8}}>({row.allocated > 0 ? Math.round((row.wip/row.allocated)*100) : 0}%)</span></div>
                      <div style={{ background: '#FFFBEB', color: '#D97706', padding: '0.4rem', borderRadius: '6px' }}><div style={{fontSize: '0.6rem'}}>Hold</div>{row.hold || 0} <span style={{display: 'block', fontSize: '0.55rem', opacity: 0.8}}>({row.allocated > 0 ? Math.round((row.hold/row.allocated)*100) : 0}%)</span></div>
                      <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.4rem', borderRadius: '6px' }}><div style={{fontSize: '0.6rem'}}>Support</div>{row.support || 0} <span style={{display: 'block', fontSize: '0.55rem', opacity: 0.8}}>({row.allocated > 0 ? Math.round((row.support/row.allocated)*100) : 0}%)</span></div>
                      <div style={{ background: '#F8FAFC', color: '#64748B', padding: '0.4rem', borderRadius: '6px' }}><div style={{fontSize: '0.6rem'}}>Pend</div>{row.pending || 0} <span style={{display: 'block', fontSize: '0.55rem', opacity: 0.8}}>({row.allocated > 0 ? Math.round((row.pending/row.allocated)*100) : 0}%)</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="table-container-responsive" style={{ maxHeight: '400px', overflowX: 'auto', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '800px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#F8FAFC' }}>
                  <tr style={{ color: '#475569' }}>
                    <th style={{ padding: '0.6rem 1rem', borderRadius: '6px 0 0 6px', backgroundColor: '#F8FAFC' }}>Line / Equipment</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', backgroundColor: '#F8FAFC' }}>Allocated</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', color: '#10B981', backgroundColor: '#F8FAFC' }}>Completed</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', color: '#3B82F6', backgroundColor: '#F8FAFC' }}>WIP</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', color: '#F59E0B', backgroundColor: '#F8FAFC' }}>Hold</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', color: '#EF4444', backgroundColor: '#F8FAFC' }}>Support Req.</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center', color: '#94A3B8', backgroundColor: '#F8FAFC' }}>Pending</th>
                    <th style={{ padding: '0.6rem 1rem', textAlign: 'right', borderRadius: '0 6px 6px 0', backgroundColor: '#F8FAFC' }}>Effort Share</th>
                  </tr>
                </thead>
                <tbody>
                  {lineEquipStats.lineEquipDetailGrid.map(row => {
                    const completedRate = Math.min(100, row.allocated > 0 ? Math.round((row.done / row.allocated) * 100) : 0);
                    const isCum = row.isCumulative;
                    return (
                      <tr key={row.name} style={{ 
                        borderBottom: isCum ? 'none' : '1px solid #F1F5F9', 
                        backgroundColor: isCum ? '#ECFDF5' : 'transparent',
                        fontWeight: isCum ? 700 : 400,
                        borderTop: isCum ? '2px solid #10B981' : 'none'
                      }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: isCum ? '#065F46' : '#334155' }}>{row.name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>{row.allocated}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
                            <span style={{ background: '#DCFCE7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>{row.done}</span>
                            <span style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 600 }}>({row.allocated > 0 ? Math.round((row.done / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', color: row.wip > 0 ? '#2563EB' : '#CBD5E1', fontWeight: row.wip > 0 ? 700 : 400 }}>
                            <span>{row.wip || 0}</span>
                            <span style={{ fontSize: '0.65rem' }}>({row.allocated > 0 ? Math.round((row.wip / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', color: row.hold > 0 ? '#D97706' : '#CBD5E1', fontWeight: row.hold > 0 ? 700 : 400 }}>
                            <span>{row.hold || 0}</span>
                            <span style={{ fontSize: '0.65rem' }}>({row.allocated > 0 ? Math.round((row.hold / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', color: row.support > 0 ? '#DC2626' : '#CBD5E1', fontWeight: row.support > 0 ? 700 : 400 }}>
                            <span>{row.support || 0}</span>
                            <span style={{ fontSize: '0.65rem' }}>({row.allocated > 0 ? Math.round((row.support / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', color: isCum ? '#065F46' : '#64748B', fontWeight: 600 }}>
                            <span>{row.pending || 0}</span>
                            <span style={{ fontSize: '0.65rem' }}>({row.allocated > 0 ? Math.round((row.pending / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <div style={{ width: '60px', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${completedRate}%`, height: '100%', backgroundColor: isCum ? '#059669' : '#10B981' }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: isCum ? '#065F46' : '#64748B', width: '30px' }}>{completedRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Backward Hierarchy Worst Offenders Highlighting */}
        {laggingActivities.length > 0 && (
          <div className="card" style={{ marginTop: '1.5rem', border: '1.5px solid #FCA5A5', backgroundColor: '#FFF5F5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B91C1C', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={18} color="#DC2626" /> ⚠️ High Risk Operations Spotlight (Worst-Performing Activity Clusters)
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#991B1B', lineHeight: 1.4 }}>
              The following critical activities fail verification checks or remain pending on a <strong>majority of occasions</strong> (&gt;30% Fail Rate). Immediate engineering or supervisory audit is required.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {laggingActivities.map((act, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.8rem', backgroundColor: '#FFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #FEE2E2', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B' }}>{act.desc}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap', fontSize: '0.7rem' }}>
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>BACKWARD HIERARCHY:</span>
                      <span style={{ color: '#475569', fontWeight: 600 }}>{act.line}</span>
                      <span style={{ color: '#94A3B8' }}>❯</span>
                      <span style={{ color: '#475569' }}>{act.subLine}</span>
                      <span style={{ color: '#94A3B8' }}>❯</span>
                      <span style={{ color: '#475569', fontStyle: 'italic' }}>{act.comp}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#B91C1C' }}>{act.failPct}% Non-Done</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748B' }}>{act.pendingCount} of {act.total} tasks missed</div>
                    </div>
                    <span style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 }}>AUDIT REQUIRED</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= TREND ANALYTICS ENGINE (MULTI-PIVOT) ================= */}
      <div className="card" style={{ borderTop: '4px solid #6366F1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
              <TrendingUp size={20} color="#6366F1" /> 7-Day Multidimensional Trend Center
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', background: '#F1F5F9', padding: '0.3rem', borderRadius: '8px' }}>
            {[
              { id: 'shift', label: 'By Shift' },
              { id: 'frequency', label: 'By Frequency' },
              { id: 'doc', label: 'By Document' }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setTrendPivot(btn.id)}
                style={{ 
                  border: 'none', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: trendPivot === btn.id ? '#FFF' : 'transparent',
                  boxShadow: trendPivot === btn.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  color: trendPivot === btn.id ? '#6366F1' : '#64748B'
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={trendCenterFilterLine} onChange={e => setTrendCenterFilterLine(e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFF' }}>
              <option value="ALL">Line: ALL</option>
              {tcFilterOptions.lines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select value={trendCenterFilterActType} onChange={e => setTrendCenterFilterActType(e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFF' }}>
              <option value="ALL">Activity Type: ALL</option>
              {tcFilterOptions.actTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select value={trendCenterFilterSubLine} onChange={e => setTrendCenterFilterSubLine(e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFF' }}>
              <option value="ALL">Sub-Line: ALL</option>
              {tcFilterOptions.subLines.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select value={trendCenterFilterComponent} onChange={e => setTrendCenterFilterComponent(e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFF' }}>
              <option value="ALL">Component: ALL</option>
              {tcFilterOptions.components.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>

        <div style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={(() => {
              let filteredSubs = submissions;
              if (trendCenterFilterLine !== 'ALL') filteredSubs = filteredSubs.filter(s => s.Line_Equipment === trendCenterFilterLine);
              if (trendCenterFilterActType !== 'ALL') filteredSubs = filteredSubs.filter(s => s.Type_of_Activity === trendCenterFilterActType);
              if (trendCenterFilterSubLine !== 'ALL') filteredSubs = filteredSubs.filter(s => s.Sub_Line_Equipment === trendCenterFilterSubLine);
              if (trendCenterFilterComponent !== 'ALL') filteredSubs = filteredSubs.filter(s => s.Component === trendCenterFilterComponent);

              const past7Dates = [...new Set(filteredSubs.map(s => s.Date).filter(Boolean))].sort().slice(-7);
              
              let pivotKey = 'Shift';
              if(trendPivot === 'frequency') pivotKey = 'Frequency';
              if(trendPivot === 'doc') pivotKey = 'Document_Number';

              const pivotEntries = [...new Set(filteredSubs.map(s => s[pivotKey] || 'Unknown'))].filter(x => x !== '-').slice(0, 5);

              return past7Dates.map(dt => {
                const dayLogs = filteredSubs.filter(s => s.Date === dt && s.Status === 'Done');
                const row = { name: dt };
                pivotEntries.forEach(entry => {
                  row[entry] = dayLogs.filter(l => l[pivotKey] === entry).length;
                });
                return row;
              });
            })()}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 500 }} />
              {(() => {
                let filteredSubs = submissions;
                if (trendCenterFilterLine !== 'ALL') filteredSubs = filteredSubs.filter(s => s.Line_Equipment === trendCenterFilterLine);
                if (trendCenterFilterActType !== 'ALL') filteredSubs = filteredSubs.filter(s => s.Type_of_Activity === trendCenterFilterActType);
                if (trendCenterFilterSubLine !== 'ALL') filteredSubs = filteredSubs.filter(s => s.Sub_Line_Equipment === trendCenterFilterSubLine);
                if (trendCenterFilterComponent !== 'ALL') filteredSubs = filteredSubs.filter(s => s.Component === trendCenterFilterComponent);

                let pivotKey = 'Shift';
                if(trendPivot === 'frequency') pivotKey = 'Frequency';
                if(trendPivot === 'doc') pivotKey = 'Document_Number';
                const pivotEntries = [...new Set(filteredSubs.map(s => s[pivotKey] || 'Unknown'))].filter(x => x !== '-').slice(0, 5);
                
                return pivotEntries.map((entry, idx) => (
                  <Line key={entry} type="monotone" dataKey={entry} stroke={COLORS[idx % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                ));
              })()}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= LEVEL 2: OPERATIONS ANALYTICS ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={22} fill="#10B981" color="#10B981" />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>LEVEL 2: Operational Control & Audits</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
          {/* Frequency Compliance */}
          <div className="card">
            <div style={cardHeaderStyle}><Calendar size={18} color="#3B82F6" /> Frequency Compliance (Target vs Result)</div>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={freqCompliance} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={40}>
                    {freqCompliance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.rate < 70 ? '#EF4444' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Document Compliance */}
          <div className="card">
            <div style={cardHeaderStyle}><ShieldCheck size={18} color="#10B981" /> Document / SOP Wise Audit Readiness</div>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={docCompliance} margin={{ left: -15, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="doc" fontSize={9} tickLine={false} angle={-15} />
                  <YAxis fontSize={11} axisLine={false} unit="%" />
                  <Tooltip />
                  <Area type="monotone" dataKey="rate" stroke="#10B981" fill="#10B981" fillOpacity={0.2} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line reliability heat list */}
          <div className="card">
            <div style={cardHeaderStyle}><Map size={18} color="#8B5CF6" /> Machine & Line Reliability Ranking</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lineReliability.length === 0 ? <div style={{ color: '#64748B', fontSize: '0.8rem' }}>No Line Reliability data available</div> :
                lineReliability.map((l, i) => (
                  <div key={i} style={{ backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{l.line}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '100px', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ width: `${l.efficiency}%`, height: '100%', backgroundColor: l.efficiency > 80 ? '#10B981' : '#F59E0B' }} />
                      </div>
                      <strong style={{ fontSize: '0.85rem', color: l.efficiency < 60 ? '#EF4444' : '#475569' }}>{l.efficiency}%</strong>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= LEVEL 3: EXECUTION & TIME HEATMAP ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={22} fill="#F59E0B" color="#F59E0B" />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>LEVEL 3: Execution Depth & Anomaly Tracking</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
          
          {/* Peak Submission Heatmap */}
          <div className="card" style={{ gridColumn: 'span 1' }}>
            <div style={cardHeaderStyle}><Clock size={18} color="#6366F1" /> Shift Hour Activity Intensity (Daily Rhythm)</div>
            <div style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={hourlyHeatMap} margin={{ left: -20 }}>
                  <XAxis dataKey="hour" fontSize={10} axisLine={false} tickLine={false} interval={2} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="submissions" fill="#E0E7FF" stroke="#6366F1" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User leaderboard */}
          <div className="card">
            <div style={cardHeaderStyle}><Users size={18} color="#10B981" /> Top Performers Productivity Table</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Name</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Tasks</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((u, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>{u.total}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: '#10B981', fontWeight: 700 }}>{u.completed} Done</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ================= LEVEL 4: GRANULAR MULTI-DIMENSION DAILY TRENDS ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={22} fill="#6366F1" color="#6366F1" />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>LEVEL 4: Multi-Dimension Completion Performance (Trend Analysis)</h2>
        </div>

        <div style={{ width: '100%' }}>
          <SingleLevel4Chart submissions={submissions} checklists={checklists} />
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
