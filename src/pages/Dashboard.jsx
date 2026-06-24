import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Filter, Calendar, BarChart as BarIcon, 
  CheckCircle, AlertTriangle, Clock, Users, ChevronDown, 
  ChevronUp, Activity, X, Search, ClipboardList, FileClock,
  TrendingUp, RefreshCw, Layers, Shield, Award, HelpCircle, Settings, Flame
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  ResponsiveContainer, CartesianGrid, AreaChart, Area,
  PieChart, Pie, Cell, Line, ComposedChart, LineChart
} from 'recharts';

import { useData } from '../context/DataContext';
import AdvancedAnalyticsDashboard from '../components/AdvancedAnalyticsDashboard';

const getLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ─── Fire Safety Mock Data Generator (stable, module-level) ───────────────────
const FS_CATEGORIES = ['Fire Extinguisher','Fire Hydrant','Smoke Detector','Alarm Panel','MCP','Hooter','Fire Pump','Sand Bucket','Fire Exit','Emergency Light'];
const FS_AREAS      = ['Production','Warehouse','Utility','Electrical Room','Syrup Room','Admin Block'];
const FS_LINES      = ['Line 1','Line 2','Line 3','Utility Area'];
const FS_FREQS      = ['Daily','Weekly','Monthly','Shift-wise'];
const FS_OPERATORS  = ['Rahul Sharma','Amit Patel','Vikram Singh','Sanjay Dutt','Rohan Verma'];
const FS_SHIFTS     = ['A','B','C','G'];
const FS_CHECKPOINTS = {
  'Fire Extinguisher': [
    { comp:'Pressure Gauge',   desc:'Check pressure gauge needle in green zone',         std:'Green Zone (12-15 bar)' },
    { comp:'Safety Pin',       desc:'Check safety pin and seal intactness',               std:'Intact & sealed' },
    { comp:'Hose Pipe',        desc:'Inspect hose pipe for cracks or blockage',           std:'No cracks, clear path' },
    { comp:'Mounting Bracket', desc:'Check wall mounting stability',                      std:'Securely mounted' }
  ],
  'Fire Hydrant': [
    { comp:'Landing Valve',    desc:'Verify landing valve handwheel operation',           std:'Smooth operation, no jam' },
    { comp:'Hose Box',         desc:'Inspect hose box door lock and condition',           std:'Lock functional, clean inside' },
    { comp:'Pressure Gauge',   desc:'Measure static hydrant line pressure',               std:'6.5 - 7.5 kg/cm²' },
    { comp:'Nozzle',           desc:'Check brass spray nozzle availability',              std:'Present & polished' }
  ],
  'Smoke Detector': [
    { comp:'LED Indicator',    desc:'Verify blinking red status LED',                     std:'Blinking every 10s' },
    { comp:'Chamber',          desc:'Inspect chamber for dust accumulation',              std:'Clean, no dust block' },
    { comp:'Test Response',    desc:'Perform aerosol smoke test response',                std:'Triggers within 5s' }
  ],
  'Alarm Panel': [
    { comp:'Battery Backup',   desc:'Check battery charger state & voltage',             std:'24V DC charging' },
    { comp:'Display Panel',    desc:'Verify zero active fault notifications',             std:'Normal status display' },
    { comp:'Power Indicator',  desc:'Check mains power green LED',                       std:'Steady Green ON' }
  ],
  'MCP': [
    { comp:'Glass Panel',      desc:'Check manual call point glass integrity',           std:'Unbroken glass, hammer present' },
    { comp:'LED Status',       desc:'Inspect system connection light',                   std:'Steady indicator status' }
  ],
  'Hooter': [
    { comp:'Audio Output',     desc:'Perform periodic sound level check',                std:'> 90 dB sound level' },
    { comp:'Enclosure',        desc:'Verify physical casing protection',                  std:'No rust/water ingress' }
  ],
  'Fire Pump': [
    { comp:'Diesel Level',     desc:'Check engine fuel level for backup pump',           std:'> 75% fuel tank' },
    { comp:'Jockey Pump',      desc:'Verify jockey pump auto-start setting',             std:'Starts at 6.0 kg/cm²' },
    { comp:'Main Pump',        desc:'Test main electric pump dry run',                   std:'No abnormal sound/vibration' }
  ],
  'Sand Bucket': [
    { comp:'Sand Quality',     desc:'Verify sand dryness and volume',                    std:'Dry, full capacity' },
    { comp:'Bucket Casing',    desc:'Check red paint and hook mounting',                  std:'Rust-free, marked "FIRE"' }
  ],
  'Fire Exit': [
    { comp:'Exit Door',        desc:'Verify emergency exit doors open outwards',         std:'Opens smoothly on push' },
    { comp:'Access Path',      desc:'Inspect passage for material obstructions',         std:'Clear passage, 0 obstacles' }
  ],
  'Emergency Light': [
    { comp:'Battery Run',      desc:'Simulate power cut light illumination',             std:'Stays ON for 30+ mins' },
    { comp:'Bulb Filament',    desc:'Verify LED spot illumination pattern',              std:'Dual spot alignment OK' }
  ]
};

const generateFireSafetyMockData = () => {
  const mockSubmissions = [];
  const today = new Date();
  for (let d = 9; d >= 0; d--) {
    const cur = new Date(today);
    cur.setDate(today.getDate() - d);
    const dateStr = getLocalDateStr(cur);
    const dailyCount = 15 + (d % 3) * 3;
    for (let j = 0; j < dailyCount; j++) {
      const category  = FS_CATEGORIES[(j + d) % FS_CATEGORIES.length];
      const area      = FS_AREAS[(j * 2 + d) % FS_AREAS.length];
      const line      = FS_LINES[(j + d * 3) % FS_LINES.length];
      const subLine   = `${line} Section ${(j % 2) + 1}`;
      const frequency = FS_FREQS[(j + d) % FS_FREQS.length];
      const cps       = FS_CHECKPOINTS[category];
      const cp        = cps[j % cps.length];
      const assetId   = `${category.slice(0,2).toUpperCase()}-${area.slice(0,2).toUpperCase()}-${String(10+(j%5)).padStart(2,'0')}`;
      const rand      = Math.random();
      let status = 'OK';
      if ((area === 'Syrup Room' && rand < 0.32) || (category === 'Smoke Detector' && rand < 0.28) || rand < 0.12) status = 'Not OK';
      const pressureReading = category === 'Fire Hydrant'
        ? parseFloat((status === 'OK' ? 6.5 + Math.random() * 1.2 : 4.2 + Math.random() * 1.2).toFixed(1))
        : undefined;
      const extStatus = category === 'Fire Extinguisher'
        ? (rand < 0.88 ? 'Good' : rand < 0.96 ? 'Damaged' : 'Expired')
        : undefined;
      mockSubmissions.push({
        id: `FS-MOCK-${dateStr}-${j}`,
        Date: dateStr,
        Date_Timestamp: new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 8+(j%12), (j*12)%60).toISOString(),
        Type_of_Activity: 'Fire Safety',
        Line_Equipment: line, Sub_Line_Equipment: subLine, Area_Zone: area,
        Equipment_Category: category, Asset_ID: assetId,
        Component: cp.comp, Activity_Description: cp.desc, Standard: cp.std,
        Frequency: frequency, Status: status,
        Submitted_By: FS_OPERATORS[(j+d) % FS_OPERATORS.length],
        Shift: FS_SHIFTS[(j+d*2) % FS_SHIFTS.length],
        Document_Number: `DOC-FS-${category.slice(0,2).toUpperCase()}-09`,
        Revision: '02', pressureReading, extStatus,
        supervisorReviewed: Math.random() < 0.85 ? 'Approved' : 'Pending',
        photoAttached: Math.random() < 0.65 ? 'yes' : 'no',
        remarks: status === 'Not OK' ? 'Requires maintenance attention' : 'Checked and found OK'
      });
    }
  }
  return mockSubmissions;
};
// ─────────────────────────────────────────────────────────────────────────────


const Dashboard = () => {
  const { user } = useAuth();
  const { submissions: rawData = [], supportInbox = [], checklists: masterChecklists = [], reviewers = [], employees = [], shifts = [] } = useData();
  const [activeTab, setActiveTab] = useState('realtime');
  const [showFilters, setShowFilters] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    type: 'ALL',
    line: 'ALL',
    subLine: 'ALL',
    component: 'ALL',
    frequency: 'ALL',
    userFilter: '',
    shift: 'ALL',
    docNo: 'ALL',
    revNo: 'ALL',
    month: 'ALL',
    year: 'ALL',
    status: 'ALL'
  });

  // Fire Safety data: blend real Firebase FS submissions + stable module-level mock data
  const fireSafetySubmissions = useMemo(() => {
    return rawData.filter(r => r.Type_of_Activity === 'Fire Safety');
  }, [rawData]);


  const filteredFSData = useMemo(() => {
    return fireSafetySubmissions.filter(item => {
      if (filters.dateStart && item.Date < filters.dateStart) return false;
      if (filters.dateEnd && item.Date > filters.dateEnd) return false;
      if (filters.line !== 'ALL' && item.Line_Equipment !== filters.line) return false;
      if (filters.subLine !== 'ALL' && item.Sub_Line_Equipment !== filters.subLine) return false;
      if (filters.component !== 'ALL' && item.Component !== filters.component) return false;
      if (filters.frequency && filters.frequency !== 'ALL' && item.Frequency !== filters.frequency) return false;
      if (filters.userFilter && !(item.Submitted_By || '').toLowerCase().includes(filters.userFilter.toLowerCase())) return false;
      if (filters.shift !== 'ALL' && item.Shift !== filters.shift) return false;
      if (filters.docNo !== 'ALL' && item.Document_Number !== filters.docNo) return false;
      if (filters.revNo !== 'ALL' && item.Revision !== filters.revNo) return false;
      
      if (filters.year !== 'ALL') {
        const y = item.Date ? item.Date.split('-')[0] : '';
        if (y !== filters.year) return false;
      }
      if (filters.month !== 'ALL') {
        const m = item.Date ? item.Date.split('-')[1] : '';
        if (m !== filters.month) return false;
      }
      return true;
    });
  }, [fireSafetySubmissions, filters]);

  const fireSafetyStats = useMemo(() => {
    const data = filteredFSData;
    const totalCheckpoints = data.length;
    const okCount = data.filter(d => d.Status === 'OK' || d.Status === 'Done').length;
    const notOkCount = data.filter(d => d.Status === 'Not OK' || d.Status === 'Support Required' || d.Status === 'Support').length;
    const complianceRate = totalCheckpoints ? Math.round((okCount / totalCheckpoints) * 100) : 100;
    
    const categoryMap = {};
    data.forEach(r => {
      const cat = r.Equipment_Category || 'Unknown';
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, ok: 0 };
      categoryMap[cat].total++;
      if (r.Status === 'OK' || r.Status === 'Done') categoryMap[cat].ok++;
    });
    const categoryCompliance = Object.entries(categoryMap).map(([name, stat]) => ({
      name,
      Compliance: Math.round((stat.ok / stat.total) * 100),
      Total: stat.total,
      ok: stat.ok,
      notOk: stat.total - stat.ok
    })).sort((a, b) => b.Compliance - a.Compliance);

    const referenceDate = filters.dateEnd ? new Date(filters.dateEnd) : new Date();
    const dates7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i);
      dates7.push(getLocalDateStr(d));
    }
    
    const topCategories = categoryCompliance.slice(0, 5).map(c => c.name);
    
    const complianceTrend = dates7.map(date => {
      const dayLogs = data.filter(r => r.Date === date);
      const res = { date };
      topCategories.forEach(cat => {
        const catLogs = dayLogs.filter(r => r.Equipment_Category === cat);
        const total = catLogs.length;
        const ok = catLogs.filter(d => d.Status === 'OK' || d.Status === 'Done').length;
        res[cat] = total ? Math.round((ok / total) * 100) : null;
      });
      return res;
    });
    
    const dates10 = [];
    for (let i = 9; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i);
      dates10.push(getLocalDateStr(d));
    }
    const inspectionTrend = dates10.map(date => {
      const dayLogs = data.filter(r => r.Date === date);
      const ok = dayLogs.filter(d => d.Status === 'OK' || d.Status === 'Done').length;
      const notOk = dayLogs.filter(d => d.Status === 'Not OK' || d.Status === 'Support Required' || d.Status === 'Support').length;
      return { date, OK: ok, 'Not OK': notOk, Total: dayLogs.length };
    });
    
    const areaMap = {};
    data.forEach(r => {
      const area = r.Area_Zone || r.Area || 'Unknown';
      if (!areaMap[area]) areaMap[area] = { total: 0, ok: 0 };
      areaMap[area].total++;
      if (r.Status === 'OK' || r.Status === 'Done') areaMap[area].ok++;
    });
    const areaCompliance = Object.entries(areaMap).map(([name, stat]) => ({
      name,
      Compliance: Math.round((stat.ok / stat.total) * 100),
      Total: stat.total
    })).sort((a, b) => b.Compliance - a.Compliance);
    
    const freqMap = {};
    data.forEach(r => {
      const f = r.Frequency || 'Unknown';
      if (!freqMap[f]) freqMap[f] = { total: 0, ok: 0 };
      freqMap[f].total++;
      if (r.Status === 'OK' || r.Status === 'Done') freqMap[f].ok++;
    });
    const frequencyCompliance = Object.entries(freqMap).map(([name, stat]) => ({
      name,
      Compliance: Math.round((stat.ok / stat.total) * 100),
      Total: stat.total
    }));
    
    const lineMap = {};
    data.forEach(r => {
      const line = r.Line_Equipment || 'Unknown';
      if (!lineMap[line]) lineMap[line] = { total: 0, ok: 0 };
      lineMap[line].total++;
      if (r.Status === 'OK' || r.Status === 'Done') lineMap[line].ok++;
    });
    const lineCompliance = Object.entries(lineMap).map(([name, stat]) => ({
      name,
      Compliance: Math.round((stat.ok / stat.total) * 100),
      Total: stat.total
    })).sort((a, b) => b.Compliance - a.Compliance);
    
    const assetMap = {};
    data.forEach(r => {
      const id = r.Asset_ID;
      if (!id || id === '-') return;
      if (!assetMap[id]) assetMap[id] = { id, category: r.Equipment_Category, area: r.Area_Zone || r.Area, total: 0, failures: 0 };
      assetMap[id].total++;
      if (r.Status === 'Not OK' || r.Status === 'Support Required' || r.Status === 'Support') {
        assetMap[id].failures++;
      }
    });
    const criticalAssets = Object.values(assetMap)
      .map(a => ({
        ...a,
        complianceRate: a.total ? Math.round(((a.total - a.failures) / a.total) * 100) : 100
      }))
      .filter(a => a.failures > 0)
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 6);
      

    
    const safetyTickets = supportInbox.filter(t => t.Type_of_Activity === 'Fire Safety');
    const deptTicketMap = {};
    safetyTickets.forEach(t => {
      const dept = t.department || t.SupportDept || 'Safety Department';
      const cat = t.Equipment_Category || t.category || 'General';
      const key = `${dept}|${cat}`;
      if (!deptTicketMap[key]) deptTicketMap[key] = { department: dept, category: cat, total: 0, tatSum: 0, closedCount: 0 };
      deptTicketMap[key].total++;
      if (t.status === 'Closed' && t.resolveDate && t.timestamp) {
        const resolveTime = new Date(t.resolveDate);
        const openTime = new Date(t.timestamp);
        const hrs = (resolveTime - openTime) / (1000 * 60 * 60);
        deptTicketMap[key].tatSum += hrs;
        deptTicketMap[key].closedCount++;
      }
    });
    const ticketsByDepartment = Object.values(deptTicketMap).map(v => ({
      department: v.department,
      category: v.category,
      Tickets: v.total,
      closureTAT: v.closedCount > 0 ? (v.tatSum / v.closedCount).toFixed(1) + ' hrs' : 'N/A'
    })).sort((a,b) => b.Tickets - a.Tickets);

    const checkedWithPhoto = data.filter(d => d.photoAttached === 'yes').length;
    const photoAttachedRate = data.length ? Math.round((checkedWithPhoto / data.length) * 100) : 85;
    
    const supervisorApproved = data.filter(d => d.supervisorReviewed === 'Approved').length;
    const approvalRate = data.length ? Math.round((supervisorApproved / data.length) * 100) : 80;
    
    const docFilled = data.filter(d => d.Document_Number && d.Document_Number !== '-').length;
    const docComplianceRate = data.length ? Math.round((docFilled / data.length) * 100) : 95;
    
    const auditReadinessScore = Math.round((complianceRate * 0.4) + (approvalRate * 0.3) + (photoAttachedRate * 0.2) + (docComplianceRate * 0.1));
    
    const operatorMap = {};
    data.forEach(r => {
      const op = r.Submitted_By || 'Unknown';
      if (!operatorMap[op]) operatorMap[op] = { name: op, completed: 0, ok: 0 };
      operatorMap[op].completed++;
      if (r.Status === 'OK' || r.Status === 'Done') operatorMap[op].ok++;
    });
    const operatorLeaderboard = Object.values(operatorMap)
      .map(o => ({
        ...o,
        complianceRate: o.completed ? Math.round((o.ok / o.completed) * 100) : 100
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5);
      
    const openSafetyTickets = supportInbox.filter(t => t.Type_of_Activity === 'Fire Safety' && (t.status === 'Open' || t.status === 'Pending'));
    let activeCrit = 0, activeHigh = 0, activeMed = 0;
    let warnCrit = 0, warnHigh = 0, warnMed = 0;
    let stickyCrit = 0, stickyHigh = 0, stickyMed = 0;
    const now = new Date();
    
    openSafetyTickets.forEach(t => {
      const ageDays = t.timestamp ? (now - new Date(t.timestamp)) / (1000 * 60 * 60 * 24) : 0;
      const risk = t.Priority || 'Medium';
      if (ageDays <= 3) {
        if (risk === 'Critical') activeCrit++;
        else if (risk === 'High') activeHigh++;
        else activeMed++;
      } else if (ageDays <= 7) {
        if (risk === 'Critical') warnCrit++;
        else if (risk === 'High') warnHigh++;
        else warnMed++;
      } else {
        if (risk === 'Critical') stickyCrit++;
        else if (risk === 'High') stickyHigh++;
        else stickyMed++;
      }
    });

    const alertsAgeBacklog = [
      { name: '0-3 Days (Active)', Critical: activeCrit, High: activeHigh, Medium: activeMed },
      { name: '4-7 Days (Warning)', Critical: warnCrit, High: warnHigh, Medium: warnMed },
      { name: ' >7 Days (Sticky)', Critical: stickyCrit, High: stickyHigh, Medium: stickyMed }
    ];
    
    const totalAssets = Object.keys(assetMap).length || 45;
    const failedAssetsCount = criticalAssets.filter(a => a.complianceRate < 80).length;
    const equipmentAvailability = totalAssets ? Math.round(((totalAssets - failedAssetsCount) / totalAssets) * 100) : 95;
    
    return {
      complianceRate,
      totalCheckpoints,
      okCount,
      notOkCount,
      complianceTrend,
      inspectionTrend,
      areaCompliance,
      categoryCompliance,
      frequencyCompliance,
      lineCompliance,
      criticalAssets,
      topCategories,
      ticketsByDepartment,
      auditReadinessScore,
      operatorLeaderboard,
      alertsAgeBacklog,
      equipmentAvailability,
      photoAttachedRate,
      approvalRate,
      docComplianceRate
    };
  }, [filteredFSData, supportInbox, filters.dateEnd]);


  const COLORS = {
    Done: '#10B981',
    WIP: '#3B82F6',
    Hold: '#F59E0B',
    Support: '#EF4444',
    Pending: '#94A3B8',
    CardBG: 'var(--surface-color, #ffffff)'
  };

  const SHIFT_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

  // Helper static / dynamic values for month/year options
  const yearOptions = useMemo(() => {
    const years = [...new Set(rawData.map(r => r.Date ? r.Date.split('-')[0] : '').filter(Boolean))];
    // Ensure current year is present if no data yet
    const cy = new Date().getFullYear().toString();
    if (!years.includes(cy)) years.push(cy);
    return years.sort().reverse();
  }, [rawData]);

  const monthOptions = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  // Filtered dataset based on date range and layout dimensions
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      if (filters.dateStart && item.Date < filters.dateStart) return false;
      if (filters.dateEnd && item.Date > filters.dateEnd) return false;
      if (filters.type !== 'ALL' && item.Type_of_Activity !== filters.type) return false;
      if (filters.line !== 'ALL' && item.Line_Equipment !== filters.line) return false;
      if (filters.subLine !== 'ALL' && item.Sub_Line_Equipment !== filters.subLine) return false;
      if (filters.component !== 'ALL' && item.Component !== filters.component) return false;
      if (filters.frequency && filters.frequency !== 'ALL' && item.Frequency !== filters.frequency) return false;
      if (filters.userFilter && !(item.Submitted_By || '').toLowerCase().includes(filters.userFilter.toLowerCase())) return false;
      if (filters.shift !== 'ALL' && item.Shift !== filters.shift) return false;
      if (filters.docNo !== 'ALL' && item.Document_Number !== filters.docNo) return false;
      if (filters.revNo !== 'ALL' && item.Revision !== filters.revNo) return false;
      if (filters.status && filters.status !== 'ALL' && item.Status !== filters.status) return false;
      
      // Year & Month isolation checks
      if (filters.year !== 'ALL') {
        const y = item.Date ? item.Date.split('-')[0] : '';
        if (y !== filters.year) return false;
      }
      if (filters.month !== 'ALL') {
        const m = item.Date ? item.Date.split('-')[1] : '';
        if (m !== filters.month) return false;
      }
      return true;
    });
  }, [rawData, filters]);

  // Baseline master checklists matching structural selections
  const baselineChecklists = useMemo(() => {
    return masterChecklists.filter(item => {
      if (filters.type !== 'ALL' && item.Type_of_Activity !== filters.type) return false;
      if (filters.line !== 'ALL' && item.Line_Equipment !== filters.line) return false;
      if (filters.subLine !== 'ALL' && item.Sub_Line_Equipment !== filters.subLine) return false;
      if (filters.component !== 'ALL' && item.Component !== filters.component) return false;
      if (filters.frequency && filters.frequency !== 'ALL' && item.Frequency !== filters.frequency) return false;
      if (filters.docNo !== 'ALL' && item.Document_Number !== filters.docNo) return false;
      if (filters.revNo !== 'ALL' && item.Revision !== filters.revNo) return false;
      return true;
    });
  }, [masterChecklists, filters]);

  // ----------------------------------------------------
  // 1. REAL-TIME OPERATIONS CALCULATIONS
  // ----------------------------------------------------
  const realTimeStats = useMemo(() => {
    const todayStr = getLocalDateStr(new Date());
    // Align today's snapshots to the currently selected layout filters
    const todaySubmissions = filteredData.filter(r => r.Date === todayStr);

    const completedToday = todaySubmissions.filter(r => r.Status === 'Done').length;
    const wipToday = todaySubmissions.filter(r => r.Status === 'WIP').length;
    const totalPlannedToday = Math.max(baselineChecklists.length, todaySubmissions.length);
    const pendingToday = Math.max(0, totalPlannedToday - completedToday - wipToday);

    // Active users contribution
    const activeUsers = [...new Set(todaySubmissions.map(r => r.Submitted_By).filter(Boolean))];

    // Carry forward tasks: WIP or Pending items from previous dates respecting filters
    const carryForward = filteredData.filter(r => r.Date < todayStr && (r.Status === 'WIP' || r.Status === 'Pending')).length;

    // Helper to check if support tickets match filters
    const matchesFilter = (val, filterVal) => {
      if (!filterVal || filterVal === 'ALL') return true;
      return String(val || '').trim().toLowerCase() === String(filterVal).trim().toLowerCase();
    };

    // Average resolution time (TAT) from filtered support tickets
    const resolvedSupport = supportInbox.filter(s => {
      if (s.status !== 'Resolved' || !s.resolvedAt) return false;
      if (!matchesFilter(s.Type_of_Activity, filters.type)) return false;
      if (!matchesFilter(s.Line_Equipment, filters.line)) return false;
      if (!matchesFilter(s.Shift, filters.shift)) return false;
      return true;
    });
    
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
      activeUsersNames: activeUsers,
      carryForwardTasks: carryForward,
      avgTat: avgSupportHrs > 0 ? `${avgSupportHrs.toFixed(1)} hrs` : '0 hrs'
    };
  }, [filteredData, supportInbox, baselineChecklists, filters]);

  // ----------------------------------------------------
  // 2. SHIFT & CARRY-FORWARD CALCULATIONS
  // ----------------------------------------------------
  const shiftAnalysis = useMemo(() => {
    const shifts = ['A', 'B', 'C', 'G'];
    const dataByShift = shifts.map(s => {
      const shiftLogs = filteredData.filter(r => r.Shift === s || (s === 'G' && r.Shift === 'General'));
      const total = shiftLogs.length;
      const completed = shiftLogs.filter(r => r.Status === 'Done' || r.Status === 'OK').length;
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

    // Day-wise Backlog Accumulation (Guaranteed 7-Day Sequential Basis)
    const referenceDate = filters.dateEnd ? new Date(filters.dateEnd) : new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i);
      dates.push(getLocalDateStr(d));
    }

    const backlogTrend = dates.map(date => {
      const dayLogs = filteredData.filter(r => r.Date === date);
      const pendingCount = dayLogs.filter(r => r.Status === 'Pending' || r.Status === 'WIP').length;
      const resolvedCount = dayLogs.filter(r => r.Status === 'Done' || r.Status === 'OK').length;
      return { date, Backlog: pendingCount, Resolved: resolvedCount };
    });

    // G Shift Contribution: Overlay clearing capacity
    const gShiftLogs = filteredData.filter(r => r.Shift === 'G' || r.Shift === 'General');
    const gCleared = gShiftLogs.filter(r => r.Status === 'Done' || r.Status === 'OK').length;

    return {
      dataByShift,
      backlogTrend,
      gShiftContribution: gCleared
    };
  }, [filteredData, filters.dateEnd]);

  // 7-Day Performance Trend Stacked Status (Guaranteed 7-Day Sequential Basis)
  const stackedStatusTrend = useMemo(() => {
    const referenceDate = filters.dateEnd ? new Date(filters.dateEnd) : new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i);
      dates.push(getLocalDateStr(d));
    }

    return dates.map(date => {
      const dayLogs = filteredData.filter(r => r.Date === date);
      const done = dayLogs.filter(r => r.Status === 'Done' || r.Status === 'OK').length;
      const wip = dayLogs.filter(r => r.Status === 'WIP').length;
      const hold = dayLogs.filter(r => r.Status === 'Hold').length;
      const support = dayLogs.filter(r => r.Status === 'Support Required' || r.Status === 'Support').length;
      const pending = dayLogs.filter(r => r.Status === 'Pending').length;
      return { date, Done: done, WIP: wip, Hold: hold, Support: support, Pending: pending };
    });
  }, [filteredData, filters.dateEnd]);

  // ----------------------------------------------------
  // 3. PRODUCTIVITY & TIME CALCULATIONS
  // ----------------------------------------------------
  const productivityStats = useMemo(() => {
    // Peak execution hours distribution
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, count: 0 }));
    
    let earlyCount = 0;
    let lateCount = 0;

    filteredData.forEach(r => {
      const rawTS = r.Date_Timestamp || r.timestamp || r.Date;
      if (rawTS) {
        const parsed = new Date(rawTS);
        if (!isNaN(parsed.getTime())) {
          const h = parsed.getHours();
          if (h >= 0 && h < 24) {
            hours[h].count++;
          }
          if (h >= 6 && h < 10) earlyCount++;
          if (h >= 18 && h < 22) lateCount++;
        }
      }
    });

    // Activity completion times
    const actTypes = [...new Set(filteredData.map(r => r.Type_of_Activity).filter(Boolean))];
    const durationByActivity = actTypes.map(type => {
      const logs = filteredData.filter(r => r.Type_of_Activity === type && (r.Status === 'Done' || r.Status === 'OK'));
      const avgMins = logs.length ? 15 + (logs.length % 5) * 4 : 20;
      return { name: type, minutes: avgMins };
    }).sort((a,b) => b.minutes - a.minutes);

    return {
      hourlyPeak: hours, // Retain all 24 hours to render baseline correctly
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
      let u = r.Submitted_By || '';
      u = u.trim();
      if (!u || u === '()') u = 'Unknown';
      
      if (!userMap[u]) {
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
        
        if (!name) name = 'Unknown';
        userMap[u] = { name, total: 0, completed: 0 };
      }
      
      userMap[u].total++;
      if (r.Status === 'Done' || r.Status === 'OK') userMap[u].completed++;
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
  }, [filteredData, employees]);

  // ----------------------------------------------------
  // TAT PERFORMANCE CALCULATIONS (FASTEST/SLOWEST RESPONDERS)
  // ----------------------------------------------------
  const tatPerformance = useMemo(() => {
    const matchesFilter = (val, filterVal) => {
      if (!filterVal || filterVal === 'ALL') return true;
      return String(val || '').trim().toLowerCase() === String(filterVal).trim().toLowerCase();
    };

    const resolvedItems = supportInbox.filter(s => {
      if (s.status !== 'Resolved' || !s.resolvedAt || !s.assignedTo) return false;
      if (!matchesFilter(s.Type_of_Activity, filters.type)) return false;
      if (!matchesFilter(s.Line_Equipment, filters.line)) return false;
      if (!matchesFilter(s.Shift, filters.shift)) return false;
      return true;
    });
    
    const userStats = {};
    
    resolvedItems.forEach(item => {
      let u = item.assignedTo || '';
      u = u.trim();
      if (!u || u === '()') u = 'Unknown';
      const dept = item.department || item.SupportDept || 'Maintenance';
      
      if (!userStats[u]) {
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
        
        if (!name) name = 'Unknown';
        userStats[u] = { name, dept, totalMs: 0, count: 0 };
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
  }, [supportInbox, filters]);

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
    
    const matchesFilter = (val, filterVal) => {
      if (!filterVal || filterVal === 'ALL') return true;
      return String(val || '').trim().toLowerCase() === String(filterVal).trim().toLowerCase();
    };

    const untreatedSupport = supportInbox.filter(s => {
      if (s.status !== 'Open' && s.status !== 'Pending') return false;
      if (!matchesFilter(s.Type_of_Activity, filters.type)) return false;
      if (!matchesFilter(s.Line_Equipment, filters.line)) return false;
      if (!matchesFilter(s.Shift, filters.shift)) return false;
      return true;
    });

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
  }, [filteredData, supportInbox, filters]);

  // ----------------------------------------------------
  // 7. REVIEW PERFORMANCE CALCULATIONS
  // ----------------------------------------------------
  const reviewPerformanceStats = useMemo(() => {
    const assignedReviewLines = [...new Set(reviewers.map(r => r.line_equipment || r.activity_type))];
    // Respect main filteredData to cascade layout filters into reviewer performance view!
    const reviewSubmissions = filteredData.filter(sub => {
      // Match either exact assigned review line or activity type
      return assignedReviewLines.some(key => 
        String(key || '').trim().toLowerCase() === String(sub.Line_Equipment || '').trim().toLowerCase() || 
        String(key || '').trim().toLowerCase() === String(sub.Type_of_Activity || '').trim().toLowerCase()
      );
    });
    
    const totalSubmissionsForReview = reviewSubmissions.length;
    const totalReviewed = reviewSubmissions.filter(sub => sub.Review_Status && sub.Review_Status !== 'Pending').length;
    const totalPendingReview = totalSubmissionsForReview - totalReviewed;
    const overallReviewCompliance = totalSubmissionsForReview ? Math.round((totalReviewed / totalSubmissionsForReview) * 100) : 100;

    const reviewerMap = {};
    reviewSubmissions.forEach(sub => {
      if (sub.Review_Status && sub.Review_Status !== 'Pending' && sub.Reviewed_By) {
        const rName = sub.Reviewed_By;
        if (!reviewerMap[rName]) {
          reviewerMap[rName] = { name: rName, total: 0, approved: 0, rejected: 0 };
        }
        reviewerMap[rName].total += 1;
        if (sub.Review_Status.includes('Approved')) {
          reviewerMap[rName].approved += 1;
        } else if (sub.Review_Status === 'Needs Correction') {
          reviewerMap[rName].rejected += 1;
        }
      }
    });

    const reviewerLeaderboard = Object.values(reviewerMap).sort((a, b) => b.total - a.total);

    const reviewStatusData = [
      { name: 'Approved', value: reviewSubmissions.filter(s => String(s.Review_Status || '').includes('Approved')).length },
      { name: 'Needs Correction', value: reviewSubmissions.filter(s => s.Review_Status === 'Needs Correction').length },
      { name: 'Pending', value: reviewSubmissions.filter(s => !s.Review_Status || s.Review_Status === 'Pending').length }
    ].filter(i => i.value > 0);

    const referenceDate = filters.dateEnd ? new Date(filters.dateEnd) : new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i);
      dates.push(getLocalDateStr(d));
    }

    const reviewTrend = dates.map(date => {
      const dayLogs = reviewSubmissions.filter(r => r.Date === date);
      const reviewedCount = dayLogs.filter(r => r.Review_Status && r.Review_Status !== 'Pending').length;
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
  }, [filteredData, reviewers, filters.dateEnd]);

  const resetFilters = () => {
    setFilters({ dateStart: '', dateEnd: '', type: 'ALL', line: 'ALL', subLine: 'ALL', component: 'ALL', frequency: 'ALL', userFilter: '', shift: 'ALL', docNo: 'ALL', revNo: 'ALL', month: 'ALL', year: 'ALL', status: 'ALL' });
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>CALENDAR YEAR</label>
              <select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Years</option>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>CALENDAR MONTH</label>
              <select value={filters.month} onChange={e => setFilters({...filters, month: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Months</option>
                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>SHIFT</label>
              <select value={filters.shift} onChange={e => setFilters({...filters, shift: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Shifts</option>
                {[...new Set([
                  ...(shifts && shifts.length > 0 ? shifts.map(s => s.id) : ['A', 'B', 'C', 'G']),
                  ...rawData.map(d => d.Shift)
                ].filter(Boolean))].map(s => <option key={s} value={s}>Shift {s}</option>)}
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
                {[...new Set([...rawData.map(d => d.Revision), ...masterChecklists.map(d => d.Revision)].filter(r => r && r !== '-'))].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>ACTIVITY TYPE</label>
              <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Types</option>
                {[...new Set([...rawData.map(d => d.Type_of_Activity), ...masterChecklists.map(c => c.Type_of_Activity)].filter(Boolean))].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>LINE / EQUIP</label>
              <select value={filters.line} onChange={e => setFilters({...filters, line: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Lines</option>
                {[...new Set([...rawData.map(d => d.Line_Equipment), ...masterChecklists.map(c => c.Line_Equipment)].filter(Boolean))].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>SUB-LINE</label>
              <select value={filters.subLine} onChange={e => setFilters({...filters, subLine: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Sub-Lines</option>
                {[...new Set([...rawData.map(d => d.Sub_Line_Equipment), ...masterChecklists.map(c => c.Sub_Line_Equipment)].filter(Boolean))].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>COMPONENT</label>
              <select value={filters.component} onChange={e => setFilters({...filters, component: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Components</option>
                {[...new Set([...rawData.map(d => d.Component), ...masterChecklists.map(c => c.Component)].filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>STATUS</label>
              <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <option value="ALL">All Statuses</option>
                {[...new Set([
                  'Done', 'WIP', 'Hold', 'Pending', 'Support Required', 'Support',
                  ...rawData.map(d => d.Status)
                ].filter(Boolean))].map(st => <option key={st} value={st}>{st}</option>)}
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
                {[...new Set([...rawData.map(d => d.Submitted_By), ...employees.map(e => e.Employee_Name)].filter(Boolean))].map(u => <option key={u} value={u} />)}
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
          { id: 'firesafety', label: '🔥 Fire Safety Analytics', icon: Flame },
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
                <AreaChart data={stackedStatusTrend} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.Done} stopOpacity={0.6}/><stop offset="95%" stopColor={COLORS.Done} stopOpacity={0.0}/></linearGradient>
                    <linearGradient id="colorWIP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.WIP} stopOpacity={0.6}/><stop offset="95%" stopColor={COLORS.WIP} stopOpacity={0.0}/></linearGradient>
                    <linearGradient id="colorHold" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.Hold} stopOpacity={0.6}/><stop offset="95%" stopColor={COLORS.Hold} stopOpacity={0.0}/></linearGradient>
                    <linearGradient id="colorSupport" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.Support} stopOpacity={0.6}/><stop offset="95%" stopColor={COLORS.Support} stopOpacity={0.0}/></linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.Pending} stopOpacity={0.6}/><stop offset="95%" stopColor={COLORS.Pending} stopOpacity={0.0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }} 
                    formatter={(value, name, props) => {
                      const total = (props.payload.Done || 0) + (props.payload.WIP || 0) + (props.payload.Hold || 0) + (props.payload.Support || 0) + (props.payload.Pending || 0);
                      const pct = total ? Math.round((value / total) * 100) : 0;
                      return [`${value} (${pct}%)`, name];
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Done" stackId="1" stroke={COLORS.Done} fill="url(#colorDone)" name="Done" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="WIP" stackId="1" stroke={COLORS.WIP} fill="url(#colorWIP)" name="In Progress" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Hold" stackId="1" stroke={COLORS.Hold} fill="url(#colorHold)" name="Hold" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Support" stackId="1" stroke={COLORS.Support} fill="url(#colorSupport)" name="Support Required" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Pending" stackId="1" stroke={COLORS.Pending} fill="url(#colorPending)" name="Pending" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 1.5: FIRE SAFETY ANALYTICS
          ======================================================== */}
      {activeTab === 'firesafety' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Row 1: KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {/* Widget 1: Overall Compliance Gauge */}
            <div className="card" style={{ borderLeft: '5px solid #EF4444', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '220px', marginBottom: 0 }}>
              <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                <span>Overall Safety Compliance</span>
                <Shield size={16} color="#EF4444" />
              </div>
              <div style={{ position: 'relative', width: '200px', height: '100px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                <ResponsiveContainer width="100%" height="200%">
                  <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <Pie
                      data={[
                        { value: fireSafetyStats.complianceRate },
                        { value: 100 - fireSafetyStats.complianceRate }
                      ]}
                      cx="50%"
                      cy="100%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={0}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#EF4444" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', bottom: 0, fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {fireSafetyStats.complianceRate}%
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', fontWeight: 600 }}>
                Target: 100% Plant Safety
              </div>
            </div>

            {/* Widget 2: Total Safety Checkpoints Card */}
            <div className="card" style={{ borderLeft: '5px solid #EA580C', padding: '1.5rem', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <span>Safety Checkpoints</span>
                <ClipboardList size={16} color="#EA580C" />
              </div>
              <div style={{ margin: '0.5rem 0' }}>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {fireSafetyStats.totalCheckpoints}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>● {fireSafetyStats.okCount} OK</span>
                  <span style={{ color: '#EF4444', fontWeight: 700 }}>● {fireSafetyStats.notOkCount} Not OK</span>
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
                Active safety checkpoints audited and validated during current scope.
              </div>
            </div>


          </div>

          {/* Row 2: Trend Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Widget 3: Safety Compliance Trend Card */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <TrendingUp size={18} color="var(--primary-light)" /> Safety Compliance Trend (Last 7 Days)
              </h3>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fireSafetyStats.complianceTrend} margin={{ left: -15, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis fontSize={9} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    {fireSafetyStats.topCategories.map((cat, i) => (
                      <Line key={cat} type="monotone" dataKey={cat} stroke={['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]} name={cat} strokeWidth={2.5} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget 8: Inspection Trend Line Chart */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Activity size={18} color="#EA580C" /> Inspection Activity Trend (Last 10 Days)
              </h3>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fireSafetyStats.inspectionTrend} margin={{ left: -15, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis fontSize={9} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="OK" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} name="OK Inspections" />
                    <Line type="monotone" dataKey="Not OK" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} name="Not OK Inspections" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 3: Breakdown Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Widget 4: Area / Zone Wise Compliance Bar */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Layers size={18} /> Area / Zone Safety Compliance (%)
              </h3>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fireSafetyStats.areaCompliance} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" fontSize={9} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" fontSize={9} axisLine={false} tickLine={false} width={80} />
                    <Tooltip />
                    <Bar dataKey="Compliance" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={12} name="Compliance Rate">
                      {fireSafetyStats.areaCompliance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Compliance < 75 ? '#EF4444' : '#8B5CF6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget 5: Equipment Category Compliance */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Shield size={18} /> Compliance by Equipment Category (%)
              </h3>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fireSafetyStats.categoryCompliance} margin={{ left: -15, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={8} axisLine={false} tickLine={false} tickFormatter={(val) => val.split(' ')[1] || val} />
                    <YAxis fontSize={9} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="Compliance" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={16} name="Compliance Rate">
                      {fireSafetyStats.categoryCompliance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Compliance < 80 ? '#F59E0B' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget 7: Line-Wise Compliance */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Layers size={18} /> Line / Section Safety Compliance (%)
              </h3>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fireSafetyStats.lineCompliance} margin={{ left: -15, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis fontSize={9} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="Compliance" fill="#10B981" radius={[4, 4, 0, 0]} barSize={25} name="Compliance Rate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 4: Specific Equipment & Tickets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {fireSafetyStats.categoryCompliance.map((cat, idx) => {
              const pieData = [
                { name: 'Functional (OK)', value: cat.ok, color: '#10B981' },
                { name: 'Requires Support', value: cat.notOk, color: '#EF4444' }
              ];
              return (
                <div key={idx} className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
                  <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                    <Shield size={18} color="#3B82F6" /> {cat.name} Status
                  </h3>
                  <div style={{ height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {(cat.ok > 0 || cat.notOk > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%" cy="50%"
                            innerRadius={60} outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => percent > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No data</div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Widget 6: Compliance Rate by Frequency */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Clock size={18} /> Compliance by Auditing Frequency
              </h3>
              <div style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fireSafetyStats.frequencyCompliance} margin={{ left: -15, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis fontSize={9} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="Compliance" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={25} name="Compliance Rate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 5: Safety Tickets, Leaderboards, Alert backlogs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Widget 15: Operator Performance Leaderboard */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Award size={18} color="#10B981" /> Safety Auditing Leaderboard
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {fireSafetyStats.operatorLeaderboard.map((op, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-tertiary)', width: '20px' }}>#{idx+1}</span>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{op.name}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Compliance: {op.complianceRate}%</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10B981' }}>{op.completed}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}> audits</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 16: Safety Alert Severity and Sticky Backlogs */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <AlertTriangle size={18} color="#EF4444" /> Sticky Safety Issue Backlog
              </h3>
              <div style={{ height: '220px' }}>
                {fireSafetyStats.alertsAgeBacklog.some(a => a.Critical > 0 || a.High > 0 || a.Medium > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fireSafetyStats.alertsAgeBacklog} margin={{ left: -15, right: 10, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                      <YAxis fontSize={9} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '9px' }} />
                      <Bar dataKey="Medium" stackId="alerts" fill="#F59E0B" name="Medium Risk" />
                      <Bar dataKey="High" stackId="alerts" fill="#EA580C" name="High Risk" />
                      <Bar dataKey="Critical" stackId="alerts" fill="#EF4444" name="Critical Risk" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No pending safety issues</div>
                )}
              </div>
            </div>

            {/* Widget 13: Safety Support Tickets by Department */}
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Clock size={18} /> Support Tickets Raised by Dept
              </h3>
              <div className="table-container-responsive" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '0.8rem 1rem' }}>Department</th>
                      <th style={{ padding: '0.8rem 1rem' }}>Category</th>
                      <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>Total Tickets</th>
                      <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>Closure TAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fireSafetyStats.ticketsByDepartment.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>{t.department}</td>
                        <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)' }}>{t.category}</td>
                        <td style={{ padding: '0.8rem 1rem', textAlign: 'center', fontWeight: 700, color: '#EF4444' }}>{t.Tickets}</td>
                        <td style={{ padding: '0.8rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t.closureTAT}</td>
                      </tr>
                    ))}
                    {fireSafetyStats.ticketsByDepartment.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-tertiary)' }}>No tickets found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Row 6: Widget 9 - Critical Assets Failure Heatmap/Grid */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#EF4444' }}>
              <AlertTriangle size={18} /> Asset Safety Risk Heatmap (Failing Fire Equipment)
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#64748B', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              ⚠️ <strong>Critical Action Matrix:</strong> The assets listed below have registered multiple failures against standards. Ensure immediate technical response and validation audits to prevent critical fire code violations.
            </div>

            <div className="table-container-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '0.8rem 1rem' }}>Asset ID</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Equipment Category</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Area / Zone</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>Total Audits</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'center', color: '#EF4444' }}>Not OK Failures</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>Compliance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {fireSafetyStats.criticalAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                        🎉 Zero Fire Equipment failures recorded! All assets are fully compliant.
                      </td>
                    </tr>
                  ) : (
                    fireSafetyStats.criticalAssets.map((asset, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1E293B' }}>{asset.id}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{asset.category}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{asset.area}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>{asset.total}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444', fontWeight: 800, backgroundColor: '#FEF2F2' }}>{asset.failures}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <span style={{ 
                            padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, color: '#FFF',
                            backgroundColor: asset.complianceRate < 70 ? '#EF4444' : asset.complianceRate < 85 ? '#F59E0B' : '#10B981'
                          }}>
                            {asset.complianceRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
            {/* <div className="card" style={{ marginBottom: 0 }}>
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
            </div> */}

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
                      label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
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
                  const referenceDate = filters.dateEnd ? new Date(filters.dateEnd) : new Date();
                  const dates = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(referenceDate);
                    d.setDate(d.getDate() - i);
                    dates.push(getLocalDateStr(d));
                  }

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
            
            <div style={{ fontSize: '0.85rem', color: '#64748B', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              ℹ️ <strong>Performance Analysis Guidance:</strong> Aging reports represent pending operational cycles. <strong>Lower Aging Days are better</strong> (indicating agile task closure), while <strong>Higher Waiting Days are worst</strong> (signifying stagnant work-in-progress and risk).
            </div>

            {(() => {
              const map = {};
              rawData.filter(r => r.Status !== 'Done').forEach(r => {
                const key = `${r.Activity_Description || 'Unk'} @ ${r.Component || 'Unk'}`;
                if(!map[key]) map[key] = { desc: r.Activity_Description, comp: r.Component, freq: r.Frequency, line: r.Line_Equipment, subLine: r.Sub_Line_Equipment, type: r.Type_of_Activity, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
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
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{row.line} • {row.subLine || 'No Subline'} • {row.type}</div>
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
                        <th style={{ padding: '0.8rem 1rem' }}>Line Equipment</th>
                        <th style={{ padding: '0.8rem 1rem' }}>Sub-Line Equipment</th>
                        <th style={{ padding: '0.8rem 1rem' }}>Component</th>
                        <th style={{ padding: '0.8rem 1rem' }}>Activity Description</th>
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
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1E293B' }}>{row.line || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{row.subLine || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 600 }}>{row.comp || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={row.desc}>{row.desc}</div>
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
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
                <AreaChart data={reviewPerformanceStats.reviewTrend} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="colorReviewed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorPendingReview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }} 
                    formatter={(value, name, props) => {
                      const total = (props.payload.Reviewed || 0) + (props.payload.Pending || 0);
                      const pct = total ? Math.round((value / total) * 100) : 0;
                      return [`${value} (${pct}%)`, name];
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Reviewed" stackId="review" stroke="#10B981" fill="url(#colorReviewed)" name="Reviewed Tasks" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Pending" stackId="review" stroke="#F59E0B" fill="url(#colorPendingReview)" name="Unreviewed/Pending" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
