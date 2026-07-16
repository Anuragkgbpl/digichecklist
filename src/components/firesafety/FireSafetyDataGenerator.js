// src/components/firesafety/FireSafetyDataGenerator.js
// 371 Master Assets Generator & Comprehensive Compliance Engine
// Strictly conforming to required Lines, Categories, Sub-Lines, Areas, Frequencies, Revisions, and SOP Documents.

export const FS_DEPARTMENTS = [
  'PRODUCTION',
  'UTILITY',
  'STORES',
  'ADMIN',
  'SHIPPING',
  'QUALITY',
  'ENVIRONMENT',
  'SAFETY'
];

export const FS_CATEGORIES = [
  'Fire Extinguisher',
  'Fire Hydrant',
  'Fire Hose reel',
  'Fire Detector',
  'Fire Sand Bucket/Stand',
  'Fire Sprinkler',
  'Fire Alarm Panel'
];

export const FS_SOP_DOCUMENTS = {
  'Fire Extinguisher': {
    docNo: 'DOC-SOP-FS-EXT-001',
    title: 'SOP for Portable Fire Extinguisher Inspection & Maintenance',
    currentRevision: '2',
    lastRevisedDate: '2025-02-15',
    reviewIntervalYears: 2,
    overdueForReview: false
  },
  'Fire Hydrant': {
    docNo: 'DOC-SOP-FS-HYD-002',
    title: 'SOP for Fire Hydrant System & Landing Valve Testing',
    currentRevision: '2',
    lastRevisedDate: '2024-10-10',
    reviewIntervalYears: 2,
    overdueForReview: false
  },
  'Fire Hose reel': {
    docNo: 'DOC-SOP-FS-HSE-003',
    title: 'SOP for Fire Hose Reel Drum & Nozzle Operation',
    currentRevision: '1',
    lastRevisedDate: '2023-04-12',
    reviewIntervalYears: 2,
    overdueForReview: true // > 2 years (730 days) from 2026-07-16
  },
  'Fire Detector': {
    docNo: 'DOC-SOP-FS-DET-004',
    title: 'SOP for Optical & Thermal Fire Detectors Audit',
    currentRevision: '2',
    lastRevisedDate: '2025-01-20',
    reviewIntervalYears: 2,
    overdueForReview: false
  },
  'Fire Sand Bucket/Stand': {
    docNo: 'DOC-SOP-FS-SND-005',
    title: 'SOP for Fire Sand Bucket Stands & Spill Containment',
    currentRevision: '0',
    lastRevisedDate: '2022-07-01',
    reviewIntervalYears: 2,
    overdueForReview: true // > 2 years & outdated Rev 0
  },
  'Fire Sprinkler': {
    docNo: 'DOC-SOP-FS-SPK-006',
    title: 'SOP for Fire Sprinkler Heads & Pre-Action Valves',
    currentRevision: '2',
    lastRevisedDate: '2024-08-18',
    reviewIntervalYears: 2,
    overdueForReview: false
  },
  'Fire Alarm Panel': {
    docNo: 'DOC-SOP-FS-FAP-007',
    title: 'SOP for Addressable Fire Alarm Panel & Battery Backup',
    currentRevision: '1',
    lastRevisedDate: '2023-02-28',
    reviewIntervalYears: 2,
    overdueForReview: true // > 2 years
  }
};

export const FS_SUB_LINES = {
  'Fire Extinguisher': ['ABC 6KG', 'CO2 4.5KG', 'ABC 2KG', 'CO2 9KG', 'DCP 5KG', 'Foam 9L'],
  'Fire Hydrant': ['Yard Hydrant Double Head', 'Internal Hydrant Single Head', 'Monitor Hydrant High-Flow'],
  'Fire Hose reel': ['Wall Mounted 30m Reel', 'Drum Reel 45m Heavy Duty', 'Cabinet Hose Reel'],
  'Fire Detector': ['Optical Smoke Detector', 'Thermal Heat Detector', 'Multi-Sensor Detector', 'Optical Beam Detector'],
  'Fire Sand Bucket/Stand': ['4-Bucket Stand Set', 'Single Wall-Mount Bucket', 'Spill Containment Sand Drum'],
  'Fire Sprinkler': ['Pendant Sprinkler Head 68°C', 'Upright Sprinkler Head 79°C', 'Side-Wall Sprinkler Head', 'Pre-Action Control Valve'],
  'Fire Alarm Panel': ['Main Addressable Panel 8-Loop', 'Repeater Panel Zone 1-4', 'Conventional Zone Panel']
};

export const FS_AREAS_BY_DEPT = {
  'PRODUCTION': ['Production Hall A (Syrup & Prep)', 'Production Hall B (High-Speed Filling)', 'Packaging Line Bay 1-3', 'Clean Room Corridor & Locker'],
  'UTILITY': ['Boiler House & Steam Line', 'Compressor Bay & Chiller Plant', 'LT Switchgear & Transformer Yard', 'Raw Water Treatment Bay'],
  'STORES': ['Raw Material Storage Warehouse A', 'Finished Goods High-Bay Warehouse B', 'Chemical Store & Flammable Bay', 'Packing Material Transit Area'],
  'ADMIN': ['Admin Main Reception & Foyer', 'HR & Conference Wing Level 1', 'Executive Office Suite Level 2', 'Staff Canteen & Kitchen Area'],
  'SHIPPING': ['Finished Goods Loading Dock 1-4', 'Forklift Charging Station Bay', 'Export Dispatch Marshalling Yard', 'Security Gatehouse & Weighbridge'],
  'QUALITY': ['QA Central Analytical Lab', 'QC Microbiology Sterile Wing', 'Stability Chamber Room Level 1', 'Sample Archival Store Level 2'],
  'ENVIRONMENT': ['Effluent Treatment Plant (ETP) Central', 'Scrap Yard & Hazardous Store Area', 'Incinerator & Sludge Press House', 'Chemical Dosing & Neutralization Tank'],
  'SAFETY': ['Fire Command Center & Pump House', 'Occupational Safety Training Hall', 'Emergency Rescue Equipment Store', 'First Aid Medical Center']
};

export const FS_COMPONENTS = {
  'Fire Extinguisher': [
    { name: 'Pressure Gauge', desc: 'Verify gauge needle is inside the green operating zone (12-15 bar)', standard: 'Green Zone (12-15 bar)' },
    { name: 'Safety Pin & Seal', desc: 'Check anti-tamper plastic seal and safety locking pin intactness', standard: 'Intact & Sealed' },
    { name: 'Hose Pipe & Nozzle', desc: 'Inspect rubber discharge hose and horn for cracks or blockage', standard: 'Zero cracks, clear passage' },
    { name: 'Casing & Bracket', desc: 'Inspect cylinder cylinder cylinder body for rust and secure wall mounting', standard: 'Securely mounted, no corrosion' }
  ],
  'Fire Hydrant': [
    { name: 'Landing Valve Handwheel', desc: 'Verify smooth opening and closing of landing valve brass wheel', standard: 'Smooth rotation, no leakage' },
    { name: 'Hose Box & Canvas Hose', desc: 'Check hose box glass door lock and 15m canvas hose roll dryness', standard: 'Clean inside, dry hose roll' },
    { name: 'Static Pressure Reading', desc: 'Measure static water pressure gauge on hydrant branch line', standard: '6.5 - 7.5 kg/cm² pressure' },
    { name: 'Brass Branch Nozzle', desc: 'Check availability and polish of brass jet/spray branch pipe', standard: 'Present & securely clamped' }
  ],
  'Fire Hose reel': [
    { name: 'Reel Drum Rotation', desc: 'Pull out 5m hose and verify smooth swinging reel drum action', standard: 'Swings freely 180 degrees' },
    { name: 'Shut-off Nozzle', desc: 'Open twist shut-off nozzle and verify water jet projection (> 6m)', standard: 'Strong jet > 6m reach' },
    { name: 'Inlet Stop Valve', desc: 'Verify upstream ball/gate inlet valve is open and corrosion-free', standard: 'Valve fully OPEN position' }
  ],
  'Fire Detector': [
    { name: 'Status LED Blink', desc: 'Verify green/red status indicator LED blinks once every 10 seconds', standard: 'Blinking every 10s' },
    { name: 'Sensor Chamber Cleanliness', desc: 'Inspect optical sensing chamber entry slots for dust or spider webs', standard: 'Clean vents, zero obstruction' },
    { name: 'Aerosol Test Response', desc: 'Test detector activation using calibrated synthetic aerosol test smoke', standard: 'Triggers alarm within 5 sec' }
  ],
  'Fire Sand Bucket/Stand': [
    { name: 'Sand Dryness & Level', desc: 'Verify fire grade dry river sand fills bucket up to top brim mark', standard: 'Dry, loose sand up to brim' },
    { name: 'Bucket Paint & Marking', desc: 'Check fire red paint, white "FIRE / आग" lettering, and bottom handle', standard: 'Vibrant red paint, clear text' },
    { name: 'Canopy Stand Stability', desc: 'Inspect steel stand frame and protective top rain canopy condition', standard: 'Firmly anchored, zero rust' }
  ],
  'Fire Sprinkler': [
    { name: 'Glass Bulb Integrity', desc: 'Verify colored thermal glass bulb (68°C Red / 79°C Yellow) is intact', standard: 'Bulb intact, no paint/coat' },
    { name: 'Deflector Plate Cleanliness', desc: 'Check brass deflector plate for dust, corrosion, or hanging debris', standard: 'Clean brass, proper alignment' },
    { name: 'Pre-Action Section Valve', desc: 'Verify section OS&Y gate valve is padlocked in OPEN position', standard: 'Padlocked OPEN, tamper switch OK' }
  ],
  'Fire Alarm Panel': [
    { name: 'Mains & Backup Power', desc: 'Verify 230V AC mains green LED and 24V DC battery float voltage', standard: '24.5V DC charging, AC normal' },
    { name: 'System Fault Display', desc: 'Inspect LCD display screen for open circuit, ground, or loop faults', standard: 'System Normal - 0 Active Faults' },
    { name: 'Lamp & Buzzer Test', desc: 'Execute panel self-test button to verify all zone LEDs and piezo buzzer', standard: 'All zone LEDs & buzzer active' }
  ]
};

export const FS_PERIODS = [
  { id: '2025-08', label: 'Aug 2025', short: 'Aug 25', isHistorical: true },
  { id: '2025-09', label: 'Sep 2025', short: 'Sep 25', isHistorical: true },
  { id: '2025-10', label: 'Oct 2025', short: 'Oct 25', isHistorical: true },
  { id: '2025-11', label: 'Nov 2025', short: 'Nov 25', isHistorical: true },
  { id: '2025-12', label: 'Dec 2025', short: 'Dec 25', isHistorical: true },
  { id: '2026-01', label: 'Jan 2026', short: 'Jan 26', isHistorical: true },
  { id: '2026-02', label: 'Feb 2026', short: 'Feb 26', isHistorical: true },
  { id: '2026-03', label: 'Mar 2026', short: 'Mar 26', isHistorical: true },
  { id: '2026-04', label: 'Apr 2026', short: 'Apr 26', isHistorical: true },
  { id: '2026-05', label: 'May 2026', short: 'May 26', isHistorical: true },
  { id: '2026-06', label: 'Jun 2026', short: 'Jun 26', isHistorical: true },
  { id: '2026-07', label: 'Jul 2026', short: 'Jul 26', isHistorical: false, isCurrent: true }
];

const INSPECTORS = [
  'Rahul Sharma (Senior Safety Officer)',
  'Amit Patel (Fire Safety Engineer)',
  'Vikram Singh (Shift Safety Inspector)',
  'Sanjay Dutt (Plant Maintenance Head)',
  'Rohan Verma (EH&S Supervisor)',
  'Deepak Nair (Utility Safety Lead)',
  'Pooja Mishra (QA EHS Auditor)'
];

// Seeded random helper for stable, reproducible results across refreshes
function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Generates the 371 master assets for the plant across the exact 8 departments and 7 categories.
 */
export function generate371PlantFireAssets() {
  const deptCounts = {
    'PRODUCTION': 110,
    'UTILITY': 65,
    'STORES': 52,
    'ADMIN': 38,
    'SHIPPING': 36,
    'QUALITY': 28,
    'ENVIRONMENT': 22,
    'SAFETY': 20
  }; // Exact total: 110 + 65 + 52 + 38 + 36 + 28 + 22 + 20 = 371

  const assets = [];
  let globalIndex = 1;

  FS_DEPARTMENTS.forEach((dept, deptIdx) => {
    const targetCount = deptCounts[dept];
    const areas = FS_AREAS_BY_DEPT[dept];

    for (let i = 0; i < targetCount; i++) {
      // Pick category cyclically with realistic weighting per department
      let catIdx = (i + deptIdx * 2) % FS_CATEGORIES.length;
      if (dept === 'PRODUCTION' && (i % 3 === 0)) catIdx = 0; // More extinguishers in Production
      if (dept === 'UTILITY' && (i % 3 === 1)) catIdx = 1; // More hydrants in Utility
      if (dept === 'STORES' && (i % 4 === 0)) catIdx = 5; // More sprinklers in Stores

      const category = FS_CATEGORIES[catIdx];
      const subLines = FS_SUB_LINES[category];
      const subLine = subLines[i % subLines.length];
      const area = areas[i % areas.length];
      const sopInfo = FS_SOP_DOCUMENTS[category];

      // Assign revision number:
      // Most assets follow currentRevision ('2' or '1'), but ~15% follow outdated '1' or '0'
      const seed = globalIndex * 997 + i * 31;
      const randRev = seededRandom(seed);
      let revisionNumber = sopInfo.currentRevision;
      if (randRev < 0.12 && sopInfo.currentRevision === '2') {
        revisionNumber = '1'; // Outdated!
      } else if (randRev < 0.04 && sopInfo.currentRevision === '2') {
        revisionNumber = '0'; // Outdated!
      } else if (randRev < 0.15 && sopInfo.currentRevision === '1') {
        revisionNumber = '0'; // Outdated!
      }

      // Assign frequency (Mostly Monthly today, supporting Weekly/Quarterly/Annual)
      const randFreq = seededRandom(seed + 101);
      let frequency = 'Monthly';
      if (randFreq < 0.12) frequency = 'Weekly';
      else if (randFreq > 0.90) frequency = 'Quarterly';
      else if (randFreq > 0.96) frequency = 'Annual';

      const assetIdPrefix = category === 'Fire Extinguisher' ? 'FS-EXT' :
                            category === 'Fire Hydrant' ? 'FS-HYD' :
                            category === 'Fire Hose reel' ? 'FS-HSE' :
                            category === 'Fire Detector' ? 'FS-DET' :
                            category === 'Fire Sand Bucket/Stand' ? 'FS-SND' :
                            category === 'Fire Sprinkler' ? 'FS-SPK' : 'FS-FAP';
      
      const assetId = `${assetIdPrefix}-${dept.slice(0,4)}-${String(globalIndex).padStart(3, '0')}`;
      const components = FS_COMPONENTS[category];

      // Generate 12 months execution history
      const periodStatus = {};
      let assetCompliantMonths = 0;
      let assetDueMonths = 0;

      FS_PERIODS.forEach((period, pIdx) => {
        const pSeed = seed + pIdx * 179;
        const pRand = seededRandom(pSeed);

        // Every past/current month up to July 2026 is due
        assetDueMonths++;
        
        // Determine status in this period:
        // ~89% Compliant (OK)
        // ~6.5% Non-Compliant (Not OK)
        // ~4.5% Not Done / Overdue (No record past due date)
        let status = 'Compliant'; // Result = 'OK'
        let failedComponent = null;
        let remarks = 'Checked per SOP standard. All safety parameters within acceptable range.';
        let inspector = INSPECTORS[pIdx % INSPECTORS.length];
        let inspectedAt = `${period.id}-${String(5 + (pIdx % 20)).padStart(2, '0')} 10:30 AM`;

        // Make certain departments or zones have slightly higher failure/overdue rates so top-worst charts are interesting
        let failThreshold = 0.065;
        let overdueThreshold = failThreshold + 0.045;

        if (dept === 'SHIPPING' || dept === 'UTILITY' || area.includes('Boiler') || area.includes('Scrap Yard')) {
          failThreshold = 0.14;
          overdueThreshold = failThreshold + 0.07;
        }

        if (pRand < failThreshold) {
          status = 'Non-Compliant'; // Result = 'Not OK'
          failedComponent = components[Math.floor(seededRandom(pSeed + 33) * components.length)].name;
          remarks = `CRITICAL: ${failedComponent} failed during periodic audit. Immediate repair/replacement required.`;
        } else if (pRand < overdueThreshold) {
          status = 'Not Done'; // Overdue - no record past due date
          failedComponent = 'Entire Inspection Overdue';
          remarks = `Periodic safety checklist for ${period.label} past due date without submission.`;
          inspector = 'Unassigned / Pending Audit';
          inspectedAt = 'N/A';
        } else {
          assetCompliantMonths++;
        }

        periodStatus[period.id] = {
          status, // 'Compliant' | 'Non-Compliant' | 'Not Done'
          failedComponent: status === 'Non-Compliant' ? failedComponent : null,
          remarks,
          inspector,
          inspectedAt,
          result: status === 'Compliant' ? 'OK' : (status === 'Non-Compliant' ? 'Not OK' : 'Overdue'),
          periodId: period.id,
          periodLabel: period.label
        };
      });

      const runningCompliancePct = assetDueMonths > 0 
        ? Math.round((assetCompliantMonths / assetDueMonths) * 100) 
        : 100;

      assets.push({
        id: assetId,
        Asset_ID: assetId,
        Equipment_Category: category,
        Line: dept,
        Sub_Line: subLine,
        Area_Zone: area,
        Frequency: frequency,
        Revision_Number: revisionNumber,
        Document_Number: sopInfo.docNo,
        Last_Revised_Date: sopInfo.lastRevisedDate,
        Review_Interval_Years: sopInfo.reviewIntervalYears,
        isSopOverdue: sopInfo.overdueForReview,
        isRevisionOutdated: revisionNumber !== sopInfo.currentRevision,
        currentRevisionTarget: sopInfo.currentRevision,
        components,
        periodStatus,
        runningCompliancePct,
        // Quick access to latest period (Jul 2026) status
        latestStatus: periodStatus['2026-07'] || periodStatus['2026-06']
      });

      globalIndex++;
    }
  });

  return assets;
}

/**
 * Computes comprehensive compliance breakdowns and KPI totals across all requested dimensions
 * respecting cross-filters.
 */
export function computeFireSafetyAnalytics(assets = [], filters = {}) {
  // 1. Apply multi-select / global filters to filter assets
  const filteredAssets = assets.filter(asset => {
    if (filters.line && filters.line !== 'ALL' && asset.Line !== filters.line) return false;
    if (filters.category && filters.category !== 'ALL' && asset.Equipment_Category !== filters.category) return false;
    if (filters.subLine && filters.subLine !== 'ALL' && asset.Sub_Line !== filters.subLine) return false;
    if (filters.area && filters.area !== 'ALL' && asset.Area_Zone !== filters.area) return false;
    if (filters.frequency && filters.frequency !== 'ALL' && asset.Frequency !== filters.frequency) return false;
    if (filters.revision && filters.revision !== 'ALL' && asset.Revision_Number !== filters.revision) return false;
    if (filters.docNo && filters.docNo !== 'ALL' && asset.Document_Number !== filters.docNo) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matchId = asset.Asset_ID.toLowerCase().includes(q);
      const matchArea = asset.Area_Zone.toLowerCase().includes(q);
      const matchSub = asset.Sub_Line.toLowerCase().includes(q);
      if (!matchId && !matchArea && !matchSub) return false;
    }
    return true;
  });

  // Evaluate across the active period (or all periods if computing total rows)
  // Let's use the current period '2026-07' (or selected period) for KPI summary & status distribution
  const targetPeriod = filters.period || '2026-07';

  let totalDueCount = 0;
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let notDoneCount = 0;

  // Breakdown aggregators
  const byCategory = {};
  const byLine = {};
  const bySubLine = {};
  const byArea = {};
  const byFrequency = {};
  const byRevision = {};
  const byDocument = {};

  // Initialize line breakdown to guarantee all 8 departments appear even if 0 items matched
  FS_DEPARTMENTS.forEach(dept => {
    byLine[dept] = { name: dept, totalDue: 0, compliant: 0, nonCompliant: 0, notDone: 0, compliancePct: 100 };
  });

  FS_CATEGORIES.forEach(cat => {
    byCategory[cat] = { name: cat, totalDue: 0, compliant: 0, nonCompliant: 0, notDone: 0, compliancePct: 100 };
  });

  Object.entries(FS_SOP_DOCUMENTS).forEach(([cat, sop]) => {
    byDocument[sop.docNo] = {
      docNo: sop.docNo,
      title: sop.title,
      category: cat,
      currentRevision: sop.currentRevision,
      lastRevisedDate: sop.lastRevisedDate,
      overdueForReview: sop.overdueForReview,
      totalDue: 0,
      compliant: 0,
      nonCompliant: 0,
      notDone: 0,
      compliancePct: 100
    };
  });

  filteredAssets.forEach(asset => {
    const pStat = asset.periodStatus[targetPeriod];
    if (!pStat) return;

    totalDueCount++;
    if (pStat.status === 'Compliant') compliantCount++;
    else if (pStat.status === 'Non-Compliant') nonCompliantCount++;
    else if (pStat.status === 'Not Done') notDoneCount++;

    // Helper to increment breakdown
    const inc = (obj, key, label = key) => {
      if (!obj[key]) {
        obj[key] = { name: label, totalDue: 0, compliant: 0, nonCompliant: 0, notDone: 0, compliancePct: 100 };
      }
      obj[key].totalDue++;
      if (pStat.status === 'Compliant') obj[key].compliant++;
      else if (pStat.status === 'Non-Compliant') obj[key].nonCompliant++;
      else if (pStat.status === 'Not Done') obj[key].notDone++;
    };

    inc(byCategory, asset.Equipment_Category);
    inc(byLine, asset.Line);
    inc(bySubLine, asset.Sub_Line);
    inc(byArea, asset.Area_Zone);
    inc(byFrequency, asset.Frequency);
    inc(byRevision, `Rev ${asset.Revision_Number}`, `Revision ${asset.Revision_Number}`);

    if (byDocument[asset.Document_Number]) {
      byDocument[asset.Document_Number].totalDue++;
      if (pStat.status === 'Compliant') byDocument[asset.Document_Number].compliant++;
      else if (pStat.status === 'Non-Compliant') byDocument[asset.Document_Number].nonCompliant++;
      else if (pStat.status === 'Not Done') byDocument[asset.Document_Number].notDone++;
    }
  });

  // Calculate percentages and formatting
  const calcPct = (c, total) => total > 0 ? Math.round((c / total) * 100 * 10) / 10 : 100;

  const overallCompliancePct = totalDueCount > 0 ? Math.round((compliantCount / totalDueCount) * 100 * 10) / 10 : 100;

  // Format breakdown arrays
  const formatBreakdown = (obj) => {
    return Object.values(obj).map(item => ({
      ...item,
      compliancePct: calcPct(item.compliant, item.totalDue)
    }));
  };

  const categoryList = formatBreakdown(byCategory);
  const lineList = formatBreakdown(byLine);
  const subLineList = formatBreakdown(bySubLine);
  const areaList = formatBreakdown(byArea).sort((a, b) => a.compliancePct - b.compliancePct); // Top non-compliant zones surfaced first
  const frequencyList = formatBreakdown(byFrequency);
  const revisionList = formatBreakdown(byRevision).sort((a, b) => a.name.localeCompare(b.name));
  const documentList = Object.values(byDocument).map(item => ({
    ...item,
    compliancePct: calcPct(item.compliant, item.totalDue)
  }));

  // Top 5 worst-performing zones
  const worstZones = areaList.filter(z => z.totalDue > 0).slice(0, 5);

  // Top 5 worst-performing equipment categories
  const worstCategories = [...categoryList].filter(c => c.totalDue > 0).sort((a, b) => a.compliancePct - b.compliancePct).slice(0, 5);

  // Overdue SOP documents & outdated revision assets
  const overdueSOPs = documentList.filter(d => d.overdueForReview);
  const outdatedRevisionAssetsCount = filteredAssets.filter(a => a.isRevisionOutdated).length;

  // Monthly 12-Period Trend Line (Historical accumulation)
  const monthlyTrend = FS_PERIODS.map(period => {
    let pTotal = 0;
    let pCompliant = 0;
    let pNonCompliant = 0;
    let pNotDone = 0;

    filteredAssets.forEach(asset => {
      const pStat = asset.periodStatus[period.id];
      if (pStat) {
        pTotal++;
        if (pStat.status === 'Compliant') pCompliant++;
        else if (pStat.status === 'Non-Compliant') pNonCompliant++;
        else if (pStat.status === 'Not Done') pNotDone++;
      }
    });

    const pCompliancePct = pTotal > 0 ? Math.round((pCompliant / pTotal) * 100 * 10) / 10 : 100;

    return {
      periodId: period.id,
      month: period.label,
      shortMonth: period.short,
      Compliance: pCompliancePct,
      Compliant: pCompliant,
      NonCompliant: pNonCompliant,
      NotDone: pNotDone,
      TotalDue: pTotal
    };
  });

  return {
    filteredAssets,
    totalDueCount,
    compliantCount,
    nonCompliantCount,
    notDoneCount,
    overallCompliancePct,
    categoryList,
    lineList,
    subLineList,
    areaList,
    frequencyList,
    revisionList,
    documentList,
    worstZones,
    worstCategories,
    overdueSOPs,
    outdatedRevisionAssetsCount,
    monthlyTrend
  };
}
