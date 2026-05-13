import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, Clock, CheckCircle, AlertTriangle, ShieldCheck, Users, 
  Layers, Activity, FileClock, Search, Calendar, Zap, Map, Settings 
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

const AdvancedAnalyticsDashboard = ({ preFilteredData = [], baseChecklists = [] }) => {
  const { submissions: rawAllSub = [], checklists: rawAllCheck = [], shifts = [] } = useData();
  const [trendPivot, setTrendPivot] = useState('shift');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Use props passed from filtered parent dashboard, fallback safely
  const submissions = preFilteredData.length > 0 ? preFilteredData : rawAllSub;
  const checklists = baseChecklists.length > 0 ? baseChecklists : rawAllCheck;

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

    // Shift Distribution
    const shiftDist = ['A','B','C','G'].map(s => ({
      shift: `Shift ${s}`,
      count: activeDataSet.filter(d => d.Shift === s || (s === 'G' && d.Shift === 'General')).length,
      done: activeDataSet.filter(d => (d.Shift === s || (s === 'G' && d.Shift === 'General')) && d.Status === 'Done').length
    }));

    // Type Distribution simple for small charts
    const typeBreakdown = activityDetailGrid.slice(0, 5).map(x => ({ name: x.name, count: x.done }));

    return { done, pending, triggered, shiftDist, typeBreakdown, activityDetailGrid };
  }, [submissions, checklists, prodDateStr]);

  // 2. OVERDUE AGING ANALYSIS
  const overdueAging = useMemo(() => {
    const today = new Date();
    const overdueTasks = submissions.filter(s => s.Status === 'Pending' || s.Status === 'Hold');
    let underShift = 0, oneDay = 0, older = 0;
    overdueTasks.forEach(task => {
      const taskTime = new Date(task.Date_Timestamp || task.Date);
      const diffHrs = (today - taskTime) / (1000 * 60 * 60);
      if (diffHrs < 8) underShift++;
      else if (diffHrs < 24) oneDay++;
      else older++;
    });
    return [
      { name: '< 1 Shift', value: underShift, fill: '#FBBF24' },
      { name: '1 Day', value: oneDay, fill: '#F97316' },
      { name: '2+ Days', value: older, fill: '#EF4444' }
    ];
  }, [submissions]);

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
      const u = s.Submitted_By || 'Anon';
      if(!map[u]) map[u] = { name: u.split(' (')[0], completed: 0, total: 0 };
      map[u].total++;
      if(s.Status === 'Done') map[u].completed++;
    });
    return Object.values(map).sort((a,b) => b.completed - a.completed).slice(0, 6);
  }, [submissions]);

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

  // 7. LINE RELIABILITY 
  const lineReliability = useMemo(() => {
    const map = {};
    checklists.forEach(c => {
      const ln = c.Line_Equipment || 'Unknown';
      if(!map[ln]) map[ln] = { line: ln, total: 0, completed: 0 };
      map[ln].total++;
    });
    submissions.forEach(s => {
      const ln = s.Line_Equipment || 'Unknown';
      if(map[ln] && s.Status === 'Done') map[ln].completed++;
    });
    return Object.values(map).map(l => ({
      ...l,
      efficiency: Math.round((l.completed / Math.max(1, l.total)) * 100)
    })).sort((a,b) => a.efficiency - b.efficiency).slice(0, 5);
  }, [checklists, submissions]);

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

  // Helper Component for Shuffling Frequency Trend Line Graphs
  const DynamicDimensionTrend = ({ title, pivotKey, icon: Icon }) => {
    const [activeFreq, setActiveFreq] = useState('ALL');

    const trend = useMemo(() => {
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      let source = submissions;
      if (activeFreq && activeFreq !== 'ALL') {
        source = source.filter(s => 
          String(s.Frequency || '').trim().toLowerCase() === activeFreq.trim().toLowerCase()
        );
      }

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
        const label = dt.split('-').reverse().join('/');
        const row = { name: label };
        topEntities.forEach(ent => {
          row[ent] = dayLogs.filter(l => l[pivotKey] === ent && l.Status === 'Done').length;
        });
        return row;
      });

      return { chartData, topEntities };
    }, [activeFreq, submissions]);

    return (
      <div className="card" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
            {Icon && <Icon size={16} color="#6366F1" />} {title}
          </div>
          <select 
            value={activeFreq} 
            onChange={e => setActiveFreq(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #CBD5E1', cursor: 'pointer', outline: 'none', fontWeight: 600, backgroundColor: '#FFF' }}
          >
            <option value="ALL">Freq: ALL</option>
            <option value="Daily">Daily</option>
            <option value="Shift-wise">Shift-wise</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>
        
        {trend.topEntities.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic' }}>
            No trend data identified for selected filters.
          </div>
        ) : (
          <div style={{ height: '220px', width: '100%' }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* ================= LEVEL 1: MANAGEMENT SCORECARD ================= */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Zap size={22} fill="#6366F1" color="#6366F1" />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>LEVEL 1: Executive Command Scorecard</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
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

        {/* All Activity Type Compliance Breakdown */}
        <div className="card" style={{ marginTop: '1.5rem', borderTop: '1px solid #E2E8F0', padding: '1.25rem' }}>
          <div style={{ ...cardHeaderStyle, border: 'none', padding: 0, marginBottom: '1rem' }}>
            <Layers size={18} color="#6366F1" /> Activity-Wise Realization & Detailed Backlog 
          </div>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {coreStats.activityDetailGrid.map(row => {
                const completedRate = Math.min(100, row.allocated > 0 ? Math.round((row.done / row.allocated) * 100) : 0);
                return (
                  <div key={row.name} style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>{row.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>{completedRate}% Done</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <div style={{ width: `${completedRate}%`, height: '100%', backgroundColor: '#6366F1' }} />
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
            <div className="table-container-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', color: '#475569' }}>
                    <th style={{ padding: '0.6rem 1rem', borderRadius: '6px 0 0 6px' }}>Activity Type</th>
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
                  {coreStats.activityDetailGrid.map(row => {
                    const completedRate = Math.min(100, row.allocated > 0 ? Math.round((row.done / row.allocated) * 100) : 0);
                    return (
                      <tr key={row.name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155' }}>{row.name}</td>
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
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', color: '#64748B', fontWeight: 600 }}>
                            <span>{row.pending || 0}</span>
                            <span style={{ fontSize: '0.65rem' }}>({row.allocated > 0 ? Math.round((row.pending / row.allocated) * 100) : 0}%)</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <div style={{ width: '60px', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${completedRate}%`, height: '100%', backgroundColor: '#6366F1' }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#64748B', width: '30px' }}>{completedRate}%</span>
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
              The following critical activities fail verification checks or remain pending on a <strong>majority of occasions</strong> (>30% Fail Rate). Immediate engineering or supervisory audit is required.
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

        <div style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={(() => {
              const past7Dates = [...new Set(submissions.map(s => s.Date).filter(Boolean))].sort().slice(-7);
              
              let pivotKey = 'Shift';
              if(trendPivot === 'frequency') pivotKey = 'Frequency';
              if(trendPivot === 'doc') pivotKey = 'Document_Number';

              const pivotEntries = [...new Set(submissions.map(s => s[pivotKey] || 'Unknown'))].filter(x => x !== '-').slice(0, 5);

              return past7Dates.map(dt => {
                const dayLogs = submissions.filter(s => s.Date === dt && s.Status === 'Done');
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
                let pivotKey = 'Shift';
                if(trendPivot === 'frequency') pivotKey = 'Frequency';
                if(trendPivot === 'doc') pivotKey = 'Document_Number';
                const pivotEntries = [...new Set(submissions.map(s => s[pivotKey] || 'Unknown'))].filter(x => x !== '-').slice(0, 5);
                
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
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

          {/* Overdue Aging Pie */}
          <div className="card">
            <div style={cardHeaderStyle}><Clock size={18} color="#F59E0B" /> Overdue Aging Breakdown</div>
            <div style={{ height: '250px', display: 'flex' }}>
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie data={overdueAging} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                    {overdueAging.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem', flex: 1 }}>
                {overdueAging.map(x => (
                  <div key={x.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: x.fill }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{x.name}: <strong style={{ fontSize: '0.9rem' }}>{x.value}</strong></span>
                  </div>
                ))}
              </div>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={22} fill="#6366F1" color="#6366F1" />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>LEVEL 4: Multi-Dimension Completion Performance (7-Day Trend)</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          <DynamicDimensionTrend title="Daily Trend: Type of Activity" pivotKey="Type_of_Activity" icon={Activity} />
          <DynamicDimensionTrend title="Daily Trend: Line Equipment" pivotKey="Line_Equipment" icon={Layers} />
          <DynamicDimensionTrend title="Daily Trend: Sub-Line Equipment" pivotKey="Sub_Line_Equipment" icon={Map} />
          <DynamicDimensionTrend title="Daily Trend: Components" pivotKey="Component" icon={Settings} />
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
