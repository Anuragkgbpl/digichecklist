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
import AdvancedAnalyticsDashboard, { Section10AgingReport, Section11ReviewerPerformance } from '../components/AdvancedAnalyticsDashboard';

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
  const [activeTab, setActiveTab] = useState('advanced');
  const [fsTrendRange, setFsTrendRange] = useState('MTD');
  const [fsAreaRange, setFsAreaRange] = useState('MTD');
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
    
    // 1. Overall Safety Compliance & Safety Checkpoints (based on latest update reference till new inspection, out of Total Checklist Activity = 858)
    const latestStatusMap = {};
    data.forEach(r => {
      const key = r.Asset_ID || `${r.Equipment_Category}-${r.Component}-${r.Activity_Description}`;
      const ts = new Date(r.Date_Timestamp || r.timestamp || r.Date || 0).getTime();
      if (!latestStatusMap[key] || ts >= latestStatusMap[key].ts) {
        latestStatusMap[key] = { status: r.Status, ts };
      }
    });

    const uniqueKeys = Object.keys(latestStatusMap);
    let inspectedNotOk = 0;
    uniqueKeys.forEach(k => {
      const s = latestStatusMap[k].status;
      if (s === 'Not OK' || s === 'Support Required' || s === 'Support') {
        inspectedNotOk++;
      }
    });

    const baseFSChecklists = masterChecklists.filter(c => {
      if (c.Type_of_Activity !== 'Fire Safety') return false;
      if (filters.line !== 'ALL' && c.Line_Equipment !== filters.line) return false;
      if (filters.subLine !== 'ALL' && c.Sub_Line_Equipment !== filters.subLine) return false;
      if (filters.component !== 'ALL' && c.Component !== filters.component) return false;
      if (filters.frequency && filters.frequency !== 'ALL' && c.Frequency !== filters.frequency) return false;
      return true;
    });

    let totalCheckpoints = baseFSChecklists.length > 0 ? baseFSChecklists.length : Math.max(uniqueKeys.length, 858);
    if (filters.line === 'ALL' && filters.subLine === 'ALL' && filters.component === 'ALL' && (!filters.frequency || filters.frequency === 'ALL') && totalCheckpoints < 858) {
      totalCheckpoints = 858;
    }

    const notOkCount = inspectedNotOk;
    const okCount = Math.max(0, totalCheckpoints - notOkCount);
    const complianceRate = totalCheckpoints > 0 ? Math.round((okCount / totalCheckpoints) * 100) : 100;
    
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
    const todayStr = getLocalDateStr(referenceDate);
    const yestDate = new Date(referenceDate);
    yestDate.setDate(yestDate.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yestDate);
    const mtdStartStr = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}-01`;
    const ytdStartStr = `${referenceDate.getFullYear()}-01-01`;

    const getRangeFilteredData = (range) => {
      return data.filter(d => {
        if (!d.Date) return false;
        if (range === 'Today') return d.Date === todayStr;
        if (range === 'Yesterday') return d.Date === yesterdayStr;
        if (range === 'MTD') return d.Date >= mtdStartStr && d.Date <= todayStr;
        if (range === 'YTD') return d.Date >= ytdStartStr && d.Date <= todayStr;
        return true;
      });
    };

    // Safety Compliance Trend Bar Chart data (by Equipment Category for selected fsTrendRange)
    const trendRangeData = getRangeFilteredData(fsTrendRange);
    const trendCategoryMap = {};
    trendRangeData.forEach(r => {
      const cat = r.Equipment_Category || 'General Fire Safety';
      if (!trendCategoryMap[cat]) trendCategoryMap[cat] = { total: 0, ok: 0 };
      trendCategoryMap[cat].total++;
      if (r.Status === 'OK' || r.Status === 'Done') trendCategoryMap[cat].ok++;
    });
    const standardCategories = ['Fire Extinguisher', 'Fire Hydrant System', 'Smoke Detector', 'Alarm System', 'Emergency Exit', 'Sprinkler System', 'Safety Signage'];
    standardCategories.forEach(cat => {
      if (!trendCategoryMap[cat]) trendCategoryMap[cat] = { total: 0, ok: 0 };
    });
    const complianceTrend = Object.entries(trendCategoryMap).map(([name, stat]) => ({
      name,
      Compliance: stat.total > 0 ? Math.round((stat.ok / stat.total) * 100) : 100,
      Total: stat.total,
      OK: stat.ok,
      NotOK: stat.total - stat.ok
    })).sort((a, b) => b.Total - a.Total);

    const topCategories = categoryCompliance.slice(0, 5).map(c => c.name);
    
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
    
    const areaRangeData = getRangeFilteredData(fsAreaRange);
    const areaMap = {};
    areaRangeData.forEach(r => {
      const area = r.Area_Zone || r.Area || 'Plant Wide';
      if (!areaMap[area]) areaMap[area] = { total: 0, ok: 0 };
      areaMap[area].total++;
      if (r.Status === 'OK' || r.Status === 'Done') areaMap[area].ok++;
    });
    const standardAreas = ['Syrup Room Area', 'Packaging Zone A', 'Packaging Zone B', 'Raw Material Storage', 'Finished Goods Warehouse', 'Utility Boiler & Compressor', 'QA Lab & Office Building'];
    standardAreas.forEach(area => {
      if (!areaMap[area]) areaMap[area] = { total: 0, ok: 0 };
    });
    const areaCompliance = Object.entries(areaMap).map(([name, stat]) => ({
      name,
      Compliance: stat.total > 0 ? Math.round((stat.ok / stat.total) * 100) : 100,
      Total: stat.total
    })).sort((a, b) => a.Compliance - b.Compliance);
    
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
    };
  }, [filteredFSData, supportInbox, filters.dateEnd, fsTrendRange, fsAreaRange, masterChecklists, filters.line, filters.subLine, filters.component, filters.frequency]);


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
          { id: 'firesafety', label: '🔥 Fire Safety Analytics', icon: Flame },
          { id: 'compliance', label: '🧩 Activity & Compliance', icon: ClipboardList },
          { id: 'aging', label: '⏳ Aging Report', icon: FileClock },
          { id: 'review_perf', label: '🛡️ Reviewer Performance', icon: Shield }
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
          backlogTrend={shiftAnalysis.backlogTrend}
          hourlyPeak={productivityStats.hourlyPeak}
        />
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <TrendingUp size={18} color="var(--primary-light)" /> Safety Compliance Trend / Breakdown (%)
                </h3>
                <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: '#F1F5F9', padding: '0.2rem', borderRadius: '6px' }}>
                  {['Today', 'Yesterday', 'MTD', 'YTD'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFsTrendRange(opt)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: fsTrendRange === opt ? '#3B82F6' : 'transparent',
                        color: fsTrendRange === opt ? '#fff' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fireSafetyStats.complianceTrend} margin={{ left: -15, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} tickFormatter={(val) => val.split(' ')[0] || val} />
                    <YAxis fontSize={9} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(val) => [`${val}%`, 'Compliance']} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Compliance" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} name="Compliance %">
                      {fireSafetyStats.complianceTrend.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Compliance < 80 ? '#EF4444' : (entry.Compliance < 95 ? '#F59E0B' : '#10B981')} />
                      ))}
                    </Bar>
                  </BarChart>
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
            <div className="card" style={{ padding: '1.5rem', marginBottom: 0, gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <Layers size={18} color="#8B5CF6" /> Area / Zone Safety Compliance (%)
                </h3>
                <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: '#F1F5F9', padding: '0.2rem', borderRadius: '6px' }}>
                  {['Today', 'Yesterday', 'MTD', 'YTD'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFsAreaRange(opt)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: fsAreaRange === opt ? '#8B5CF6' : 'transparent',
                        color: fsAreaRange === opt ? '#fff' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: '380px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fireSafetyStats.areaCompliance} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" fontSize={11} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" fontSize={11} axisLine={false} tickLine={false} width={130} />
                    <Tooltip formatter={(val) => [`${val}%`, 'Compliance Rate']} />
                    <Bar dataKey="Compliance" fill="#8B5CF6" radius={[0, 6, 6, 0]} barSize={20} name="Compliance Rate">
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
          TAB 7: AGING REPORT
          ======================================================= */}
      {activeTab === 'aging' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <Section10AgingReport submissions={filteredData.length ? filteredData : rawData} />
        </div>
      )}

      {/* ========================================================
          TAB REVIEW: REVIEWER PERFORMANCE
          ======================================================== */}
      {activeTab === 'review_perf' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <Section11ReviewerPerformance submissions={filteredData.length ? filteredData : rawData} checklists={masterChecklists} employees={employees} reviewers={reviewers} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
