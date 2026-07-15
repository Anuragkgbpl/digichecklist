import React, { useState, useMemo, useEffect } from 'react';
import { 
  Layers, ChevronDown, ChevronRight, Filter, RefreshCw, BarChart2, 
  PieChart as PieChartIcon, Activity, AlertTriangle, CheckCircle, Clock, 
  HelpCircle, ArrowUpRight, Award, Sliders, TrendingUp, Calendar, FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

const COLORS = {
  Completed: '#10B981',
  WIP: '#3B82F6',
  Hold: '#F59E0B',
  Support: '#EF4444',
  Pending: '#64748B',
  Effort: '#8B5CF6'
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];
const TREND_LINE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AllInOneOperationsMatrix({ submissions = [], checklists = [] }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Sticky Filters state (For Section 1 & Section 2)
  const [filterFreq, setFilterFreq] = useState('ALL');
  const [filterActType, setFilterActType] = useState('ALL');
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSubLine, setFilterSubLine] = useState('ALL');
  const [filterComponent, setFilterComponent] = useState('ALL');

  // Expanded table rows state (for drilling into Line/Equipment sub-breakdown inside Section 1)
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Cross-filtering selection from Section 1 into Section 3
  const [selectedFreqForLineMatrix, setSelectedFreqForLineMatrix] = useState('ALL');

  // Active Matrix View switcher for Section 2 (In-Graph Component)
  const [activeMatrixView, setActiveMatrixView] = useState('realization');

  // Section 3 Granular Filter Bar state
  const [sec3Freq, setSec3Freq] = useState('ALL');
  const [sec3ActType, setSec3ActType] = useState('ALL');
  const [sec3SubLine, setSec3SubLine] = useState('ALL');
  const [sec3Component, setSec3Component] = useState('ALL');

  // Sync cross-filter selection from Section 1 with Section 3 Frequency filter
  useEffect(() => {
    if (selectedFreqForLineMatrix !== 'ALL') {
      setSec3Freq(selectedFreqForLineMatrix);
    } else {
      setSec3Freq('ALL');
    }
  }, [selectedFreqForLineMatrix]);

  // Dynamic filter options derived from current data
  const freqsList = useMemo(() => {
    return ['Daily', 'Shift-wise', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Yearly'];
  }, []);

  const actTypesList = useMemo(() => {
    return [...new Set([
      ...checklists.map(c => c.Type_of_Activity),
      ...submissions.map(s => s.Type_of_Activity)
    ].filter(Boolean))].sort();
  }, [checklists, submissions]);

  const linesList = useMemo(() => {
    return [...new Set([
      ...checklists.map(c => c.Line_Equipment),
      ...submissions.map(s => s.Line_Equipment)
    ].filter(Boolean))].sort();
  }, [checklists, submissions]);

  const subLinesList = useMemo(() => {
    return [...new Set([
      ...checklists.filter(c => filterLine === 'ALL' || c.Line_Equipment === filterLine).map(c => c.Sub_Line_Equipment),
      ...submissions.filter(s => filterLine === 'ALL' || s.Line_Equipment === filterLine).map(s => s.Sub_Line_Equipment)
    ].filter(Boolean))].sort();
  }, [checklists, submissions, filterLine]);

  const componentsList = useMemo(() => {
    return [...new Set([
      ...checklists.filter(c => (filterLine === 'ALL' || c.Line_Equipment === filterLine) && (filterSubLine === 'ALL' || c.Sub_Line_Equipment === filterSubLine)).map(c => c.Component),
      ...submissions.filter(s => (filterLine === 'ALL' || s.Line_Equipment === filterLine) && (filterSubLine === 'ALL' || s.Sub_Line_Equipment === filterSubLine)).map(s => s.Component)
    ].filter(Boolean))].sort();
  }, [checklists, submissions, filterLine, filterSubLine]);

  const resetFilters = () => {
    setFilterFreq('ALL');
    setFilterActType('ALL');
    setFilterLine('ALL');
    setFilterSubLine('ALL');
    setFilterComponent('ALL');
    setSelectedFreqForLineMatrix('ALL');
  };

  const toggleRow = (freqName) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(freqName)) {
        next.delete(freqName);
      } else {
        next.add(freqName);
      }
      return next;
    });
  };

  const handleRowClickCrossFilter = (freqName) => {
    if (selectedFreqForLineMatrix === freqName) {
      setSelectedFreqForLineMatrix('ALL');
    } else {
      setSelectedFreqForLineMatrix(freqName);
    }
  };

  // Filtered dataset for Section 1 master calculations
  const { filteredChecklists, filteredSubmissions } = useMemo(() => {
    const fc = checklists.filter(c => {
      if (filterFreq !== 'ALL' && c.Frequency !== filterFreq) return false;
      if (filterActType !== 'ALL' && c.Type_of_Activity !== filterActType) return false;
      if (filterLine !== 'ALL' && c.Line_Equipment !== filterLine) return false;
      if (filterSubLine !== 'ALL' && c.Sub_Line_Equipment !== filterSubLine) return false;
      if (filterComponent !== 'ALL' && c.Component !== filterComponent) return false;
      return true;
    });

    const fs = submissions.filter(s => {
      if (filterFreq !== 'ALL' && s.Frequency !== filterFreq) return false;
      if (filterActType !== 'ALL' && s.Type_of_Activity !== filterActType) return false;
      if (filterLine !== 'ALL' && s.Line_Equipment !== filterLine) return false;
      if (filterSubLine !== 'ALL' && s.Sub_Line_Equipment !== filterSubLine) return false;
      if (filterComponent !== 'ALL' && s.Component !== filterComponent) return false;
      return true;
    });

    return { filteredChecklists: fc, filteredSubmissions: fs };
  }, [checklists, submissions, filterFreq, filterActType, filterLine, filterSubLine, filterComponent]);

  // Section 1: Master Table Grid Calculation (by Frequency + Sub-breakdown by Line)
  const masterGridData = useMemo(() => {
    const presentFreqs = [...new Set([
      ...filteredChecklists.map(c => c.Frequency),
      ...filteredSubmissions.map(s => s.Frequency)
    ].filter(Boolean))];

    const allOrderedFreqs = freqsList.filter(f => presentFreqs.includes(f));
    presentFreqs.forEach(f => {
      if (!allOrderedFreqs.includes(f)) allOrderedFreqs.push(f);
    });

    let totalAlloc = 0;
    let totalCompleted = 0;
    let totalWip = 0;
    let totalHold = 0;
    let totalSupport = 0;
    let totalPending = 0;

    const rows = allOrderedFreqs.map(freq => {
      const freqChecklists = filteredChecklists.filter(c => c.Frequency === freq);
      const freqSubmissions = filteredSubmissions.filter(s => s.Frequency === freq);

      const uniqueTaskMap = {};
      freqSubmissions.forEach(act => {
        const key = act.Document_Number || act.Checklist_ID || act.Asset_ID || `${act.Line_Equipment}-${act.Type_of_Activity}-${act.Component}-${act.Activity_Description}`;
        const ts = new Date(act.Date_Timestamp || act.timestamp || act.Date || 0).getTime();
        if (!uniqueTaskMap[key] || ts > uniqueTaskMap[key].ts) {
          uniqueTaskMap[key] = { act, ts };
        }
      });

      const uniqueActs = Object.values(uniqueTaskMap).map(u => u.act);

      const completed = uniqueActs.filter(a => a.Status === 'Done' || a.Status === 'OK').length;
      const wip = uniqueActs.filter(a => a.Status === 'WIP').length;
      const hold = uniqueActs.filter(a => a.Status === 'Hold').length;
      const support = uniqueActs.filter(a => a.Status === 'Support Required' || a.Status === 'Support' || a.Status === 'Not OK').length;
      
      const allocated = Math.max(freqChecklists.length, uniqueActs.length);
      const pending = Math.max(0, allocated - (completed + wip + hold + support));

      totalAlloc += allocated;
      totalCompleted += completed;
      totalWip += wip;
      totalHold += hold;
      totalSupport += support;
      totalPending += pending;

      const uniqueLinesInFreq = [...new Set([
        ...freqChecklists.map(c => c.Line_Equipment || 'General / Unknown'),
        ...freqSubmissions.map(s => s.Line_Equipment || 'General / Unknown')
      ].filter(Boolean))].sort();

      const subBreakdown = uniqueLinesInFreq.map(lineName => {
        const lineChecklists = freqChecklists.filter(c => (c.Line_Equipment || 'General / Unknown') === lineName);
        const lineActs = uniqueActs.filter(a => (a.Line_Equipment || 'General / Unknown') === lineName);

        const lCompleted = lineActs.filter(a => a.Status === 'Done' || a.Status === 'OK').length;
        const lWip = lineActs.filter(a => a.Status === 'WIP').length;
        const lHold = lineActs.filter(a => a.Status === 'Hold').length;
        const lSupport = lineActs.filter(a => a.Status === 'Support Required' || a.Status === 'Support' || a.Status === 'Not OK').length;
        const lAllocated = Math.max(lineChecklists.length, lineActs.length);
        const lPending = Math.max(0, lAllocated - (lCompleted + lWip + lHold + lSupport));

        return {
          name: lineName,
          allocated: lAllocated,
          completed: lCompleted,
          wip: lWip,
          hold: lHold,
          support: lSupport,
          pending: lPending,
          completedPct: lAllocated > 0 ? Math.round((lCompleted / lAllocated) * 100) : 0,
          wipPct: lAllocated > 0 ? Math.round((lWip / lAllocated) * 100) : 0,
          holdPct: lAllocated > 0 ? Math.round((lHold / lAllocated) * 100) : 0,
          supportPct: lAllocated > 0 ? Math.round((lSupport / lAllocated) * 100) : 0,
          pendingPct: lAllocated > 0 ? Math.round((lPending / lAllocated) * 100) : 0,
        };
      });

      return {
        frequency: freq,
        allocated,
        completed,
        wip,
        hold,
        support,
        pending,
        completedPct: allocated > 0 ? Math.round((completed / allocated) * 100) : 0,
        wipPct: allocated > 0 ? Math.round((wip / allocated) * 100) : 0,
        holdPct: allocated > 0 ? Math.round((hold / allocated) * 100) : 0,
        supportPct: allocated > 0 ? Math.round((support / allocated) * 100) : 0,
        pendingPct: allocated > 0 ? Math.round((pending / allocated) * 100) : 0,
        subBreakdown
      };
    });

    const cumulativeRow = {
      frequency: 'Cumulative Total',
      allocated: totalAlloc,
      completed: totalCompleted,
      wip: totalWip,
      hold: totalHold,
      support: totalSupport,
      pending: totalPending,
      completedPct: totalAlloc > 0 ? Math.round((totalCompleted / totalAlloc) * 100) : 0,
      wipPct: totalAlloc > 0 ? Math.round((totalWip / totalAlloc) * 100) : 0,
      holdPct: totalAlloc > 0 ? Math.round((totalHold / totalAlloc) * 100) : 0,
      supportPct: totalAlloc > 0 ? Math.round((totalSupport / totalAlloc) * 100) : 0,
      pendingPct: totalAlloc > 0 ? Math.round((totalPending / totalAlloc) * 100) : 0,
      isCumulative: true
    };

    return { rows, cumulativeRow };
  }, [filteredChecklists, filteredSubmissions, freqsList]);

  // Equipment Performance Matrix data for Section 2
  const equipmentPerformanceData = useMemo(() => {
    const lineMap = {};
    filteredChecklists.forEach(c => {
      const line = c.Line_Equipment || 'General';
      if (!lineMap[line]) lineMap[line] = { name: line, allocated: 0, completed: 0, support: 0, pending: 0 };
      lineMap[line].allocated++;
    });

    const uniqueTaskMap = {};
    filteredSubmissions.forEach(act => {
      const key = act.Document_Number || act.Checklist_ID || act.Asset_ID || `${act.Line_Equipment}-${act.Type_of_Activity}-${act.Component}-${act.Activity_Description}`;
      const ts = new Date(act.Date_Timestamp || act.timestamp || act.Date || 0).getTime();
      if (!uniqueTaskMap[key] || ts > uniqueTaskMap[key].ts) {
        uniqueTaskMap[key] = { act, ts };
      }
    });

    Object.values(uniqueTaskMap).forEach(({ act }) => {
      const line = act.Line_Equipment || 'General';
      if (!lineMap[line]) lineMap[line] = { name: line, allocated: 0, completed: 0, support: 0, pending: 0 };
      if (act.Status === 'Done' || act.Status === 'OK') lineMap[line].completed++;
      else if (act.Status === 'Support Required' || act.Status === 'Support' || act.Status === 'Not OK') lineMap[line].support++;
      else if (act.Status === 'Pending') lineMap[line].pending++;
    });

    return Object.values(lineMap).map(item => {
      const alloc = Math.max(item.allocated, item.completed + item.support + item.pending);
      const pending = Math.max(0, alloc - (item.completed + item.support));
      return {
        name: item.name,
        allocated: alloc,
        Completed: item.completed,
        SupportReq: item.support,
        Pending: pending,
        ComplianceRate: alloc > 0 ? Math.round((item.completed / alloc) * 100) : 0
      };
    }).sort((a, b) => b.allocated - a.allocated);
  }, [filteredChecklists, filteredSubmissions]);

  // Effort Distribution Pie data for Section 2
  const effortPieData = useMemo(() => {
    return masterGridData.rows.map(r => ({
      name: r.frequency,
      value: r.allocated,
      completed: r.completed
    })).filter(r => r.value > 0);
  }, [masterGridData.rows]);

  // Section 3: Line / Equipment Matrix Data (Granular View Breakdown)
  const section3GridData = useMemo(() => {
    let s3Checklists = checklists;
    let s3Submissions = submissions;

    if (sec3Freq !== 'ALL') {
      s3Checklists = s3Checklists.filter(c => c.Frequency === sec3Freq);
      s3Submissions = s3Submissions.filter(s => s.Frequency === sec3Freq);
    }
    if (sec3ActType !== 'ALL') {
      s3Checklists = s3Checklists.filter(c => c.Type_of_Activity === sec3ActType);
      s3Submissions = s3Submissions.filter(s => s.Type_of_Activity === sec3ActType);
    }
    if (sec3SubLine !== 'ALL') {
      s3Checklists = s3Checklists.filter(c => c.Sub_Line_Equipment === sec3SubLine);
      s3Submissions = s3Submissions.filter(s => s.Sub_Line_Equipment === sec3SubLine);
    }
    if (sec3Component !== 'ALL') {
      s3Checklists = s3Checklists.filter(c => c.Component === sec3Component);
      s3Submissions = s3Submissions.filter(s => s.Component === sec3Component);
    }

    const allLines = [...new Set([
      ...s3Checklists.map(c => c.Line_Equipment || 'General / Unknown'),
      ...s3Submissions.map(s => s.Line_Equipment || 'General / Unknown')
    ].filter(Boolean))].sort();

    let totalAlloc = 0;
    let totalCompleted = 0;
    let totalWip = 0;
    let totalHold = 0;
    let totalSupport = 0;
    let totalPending = 0;

    const rows = allLines.map(lineName => {
      const lChecklists = s3Checklists.filter(c => (c.Line_Equipment || 'General / Unknown') === lineName);
      const lSubmissions = s3Submissions.filter(s => (s.Line_Equipment || 'General / Unknown') === lineName);

      const uniqueTaskMap = {};
      lSubmissions.forEach(act => {
        const key = act.Document_Number || act.Checklist_ID || act.Asset_ID || `${act.Type_of_Activity}-${act.Sub_Line_Equipment}-${act.Component}-${act.Activity_Description}`;
        const ts = new Date(act.Date_Timestamp || act.timestamp || act.Date || 0).getTime();
        if (!uniqueTaskMap[key] || ts > uniqueTaskMap[key].ts) {
          uniqueTaskMap[key] = { act, ts };
        }
      });

      const uniqueActs = Object.values(uniqueTaskMap).map(u => u.act);

      const completed = uniqueActs.filter(a => a.Status === 'Done' || a.Status === 'OK').length;
      const wip = uniqueActs.filter(a => a.Status === 'WIP').length;
      const hold = uniqueActs.filter(a => a.Status === 'Hold').length;
      const support = uniqueActs.filter(a => a.Status === 'Support Required' || a.Status === 'Support' || a.Status === 'Not OK').length;
      
      const allocated = Math.max(lChecklists.length, uniqueActs.length);
      const pending = Math.max(0, allocated - (completed + wip + hold + support));

      totalAlloc += allocated;
      totalCompleted += completed;
      totalWip += wip;
      totalHold += hold;
      totalSupport += support;
      totalPending += pending;

      return {
        line: lineName,
        allocated,
        completed,
        wip,
        hold,
        support,
        pending,
        completedPct: allocated > 0 ? Math.round((completed / allocated) * 100) : 0,
        wipPct: allocated > 0 ? Math.round((wip / allocated) * 100) : 0,
        holdPct: allocated > 0 ? Math.round((hold / allocated) * 100) : 0,
        supportPct: allocated > 0 ? Math.round((support / allocated) * 100) : 0,
        pendingPct: allocated > 0 ? Math.round((pending / allocated) * 100) : 0,
      };
    });

    const cumulativeRow = {
      line: 'Cumulative Line Total',
      allocated: totalAlloc,
      completed: totalCompleted,
      wip: totalWip,
      hold: totalHold,
      support: totalSupport,
      pending: totalPending,
      completedPct: totalAlloc > 0 ? Math.round((totalCompleted / totalAlloc) * 100) : 0,
      wipPct: totalAlloc > 0 ? Math.round((totalWip / totalAlloc) * 100) : 0,
      holdPct: totalAlloc > 0 ? Math.round((totalHold / totalAlloc) * 100) : 0,
      supportPct: totalAlloc > 0 ? Math.round((totalSupport / totalAlloc) * 100) : 0,
      pendingPct: totalAlloc > 0 ? Math.round((totalPending / totalAlloc) * 100) : 0,
      isCumulative: true
    };

    return { rows, cumulativeRow };
  }, [checklists, submissions, sec3Freq, sec3ActType, sec3SubLine, sec3Component]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', marginBottom: '2rem', backgroundColor: '#FFFFFF', borderRadius: '16px', padding: isMobile ? '1rem' : '1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      
      {/* Top Header & Sticky Global Filters Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '2px solid #F1F5F9', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 900, color: '#1E293B' }}>
              <Layers size={24} color="#6366F1" /> All-in-One Operations Matrix Dashboard
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '0.45rem 0.9rem', borderRadius: '999px', border: '1px solid #BFDBFE' }}>
              Baseline Target: {masterGridData.cumulativeRow.allocated}
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, backgroundColor: '#DCFCE7', color: '#166534', padding: '0.45rem 0.9rem', borderRadius: '999px', border: '1px solid #86EFAC' }}>
              Realization Velocity: {masterGridData.cumulativeRow.completedPct}%
            </span>
          </div>
        </div>

        {/* Sticky Filters Bar */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '0.75rem', 
          padding: '1rem', 
          backgroundColor: '#F8FAFC', 
          borderRadius: '12px',
          border: '1px solid #E2E8F0'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Frequency</label>
            <select value={filterFreq} onChange={(e) => setFilterFreq(e.target.value)} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', color: '#1E293B', fontSize: '0.8rem', fontWeight: 700, outline: 'none' }}>
              <option value="ALL">All Frequencies</option>
              {freqsList.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Activity Type</label>
            <select value={filterActType} onChange={(e) => setFilterActType(e.target.value)} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', color: '#1E293B', fontSize: '0.8rem', fontWeight: 700, outline: 'none' }}>
              <option value="ALL">All Activity Types</option>
              {actTypesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Line / Equipment</label>
            <select value={filterLine} onChange={(e) => setFilterLine(e.target.value)} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', color: '#1E293B', fontSize: '0.8rem', fontWeight: 700, outline: 'none' }}>
              <option value="ALL">All Lines & Equipment</option>
              {linesList.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Sub-Line</label>
            <select value={filterSubLine} onChange={(e) => setFilterSubLine(e.target.value)} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', color: '#1E293B', fontSize: '0.8rem', fontWeight: 700, outline: 'none' }}>
              <option value="ALL">All Sub-Lines</option>
              {subLinesList.map(sl => <option key={sl} value={sl}>{sl}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Component</label>
            <select value={filterComponent} onChange={(e) => setFilterComponent(e.target.value)} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', color: '#1E293B', fontSize: '0.8rem', fontWeight: 700, outline: 'none' }}>
              <option value="ALL">All Components</option>
              {componentsList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={resetFilters} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', color: '#475569', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <RefreshCw size={14} /> Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1 & 2 GRID: Master Matrix Table & In-Graph Visualization */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 620px), 1fr))', gap: '1.5rem' }}>
        
        {/* SECTION 1: Master Matrix Table (Unified View) */}
        <div className="card" style={{ padding: isMobile ? '1rem' : '1.25rem', marginBottom: 0, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Section 1: Master Matrix Table (Unified View)
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                Click row to cross-filter Section 3. Use chevron to expand sub-breakdown.
              </span>
            </div>
            {selectedFreqForLineMatrix !== 'ALL' && (
              <button onClick={() => setSelectedFreqForLineMatrix('ALL')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer' }}>
                Clear Frequency Selection ({selectedFreqForLineMatrix}) ×
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left', minWidth: '760px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', color: '#475569', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>Frequency / Period</th>
                  <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>Allocated</th>
                  <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: COLORS.Completed, fontWeight: 800 }}>Completed</th>
                  <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: COLORS.WIP, fontWeight: 800 }}>WIP</th>
                  <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: COLORS.Hold, fontWeight: 800 }}>Hold</th>
                  <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: COLORS.Support, fontWeight: 800 }}>Support Req.</th>
                  <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: COLORS.Pending, fontWeight: 800 }}>Pending</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, minWidth: '135px' }}>Effort Share</th>
                </tr>
              </thead>
              <tbody>
                {masterGridData.rows.map(row => {
                  const isExpanded = expandedRows.has(row.frequency);
                  const hasSub = row.subBreakdown && row.subBreakdown.length > 0;
                  const isSelected = selectedFreqForLineMatrix === row.frequency;

                  return (
                    <React.Fragment key={row.frequency}>
                      <tr 
                        onClick={() => handleRowClickCrossFilter(row.frequency)}
                        style={{ 
                          borderBottom: isExpanded ? 'none' : '1px solid #F1F5F9',
                          backgroundColor: isSelected ? '#EFF6FF' : (isExpanded ? '#F8FAFC' : '#FFFFFF'),
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span 
                            onClick={(e) => { e.stopPropagation(); if (hasSub) toggleRow(row.frequency); }} 
                            style={{ padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                          >
                            {hasSub ? (
                              isExpanded ? <ChevronDown size={16} color="#3B82F6" /> : <ChevronRight size={16} color="#64748B" />
                            ) : <span style={{ width: 16 }} />}
                          </span>
                          <span>{row.frequency}</span>
                          {hasSub && <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>({row.subBreakdown.length})</span>}
                        </td>
                        <td style={{ padding: '0.9rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>{row.allocated}</td>
                        <td style={{ padding: '0.9rem 0.5rem', textAlign: 'center' }}>
                          <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.25rem 0.55rem', borderRadius: '6px', fontWeight: 700 }}>
                            {row.completed} <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>({row.completedPct}%)</span>
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 0.5rem', textAlign: 'center', fontWeight: 600, color: row.wip > 0 ? COLORS.WIP : '#94A3B8' }}>
                          {row.wip} <span style={{ fontSize: '0.72rem' }}>({row.wipPct}%)</span>
                        </td>
                        <td style={{ padding: '0.9rem 0.5rem', textAlign: 'center', fontWeight: 600, color: row.hold > 0 ? COLORS.Hold : '#94A3B8' }}>
                          {row.hold} <span style={{ fontSize: '0.72rem' }}>({row.holdPct}%)</span>
                        </td>
                        <td style={{ padding: '0.9rem 0.5rem', textAlign: 'center' }}>
                          {row.support > 0 ? (
                            <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '0.25rem 0.55rem', borderRadius: '6px', fontWeight: 800, border: '1px solid #FECACA' }}>
                              🚨 {row.support} ({row.supportPct}%)
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontWeight: 600 }}>0 (0%)</span>
                          )}
                        </td>
                        <td style={{ padding: '0.9rem 0.5rem', textAlign: 'center', fontWeight: 600, color: COLORS.Pending }}>
                          {row.pending} <span style={{ fontSize: '0.72rem' }}>({row.pendingPct}%)</span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyItems: 'flex-end' }}>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', minWidth: '65px' }}>
                              <div style={{ width: `${row.completedPct}%`, height: '100%', backgroundColor: COLORS.Completed }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', minWidth: '36px' }}>{row.completedPct}%</span>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-Breakdown by Line / Equipment */}
                      {isExpanded && row.subBreakdown.map(sub => (
                        <tr key={`${row.frequency}-${sub.name}`} style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.78rem' }}>
                          <td style={{ padding: '0.65rem 1rem 0.65rem 2.5rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ color: '#3B82F6', fontWeight: 800 }}>↳</span> {sub.name}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 600 }}>{sub.allocated}</td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: '#166534', fontWeight: 600 }}>
                            {sub.completed} ({sub.completedPct}%)
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: sub.wip > 0 ? COLORS.WIP : '#94A3B8' }}>
                            {sub.wip} ({sub.wipPct}%)
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: sub.hold > 0 ? COLORS.Hold : '#94A3B8' }}>
                            {sub.hold} ({sub.holdPct}%)
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                            {sub.support > 0 ? (
                              <span style={{ color: '#DC2626', fontWeight: 800 }}>{sub.support} ({sub.supportPct}%)</span>
                            ) : (
                              <span style={{ color: '#94A3B8' }}>0 (0%)</span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: COLORS.Pending }}>
                            {sub.pending} ({sub.pendingPct}%)
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ flex: 1, height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', minWidth: '50px' }}>
                                <div style={{ width: `${sub.completedPct}%`, height: '100%', backgroundColor: '#34D399' }} />
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#475569', minWidth: '32px' }}>{sub.completedPct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}

                {/* Cumulative Total Bottom Row */}
                <tr style={{ backgroundColor: '#EFF6FF', borderTop: '2px solid #3B82F6', fontWeight: 800, color: '#1E3A8A' }}>
                  <td style={{ padding: '1rem', fontSize: '0.88rem' }}>{masterGridData.cumulativeRow.frequency}</td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontSize: '0.88rem' }}>{masterGridData.cumulativeRow.allocated}</td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#166534', fontSize: '0.88rem' }}>
                    {masterGridData.cumulativeRow.completed} ({masterGridData.cumulativeRow.completedPct}%)
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: COLORS.WIP }}>
                    {masterGridData.cumulativeRow.wip} ({masterGridData.cumulativeRow.wipPct}%)
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: COLORS.Hold }}>
                    {masterGridData.cumulativeRow.hold} ({masterGridData.cumulativeRow.holdPct}%)
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#DC2626' }}>
                    🚨 {masterGridData.cumulativeRow.support} ({masterGridData.cumulativeRow.supportPct}%)
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#475569' }}>
                    {masterGridData.cumulativeRow.pending} ({masterGridData.cumulativeRow.pendingPct}%)
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#BFDBFE', borderRadius: '4px', overflow: 'hidden', minWidth: '65px' }}>
                        <div style={{ width: `${masterGridData.cumulativeRow.completedPct}%`, height: '100%', backgroundColor: '#2563EB' }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', color: '#1E3A8A' }}>{masterGridData.cumulativeRow.completedPct}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: In-Graph Component (Dynamic Visualization) */}
        <div className="card" style={{ padding: isMobile ? '1rem' : '1.25rem', marginBottom: 0, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Section 2: Interactive Matrix Visualization
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                Synchronized in real-time with master table filters.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                value={activeMatrixView}
                onChange={(e) => setActiveMatrixView(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #3B82F6',
                  backgroundColor: '#EFF6FF',
                  color: '#1E3A8A',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="realization">📊 Realization Progress Matrix</option>
                <option value="urgency">🚨 Backlog & Support Urgency Matrix</option>
                <option value="effort">🥧 Effort Distribution Matrix</option>
                <option value="equipment">⚡ Equipment Performance Matrix</option>
              </select>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '360px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {activeMatrixView === 'realization' && (
              <div style={{ height: '360px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                  Stacked Realization across Frequencies
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={masterGridData.rows} margin={{ left: -15, right: 10, top: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="frequency" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="completed" stackId="a" fill={COLORS.Completed} name="Completed" />
                    <Bar dataKey="wip" stackId="a" fill={COLORS.WIP} name="In Progress" />
                    <Bar dataKey="hold" stackId="a" fill={COLORS.Hold} name="Hold" />
                    <Bar dataKey="support" stackId="a" fill={COLORS.Support} name="Support Required" />
                    <Bar dataKey="pending" stackId="a" fill={COLORS.Pending} radius={[4, 4, 0, 0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeMatrixView === 'urgency' && (
              <div style={{ height: '360px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#B91C1C' }}>
                  Urgency Spotlight: Support Required vs. Pending Backlog
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={masterGridData.rows} margin={{ left: -15, right: 10, top: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="frequency" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="support" fill={COLORS.Support} radius={[4, 4, 0, 0]} name="Support Required" barSize={26} />
                    <Bar dataKey="pending" fill={COLORS.Pending} radius={[4, 4, 0, 0]} name="Pending Backlog" barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeMatrixView === 'effort' && (
              <div style={{ height: '360px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#4C1D95' }}>
                  Effort Share Distribution across Frequencies
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(value, name) => [`${value} scheduled (${Math.round((value / (masterGridData.cumulativeRow.allocated || 1)) * 100)}%)`, name]} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Pie
                      data={effortPieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {effortPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeMatrixView === 'equipment' && (
              <div style={{ height: '360px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#1E3A8A' }}>
                  Line / Equipment Telemetry: Compliance Rate (%) & Support Bottlenecks
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={equipmentPerformanceData.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" fontSize={11} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" fontSize={11} axisLine={false} tickLine={false} width={130} />
                    <Tooltip formatter={(value, name) => [name === 'ComplianceRate' ? `${value}%` : value, name === 'ComplianceRate' ? 'Compliance %' : name]} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="ComplianceRate" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={18} name="Compliance Rate (%)" />
                    <Bar dataKey="SupportReq" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={12} name="Support Required" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 3: Line / Equipment Matrix (Granular View Breakdown) */}
      <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem', marginBottom: 0, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="#10B981" /> Section 3: Line / Equipment Matrix (Granular View Breakdown)
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
              Dynamically pairs individual assets or operational areas with status metrics. {sec3Freq !== 'ALL' ? `Filtered by Frequency: ${sec3Freq}` : 'Showing all frequencies.'}
            </span>
          </div>

          {/* Granular Filter Bar inline dropdowns */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={sec3Freq} onChange={e => setSec3Freq(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#334155' }}>
              <option value="ALL">Frequency: ALL</option>
              {freqsList.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={sec3ActType} onChange={e => setSec3ActType(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#334155' }}>
              <option value="ALL">Activity Type: ALL</option>
              {actTypesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={sec3SubLine} onChange={e => setSec3SubLine(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#334155' }}>
              <option value="ALL">Sub-Line: ALL</option>
              {subLinesList.map(sl => <option key={sl} value={sl}>{sl}</option>)}
            </select>
            <select value={sec3Component} onChange={e => setSec3Component(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#334155' }}>
              <option value="ALL">Component: ALL</option>
              {componentsList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(sec3Freq !== 'ALL' || sec3ActType !== 'ALL' || sec3SubLine !== 'ALL' || sec3Component !== 'ALL') && (
              <button onClick={() => { setSec3Freq('ALL'); setSec3ActType('ALL'); setSec3SubLine('ALL'); setSec3Component('ALL'); setSelectedFreqForLineMatrix('ALL'); }} style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer' }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0', maxHeight: '440px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left', minWidth: '760px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#F8FAFC' }}>
              <tr style={{ color: '#475569', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>Line / Equipment</th>
                <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>Allocated</th>
                <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: COLORS.Completed, fontWeight: 800 }}>Completed</th>
                <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: COLORS.WIP, fontWeight: 800 }}>WIP</th>
                <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: COLORS.Hold, fontWeight: 800 }}>Hold</th>
                <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: COLORS.Support, fontWeight: 800 }}>Support Req.</th>
                <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: COLORS.Pending, fontWeight: 800 }}>Pending</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, minWidth: '135px' }}>Effort Share</th>
              </tr>
            </thead>
            <tbody>
              {section3GridData.rows.map(row => (
                <tr key={row.line} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1E293B' }}>{row.line}</td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>{row.allocated}</td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.25rem 0.55rem', borderRadius: '6px', fontWeight: 700 }}>
                      {row.completed} <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>({row.completedPct}%)</span>
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 600, color: row.wip > 0 ? COLORS.WIP : '#94A3B8' }}>
                    {row.wip} <span style={{ fontSize: '0.72rem' }}>({row.wipPct}%)</span>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 600, color: row.hold > 0 ? COLORS.Hold : '#94A3B8' }}>
                    {row.hold} <span style={{ fontSize: '0.72rem' }}>({row.holdPct}%)</span>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                    {row.support > 0 ? (
                      <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '0.25rem 0.55rem', borderRadius: '6px', fontWeight: 800, border: '1px solid #FECACA' }}>
                        🚨 {row.support} ({row.supportPct}%)
                      </span>
                    ) : (
                      <span style={{ color: '#94A3B8', fontWeight: 600 }}>0 (0%)</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 600, color: COLORS.Pending }}>
                    {row.pending} <span style={{ fontSize: '0.72rem' }}>({row.pendingPct}%)</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyItems: 'flex-end' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', minWidth: '65px' }}>
                        <div style={{ width: `${row.completedPct}%`, height: '100%', backgroundColor: '#10B981' }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', minWidth: '36px' }}>{row.completedPct}%</span>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Cumulative Line Total Bottom Row */}
              <tr style={{ backgroundColor: '#ECFDF5', borderTop: '2px solid #10B981', fontWeight: 800, color: '#065F46' }}>
                <td style={{ padding: '1rem', fontSize: '0.88rem' }}>{section3GridData.cumulativeRow.line}</td>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontSize: '0.88rem' }}>{section3GridData.cumulativeRow.allocated}</td>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#166534', fontSize: '0.88rem' }}>
                  {section3GridData.cumulativeRow.completed} ({section3GridData.cumulativeRow.completedPct}%)
                </td>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: COLORS.WIP }}>
                  {section3GridData.cumulativeRow.wip} ({section3GridData.cumulativeRow.wipPct}%)
                </td>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: COLORS.Hold }}>
                  {section3GridData.cumulativeRow.hold} ({section3GridData.cumulativeRow.holdPct}%)
                </td>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#DC2626' }}>
                  🚨 {section3GridData.cumulativeRow.support} ({section3GridData.cumulativeRow.supportPct}%)
                </td>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#475569' }}>
                  {section3GridData.cumulativeRow.pending} ({section3GridData.cumulativeRow.pendingPct}%)
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#A7F3D0', borderRadius: '4px', overflow: 'hidden', minWidth: '65px' }}>
                      <div style={{ width: `${section3GridData.cumulativeRow.completedPct}%`, height: '100%', backgroundColor: '#059669' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#065F46' }}>{section3GridData.cumulativeRow.completedPct}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
