/**
 * routes/dashboard.js — All analytics computed server-side.
 * GET /api/dashboard/analytics?dateStart=&dateEnd=&shift=ALL&type=ALL&...
 */

const express = require('express');
const router = express.Router();
const { getCollection } = require('../firebase');
const {
  applyFilters, computeKpis, computeDailyTrend, computeFreqTrends,
  computeActivityTrends, computeDrilldown, computeWorkforce, computeTat,
  computeDeptPerformance, computeComplianceAreas, computeDocRevDistributions
} = require('../analyticsLogic');

router.get('/analytics', async (req, res) => {
  try {
    const [submissions, supportInbox] = await Promise.all([
      getCollection('submissions'),
      getCollection('support_inbox')
    ]);

    const filters = {
      dateStart: req.query.dateStart || '',
      dateEnd: req.query.dateEnd || '',
      shift: req.query.shift || 'ALL',
      type: req.query.type || 'ALL',
      line: req.query.line || 'ALL',
      subLine: req.query.subLine || 'ALL',
      frequency: req.query.frequency || 'ALL',
      user: req.query.user || 'ALL',
      component: req.query.component || '',
      revisionNo: req.query.revisionNo || 'ALL',
      docType: req.query.docType || 'ALL'
    };

    const drillPath = req.query.drillPath ? JSON.parse(req.query.drillPath) : [];
    const filteredData = applyFilters(submissions, filters);

    const [kpis, dailyTrend, freqTrends, activityTrends, drilldown, workforce, tat, deptPerf, areas, docRev] = await Promise.all([
      Promise.resolve(computeKpis(filteredData)),
      Promise.resolve(computeDailyTrend(filteredData)),
      Promise.resolve(computeFreqTrends(submissions, filteredData)),
      Promise.resolve(computeActivityTrends(filteredData)),
      Promise.resolve(computeDrilldown(filteredData, drillPath)),
      Promise.resolve(computeWorkforce(filteredData)),
      Promise.resolve(computeTat(supportInbox)),
      Promise.resolve(computeDeptPerformance(filteredData)),
      Promise.resolve(computeComplianceAreas(filteredData)),
      Promise.resolve(computeDocRevDistributions(filteredData))
    ]);

    // Unique filter options (for dropdowns)
    const filterOptions = {
      lines: [...new Set(submissions.map(d => d.Line_Equipment).filter(Boolean))],
      subLines: [...new Set(submissions.map(d => d.Sub_Line_Equipment).filter(Boolean))],
      types: [...new Set(submissions.map(d => d.Type_of_Activity).filter(Boolean))],
      frequencies: [...new Set(submissions.map(d => d.Frequency).filter(Boolean))],
      users: [...new Set(submissions.map(d => d.Submitted_By).filter(Boolean))],
      revisions: [...new Set(submissions.map(d => d.Revision_No).filter(Boolean))],
      docTypes: [...new Set(submissions.map(d => d.Document_Type).filter(Boolean))]
    };

    res.json({
      kpis, dailyTrend, freqTrends, activityTrends, drilldown,
      workforce, tat, deptPerf, areas, docRev, filterOptions
    });
  } catch (err) {
    console.error('Dashboard analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
