/**
 * analyticsLogic.js — All dashboard calculation logic runs SERVER-SIDE here.
 * Clients only receive computed results — they cannot see how it was calculated.
 */

/**
 * Compute all primary KPI stats from a filtered submissions array.
 */
const computeKpis = (data) => {
  const total = data.length;
  const done = data.filter(r => r.Status === 'Done').length;
  const wip = data.filter(r => r.Status === 'WIP').length;
  const support = data.filter(r => r.Status === 'Support Required').length;
  const hold = data.filter(r => r.Status === 'Hold').length;
  const postponed = data.filter(r => r.Status === 'Postponed').length;
  return { total, done, wip, support, hold, postponed, compliance: total ? Math.round((done / total) * 100) : 0 };
};

/**
 * Filter submissions based on query params.
 */
const applyFilters = (data, filters) => {
  return data.filter(item => {
    if (filters.dateStart && item.Date < filters.dateStart) return false;
    if (filters.dateEnd && item.Date > filters.dateEnd) return false;
    if (filters.shift && filters.shift !== 'ALL' && item.Shift !== filters.shift) return false;
    if (filters.type && filters.type !== 'ALL' && item.Type_of_Activity !== filters.type) return false;
    if (filters.line && filters.line !== 'ALL' && item.Line_Equipment !== filters.line) return false;
    if (filters.subLine && filters.subLine !== 'ALL' && item.Sub_Line_Equipment !== filters.subLine) return false;
    if (filters.frequency && filters.frequency !== 'ALL' && item.Frequency !== filters.frequency) return false;
    if (filters.user && filters.user !== 'ALL' && !item.Submitted_By?.includes(filters.user)) return false;
    if (filters.component && !item.Component?.toLowerCase().includes(filters.component.toLowerCase())) return false;
    if (filters.revisionNo && filters.revisionNo !== 'ALL' && item.Revision_No !== filters.revisionNo) return false;
    if (filters.docType && filters.docType !== 'ALL' && item.Document_Type !== filters.docType) return false;
    return true;
  });
};

/**
 * Compute daily trend data (stacked by status).
 */
const computeDailyTrend = (data, days = 15) => {
  const grouped = {};
  data.forEach(curr => {
    const date = curr.Date || 'Unknown';
    if (!grouped[date]) grouped[date] = { date, Done: 0, WIP: 0, Support: 0, Hold: 0, Postponed: 0 };
    const s = curr.Status === 'Support Required' ? 'Support' : curr.Status;
    if (grouped[date][s] !== undefined) grouped[date][s]++;
  });
  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
};

/**
 * Compute trend data broken down by frequency type.
 */
const computeFreqTrends = (allData, filteredData, days = 7) => {
  const targetFreqs = [...new Set(allData.map(r => r.Frequency).filter(Boolean))];
  const result = {};
  targetFreqs.forEach(freq => {
    const freqData = filteredData.filter(r => r.Frequency === freq);
    const grouped = {};
    freqData.forEach(curr => {
      const date = curr.Date || 'Unknown';
      if (!grouped[date]) grouped[date] = { date, Compliance: 0, Total: 0, Done: 0, WIP: 0, Support: 0, Hold: 0 };
      grouped[date].Total++;
      const s = curr.Status === 'Support Required' ? 'Support' : curr.Status;
      if (grouped[date][s] !== undefined) grouped[date][s]++;
      grouped[date].Compliance = Math.round((grouped[date].Done / grouped[date].Total) * 100);
    });
    result[freq] = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
  });
  return result;
};

/**
 * Compute activity-level daily trends (each activity type separately).
 */
const computeActivityTrends = (filteredData, days = 7) => {
  const types = [...new Set(filteredData.map(r => r.Type_of_Activity).filter(Boolean))];
  return types.map(type => {
    const typeData = filteredData.filter(r => r.Type_of_Activity === type);
    const grouped = {};
    typeData.forEach(curr => {
      const date = curr.Date || 'Unknown';
      if (!grouped[date]) grouped[date] = { date, Done: 0, WIP: 0, Support: 0, Total: 0 };
      const s = curr.Status === 'Support Required' ? 'Support' : curr.Status;
      if (grouped[date][s] !== undefined) grouped[date][s]++;
      grouped[date].Total++;
      grouped[date].Compliance = Math.round((grouped[date].Done / grouped[date].Total) * 100);
    });
    return { type, data: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).slice(-days) };
  });
};

/**
 * Compute drillable compliance: Line -> SubLine -> Component
 */
const computeDrilldown = (filteredData, drillPath = []) => {
  let data = filteredData;
  let groupBy = 'Line_Equipment';

  if (drillPath.length === 1) {
    data = data.filter(d => d.Line_Equipment === drillPath[0]);
    groupBy = 'Sub_Line_Equipment';
  } else if (drillPath.length >= 2) {
    data = data.filter(d => d.Line_Equipment === drillPath[0] && d.Sub_Line_Equipment === drillPath[1]);
    groupBy = 'Component';
  }

  const grouped = {};
  data.forEach(d => {
    const key = d[groupBy] || 'Unknown';
    if (!grouped[key]) grouped[key] = { name: key, total: 0, done: 0 };
    grouped[key].total++;
    if (d.Status === 'Done') grouped[key].done++;
  });

  return Object.values(grouped)
    .filter(g => g.total > 0)
    .map(g => ({ name: g.name, compliance: Math.round((g.done / g.total) * 100), total: g.total }))
    .sort((a, b) => b.compliance - a.compliance)
    .slice(0, 10);
};

/**
 * Compute workforce best/worst performers.
 */
const computeWorkforce = (filteredData) => {
  const employees = {};
  filteredData.forEach(curr => {
    const name = curr.Submitted_By || 'Unknown';
    if (!employees[name]) employees[name] = { total: 0, done: 0 };
    employees[name].total++;
    if (curr.Status === 'Done') employees[name].done++;
  });
  const result = Object.entries(employees)
    .filter(([_, s]) => s.total > 0)
    .map(([name, s]) => ({ name: name.split(' (')[0], compliance: Math.round((s.done / s.total) * 100), total: s.total, done: s.done }))
    .sort((a, b) => b.compliance - a.compliance);
  return { top: result.slice(0, 5), worst: result.slice(-5).reverse() };
};

/**
 * Compute Average TAT from support inbox resolved items — by user.
 */
const computeTat = (supportData) => {
  const resolvedItems = supportData.filter(s => s.status === 'Resolved' && s.resolvedAt);
  if (resolvedItems.length === 0) return { avg: 'N/A', count: 0, byUser: { top: [], worst: [] } };

  const totalMs = resolvedItems.reduce((acc, item) => {
    return acc + Math.max(0, new Date(item.resolvedAt) - new Date(item.timestamp));
  }, 0);
  const avgHrs = (totalMs / resolvedItems.length) / 36e5;

  const userStats = {};
  resolvedItems.filter(s => s.assignedTo).forEach(item => {
    const user = item.assignedTo;
    if (!userStats[user]) userStats[user] = { dept: item.department || 'Unknown', totalMs: 0, count: 0 };
    userStats[user].totalMs += Math.max(0, new Date(item.resolvedAt) - new Date(item.timestamp));
    userStats[user].count++;
  });

  const byUser = Object.entries(userStats).map(([user, data]) => {
    const h = (data.totalMs / data.count) / 36e5;
    return { user, dept: data.dept, avgHrs: h, avgFormatted: h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`, count: data.count };
  }).sort((a, b) => a.avgHrs - b.avgHrs);

  return {
    avg: avgHrs.toFixed(1) + ' hrs',
    count: resolvedItems.length,
    byUser: { top: byUser.slice(0, 5), worst: byUser.slice(-5).reverse() }
  };
};

/**
 * Compute department performance.
 */
const computeDeptPerformance = (filteredData) => {
  const depts = {};
  filteredData.forEach(r => {
    const dept = r.SupportDept;
    if (!dept) return;
    if (!depts[dept]) depts[dept] = { total: 0, done: 0 };
    depts[dept].total++;
    if (r.Status === 'Done') depts[dept].done++;
  });
  const result = Object.entries(depts)
    .map(([name, s]) => ({ name, compliance: Math.round((s.done / s.total) * 100) }))
    .sort((a, b) => b.compliance - a.compliance);
  return { top: result.slice(0, 3), worst: result.slice(-3).reverse() };
};

/**
 * Compute compliance areas (highest and lowest).
 */
const computeComplianceAreas = (filteredData) => {
  const areas = {};
  filteredData.forEach(r => {
    const key = `${r.Line_Equipment} > ${r.Sub_Line_Equipment}`;
    if (!areas[key]) areas[key] = { name: key, total: 0, done: 0 };
    areas[key].total++;
    if (r.Status === 'Done') areas[key].done++;
  });
  const list = Object.values(areas)
    .filter(a => a.total > 0)
    .map(a => ({ ...a, compliance: Math.round((a.done / a.total) * 100) }));
  return {
    highest: list.sort((a, b) => b.compliance - a.compliance).slice(0, 5),
    lowest: list.sort((a, b) => a.compliance - b.compliance).slice(0, 5)
  };
};

/**
 * Compute document type and revision distributions.
 */
const computeDocRevDistributions = (filteredData) => {
  const docTypes = {};
  const revisions = {};
  filteredData.forEach(r => {
    const doc = r.Document_Type || 'None';
    docTypes[doc] = (docTypes[doc] || 0) + 1;
    const rev = r.Revision_No || 'None';
    revisions[rev] = (revisions[rev] || 0) + 1;
  });
  return {
    docTypes: Object.entries(docTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    revisions: Object.entries(revisions).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  };
};

module.exports = {
  applyFilters, computeKpis, computeDailyTrend, computeFreqTrends,
  computeActivityTrends, computeDrilldown, computeWorkforce, computeTat,
  computeDeptPerformance, computeComplianceAreas, computeDocRevDistributions
};
