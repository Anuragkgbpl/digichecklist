import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Filter, Calendar, BarChart as BarIcon, 
  CheckCircle, AlertTriangle, Clock, Users, ChevronDown, 
  ChevronUp, Activity, X, Search
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  ResponsiveContainer, CartesianGrid, AreaChart, Area,
  PieChart, Pie, Cell, Line, ComposedChart
} from 'recharts';

import { useData } from '../context/DataContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { submissions: rawData, supportInbox: supportData } = useData();
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    shift: 'ALL',
    type: 'ALL',
    line: 'ALL',
    subLine: 'ALL',
    component: '',
    frequency: 'ALL',
    user: 'ALL'
  });

  const COLORS = {
    Done: '#10B981',
    WIP: '#F59E0B',
    Support: '#EF4444',
    Hold: '#6366F1',
    Postponed: '#8B5CF6',
    Frequency: '#F43F5E'
  };

  const isAllActivities = useMemo(() => {
    return user?.allowedActivity === 'ALL' || (Array.isArray(user?.allowedActivity) && user.allowedActivity.includes('ALL'));
  }, [user]);

  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      // Role-based restrictions
      if (user?.role === 'USER' && !isAllActivities) {
        const allowed = Array.isArray(user.allowedActivity) ? user.allowedActivity : [user.allowedActivity];
        if (!allowed.includes(item.Type_of_Activity)) return false;
      }

      if (filters.dateStart && item.Date < filters.dateStart) return false;
      if (filters.dateEnd && item.Date > filters.dateEnd) return false;
      if (filters.shift !== 'ALL' && item.Shift !== filters.shift) return false;
      if (filters.type !== 'ALL' && item.Type_of_Activity !== filters.type) return false;
      if (filters.line !== 'ALL' && item.Line_Equipment !== filters.line) return false;
      if (filters.subLine !== 'ALL' && item.Sub_Line_Equipment !== filters.subLine) return false;
      if (filters.frequency !== 'ALL' && item.Frequency !== filters.frequency) return false;
      if (filters.user !== 'ALL' && !item.Submitted_By?.includes(filters.user)) return false;
      if (filters.component && !item.Component?.toLowerCase().includes(filters.component.toLowerCase())) return false;
      return true;
    });
  }, [rawData, filters, user, isAllActivities]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = filteredData.length;
    return {
      total,
      done: filteredData.filter(r => r.Status === 'Done').length,
      wip: filteredData.filter(r => r.Status === 'WIP').length,
      support: filteredData.filter(r => r.Status === 'Support Required').length,
      hold: filteredData.filter(r => r.Status === 'Hold').length,
      postponed: filteredData.filter(r => r.Status === 'Postponed').length,
      compliance: total ? Math.round((filteredData.filter(r => r.Status === 'Done').length / total) * 100) : 0
    };
  }, [filteredData]);

  // Dynamic Activity Summary Cards
  const activitySummaries = useMemo(() => {
    const types = [...new Set(rawData.map(r => r.Type_of_Activity).filter(Boolean))];
    return types.map(type => {
      const typeData = filteredData.filter(r => r.Type_of_Activity === type);
      if (typeData.length === 0) return null;
      return {
        type,
        total: typeData.length,
        compliance: typeData.length ? Math.round((typeData.filter(r => r.Status === 'Done').length / typeData.length) * 100) : 0
      };
    }).filter(Boolean);
  }, [rawData, filteredData]);

  // Dynamic Frequency Summary Cards
  const frequencySummaries = useMemo(() => {
    const freqs = [...new Set(rawData.map(r => r.Frequency).filter(Boolean))];
    return freqs.map(freq => {
      const freqData = filteredData.filter(r => r.Frequency === freq);
      if (freqData.length === 0) return null;
      return {
        freq,
        total: freqData.length,
        compliance: freqData.length ? Math.round((freqData.filter(r => r.Status === 'Done').length / freqData.length) * 100) : 0
      };
    }).filter(Boolean);
  }, [rawData, filteredData]);

  // Date-wise Stacked Bar Chart Data
  const trendData = useMemo(() => {
    const grouped = filteredData.reduce((acc, curr) => {
      const date = curr.Date || 'Unknown';
      if (!acc[date]) acc[date] = { date, Done: 0, WIP: 0, Support: 0, Hold: 0, Postponed: 0 };
      const status = curr.Status === 'Support Required' ? 'Support' : curr.Status;
      if (acc[date][status] !== undefined) acc[date][status]++;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).slice(-15);
  }, [filteredData]);

  // Frequency Distribution Chart Data
  const freqDistData = useMemo(() => {
    const grouped = filteredData.reduce((acc, curr) => {
      const freq = curr.Frequency || 'Other';
      if (!acc[freq]) acc[freq] = { name: freq, value: 0 };
      acc[freq].value++;
      return acc;
    }, {});
    return Object.values(grouped);
  }, [filteredData]);

  // Frequency-wise Compliance Trends (Dynamic from Master)
  const freqTrendAnalysis = useMemo(() => {
    const targetFreqs = [...new Set(rawData.map(r => r.Frequency).filter(Boolean))];
    return targetFreqs.reduce((acc, freq) => {
      const data = filteredData.filter(r => r.Frequency === freq);
      const grouped = data.reduce((g, curr) => {
        const date = curr.Date || 'Unknown';
        if (!g[date]) g[date] = { date, Compliance: 0, Total: 0, Done: 0, WIP: 0, Support: 0, Hold: 0 };
        g[date].Total++;
        const status = curr.Status === 'Support Required' ? 'Support' : curr.Status;
        if (g[date][status] !== undefined) g[date][status]++;
        g[date].Compliance = Math.round((g[date].Done / g[date].Total) * 100);
        return g;
      }, {});
      acc[freq] = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
      return acc;
    }, {});
  }, [rawData, filteredData]);

  // Lowest Compliance Areas
  const lowestComplianceAreas = useMemo(() => {
    const areas = {}; 
    filteredData.forEach(r => {
      const key = `${r.Line_Equipment} > ${r.Sub_Line_Equipment}`;
      if (!areas[key]) areas[key] = { name: key, total: 0, done: 0 };
      areas[key].total++;
      if (r.Status === 'Done') areas[key].done++;
    });
    return Object.values(areas)
      .filter(a => a.total > 0)
      .map(a => ({ ...a, compliance: Math.round((a.done / a.total) * 100) }))
      .sort((a, b) => a.compliance - b.compliance)
      .slice(0, 5);
  }, [filteredData]);

  // Granular Daily Trend by Dimension
  const granularTrend = useMemo(() => {
    const grouped = filteredData.reduce((acc, curr) => {
      const date = curr.Date || 'Unknown';
      if (!acc[date]) acc[date] = { date, Done: 0, WIP: 0, Support: 0, Hold: 0, Postponed: 0 };
      const status = curr.Status === 'Support Required' ? 'Support' : curr.Status;
      if (acc[date][status] !== undefined) acc[date][status]++;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  }, [filteredData]);

  // TAT Calculation (Turnaround Time)
  // Highest Compliance Areas
  const highestComplianceAreas = useMemo(() => {
    const areas = {}; 
    filteredData.forEach(r => {
      const key = `${r.Line_Equipment} > ${r.Sub_Line_Equipment}`;
      if (!areas[key]) areas[key] = { name: key, total: 0, done: 0 };
      areas[key].total++;
      if (r.Status === 'Done') areas[key].done++;
    });
    return Object.values(areas)
      .filter(a => a.total > 0)
      .map(a => ({ ...a, compliance: Math.round((a.done / a.total) * 100) }))
      .sort((a, b) => b.compliance - a.compliance)
      .slice(0, 5);
  }, [filteredData]);

  // Department Contribution (Donut)
  const deptContributionData = useMemo(() => {
    const depts = {};
    filteredData.forEach(r => {
      const dept = r.SupportDept || 'No Support';
      if (dept === '') return;
      depts[dept] = (depts[dept] || 0) + 1;
    });
    return Object.entries(depts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Top and Worst Performing Department
  const deptPerformance = useMemo(() => {
    const depts = {};
    filteredData.forEach(r => {
      const dept = r.SupportDept;
      if (!dept) return;
      if (!depts[dept]) depts[dept] = { total: 0, done: 0 };
      depts[dept].total++;
      if (r.Status === 'Done') depts[dept].done++;
    });
    const result = Object.entries(depts)
      .map(([name, stats]) => ({ name, compliance: Math.round((stats.done / stats.total) * 100) }))
      .sort((a, b) => b.compliance - a.compliance);
    return { top: result.slice(0, 3), worst: result.slice(-3).reverse() };
  }, [filteredData]);

  // Dynamic Activity Trends
  const activityTrends = useMemo(() => {
    const types = [...new Set(filteredData.map(r => r.Type_of_Activity).filter(Boolean))];
    return types.map(type => {
      const typeData = filteredData.filter(r => r.Type_of_Activity === type);
      const grouped = typeData.reduce((acc, curr) => {
        const date = curr.Date || 'Unknown';
        if (!acc[date]) acc[date] = { date, Done: 0, WIP: 0, Support: 0 };
        const s = curr.Status === 'Support Required' ? 'Support' : curr.Status;
        if (acc[date][s] !== undefined) acc[date][s]++;
        return acc;
      }, {});
      return {
        type,
        data: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).slice(-7)
      };
    });
  }, [filteredData]);

  const TAT_COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6'];

  const tatMetrics = useMemo(() => {
    const resolvedItems = supportData.filter(s => s.status === 'Resolved' && s.resolvedAt);
    if (resolvedItems.length === 0) return { avg: 'N/A', count: 0 };
    const totalMs = resolvedItems.reduce((acc, item) => {
      const start = new Date(item.timestamp);
      const end = new Date(item.resolvedAt);
      return acc + (end - start);
    }, 0);
    const avgHrs = (totalMs / resolvedItems.length) / (1000 * 60 * 60);
    return {
      avg: avgHrs.toFixed(1) + ' hrs',
      count: resolvedItems.length
    };
  }, [supportData]);

  const resetFilters = () => setFilters({
    dateStart: '', dateEnd: '', shift: 'ALL', type: 'ALL', line: 'ALL', subLine: 'ALL', component: '', frequency: 'ALL', user: 'ALL'
  });

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header & Main Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><LayoutDashboard /> Advanced Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0 0' }}>Data-driven operational intelligence</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowFilters(!showFilters)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> {showFilters ? 'Hide Filters' : 'Advanced Filters'}
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Filter Drawer */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={16} /> Filter Dataset</h4>
            <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Reset All</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>DATE RANGE</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="date" value={filters.dateStart} onChange={e => setFilters({...filters, dateStart: e.target.value})} style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }} />
                <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                <input type="date" value={filters.dateEnd} onChange={e => setFilters({...filters, dateEnd: e.target.value})} style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>ACTIVITY TYPE</label>
              <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Types</option>
                {[...new Set(rawData.map(d => d.Type_of_Activity).filter(Boolean))].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>LINE / EQUIPMENT</label>
              <select value={filters.line} onChange={e => setFilters({...filters, line: e.target.value})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Lines</option>
                {[...new Set(rawData.map(d => d.Line_Equipment).filter(Boolean))].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>SUB-LINE</label>
              <select value={filters.subLine} onChange={e => setFilters({...filters, subLine: e.target.value})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Sub-Lines</option>
                {[...new Set(rawData.map(d => d.Sub_Line_Equipment).filter(Boolean))].map(sl => <option key={sl} value={sl}>{sl}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>SHIFT</label>
              <select value={filters.shift} onChange={e => setFilters({...filters, shift: e.target.value})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Shifts</option>
                <option value="A">Shift A</option>
                <option value="B">Shift B</option>
                <option value="C">Shift C</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>COMPONENT SEARCH</label>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFF', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem 0.5rem' }}>
                <Search size={14} color="var(--text-tertiary)" style={{ marginRight: '0.4rem' }} />
                <input type="text" placeholder="Component..." value={filters.component} onChange={e => setFilters({...filters, component: e.target.value})} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.8rem' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem', borderTop: '4px solid var(--primary-light)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>TOTAL CHECKLISTS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Filtered scope</div>
        </div>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem', borderTop: `4px solid ${COLORS.Done}` }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>COMPLIANCE RATE</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: COLORS.Done }}>{stats.compliance}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>{stats.done} activities completed</div>
        </div>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem', borderTop: `4px solid ${COLORS.Support}` }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>SUPPORT REQUIRED</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: COLORS.Support }}>{stats.support}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Critical attention needed</div>
        </div>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem', borderTop: '4px solid #6366F1' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>AVG RESOLUTION (TAT)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366F1' }}>{tatMetrics.avg}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Based on {tatMetrics.count} resolved items</div>
        </div>
      </div>

      {/* Activity Summary Cards */}
      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>ACTIVITY PERFORMANCE BREAKDOWN</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {activitySummaries.map(act => (
          <div key={act.type} className="card" style={{ marginBottom: 0, padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(to right, #FFF, #F8FAFC)' }}>
            <div style={{ backgroundColor: '#EEF2FF', padding: '0.75rem', borderRadius: '12px', color: 'var(--primary-light)' }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{act.type}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{act.total} Tasks • {act.compliance}% Compliance</div>
              <div style={{ height: '4px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '2px', marginTop: '0.4rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${act.compliance}%`, backgroundColor: act.compliance > 80 ? COLORS.Done : COLORS.WIP }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Frequency Summary Cards */}
      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>FREQUENCY PERFORMANCE SUMMARY</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {frequencySummaries.map(item => (
          <div key={item.freq} className="card" style={{ marginBottom: 0, padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'linear-gradient(to right, #FFF, #F0FDFA)' }}>
            <div style={{ backgroundColor: '#CCFBF1', padding: '0.75rem', borderRadius: '12px', color: '#0D9488' }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{item.freq}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.total} Checklists • {item.compliance}% Compliance</div>
              <div style={{ height: '4px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '2px', marginTop: '0.4rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${item.compliance}%`, backgroundColor: '#0D9488' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Daily Performance Trend - Stacked Bar */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={18} /> Daily Performance Distribution</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Stacked status distribution by date</p>
            </div>
          </div>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={granularTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: 'var(--text-tertiary)' }} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: 'var(--text-tertiary)' }} />
                <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px' }} />
                <Bar dataKey="Done" stackId="a" fill={COLORS.Done} radius={[0, 0, 0, 0]} />
                <Bar dataKey="WIP" stackId="a" fill={COLORS.WIP} />
                <Bar dataKey="Support" stackId="a" fill={COLORS.Support} />
                <Bar dataKey="Hold" stackId="a" fill={COLORS.Hold} />
                <Bar dataKey="Postponed" stackId="a" fill={COLORS.Postponed} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Contribution Donut Chart */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> Support Contribution by Dept</h3>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptContributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deptContributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TAT_COLORS[index % TAT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frequency Performance Trends - Stacked Bar + Trend Line */}
        <div className="card" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} /> Compliance & Status Trend by Frequency (Dynamic)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {Object.keys(freqTrendAnalysis).map(freq => (
              <div key={freq} style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>{freq} Analytics</div>
                <div style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={freqTrendAnalysis[freq] || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={9} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} fontSize={9} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} fontSize={9} unit="%" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="Done" stackId="a" fill={COLORS.Done} barSize={25} />
                      <Bar yAxisId="left" dataKey="WIP" stackId="a" fill={COLORS.WIP} />
                      <Bar yAxisId="left" dataKey="Support" stackId="a" fill={COLORS.Support} />
                      <Bar yAxisId="left" dataKey="Hold" stackId="a" fill={COLORS.Hold} />
                      <Line yAxisId="right" type="monotone" dataKey="Compliance" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Activity Specific Trend Charts */}
        <div className="card" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarIcon size={18} /> Dynamic Activity Trends</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {activityTrends.map(trend => (
              <div key={trend.type} style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '1rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>{trend.type}</div>
                <div style={{ height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={8} />
                      <YAxis fontSize={8} />
                      <Tooltip />
                      <Bar dataKey="Done" stackId="a" fill={COLORS.Done} />
                      <Bar dataKey="Support" stackId="a" fill={COLORS.Support} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Frequency Distribution */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarIcon size={18} /> Frequency Distribution</h3>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freqDistData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" axisLine={false} tickLine={false} fontSize={10} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} width={80} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Bar dataKey="value" fill={COLORS.Frequency} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Highest & Lowest Compliance Areas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ marginBottom: 0, border: '1px solid #6EE7B7' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669' }}><CheckCircle size={18} /> Highest Compliance Areas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {highestComplianceAreas.map((area, i) => (
                <div key={i} style={{ padding: '0.75rem', backgroundColor: '#ECFDF5', borderRadius: '12px', border: '1px solid #D1FAE5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#047857' }}>{area.name}</span>
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#059669' }}>{area.compliance}%</span>
                  </div>
                  <div style={{ height: '6px', width: '100%', backgroundColor: '#D1FAE5', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${area.compliance}%`, backgroundColor: '#10B981' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, border: '1px solid #FCA5A5' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626' }}><AlertTriangle size={18} /> Lowest Compliance Areas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lowestComplianceAreas.map((area, i) => (
                <div key={i} style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FEE2E2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#991B1B' }}>{area.name}</span>
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#DC2626' }}>{area.compliance}%</span>
                  </div>
                  <div style={{ height: '6px', width: '100%', backgroundColor: '#FEE2E2', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${area.compliance}%`, backgroundColor: '#EF4444' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dept Performance Leaderboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981' }}><CheckCircle size={18} /> Top Performing Departments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {deptPerformance.top.map((dept, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{dept.name}</span>
                  <span style={{ fontWeight: 800, color: '#10B981' }}>{dept.compliance}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444' }}><AlertTriangle size={18} /> Worst Performing Departments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {deptPerformance.worst.map((dept, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{dept.name}</span>
                  <span style={{ fontWeight: 800, color: '#EF4444' }}>{dept.compliance}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Workforce Compliance */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> Workforce Compliance</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>EMPLOYEE</th>
                <th style={{ textAlign: 'center', padding: '0.5rem' }}>TASKS</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>COMPLIANCE</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(filteredData.reduce((acc, curr) => {
                const name = curr.Submitted_By || 'Unknown';
                if (!acc[name]) acc[name] = { total: 0, done: 0 };
                acc[name].total++;
                if (curr.Status === 'Done') acc[name].done++;
                return acc;
              }, {})).sort((a, b) => b[1].done - a[1].done).slice(0, 5).map(([name, val], i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{name.split(' (')[0]}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{val.done} / {val.total}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    <span style={{ color: val.done / val.total > 0.8 ? COLORS.Done : COLORS.WIP, fontWeight: 700 }}>
                      {Math.round((val.done / val.total) * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RCA Highlights */}
        <div className="card" style={{ marginBottom: 0, backgroundColor: '#FFF5F5', border: '1px solid #FCA5A5' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626' }}><AlertTriangle size={18} /> Chronic Issue Warnings</h3>
          <div style={{ fontSize: '0.8rem', color: '#991B1B', marginBottom: '1rem' }}>Components with &gt;1 support or hold incidents in current filter scope.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(filteredData.filter(r => r.Status === 'Support Required' || r.Status === 'Hold').reduce((acc, curr) => {
              acc[curr.Component] = (acc[curr.Component] || 0) + 1;
              return acc;
            }, {})).filter(([_, count]) => count > 1).map(([name, count], i) => (
              <div key={i} style={{ backgroundColor: '#FFF', padding: '0.75rem', borderRadius: '8px', border: '1px solid #FCA5A5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>{name}</span>
                <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>{count} Incidents</span>
              </div>
            ))}
            {Object.keys(filteredData.filter(r => r.Status === 'Support Required' || r.Status === 'Hold').reduce((acc, curr) => {
              acc[curr.Component] = (acc[curr.Component] || 0) + 1;
              return acc;
            }, {})).filter(([_, count]) => count > 1).length === 0 && (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#059669', fontSize: '0.875rem' }}>
                <CheckCircle size={24} style={{ marginBottom: '0.5rem' }} /><br />No chronic issues detected.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
