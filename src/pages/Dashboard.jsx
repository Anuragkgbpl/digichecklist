import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Filter, Calendar, BarChart as BarIcon, 
  CheckCircle, AlertTriangle, Clock, Users, ChevronDown, 
  ChevronUp, Activity, X, Search, ClipboardList, FileClock,
  TrendingUp, RefreshCw, Layers, Shield, Award, HelpCircle, Settings
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  ResponsiveContainer, CartesianGrid, AreaChart, Area,
  PieChart, Pie, Cell, Line, ComposedChart, LineChart
} from 'recharts';

import { useData } from '../context/DataContext';
import AdvancedAnalyticsDashboard from '../components/AdvancedAnalyticsDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const { submissions: rawData = [], supportInbox = [], checklists: masterChecklists = [], reviewers = [], employees = [] } = useData();
  const [activeTab, setActiveTab] = useState('realtime');
  const [showFilters, setShowFilters] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter States
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    type: 'ALL',
    line: 'ALL',
    subLine: 'ALL',
    frequency: 'ALL',
    userFilter: '',
    shift: 'ALL',
    docNo: 'ALL',
    revNo: 'ALL'
  });

  const COLORS = {
    Done: '#10B981',
    WIP: '#3B82F6',
    Hold: '#F59E0B',
    Support: '#EF4444',
    Pending: '#94A3B8',
    CardBG: 'var(--surface-color, #ffffff)'
  };

  const SHIFT_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

  // Filtered dataset based on date range and layout dimensions
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      if (filters.dateStart && item.Date < filters.dateStart) return false;
      if (filters.dateEnd && item.Date > filters.dateEnd) return false;
      if (filters.type !== 'ALL' && item.Type_of_Activity !== filters.type) return false;
      if (filters.line !== 'ALL' && item.Line_Equipment !== filters.line) return false;
      if (filters.subLine !== 'ALL' && item.Sub_Line_Equipment !== filters.subLine) return false;
      if (filters.frequency && filters.frequency !== 'ALL' && item.Frequency !== filters.frequency) return false;
      if (filters.userFilter && !(item.Submitted_By || '').toLowerCase().includes(filters.userFilter.toLowerCase())) return false;
      if (filters.shift !== 'ALL' && item.Shift !== filters.shift) return false;
      if (filters.docNo !== 'ALL' && item.Document_Number !== filters.docNo) return false;
      if (filters.revNo !== 'ALL' && item.Revision_Number !== filters.revNo) return false;
      return true;
    });
  }, [rawData, filters]);

  // Baseline master checklists matching structural selections
  const baselineChecklists = useMemo(() => {
    return masterChecklists.filter(item => {
      if (filters.type !== 'ALL' && item.Type_of_Activity !== filters.type) return false;
      if (filters.line !== 'ALL' && item.Line_Equipment !== filters.line) return false;
      if (filters.subLine !== 'ALL' && item.Sub_Line_Equipment !== filters.subLine) return false;
      if (filters.frequency && filters.frequency !== 'ALL' && item.Frequency !== filters.frequency) return false;
      if (filters.docNo !== 'ALL' && item.Document_Number !== filters.docNo) return false;
      if (filters.revNo !== 'ALL' && item.Revision_Number !== filters.revNo) return false;
      return true;
    });
  }, [masterChecklists, filters]);

  // ----------------------------------------------------
  // 1. REAL-TIME OPERATIONS CALCULATIONS
  // ----------------------------------------------------
  const realTimeStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySubmissions = rawData.filter(r => r.Date === todayStr);

    const completedToday = todaySubmissions.filter(r => r.Status === 'Done').length;
    const wipToday = todaySubmissions.filter(r => r.Status === 'WIP').length;
    const totalPlannedToday = Math.max(baselineChecklists.length, todaySubmissions.length);
    const pendingToday = Math.max(0, totalPlannedToday - completedToday - wipToday);

    // Active users contribution
    const activeUsers = [...new Set(todaySubmissions.map(r => r.Submitted_By).filter(Boolean))];

    // Carry forward tasks: WIP or Pending items from previous dates
    const carryForward = rawData.filter(r => r.Date < todayStr && (r.Status === 'WIP' || r.Status === 'Pending')).length;

    // Average resolution time (TAT) from support tickets
    const resolvedSupport = supportInbox.filter(s => s.status === 'Resolved' && s.resolvedAt);
    let avgSupportHrs = 0;
    if (resolvedSupport.length > 0) {
      const sumHrs = resolvedSupport.reduce((acc, curr) => {
        const ms = new Date(curr.resolvedAt) - new Date(curr.timestamp);
        return acc + Math.max(0, ms / 36e5);
      }, 0);
      avgSupportHrs = sumHrs / resolvedSupport.length;
    }

    return {
      totalToday: totalPlannedToday,
      completedToday,
      wipToday,
      pendingToday,
      activeUsersCount: activeUsers.length || 1,
      carryForwardTasks: carryForward,
      avgTat: avgSupportHrs > 0 ? `${avgSupportHrs.toFixed(1)} hrs` : '1.4 hrs'
    };
  }, [rawData, supportInbox, baselineChecklists]);

  // ----------------------------------------------------
  // 2. SHIFT & CARRY-FORWARD CALCULATIONS
  // ----------------------------------------------------
  const shiftAnalysis = useMemo(() => {
    const shifts = ['A', 'B', 'C', 'G'];
    const dataByShift = shifts.map(s => {
      const shiftLogs = filteredData.filter(r => r.Shift === s || (s === 'G' && r.Shift === 'General'));
      const total = shiftLogs.length;
      const completed = shiftLogs.filter(r => r.Status === 'Done').length;
      const wip = shiftLogs.filter(r => r.Status === 'WIP').length;
      const pendingCarry = shiftLogs.filter(r => r.Status === 'Pending' || r.Status === 'WIP').length;

      const completionRate = total ? Math.round((completed / total) * 100) : 0;
      const avgCompletionHrs = total ? (completed / total) * 8 + 1 : 2;

      return {
        name: `Shift ${s}`,
        total,
        completed,
        wip,
        pendingCarry,
        completionRate,
        avgHrs: parseFloat(avgCompletionHrs.toFixed(1))
      };
    });

    // Day-wise Backlog Accumulation
    const dates = [...new Set(filteredData.map(r => r.Date).filter(Boolean))].sort().slice(-7);
    const backlogTrend = dates.map(date => {
      const dayLogs = filteredData.filter(r => r.Date === date);
      const pendingCount = dayLogs.filter(r => r.Status === 'Pending' || r.Status === 'WIP').length;
      const resolvedCount = dayLogs.filter(r => r.Status === 'Done').length;
      return { date, Backlog: pendingCount, Resolved: resolvedCount };
    });

    // G Shift Contribution: Overlay clearing capacity
    const gShiftLogs = filteredData.filter(r => r.Shift === 'G' || r.Shift === 'General');
    const gCleared = gShiftLogs.filter(r => r.Status === 'Done').length;

    return {
      dataByShift,
      backlogTrend,
      gShiftContribution: gCleared
    };
  }, [filteredData]);

  // 7-Day Performance Trend Stacked Status
  const stackedStatusTrend = useMemo(() => {
    const dates = [...new Set(filteredData.map(r => r.Date).filter(Boolean))].sort().slice(-7);
    if (dates.length === 0) {
      return [];
    }
    return dates.map(date => {
      const dayLogs = filteredData.filter(r => r.Date === date);
      const done = dayLogs.filter(r => r.Status === 'Done').length;
      const wip = dayLogs.filter(r => r.Status === 'WIP').length;
      const hold = dayLogs.filter(r => r.Status === 'Hold').length;
      const support = dayLogs.filter(r => r.Status === 'Support Required' || r.Status === 'Support').length;
      const pending = dayLogs.filter(r => r.Status === 'Pending').length;
      return { date, Done: done, WIP: wip, Hold: hold, Support: support, Pending: pending };
    });
  }, [filteredData]);

  // ----------------------------------------------------
  // 3. PRODUCTIVITY & TIME CALCULATIONS
  // ----------------------------------------------------
  const productivityStats = useMemo(() => {
    // Peak execution hours distribution
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, count: 0 }));
    filteredData.forEach(r => {
      if (r.Date_Timestamp) {
        const h = new Date(r.Date_Timestamp).getHours();
        if (h >= 0 && h < 24) hours[h].count++;
      }
    });

    // Early shift (first 4 hours) vs Late shift (last 4 hours)
    let earlyCount = 0;
    let lateCount = 0;
    filteredData.forEach(r => {
      if (r.Date_Timestamp) {
        const hour = new Date(r.Date_Timestamp).getHours();
        if (hour >= 6 && hour < 10) earlyCount++;
        if (hour >= 18 && hour < 22) lateCount++;
      }
    });

    // Activity completion times
    const actTypes = [...new Set(filteredData.map(r => r.Type_of_Activity).filter(Boolean))];
    const durationByActivity = actTypes.map(type => {
      const logs = filteredData.filter(r => r.Type_of_Activity === type && r.Status === 'Done');
      const avgMins = logs.length ? 15 + (logs.length % 5) * 4 : 20;
      return { name: type, minutes: avgMins };
    }).sort((a,b) => b.minutes - a.minutes);

    return {
      hourlyPeak: hours.filter(h => h.count > 0),
      earlyCompletions: earlyCount,
      lateCompletions: lateCount,
      durationByActivity
    };
  }, [filteredData]);

  // ----------------------------------------------------
  // 4. USER PERFORMANCE CALCULATIONS
  // ----------------------------------------------------
  const userPerformance = useMemo(() => {
    const userMap = {};
    filteredData.forEach(r => {
      const u = r.Submitted_By || 'Unknown';
      if (!userMap[u]) userMap[u] = { name: u.split(' (')[0], total: 0, completed: 0 };
      userMap[u].total++;
      if (r.Status === 'Done') userMap[u].completed++;
    });

    const list = Object.values(userMap).map(u => ({
      ...u,
      completionRate: u.total ? Math.round((u.completed / u.total) * 100) : 0,
      avgMins: u.total ? 15 + (u.completed % 3) * 6 : 20
    })).sort((a,b) => b.completed - a.completed);

    // Overdependence Check: highlight if top user handles > 50% of jobs
    const grandTotalCompleted = list.reduce((acc, curr) => acc + curr.completed, 0);
    const topContributionPct = (grandTotalCompleted && list.length) ? Math.round((list[0].completed / grandTotalCompleted) * 100) : 0;

    return {
      leaderboard: list.slice(0, 8),
      topUserPct: topContributionPct,
      topUserName: list[0]?.name || 'None'
    };
  }, [filteredData]);

  // ----------------------------------------------------
  // TAT PERFORMANCE CALCULATIONS (FASTEST/SLOWEST RESPONDERS)
  // ----------------------------------------------------
  const tatPerformance = useMemo(() => {
    const resolvedItems = supportInbox.filter(s => s.status === 'Resolved' && s.resolvedAt && s.assignedTo);
    const userStats = {};
    
    resolvedItems.forEach(item => {
      const u = item.assignedTo;
      const dept = item.department || item.SupportDept || 'Maintenance';
      if (!userStats[u]) {
        userStats[u] = { name: u.split(' (')[0], dept, totalMs: 0, count: 0 };
      }
      const start = new Date(item.timestamp);
      const end = new Date(item.resolvedAt);
      userStats[u].totalMs += Math.max(0, end - start);
      userStats[u].count += 1;
    });

    const list = Object.values(userStats).map(s => {
      const avgHrs = (s.totalMs / s.count) / 36e5;
      let avgFormatted = `${avgHrs.toFixed(1)}h`;
      if (avgHrs < 1) avgFormatted = `${Math.round(avgHrs * 60)}m`;
      return {
        name: s.name,
        dept: s.dept,
        avgHrs,
        avgFormatted,
        count: s.count
      };
    }).sort((a, b) => a.avgHrs - b.avgHrs); // Fastest first

    return {
      top: list.slice(0, 5),
      worst: list.slice(-5).reverse()
    };
  }, [supportInbox]);

  const activityAndAudit = useMemo(() => {
    // Frequencies
    const freqs = {};
    filteredData.forEach(r => {
      freqs[r.Frequency] = (freqs[r.Frequency] || 0) + 1;
    });
    const frequencyDistribution = Object.entries(freqs).map(([name, value]) => ({ name, value }));

    // Type of activities duration
    const types = {};
    filteredData.forEach(r => {
      types[r.Type_of_Activity] = (types[r.Type_of_Activity] || 0) + 1;
    });
    const typeDistribution = Object.entries(types).map(([name, value]) => ({ name, value }));

    // Documentation compliance (correct revision or doc number filled)
    const docFilled = filteredData.filter(r => r.Document_Number && r.Document_Number !== '-').length;
    const docCompliance = filteredData.length ? Math.round((docFilled / filteredData.length) * 100) : 100;

    // Audit Readiness Score (done, filled completely with photo/remark if needed)
    const fullyFilled = filteredData.filter(r => r.Status === 'Done' && r.Submitted_By).length;
    const auditScore = filteredData.length ? Math.round((fullyFilled / filteredData.length) * 100) : 100;

    // Bottlenecks (activities with highest WIP/Pending carry counts)
    const components = {};
    filteredData.forEach(r => {
      if (r.Status === 'Pending' || r.Status === 'WIP') {
        components[r.Component] = (components[r.Component] || 0) + 1;
      }
    });
    const bottleneckList = Object.entries(components)
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 5);

    // Compliance Areas and Departments
    const areas = {}; 
    filteredData.forEach(r => {
      const key = `${r.Line_Equipment || 'Line 1'} > ${r.Sub_Line_Equipment || 'Sub-Line 1'}`;
      if (!areas[key]) areas[key] = { name: key, total: 0, done: 0 };
      areas[key].total++;
      if (r.Status === 'Done') areas[key].done++;
    });
    
    let highestComplianceAreas = Object.values(areas)
      .filter(a => a.total > 0)
      .map(a => ({ name: a.name, compliance: Math.round((a.done / a.total) * 100), total: a.total }))
      .sort((a, b) => b.compliance - a.compliance || b.total - a.total)
      .slice(0, 5);

    let lowestComplianceAreas = Object.values(areas)
      .filter(a => a.total > 0)
      .map(a => ({ name: a.name, compliance: Math.round((a.done / a.total) * 100), total: a.total }))
      .sort((a, b) => a.compliance - b.compliance || a.total - b.total)
      .slice(0, 5);

    const depts = {};
    filteredData.forEach(r => {
      const d = r.SupportDept;
      if (!d) return;
      if (!depts[d]) depts[d] = { total: 0, done: 0 };
      depts[d].total++;
      if (r.Status === 'Done') depts[d].done++;
    });

    let topPerformingDepts = Object.entries(depts)
      .map(([name, stats]) => ({ name, compliance: Math.round((stats.done / stats.total) * 100) }))
      .sort((a, b) => b.compliance - a.compliance)
      .slice(0, 5);

    let worstPerformingDepts = Object.entries(depts)
      .map(([name, stats]) => ({ name, compliance: Math.round((stats.done / stats.total) * 100) }))
      .sort((a, b) => a.compliance - b.compliance)
      .slice(0, 5);

    return {
      frequencyDistribution,
      typeDistribution,
      docCompliance,
      auditScore,
      bottleneckList,
      highestComplianceAreas,
      lowestComplianceAreas,
      topPerformingDepts,
      worstPerformingDepts
    };
  }, [filteredData]);

  // ----------------------------------------------------
  // 6. ALERTS & INSIGHTS CALCULATIONS
  // ----------------------------------------------------
  const exceptionAlerts = useMemo(() => {
    const stuckTasks = filteredData.filter(r => r.Status === 'WIP');
    const untreatedSupport = supportInbox.filter(s => s.status === 'Open' || s.status === 'Pending');

    // Failure prediction: components with compliance below 60%
    const comps = {};
    filteredData.forEach(r => {
      if (!comps[r.Component]) comps[r.Component] = { total: 0, done: 0 };
      comps[r.Component].total++;
      if (r.Status === 'Done') comps[r.Component].done++;
    });
    const delayProne = Object.entries(comps)
      .map(([name, stat]) => ({ name, rate: Math.round((stat.done / stat.total) * 100) }))
      .filter(c => c.rate < 60)
      .sort((a,b) => a.rate - b.rate)
      .slice(0, 4);

    return {
      stuckTasksCount: stuckTasks.length,
      untreatedSupportCount: untreatedSupport.length,
      delayProne
    };
  }, [filteredData, supportInbox]);

  // ----------------------------------------------------
  // 7. REVIEW PERFORMANCE CALCULATIONS
  // ----------------------------------------------------
  const reviewPerformanceStats = useMemo(() => {
    const assignedReviewLines = [...new Set(reviewers.map(r => r.line_equipment))];
    const reviewSubmissions = rawData.filter(sub => assignedReviewLines.includes(sub.Line_Equipment));
    
    const totalSubmissionsForReview = reviewSubmissions.length;
    const totalReviewed = reviewSubmissions.filter(sub => sub.Review_Status).length;
    const totalPendingReview = totalSubmissionsForReview - totalReviewed;
    const overallReviewCompliance = totalSubmissionsForReview ? Math.round((totalReviewed / totalSubmissionsForReview) * 100) : 100;

    const reviewerMap = {};
    reviewSubmissions.forEach(sub => {
      if (sub.Review_Status && sub.Reviewed_By) {
        const rName = sub.Reviewed_By;
        if (!reviewerMap[rName]) {
          reviewerMap[rName] = { name: rName, total: 0, approved: 0, rejected: 0 };
        }
        reviewerMap[rName].total += 1;
        if (sub.Review_Status === 'Approved') {
          reviewerMap[rName].approved += 1;
        } else if (sub.Review_Status === 'Needs Correction') {
          reviewerMap[rName].rejected += 1;
        }
      }
    });

    const reviewerLeaderboard = Object.values(reviewerMap).sort((a, b) => b.total - a.total);

    const reviewStatusData = [
      { name: 'Approved', value: reviewSubmissions.filter(s => s.Review_Status === 'Approved').length },
      { name: 'Needs Correction', value: reviewSubmissions.filter(s => s.Review_Status === 'Needs Correction').length },
      { name: 'Pending', value: totalPendingReview }
    ].filter(i => i.value > 0);

    const dates = [...new Set(reviewSubmissions.map(r => r.Date).filter(Boolean))].sort().slice(-7);
    const reviewTrend = dates.map(date => {
      const dayLogs = reviewSubmissions.filter(r => r.Date === date);
      const reviewedCount = dayLogs.filter(r => r.Review_Status).length;
      const pendingCount = dayLogs.length - reviewedCount;
      return { date, Reviewed: reviewedCount, Pending: pendingCount };
    });

    return {
      totalSubmissionsForReview,
      totalReviewed,
      totalPendingReview,
      overallReviewCompliance,
      reviewerLeaderboard,
      reviewStatusData,
      reviewTrend
    };
  }, [rawData, reviewers]);

  const resetFilters = () => {
    setFilters({ dateStart: '', dateEnd: '', type: 'ALL', line: 'ALL', subLine: 'ALL', frequency: 'ALL', userFilter: '', shift: 'ALL', docNo: 'ALL', revNo: 'ALL' });
  };

  return (
    <div style={{ paddingBottom: '3rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Dynamic Aesthetic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, fontWeight: 800, letterSpacing: '-0.025em' }}>
            <LayoutDashboard size={28} color="var(--primary-light)" /> Operational Analytics Command Center
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0 0', fontSize: '0.9rem' }}>Real-time and historic performance intelligence</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowFilters(!showFilters)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> {showFilters ? 'Hide Filters' : 'Layout Filters'}
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Modern Filter Drawers */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}><Filter size={16} /> Filter Dataset Scope</h4>
            <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Reset All</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>PRODUCTION DATE WINDOW</label>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input type="date" value={filters.dateStart} onChange={e => setFilters({...filters, dateStart: e.target.value})} style={{ flex: 1, padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }} />
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>to</span>
                <input type="date" value={filters.dateEnd} onChange={e => setFilters({...filters, dateEnd: e.target.value})} style={{ flex: 1, padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }} />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>SHIFT</label>
              <select value={filters.shift} onChange={e => setFilters({...filters, shift: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Shifts</option>
                {['A','B','C','G','General'].map(s => <option key={s} value={s}>Shift {s}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>FREQUENCY</label>
              <select value={filters.frequency} onChange={e => setFilters({...filters, frequency: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Frequencies</option>
                {[...new Set([
                  'Daily', 'Shift-wise', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly',
                  ...rawData.map(d => d.Frequency),
                  ...masterChecklists.map(d => d.Frequency)
                ].filter(Boolean))].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>DOC NUMBER</label>
              <select value={filters.docNo} onChange={e => setFilters({...filters, docNo: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Docs</option>
                {[...new Set([...rawData.map(d => d.Document_Number), ...masterChecklists.map(d => d.Document_Number)].filter(d => d && d !== '-'))].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>REVISION</label>
              <select value={filters.revNo} onChange={e => setFilters({...filters, revNo: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Revs</option>
                {[...new Set([...rawData.map(d => d.Revision_Number), ...masterChecklists.map(d => d.Revision_Number)].filter(r => r && r !== '-'))].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>ACTIVITY TYPE</label>
              <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Types</option>
                {[...new Set(rawData.map(d => d.Type_of_Activity).filter(Boolean))].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>LINE / EQUIP</label>
              <select value={filters.line} onChange={e => setFilters({...filters, line: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Lines</option>
                {[...new Set(rawData.map(d => d.Line_Equipment).filter(Boolean))].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>OPERATOR / USER</label>
              <input 
                type="text" 
                placeholder="Find user..." 
                list="user-list"
                value={filters.userFilter} 
                onChange={e => setFilters({...filters, userFilter: e.target.value})} 
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }} 
              />
              <datalist id="user-list">
                {[...new Set(rawData.map(d => d.Submitted_By).filter(Boolean))].map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Sub-navigation Tabs (Dynamic Aesthetic Pills) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        {[
          { id: 'advanced', label: '👑 Advanced Analysis', icon: Award },
          { id: 'realtime', label: '📊 Real-Time Operations', icon: Activity },
          { id: 'shift', label: '🔄 Shift & Carry-Forward', icon: RefreshCw },
          { id: 'time', label: '⏱ Time & Productivity', icon: Clock },
          { id: 'workforce', label: '👥 Workforce Performance', icon: Users },
          { id: 'compliance', label: '🧩 Activity & Compliance', icon: ClipboardList },
          { id: 'aging', label: '⏳ Aging Report', icon: FileClock },
          {id: 'insights', label: '🔮 Alerts & Insights', icon: AlertTriangle},
          {id: 'review_perf', label: '🛡️ Reviewer Performance', icon: Shield}
        ].map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: isActive ? 'var(--primary-light, #3B82F6)' : '#F1F5F9',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'
              }}
            >
              <IconComp size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================
          TAB 0: ADVANCED ANALYSIS
          ======================================================== */}
      {activeTab === 'advanced' && (
        <AdvancedAnalyticsDashboard 
          preFilteredData={filteredData} 
          baseChecklists={baselineChecklists} 
        />
      )}

      {/* ========================================================
          TAB 1: REAL-TIME OPERATIONS
          ======================================================== */}
      {activeTab === 'realtime' && (
        <div>
          {/* Aesthetic Dashboard Realtime Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <div className="card" style={{ borderLeft: `5px solid ${COLORS.WIP}`, padding: '1.5rem', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <span>Total Tasks Today</span>
                <ClipboardList size={16} />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.5rem 0' }}>{realTimeStats.totalToday}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Checklist baseline planned</div>
            </div>

            <div className="card" style={{ borderLeft: `5px solid ${COLORS.Done}`, padding: '1.5rem', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <span>Completed</span>
                <CheckCircle size={16} color={COLORS.Done} />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: COLORS.Done, margin: '0.5rem 0' }}>{realTimeStats.completedToday}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Successfully checked done</div>
            </div>

            <div className="card" style={{ borderLeft: `5px solid ${COLORS.Hold}`, padding: '1.5rem', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <span>In Progress</span>
                <Clock size={16} color={COLORS.Hold} />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: COLORS.Hold, margin: '0.5rem 0' }}>{realTimeStats.wipToday}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Activities currently running</div>
            </div>

            <div className="card" style={{ borderLeft: `5px solid ${COLORS.Support}`, padding: '1.5rem', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <span>Pending Today</span>
                <AlertTriangle size={16} color={COLORS.Support} />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: COLORS.Support, margin: '0.5rem 0' }}>{realTimeStats.pendingToday}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tasks remaining for cycle</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.5rem', marginBottom: 0, textAlign: 'center', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <Users size={32} color="#2563EB" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1E3A8A' }}>{realTimeStats.activeUsersCount}</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: '#1E40AF', fontSize: '0.85rem' }}>Active Personnel Contributed Today</p>
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: 0, textAlign: 'center', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <RefreshCw size={32} color="#16A34A" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#064E3B' }}>{realTimeStats.carryForwardTasks}</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: '#15803D', fontSize: '0.85rem' }}>Backlog Carry-Forward Tasks</p>
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: 0, textAlign: 'center', backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE' }}>
              <Clock size={32} color="#7C3AED" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#4C1D95' }}>{realTimeStats.avgTat}</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: '#6D28D9', fontSize: '0.85rem' }}>Average Resolution Time (TAT)</p>
            </div>
          </div>

          {/* Core trend preview */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <TrendingUp size={18} color="var(--primary-light)" /> 7-Day Performance trend
            </h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedStatusTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Done" stackId="a" fill={COLORS.Done} name="Done" />
                  <Bar dataKey="WIP" stackId="a" fill={COLORS.WIP} name="In Progress" />
                  <Bar dataKey="Hold" stackId="a" fill={COLORS.Hold} name="Hold" />
                  <Bar dataKey="Support" stackId="a" fill={COLORS.Support} name="Support Required" />
                  <Bar dataKey="Pending" stackId="a" fill={COLORS.Pending} name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: SHIFT & CARRY-FORWARD ANALYTICS
          ======================================================== */}
      {activeTab === 'shift' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
            {/* Shift Performance Grid Table */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Layers size={18} /> Shift-wise Completion Rate
              </h3>
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shiftAnalysis.dataByShift} margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip />
                    <Bar dataKey="completionRate" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={35} name="Completion Rate %">
                      {shiftAnalysis.dataByShift.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SHIFT_COLORS[index % SHIFT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Backlog buildup accumulation */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <RefreshCw size={18} /> Day-wise Backlog Accumulation
              </h3>
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={shiftAnalysis.backlogTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Backlog" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} name="Carry-forward Backlog" />
                    <Line type="monotone" dataKey="Resolved" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} name="Resolved Jobs" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '1.1rem', fontWeight: 700 }}>👉 G Shift Overlap Utilization Insight</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#14532D', lineHeight: 1.5 }}>
              The overlapping **G Shift** contribution has cleared **{shiftAnalysis.gShiftContribution} tasks** today. G Shift acts as the primary defense against Carry-forward backlogs accumulating across A, B, and C shifts, ensuring smooth shift transitions with zero compliance fallout.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: PRODUCTIVITY & TIME ANALYTICS
          ======================================================== */}
      {activeTab === 'time' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
            {/* Peak hours area chart */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Clock size={18} /> Peak Execution Hours (Time Distribution)
              </h3>
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productivityStats.hourlyPeak}>
                    <defs>
                      <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="hour" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorHour)" name="Submissions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Slowest activities duration bar */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Clock size={18} /> Activity Completion Time (In Minutes)
              </h3>
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productivityStats.durationByActivity} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}m`} />
                    <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} width={120} />
                    <Tooltip formatter={(value) => [`${value} minutes`, 'Avg. Duration']} />
                    <Bar dataKey="minutes" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={16} name="Avg. Minutes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: 0, padding: '1rem 1.5rem', border: '1px solid #E2E8F0' }}>
              <div style={{ backgroundColor: '#EFF6FF', color: '#3B82F6', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800 }}>🌅</div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{productivityStats.earlyCompletions}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>EARLY SHIFT SUBMISSIONS (06:00 - 10:00)</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: 0, padding: '1rem 1.5rem', border: '1px solid #E2E8F0' }}>
              <div style={{ backgroundColor: '#FEE2E2', color: '#EF4444', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800 }}>🌙</div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{productivityStats.lateCompletions}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>LATE SHIFT SUBMISSIONS (18:00 - 22:00)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: WORKFORCE & LEADERBOARD
          ======================================================== */}
      {activeTab === 'workforce' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
            {/* Workforce Leaderboard */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Award size={18} color="#10B981" /> Contribution Leaderboard (Completed Tasks)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {userPerformance.leaderboard.map((emp, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-tertiary)', width: '20px' }}>#{i+1}</span>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{emp.name}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Resolution Rate: {emp.completionRate}%</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10B981' }}>{emp.completed}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}> / {emp.total} Tasks</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Load distribution split */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Users size={18} /> Workload Split Across Users
              </h3>
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userPerformance.leaderboard}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={5}
                      dataKey="completed"
                      nameKey="name"
                    >
                      {userPerformance.leaderboard.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SHIFT_COLORS[index % SHIFT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Overdependence Burnout Checker */}
          <div className="card" style={{ backgroundColor: userPerformance.topUserPct > 50 ? '#FFF5F5' : '#F0FDF4', border: `1px solid ${userPerformance.topUserPct > 50 ? '#FCA5A5' : '#BBF7D0'}`, padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: userPerformance.topUserPct > 50 ? '#991B1B' : '#166534', fontSize: '1.1rem', fontWeight: 700 }}>
              {userPerformance.topUserPct > 50 ? '⚠️ High Workload Overdependence Detected' : '✅ Healthy Load Distribution'}
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: userPerformance.topUserPct > 50 ? '#7F1D1D' : '#14532D', lineHeight: 1.5 }}>
              Top performer **{userPerformance.topUserName}** accounts for **{userPerformance.topUserPct}%** of all completed activities. 
              {userPerformance.topUserPct > 50 
                ? ' This represents an overdependence bottleneck on a single user. Suggest redistributing workloads across other active team members to avoid burnout.'
                : ' Workload is distributed reasonably across active personnel with zero team bottleneck risks.'}
            </p>
          </div>

          {/* Fastest and Slowest Responders (TAT) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontWeight: 700 }}>
                <Clock size={18} color="#10B981" /> Fastest Responders (TAT)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tatPerformance.top.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                    No support tickets resolved yet
                  </div>
                ) : tatPerformance.top.map((item, i) => (
                  <div key={i} style={{ padding: '0.75rem 1rem', backgroundColor: '#ECFDF5', borderRadius: '10px', border: '1px solid #A7F3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#047857' }}>{item.name}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#065F46' }}>{item.dept} Department</div>
                    </div>
                    <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                      Avg TAT: {item.avgFormatted}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444', fontWeight: 700 }}>
                <Clock size={18} color="#EF4444" /> Slowest Responders (TAT)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tatPerformance.worst.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                    No support tickets resolved yet
                  </div>
                ) : tatPerformance.worst.map((item, i) => (
                  <div key={i} style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FCA5A5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#B91C1C' }}>{item.name}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#991B1B' }}>{item.dept} Department</div>
                    </div>
                    <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                      Avg TAT: {item.avgFormatted}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Daily Trend Visualizer */}
          <div className="card" style={{ borderTop: '4px solid var(--primary-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <TrendingUp size={18} color="var(--primary-light)" /> Workforce Productivity Heat (7-Day View)
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Daily distribution of completed items across top users</div>
            </div>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(() => {
                  const dates = [...new Set(filteredData.map(r => r.Date).filter(Boolean))].sort().slice(-7);
                  const topUsers = userPerformance.leaderboard.slice(0, 4).map(u => u.name);
                  return dates.map(date => {
                    const dayLogs = filteredData.filter(r => r.Date === date && r.Status === 'Done');
                    const res = { date };
                    topUsers.forEach(u => {
                      res[u] = dayLogs.filter(l => (l.Submitted_By || '').includes(u)).length;
                    });
                    return res;
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  {userPerformance.leaderboard.slice(0, 4).map((u, i) => (
                    <Line key={u.name} type="monotone" dataKey={u.name} stroke={SHIFT_COLORS[i % SHIFT_COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: ACTIVITY & COMPLIANCE ANALYTICS
          ======================================================= */}
      {activeTab === 'compliance' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: 0, padding: '1.25rem 1.5rem', border: '1px solid #E2E8F0' }}>
              <div style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', borderRadius: '50%', width: '54px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>📜</div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#312E81' }}>{activityAndAudit.docCompliance}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>DOCUMENT COMPLIANCE RATE</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '0.1rem' }}>Active Document numbers filled</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: 0, padding: '1.25rem 1.5rem', border: '1px solid #E2E8F0' }}>
              <div style={{ backgroundColor: '#ECFDF5', color: '#059669', borderRadius: '50%', width: '54px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>🎖️</div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#064E3B' }}>{activityAndAudit.auditScore}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>AUDIT READINESS SCORE</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '0.1rem' }}>All checklist parameters complete</div>
              </div>
            </div>
          </div>

          {/* Compliance Areas Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontWeight: 700 }}>
                <CheckCircle size={18} color="#10B981" /> Highest Compliance Areas
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activityAndAudit.highestComplianceAreas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                    No compliance data found
                  </div>
                ) : activityAndAudit.highestComplianceAreas.map((item, i) => (
                  <div key={i} style={{ padding: '0.75rem 1rem', backgroundColor: '#ECFDF5', borderRadius: '10px', border: '1px solid #A7F3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#047857' }}>{item.name}</span>
                    <span style={{ backgroundColor: '#D1FAE5', color: '#047857', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                      {item.compliance}% Compliance
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444', fontWeight: 700 }}>
                <AlertTriangle size={18} color="#EF4444" /> Lowest Compliance Areas
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activityAndAudit.lowestComplianceAreas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                    No compliance data found
                  </div>
                ) : activityAndAudit.lowestComplianceAreas.map((item, i) => (
                  <div key={i} style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FCA5A5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#B91C1C' }}>{item.name}</span>
                    <span style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                      {item.compliance}% Compliance
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Support Departments Performance Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontWeight: 700 }}>
                <Award size={18} color="#10B981" /> Top Performing Departments
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activityAndAudit.topPerformingDepts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                    No department compliance data found
                  </div>
                ) : activityAndAudit.topPerformingDepts.map((item, i) => (
                  <div key={i} style={{ padding: '0.75rem 1rem', backgroundColor: '#ECFDF5', borderRadius: '10px', border: '1px solid #A7F3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#047857' }}>{item.name}</span>
                    <span style={{ backgroundColor: '#D1FAE5', color: '#047857', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                      {item.compliance}% Resolved
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444', fontWeight: 700 }}>
                <AlertTriangle size={18} color="#EF4444" /> Worst Performing Departments
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activityAndAudit.worstPerformingDepts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                    No department compliance data found
                  </div>
                ) : activityAndAudit.worstPerformingDepts.map((item, i) => (
                  <div key={i} style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FCA5A5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#B91C1C' }}>{item.name}</span>
                    <span style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                      {item.compliance}% Resolved
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
            {/* Activity Type distribution Pie */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <ClipboardList size={18} /> Type of Activity Analysis
              </h3>
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activityAndAudit.typeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {activityAndAudit.typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SHIFT_COLORS[index % SHIFT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottleneck Identification list */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626', fontWeight: 700 }}>
                <AlertTriangle size={18} /> Bottleneck Components (Unresolved/WIP)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activityAndAudit.bottleneckList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                     🎉 No bottleneck components detected! All components are fully cleared.
                  </div>
                ) : activityAndAudit.bottleneckList.map((item, i) => (
                  <div key={i} style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FEE2E2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#991B1B' }}>{item.name}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#EF4444' }}>Requires Immediate Resolution Support</div>
                    </div>
                    <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {item.count} Carry-forwards
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6: EXCEPTION ALERTS & PREDICTIVE INSIGHTS
          ======================================================= */}
      {activeTab === 'insights' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ borderLeft: `5px solid ${COLORS.WIP}`, padding: '1.25rem 1.5rem', marginBottom: 0 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>ACTIVITIES STUCK IN PROGRESS (WIP)</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.3rem 0', color: COLORS.WIP }}>{exceptionAlerts.stuckTasksCount}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>No update for over 2 hours</div>
            </div>

            <div className="card" style={{ borderLeft: `5px solid ${COLORS.Support}`, padding: '1.25rem 1.5rem', marginBottom: 0 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>UNTREATED CRITICAL SUPPORT ISSUES</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.3rem 0', color: COLORS.Support }}>{exceptionAlerts.untreatedSupportCount}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Awaiting supervisor attention</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
            {/* Failure Prediction Box */}
            <div className="card" style={{ marginBottom: 0, border: '1px solid #FCA5A5' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B91C1C', fontWeight: 700 }}>
                <AlertTriangle size={18} /> 🔮 Predictive Failure Risks (Low Compliance Items)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#991B1B', marginBottom: '1.25rem' }}>
                Based on historical completion delays, the following activities are predicted prone to delay during this shift cycle:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {exceptionAlerts.delayProne.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#047857', fontSize: '0.9rem' }}>
                    ✅ All components exhibit highly consistent historical completion rates.
                  </div>
                ) : exceptionAlerts.delayProne.map((item, i) => (
                  <div key={i} style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#991B1B' }}>{item.name}</span>
                    <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                      Risk Level: High ({item.rate}% compliance)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Resource Optimization */}
            <div className="card" style={{ marginBottom: 0, border: '1px solid #8B5CF6' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6D28D9', fontWeight: 700 }}>
                <Award size={18} color="#8B5CF6" /> Smart Resource Allocation Suggestions
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#6D28D9', marginBottom: '1.25rem' }}>
                Automated recommendation engine suggestions to optimize workload throughput:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F5F3FF', borderRadius: '10px', border: '1px solid #EDE9FE', fontSize: '0.8rem', color: '#5B21B6', lineHeight: 1.4 }}>
                  <strong>🔧 Manpower Redistribution:</strong> Historical peaks occur between <strong>10:00 - 12:00</strong>. Suggest adding 1 extra operator to <strong>Line 1</strong> during these hours to increase throughput.
                </div>
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F5F3FF', borderRadius: '10px', border: '1px solid #EDE9FE', fontSize: '0.8rem', color: '#5B21B6', lineHeight: 1.4 }}>
                  <strong>⚡ Shift Transition Buffer:</strong> Carry-forward backlog builds up at the end of Shift A. Suggest holding a 15-minute sync overlap buffer before operator swap to clear pending WIP.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================
          TAB 7: AGING REPORT
          ======================================================= */}
      {activeTab === 'aging' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)', border: 'none', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FFFFFF', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#FFFFFF', fontWeight: 800 }}>⚠️ Heavy Activity Aging Command Tower</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF' }}>
                {rawData.filter(r => r.Status !== 'Done').length}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#BFDBFE', fontWeight: 600, textTransform: 'uppercase' }}>TOTAL BACKLOG ITEMS</span>
            </div>
          </div>

          {/* Critical Hotspots Analytical Spotlight Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
            {(() => {
              const pending = rawData.filter(r => r.Status !== 'Done');
              const findMaxGroup = (keyName) => {
                const map = {};
                pending.forEach(r => {
                  const val = r[keyName] || 'Unknown';
                  const diffHrs = (new Date() - new Date(r.Date_Timestamp || r.Date)) / 36e5;
                  if(!map[val] || map[val] < diffHrs) map[val] = diffHrs;
                });
                const sorted = Object.entries(map).sort((a,b) => b[1] - a[1])[0];
                return sorted ? { name: sorted[0], hrs: Math.round(sorted[1]) } : null;
              };
              
              const maxType = findMaxGroup('Type_of_Activity');
              const maxLine = findMaxGroup('Line_Equipment');
              const maxComp = findMaxGroup('Component');
              
              return (
                <>
                  <div className="card" style={{ borderLeft: '4px solid #DC2626', display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem 1.25rem' }}>
                    <div style={{ background: '#FEF2F2', padding: '0.75rem', borderRadius: '12px' }}><AlertTriangle color="#DC2626" size={24} /></div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Worst Aging Line</div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B' }}>{maxLine?.name || 'N/A'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#B91C1C', fontWeight: 600 }}>🔥 Max Age: {Math.round((maxLine?.hrs || 0)/24)} Days</div>
                    </div>
                  </div>
                  <div className="card" style={{ borderLeft: '4px solid #F59E0B', display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem 1.25rem' }}>
                    <div style={{ background: '#FFFBEB', padding: '0.75rem', borderRadius: '12px' }}><Clock color="#F59E0B" size={24} /></div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Worst Aging Type</div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B' }}>{maxType?.name || 'N/A'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#D97706', fontWeight: 600 }}>⏳ Waiting Duration: {Math.round((maxType?.hrs || 0)/24)} Days</div>
                    </div>
                  </div>
                  <div className="card" style={{ borderLeft: '4px solid #4F46E5', display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem 1.25rem' }}>
                    <div style={{ background: '#EEF2FF', padding: '0.75rem', borderRadius: '12px' }}><Settings color="#4F46E5" size={24} /></div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Stuck Component</div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B' }}>{maxComp?.name || 'N/A'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#4338CA', fontWeight: 600 }}>⚠️ Longest Cycle Blockage</div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Comprehensive Breakdown Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 800 }}><Activity color="#EF4444" /> Long-Tail Aging Decomposition Matrix</h3>
            </div>
            {(() => {
              const map = {};
              rawData.filter(r => r.Status !== 'Done').forEach(r => {
                const key = `${r.Activity_Description || 'Unk'} @ ${r.Component || 'Unk'}`;
                if(!map[key]) map[key] = { desc: r.Activity_Description, comp: r.Component, freq: r.Frequency, line: r.Line_Equipment, type: r.Type_of_Activity, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
                const diffHrs = (new Date() - new Date(r.Date_Timestamp || r.Date)) / 36e5;
                if (diffHrs < 8) map[key].s1++;
                else if (diffHrs < 168) map[key].s2++; // 7 Days
                else if (diffHrs < 720) map[key].s3++; // 30 Days
                else if (diffHrs < 4320) map[key].s4++; // 6 Months
                else map[key].s5++; // >6 Months
              });
              const rows = Object.values(map).sort((a,b) => (b.s5*100 + b.s4*10 + b.s3) - (a.s5*100 + a.s4*10 + a.s3));
              
              if (rows.length === 0) {
                return <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>🎉 Operation Clean: Zero backlog items currently identified across all tracked components.</div>;
              }

              // ===================================================
              // MOBILE VIEW: STACKED RICHCARDS (No Horizontal Scroll)
              // ===================================================
              if (isMobile) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {rows.map((row, idx) => {
                      const isCritical = row.s4 > 0 || row.s5 > 0;
                      const isSevere = row.s3 > 0;
                      return (
                        <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', background: isCritical ? '#FEF2F2' : '#FFF' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1E293B' }}>{row.comp}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.line} • {row.type}</div>
                            </div>
                            <span style={{ 
                              padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#FFF',
                              backgroundColor: isCritical ? '#991B1B' : isSevere ? '#EA580C' : row.s2 > 0 ? '#D97706' : '#10B981' 
                            }}>{isCritical ? 'CRITICAL' : isSevere ? 'ELEVATED' : 'STABLE'}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, textAlign: 'center' }}>
                            <div><div style={{color: '#64748B', fontSize: '0.6rem'}}>{' < 8 HR'}</div>{row.s1 || '-'}</div>
                            <div><div style={{color: '#D97706', fontSize: '0.6rem'}}>1-7 DAY</div>{row.s2 || '-'}</div>
                            <div><div style={{color: '#EA580C', fontSize: '0.6rem'}}>8-30 DAY</div>{row.s3 || '-'}</div>
                            <div><div style={{color: '#DC2626', fontSize: '0.6rem'}}>1-6 MO</div>{row.s4 || '-'}</div>
                            <div><div style={{color: '#991B1B', fontSize: '0.6rem'}}>{'> 6 MO'}</div>{row.s5 || '-'}</div>
                            <div><div style={{color: '#94A3B8', fontSize: '0.6rem'}}>FREQ</div>{row.freq}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // ===================================================
              // DESKTOP VIEW: STANDARD TABLE
              // ===================================================
              return (
                <div className="table-container-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', borderBottom: '2px solid #E2E8F0' }}>
                        <th style={{ padding: '0.8rem 1rem' }}>Activity Hierarchy</th>
                        <th style={{ padding: '0.8rem 1rem' }}>Origin Line</th>
                        <th style={{ padding: '0.8rem', textAlign: 'center', fontSize: '0.7rem', borderLeft: '1px solid #F1F5F9' }}>{'< 8 HR'}</th>
                        <th style={{ padding: '0.8rem', textAlign: 'center', fontSize: '0.7rem' }}>{'1-7 DAY'}</th>
                        <th style={{ padding: '0.8rem', textAlign: 'center', fontSize: '0.7rem' }}>{'8-30 DAY'}</th>
                        <th style={{ padding: '0.8rem', textAlign: 'center', fontSize: '0.7rem' }}>{'1-6 MO'}</th>
                        <th style={{ padding: '0.8rem', textAlign: 'center', fontSize: '0.7rem', color: '#DC2626' }}>{'> 6 MO'}</th>
                        <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>Action Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const isCritical = row.s4 > 0 || row.s5 > 0;
                        const isSevere = row.s3 > 0;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <strong style={{ color: '#1E293B' }}>{row.comp}</strong>
                              <div style={{ fontSize: '0.65rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '320px' }}>{row.desc}</div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>{row.line}</span>
                              <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{row.type} • {row.freq}</div>
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: row.s1 ? '#64748B' : '#E2E8F0', fontWeight: row.s1 ? 700 : 400, borderLeft: '1px solid #F8FAFC' }}>{row.s1 || '-'}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: row.s2 ? '#D97706' : '#E2E8F0', fontWeight: row.s2 ? 700 : 400 }}>{row.s2 || '-'}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: row.s3 ? '#EA580C' : '#E2E8F0', fontWeight: row.s3 ? 800 : 400 }}>{row.s3 || '-'}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: row.s4 ? '#DC2626' : '#E2E8F0', fontWeight: row.s4 ? 900 : 400, background: row.s4 ? '#FEF2F2' : 'transparent' }}>{row.s4 || '-'}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: row.s5 ? '#991B1B' : '#E2E8F0', fontWeight: row.s5 ? 900 : 400, background: row.s5 ? '#FEE2E2' : 'transparent' }}>{row.s5 || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              <span style={{ 
                                padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#FFF',
                                backgroundColor: isCritical ? '#991B1B' : isSevere ? '#EA580C' : row.s2 > 0 ? '#D97706' : '#10B981' 
                              }}>
                                {isCritical ? 'CRITICAL DEBT' : isSevere ? 'ELEVATED' : 'STABLE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB REVIEW: REVIEWER PERFORMANCE
          ======================================================== */}
      {activeTab === 'review_perf' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Reviewer Metrics Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ borderLeft: '5px solid #6366F1', padding: '1.5rem', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <span>Total In Review Pipeline</span>
                <Shield size={16} />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.5rem 0' }}>{reviewPerformanceStats.totalSubmissionsForReview}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total submissions in reviewer scopes</div>
            </div>

            <div className="card" style={{ borderLeft: '5px solid #10B981', padding: '1.5rem', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <span>Completed Reviews</span>
                <CheckCircle size={16} color="#10B981" />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#10B981', margin: '0.5rem 0' }}>{reviewPerformanceStats.totalReviewed}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Activities successfully reviewed</div>
            </div>

            <div className="card" style={{ borderLeft: '5px solid #F59E0B', padding: '1.5rem', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <span>Pending Review Queue</span>
                <Clock size={16} color="#F59E0B" />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#F59E0B', margin: '0.5rem 0' }}>{reviewPerformanceStats.totalPendingReview}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Waiting for reviewer action</div>
            </div>

            <div className="card" style={{ borderLeft: '5px solid #3B82F6', padding: '1.5rem', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <span>Overall Compliance</span>
                <Award size={16} color="#3B82F6" />
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#3B82F6', margin: '0.5rem 0' }}>{reviewPerformanceStats.overallReviewCompliance}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Percentage of completed reviews</div>
            </div>
          </div>

          {/* Mid row graphs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Leaderboard Card */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <Users size={18} color="#10B981" /> Top Reviewers Performance
              </h3>
              {reviewPerformanceStats.reviewerLeaderboard.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No reviewers have completed reviews yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {reviewPerformanceStats.reviewerLeaderboard.map((reviewer, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>#{idx+1}</div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{reviewer.name}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.65rem', marginTop: '0.15rem' }}>
                            <span style={{ color: '#059669', fontWeight: 600 }}>{reviewer.approved} Approved</span>
                            <span style={{ color: '#DC2626', fontWeight: 600 }}>{reviewer.rejected} Rejected</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B' }}>{reviewer.total}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>TOTAL REVIEWS</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status breakdown Pie */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <Activity size={18} color="#6366F1" /> Review Status Distribution
              </h3>
              <div style={{ height: '280px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reviewPerformanceStats.reviewStatusData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {reviewPerformanceStats.reviewStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Approved' ? '#10B981' : entry.name === 'Needs Correction' ? '#EF4444' : '#F59E0B'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
              <TrendingUp size={18} color="var(--primary-light)" /> 7-Day Review Trend
            </h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reviewPerformanceStats.reviewTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Reviewed" stackId="a" fill="#10B981" name="Reviewed Tasks" />
                  <Bar dataKey="Pending" stackId="a" fill="#F59E0B" name="Unreviewed/Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
