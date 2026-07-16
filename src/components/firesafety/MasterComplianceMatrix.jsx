// src/components/firesafety/MasterComplianceMatrix.jsx
// Spreadsheet-Style Master Compliance Matrix Table
// Virtualized rendering for 371+ assets × 12 periods, Sticky Columns & Summaries, Collapsible Group Headers, Export to Excel/CSV

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  FS_PERIODS, FS_DEPARTMENTS, FS_CATEGORIES, FS_SUB_LINES, 
  FS_SOP_DOCUMENTS 
} from './FireSafetyDataGenerator';
import { 
  Filter, Download, ChevronRight, ChevronDown, Check, X, 
  AlertTriangle, Clock, Search, FileSpreadsheet, Layers, 
  ShieldCheck, Eye, RefreshCw, FolderDown, Maximize2, Minimize2
} from 'lucide-react';

const ROW_HEIGHT = 44; // Fixed pixel height per row for accurate virtual scrolling

const MasterComplianceMatrix = ({ assets, filters, onFilterChange, onResetFilters }) => {
  // Local states for collapsible line/category groups and cell modal
  const [collapsedLines, setCollapsedLines] = useState({});
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [selectedCellDetail, setSelectedCellDetail] = useState(null);
  const [isVirtualScrollEnabled, setIsVirtualScrollEnabled] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = useRef(null);

  // Toggle line collapse
  const toggleLine = (line) => {
    setCollapsedLines(prev => ({ ...prev, [line]: !prev[line] }));
  };

  // Toggle category collapse within a line
  const toggleCategory = (line, cat) => {
    const key = `${line}|${cat}`;
    setCollapsedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setCollapsedLines({});
    setCollapsedCategories({});
  };

  const collapseAll = () => {
    const allLines = {};
    FS_DEPARTMENTS.forEach(d => { allLines[d] = true; });
    setCollapsedLines(allLines);
  };

  // Filtered assets based on global filter bar
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (filters.line && filters.line !== 'ALL' && asset.Line !== filters.line) return false;
      if (filters.category && filters.category !== 'ALL' && asset.Equipment_Category !== filters.category) return false;
      if (filters.subLine && filters.subLine !== 'ALL' && asset.Sub_Line !== filters.subLine) return false;
      if (filters.frequency && filters.frequency !== 'ALL' && asset.Frequency !== filters.frequency) return false;
      if (filters.revision && filters.revision !== 'ALL' && asset.Revision_Number !== filters.revision) return false;
      if (filters.docNo && filters.docNo !== 'ALL' && asset.Document_Number !== filters.docNo) return false;
      if (filters.status && filters.status !== 'ALL') {
        const latestStatus = asset.latestStatus?.status || 'Compliant';
        if (latestStatus !== filters.status) return false;
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchId = asset.Asset_ID.toLowerCase().includes(q);
        const matchArea = asset.Area_Zone.toLowerCase().includes(q);
        const matchSub = asset.Sub_Line.toLowerCase().includes(q);
        if (!matchId && !matchArea && !matchSub) return false;
      }
      return true;
    });
  }, [assets, filters]);

  // Build the flattened display rows list hierarchy: Line -> Category -> Assets / Subtotal
  const { displayRows, columnTotals } = useMemo(() => {
    const rows = [];
    const colStats = {};
    FS_PERIODS.forEach(p => { colStats[p.id] = { total: 0, compliant: 0, nonCompliant: 0, notDone: 0 }; });

    // Group assets by Line then Category
    const lineGroup = {};
    FS_DEPARTMENTS.forEach(d => { lineGroup[d] = {}; });

    filteredAssets.forEach(asset => {
      if (!lineGroup[asset.Line]) lineGroup[asset.Line] = {};
      if (!lineGroup[asset.Line][asset.Equipment_Category]) lineGroup[asset.Line][asset.Equipment_Category] = [];
      lineGroup[asset.Line][asset.Equipment_Category].push(asset);

      // Accumulate global column totals
      FS_PERIODS.forEach(p => {
        const pStat = asset.periodStatus[p.id];
        if (pStat) {
          colStats[p.id].total++;
          if (pStat.status === 'Compliant') colStats[p.id].compliant++;
          else if (pStat.status === 'Non-Compliant') colStats[p.id].nonCompliant++;
          else if (pStat.status === 'Not Done') colStats[p.id].notDone++;
        }
      });
    });

    // Iterate across departments
    FS_DEPARTMENTS.forEach(dept => {
      const catMap = lineGroup[dept] || {};
      let deptTotalAssets = 0;
      let deptCompliantMonths = 0;
      let deptDueMonths = 0;
      const deptColStats = {};
      FS_PERIODS.forEach(p => { deptColStats[p.id] = { total: 0, compliant: 0 }; });

      Object.entries(catMap).forEach(([cat, catAssets]) => {
        deptTotalAssets += catAssets.length;
        catAssets.forEach(a => {
          FS_PERIODS.forEach(p => {
            const st = a.periodStatus[p.id];
            if (st) {
              deptDueMonths++;
              deptColStats[p.id].total++;
              if (st.status === 'Compliant') {
                deptCompliantMonths++;
                deptColStats[p.id].compliant++;
              }
            }
          });
        });
      });

      if (deptTotalAssets === 0) return; // Skip departments with 0 matching assets

      const deptCompliancePct = deptDueMonths > 0 ? Math.round((deptCompliantMonths / deptDueMonths) * 100) : 100;
      const isLineCollapsed = !!collapsedLines[dept];

      rows.push({
        type: 'LINE_HEADER',
        id: `line-${dept}`,
        line: dept,
        totalAssets: deptTotalAssets,
        compliancePct: deptCompliancePct,
        isCollapsed: isLineCollapsed,
        colStats: deptColStats
      });

      if (!isLineCollapsed) {
        FS_CATEGORIES.forEach(cat => {
          const catAssets = catMap[cat];
          if (!catAssets || catAssets.length === 0) return;

          let catDueMonths = 0;
          let catCompliantMonths = 0;
          const catColStats = {};
          FS_PERIODS.forEach(p => { catColStats[p.id] = { total: 0, compliant: 0 }; });

          catAssets.forEach(a => {
            FS_PERIODS.forEach(p => {
              const st = a.periodStatus[p.id];
              if (st) {
                catDueMonths++;
                catColStats[p.id].total++;
                if (st.status === 'Compliant') {
                  catCompliantMonths++;
                  catColStats[p.id].compliant++;
                }
              }
            });
          });

          const catCompliancePct = catDueMonths > 0 ? Math.round((catCompliantMonths / catDueMonths) * 100) : 100;
          const catKey = `${dept}|${cat}`;
          const isCatCollapsed = !!collapsedCategories[catKey];

          rows.push({
            type: 'CAT_HEADER',
            id: `cat-${catKey}`,
            line: dept,
            category: cat,
            totalAssets: catAssets.length,
            compliancePct: catCompliancePct,
            isCollapsed: isCatCollapsed,
            colStats: catColStats
          });

          if (!isCatCollapsed) {
            catAssets.forEach(asset => {
              rows.push({
                type: 'ASSET_ROW',
                id: asset.id,
                asset
              });
            });
          }
        });
      }
    });

    return { displayRows: rows, columnTotals: colStats };
  }, [filteredAssets, collapsedLines, collapsedCategories]);

  // Handle scroll for windowed virtualization
  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Calculate visible window
  const totalRowHeight = displayRows.length * ROW_HEIGHT;
  const viewportHeight = 650; // Max table height
  const startIndex = isVirtualScrollEnabled ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5) : 0;
  const endIndex = isVirtualScrollEnabled ? Math.min(displayRows.length, Math.floor((scrollTop + viewportHeight) / ROW_HEIGHT) + 15) : displayRows.length;
  const visibleRows = displayRows.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  // Export to CSV utility
  const exportToCSV = () => {
    const headers = [
      'Asset_ID', 'Area_Zone', 'Equipment_Category', 'Line', 'Sub_Line', 
      'Frequency', 'Revision_Number', 'Document_Number', 'Overall_Compliance_Pct',
      ...FS_PERIODS.map(p => p.label)
    ];

    const csvRows = [headers.join(',')];

    filteredAssets.forEach(asset => {
      const rowData = [
        `"${asset.Asset_ID}"`,
        `"${asset.Area_Zone}"`,
        `"${asset.Equipment_Category}"`,
        `"${asset.Line}"`,
        `"${asset.Sub_Line}"`,
        `"${asset.Frequency}"`,
        `"${asset.Revision_Number}"`,
        `"${asset.Document_Number}"`,
        `${asset.runningCompliancePct}%`
      ];

      FS_PERIODS.forEach(p => {
        const st = asset.periodStatus[p.id];
        rowData.push(`"${st ? st.status : 'Not yet due'}"`);
      });

      csvRows.push(rowData.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Plant_Fire_Safety_Matrix_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel HTML (.xls) utility
  const exportToExcel = () => {
    let html = `<table border="1"><thead><tr>
      <th>Asset ID</th><th>Area / Zone</th><th>Equipment Category</th><th>Line</th>
      <th>Sub-Line</th><th>Frequency</th><th>Revision No</th><th>Document No</th>
      <th>Overall Compliance %</th>${FS_PERIODS.map(p => `<th>${p.label}</th>`).join('')}
    </tr></thead><tbody>`;

    filteredAssets.forEach(asset => {
      html += `<tr>
        <td><b>${asset.Asset_ID}</b></td><td>${asset.Area_Zone}</td><td>${asset.Equipment_Category}</td><td>${asset.Line}</td>
        <td>${asset.Sub_Line}</td><td>${asset.Frequency}</td><td>Rev ${asset.Revision_Number}</td><td>${asset.Document_Number}</td>
        <td style="font-weight:bold;">${asset.runningCompliancePct}%</td>
        ${FS_PERIODS.map(p => {
          const st = asset.periodStatus[p.id];
          const color = st?.status === 'Compliant' ? '#D1FAE5' : st?.status === 'Non-Compliant' ? '#FEE2E2' : '#F1F5F9';
          return `<td style="background-color:${color};text-align:center;">${st ? st.status : '-'}</td>`;
        }).join('')}
      </tr>`;
    });

    html += `</tbody></table>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Plant_Fire_Safety_Compliance_Matrix_${new Date().toISOString().slice(0,10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── MATRIX TOP BAR: Filters & Action Buttons ── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={22} color="#3B82F6" /> Master Compliance Matrix (Spreadsheet View)
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Viewing <strong>{filteredAssets.length} of {assets.length} total plant assets</strong> across 12 monthly audit periods. Sticky columns & summary rows enabled.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            <button
              onClick={expandAll}
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Maximize2 size={14} /> Expand All
            </button>
            <button
              onClick={collapseAll}
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Minimize2 size={14} /> Collapse All
            </button>
            <button
              onClick={() => setIsVirtualScrollEnabled(!isVirtualScrollEnabled)}
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '6px', border: `1px solid ${isVirtualScrollEnabled ? '#3B82F6' : '#CBD5E1'}`, backgroundColor: isVirtualScrollEnabled ? '#EFF6FF' : '#FFF', color: isVirtualScrollEnabled ? '#2563EB' : '#334155', cursor: 'pointer' }}
              title="Virtual scrolling ensures 60 FPS performance when viewing thousands of cells"
            >
              ⚡ Virtual DOM: {isVirtualScrollEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={exportToCSV}
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '6px', border: 'none', backgroundColor: '#10B981', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)' }}
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={exportToExcel}
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '6px', border: 'none', backgroundColor: '#065F46', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(6, 95, 70, 0.25)' }}
            >
              <FolderDown size={14} /> Export Excel (.xls)
            </button>
          </div>
        </div>

        {/* Global Multi-Select / Slicing Filter Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', backgroundColor: '#F8FAFC', padding: '0.85rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          
          {/* Search Asset ID / Area */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Search ID / Area</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Find asset ID..."
                value={filters.searchQuery || ''}
                onChange={e => onFilterChange('searchQuery', e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.8rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Line / Department */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Line / Department</label>
            <select
              value={filters.line || 'ALL'}
              onChange={e => onFilterChange('line', e.target.value)}
              style={{ padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 600 }}
            >
              <option value="ALL">All Departments ({FS_DEPARTMENTS.length})</option>
              {FS_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Equipment Category */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Equipment Category</label>
            <select
              value={filters.category || 'ALL'}
              onChange={e => {
                onFilterChange('category', e.target.value);
                onFilterChange('subLine', 'ALL'); // Reset subLine when category changes
              }}
              style={{ padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 600 }}
            >
              <option value="ALL">All Categories ({FS_CATEGORIES.length})</option>
              {FS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Sub-Line */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Sub-Line</label>
            <select
              value={filters.subLine || 'ALL'}
              onChange={e => onFilterChange('subLine', e.target.value)}
              style={{ padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 600 }}
            >
              <option value="ALL">All Sub-Lines</option>
              {(filters.category && filters.category !== 'ALL' ? FS_SUB_LINES[filters.category] : Object.values(FS_SUB_LINES).flat()).map(sl => (
                <option key={sl} value={sl}>{sl}</option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Frequency</label>
            <select
              value={filters.frequency || 'ALL'}
              onChange={e => onFilterChange('frequency', e.target.value)}
              style={{ padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 600 }}
            >
              <option value="ALL">All Frequencies</option>
              <option value="Monthly">Monthly</option>
              <option value="Weekly">Weekly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Annual">Annual</option>
            </select>
          </div>

          {/* Revision Number */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Revision Number</label>
            <select
              value={filters.revision || 'ALL'}
              onChange={e => onFilterChange('revision', e.target.value)}
              style={{ padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 600 }}
            >
              <option value="ALL">All Revisions (0/1/2)</option>
              <option value="2">Revision 2 (Latest)</option>
              <option value="1">Revision 1</option>
              <option value="0">Revision 0 (Legacy)</option>
            </select>
          </div>

          {/* Document Number */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Document Number</label>
            <select
              value={filters.docNo || 'ALL'}
              onChange={e => onFilterChange('docNo', e.target.value)}
              style={{ padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 600 }}
            >
              <option value="ALL">All SOP Documents ({Object.keys(FS_SOP_DOCUMENTS).length})</option>
              {Object.values(FS_SOP_DOCUMENTS).map(d => (
                <option key={d.docNo} value={d.docNo}>{d.docNo}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={onResetFilters}
              style={{ width: '100%', padding: '0.45rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
            >
              <RefreshCw size={13} /> Reset Filters
            </button>
          </div>

        </div>
      </div>

      {/* ── THE VIRTUALIZED SPREADSHEET MATRIX GRID ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #CBD5E1', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        
        {/* Table Header with Sticky Columns & Month Columns */}
        <div style={{ overflowX: 'auto', maxHeight: '650px', position: 'relative' }} ref={scrollContainerRef} onScroll={handleScroll}>
          <table style={{ width: 'max-content', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.8rem', textAlign: 'left', backgroundColor: '#FFF' }}>
            <thead>
              <tr style={{ backgroundColor: '#1E293B', color: '#FFF', position: 'sticky', top: 0, zIndex: 30, height: `${ROW_HEIGHT}px` }}>
                
                {/* 8 STICKY LEFT COLUMNS */}
                <th style={{ padding: '0 0.75rem', position: 'sticky', left: 0, zIndex: 35, backgroundColor: '#1E293B', borderRight: '1px solid #334155', minWidth: '130px' }}>Asset ID</th>
                <th style={{ padding: '0 0.75rem', position: 'sticky', left: 130, zIndex: 35, backgroundColor: '#1E293B', borderRight: '1px solid #334155', minWidth: '150px' }}>Area / Zone</th>
                <th style={{ padding: '0 0.75rem', position: 'sticky', left: 280, zIndex: 35, backgroundColor: '#1E293B', borderRight: '1px solid #334155', minWidth: '140px' }}>Equipment Category</th>
                <th style={{ padding: '0 0.75rem', position: 'sticky', left: 420, zIndex: 35, backgroundColor: '#1E293B', borderRight: '1px solid #334155', minWidth: '110px' }}>Line</th>
                <th style={{ padding: '0 0.75rem', position: 'sticky', left: 530, zIndex: 35, backgroundColor: '#1E293B', borderRight: '1px solid #334155', minWidth: '140px' }}>Sub-Line</th>
                <th style={{ padding: '0 0.75rem', position: 'sticky', left: 670, zIndex: 35, backgroundColor: '#1E293B', borderRight: '1px solid #334155', minWidth: '85px', textAlign: 'center' }}>Freq</th>
                <th style={{ padding: '0 0.75rem', position: 'sticky', left: 755, zIndex: 35, backgroundColor: '#1E293B', borderRight: '1px solid #334155', minWidth: '70px', textAlign: 'center' }}>Rev</th>
                <th style={{ padding: '0 0.75rem', position: 'sticky', left: 825, zIndex: 35, backgroundColor: '#1E293B', borderRight: '2px solid #64748B', minWidth: '160px' }}>Document No</th>
                
                {/* STICKY RIGHT COLUMN: Running Compliance % per Row */}
                <th style={{ padding: '0 0.75rem', position: 'sticky', left: 985, zIndex: 35, backgroundColor: '#0F172A', color: '#38BDF8', borderRight: '2px solid #64748B', minWidth: '100px', textAlign: 'center' }}>
                  Overall %
                </th>

                {/* 12 SCROLLABLE MONTH COLUMNS */}
                {FS_PERIODS.map(p => (
                  <th key={p.id} style={{ padding: '0 0.6rem', textAlign: 'center', minWidth: '90px', borderRight: '1px solid #334155', backgroundColor: p.isCurrent ? '#2563EB' : '#1E293B' }}>
                    <div>{p.label}</div>
                    {p.isCurrent && <div style={{ fontSize: '0.65rem', color: '#93C5FD', fontWeight: 400 }}>Current</div>}
                  </th>
                ))}

              </tr>
            </thead>

            {/* Virtualized or Standard Table Body */}
            <tbody style={{ height: isVirtualScrollEnabled ? `${totalRowHeight}px` : 'auto', position: 'relative' }}>
              
              {/* Top Spacer when virtualized */}
              {isVirtualScrollEnabled && offsetY > 0 && (
                <tr style={{ height: `${offsetY}px` }}><td colSpan={9 + FS_PERIODS.length} /></tr>
              )}

              {(isVirtualScrollEnabled ? visibleRows : displayRows).map((row) => {
                
                // 1. LINE HEADER ROW (Department group header)
                if (row.type === 'LINE_HEADER') {
                  const ragColor = row.compliancePct < 85 ? '#EF4444' : row.compliancePct < 95 ? '#F59E0B' : '#10B981';
                  return (
                    <tr key={row.id} style={{ backgroundColor: '#F1F5F9', fontWeight: 800, height: `${ROW_HEIGHT}px`, borderBottom: '2px solid #CBD5E1', cursor: 'pointer' }}
                        onClick={() => toggleLine(row.line)}>
                      <td colSpan={8} style={{ padding: '0 0.75rem', position: 'sticky', left: 0, zIndex: 20, backgroundColor: '#E2E8F0', color: '#1E293B', borderRight: '2px solid #64748B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {row.isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                          <span style={{ fontSize: '0.9rem', color: '#0F172A' }}>🏢 DEPARTMENT: {row.line}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginLeft: '0.5rem' }}>({row.totalAssets} assets)</span>
                        </div>
                      </td>
                      <td style={{ padding: '0 0.5rem', position: 'sticky', left: 985, zIndex: 20, backgroundColor: '#CBD5E1', color: ragColor, fontWeight: 900, textAlign: 'center', borderRight: '2px solid #64748B' }}>
                        {row.compliancePct}%
                      </td>
                      {FS_PERIODS.map(p => {
                        const st = row.colStats[p.id];
                        const colPct = st && st.total > 0 ? Math.round((st.compliant / st.total) * 100) : 100;
                        const cColor = colPct < 85 ? '#EF4444' : colPct < 95 ? '#D97706' : '#059669';
                        return (
                          <td key={p.id} style={{ textAlign: 'center', fontWeight: 700, color: cColor, borderRight: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontSize: '0.75rem' }}>
                            {colPct}%
                          </td>
                        );
                      })}
                    </tr>
                  );
                }

                // 2. CATEGORY HEADER ROW (Subgroup header inside line)
                if (row.type === 'CAT_HEADER') {
                  const ragColor = row.compliancePct < 85 ? '#EF4444' : row.compliancePct < 95 ? '#F59E0B' : '#10B981';
                  return (
                    <tr key={row.id} style={{ backgroundColor: '#F8FAFC', fontWeight: 700, height: `${ROW_HEIGHT}px`, borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                        onClick={() => toggleCategory(row.line, row.category)}>
                      <td colSpan={8} style={{ padding: '0 0.75rem 0 2rem', position: 'sticky', left: 0, zIndex: 18, backgroundColor: '#F1F5F9', color: '#334155', borderRight: '2px solid #64748B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {row.isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          <span>🔧 {row.category}</span>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>({row.totalAssets} items)</span>
                        </div>
                      </td>
                      <td style={{ padding: '0 0.5rem', position: 'sticky', left: 985, zIndex: 18, backgroundColor: '#E2E8F0', color: ragColor, fontWeight: 800, textAlign: 'center', borderRight: '2px solid #64748B' }}>
                        {row.compliancePct}%
                      </td>
                      {FS_PERIODS.map(p => {
                        const st = row.colStats[p.id];
                        const colPct = st && st.total > 0 ? Math.round((st.compliant / st.total) * 100) : 100;
                        return (
                          <td key={p.id} style={{ textAlign: 'center', color: '#475569', borderRight: '1px solid #E2E8F0', fontSize: '0.75rem' }}>
                            {colPct}%
                          </td>
                        );
                      })}
                    </tr>
                  );
                }

                // 3. ASSET ROW (Individual Asset 371 items)
                if (row.type === 'ASSET_ROW') {
                  const asset = row.asset;
                  const runningRag = asset.runningCompliancePct < 85 ? '#EF4444' : asset.runningCompliancePct < 95 ? '#F59E0B' : '#10B981';

                  return (
                    <tr key={row.id} style={{ height: `${ROW_HEIGHT}px`, borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFF', transition: 'background-color 0.15s ease' }}>
                      
                      {/* 8 Sticky Left Columns */}
                      <td style={{ padding: '0 0.75rem', position: 'sticky', left: 0, zIndex: 15, backgroundColor: '#FFF', borderRight: '1px solid #E2E8F0', fontWeight: 800, color: '#1E293B', whiteSpace: 'nowrap' }}>
                        {asset.Asset_ID}
                      </td>
                      <td style={{ padding: '0 0.75rem', position: 'sticky', left: 130, zIndex: 15, backgroundColor: '#FFF', borderRight: '1px solid #E2E8F0', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }} title={asset.Area_Zone}>
                        {asset.Area_Zone}
                      </td>
                      <td style={{ padding: '0 0.75rem', position: 'sticky', left: 280, zIndex: 15, backgroundColor: '#FFF', borderRight: '1px solid #E2E8F0', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {asset.Equipment_Category}
                      </td>
                      <td style={{ padding: '0 0.75rem', position: 'sticky', left: 420, zIndex: 15, backgroundColor: '#FFF', borderRight: '1px solid #E2E8F0', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {asset.Line}
                      </td>
                      <td style={{ padding: '0 0.75rem', position: 'sticky', left: 530, zIndex: 15, backgroundColor: '#FFF', borderRight: '1px solid #E2E8F0', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={asset.Sub_Line}>
                        {asset.Sub_Line}
                      </td>
                      <td style={{ padding: '0 0.5rem', position: 'sticky', left: 670, zIndex: 15, backgroundColor: '#FFF', borderRight: '1px solid #E2E8F0', textAlign: 'center', fontSize: '0.75rem', color: '#64748B' }}>
                        {asset.Frequency}
                      </td>
                      <td style={{ padding: '0 0.5rem', position: 'sticky', left: 755, zIndex: 15, backgroundColor: asset.isRevisionOutdated ? '#FEF2F2' : '#FFF', borderRight: '1px solid #E2E8F0', textAlign: 'center', fontWeight: 700, color: asset.isRevisionOutdated ? '#EF4444' : '#10B981' }} title={asset.isRevisionOutdated ? `Outdated Revision! Target SOP is Rev ${asset.currentRevisionTarget}` : 'Current SOP revision'}>
                        {asset.Revision_Number} {asset.isRevisionOutdated ? '⚠️' : ''}
                      </td>
                      <td style={{ padding: '0 0.75rem', position: 'sticky', left: 825, zIndex: 15, backgroundColor: asset.isSopOverdue ? '#FFF1F2' : '#FFF', borderRight: '2px solid #64748B', fontSize: '0.75rem', fontWeight: 600, color: asset.isSopOverdue ? '#BE123C' : '#334155', whiteSpace: 'nowrap' }} title={asset.isSopOverdue ? `SOP Overdue for 2-Year Review! Last Revised: ${asset.Last_Revised_Date}` : `SOP up to date. Last Revised: ${asset.Last_Revised_Date}`}>
                        {asset.Document_Number} {asset.isSopOverdue ? '⚠️' : ''}
                      </td>

                      {/* Sticky Summary Column: Running Compliance % per asset */}
                      <td style={{ padding: '0 0.5rem', position: 'sticky', left: 985, zIndex: 15, backgroundColor: '#F8FAFC', color: runningRag, fontWeight: 900, textAlign: 'center', borderRight: '2px solid #64748B' }}>
                        {asset.runningCompliancePct}%
                      </td>

                      {/* 12 Monthly Period Cells (Compact Color-Coded Chips) */}
                      {FS_PERIODS.map(p => {
                        const st = asset.periodStatus[p.id];
                        if (!st) {
                          // White / Blank = Not yet due
                          return (
                            <td key={p.id} style={{ textAlign: 'center', borderRight: '1px solid #F1F5F9', backgroundColor: '#FFF' }}>
                              <span style={{ fontSize: '0.7rem', color: '#CBD5E1' }}>-</span>
                            </td>
                          );
                        }

                        // Determine Chip color & style
                        let chipBg = '#DCFCE7'; // Green = Compliant
                        let chipText = '#065F46';
                        let chipIcon = <Check size={13} strokeWidth={3} />;
                        let statusText = 'OK';

                        if (st.status === 'Non-Compliant') {
                          chipBg = '#FEE2E2'; // Red = Non-Compliant
                          chipText = '#991B1B';
                          chipIcon = <X size={13} strokeWidth={3} />;
                          statusText = 'Not OK';
                        } else if (st.status === 'Not Done') {
                          chipBg = '#F1F5F9'; // Grey = Not Done / Overdue
                          chipText = '#475569';
                          chipIcon = <Clock size={13} />;
                          statusText = 'Overdue';
                        }

                        return (
                          <td 
                            key={p.id} 
                            style={{ textAlign: 'center', borderRight: '1px solid #F1F5F9', padding: '0.3rem', cursor: 'pointer', backgroundColor: p.isCurrent ? '#F8FAFC' : '#FFF' }}
                            onClick={() => setSelectedCellDetail({ asset, period: p, status: st })}
                            title={`Click/Hover cell detail: ${asset.Asset_ID} (${p.label}) -> ${st.status}`}
                          >
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.2rem',
                              backgroundColor: chipBg,
                              color: chipText,
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              width: '75px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                              {chipIcon} <span>{statusText}</span>
                            </div>
                          </td>
                        );
                      })}

                    </tr>
                  );
                }

                return null;
              })}

              {/* Bottom Spacer when virtualized */}
              {isVirtualScrollEnabled && totalRowHeight - (offsetY + visibleRows.length * ROW_HEIGHT) > 0 && (
                <tr style={{ height: `${totalRowHeight - (offsetY + visibleRows.length * ROW_HEIGHT)}px` }}><td colSpan={9 + FS_PERIODS.length} /></tr>
              )}

            </tbody>

            {/* STICKY BOTTOM SUMMARY ROW: Monthly Plant Compliance % Across All Filtered Assets */}
            <tfoot>
              <tr style={{ backgroundColor: '#0F172A', color: '#FFF', fontWeight: 900, position: 'sticky', bottom: 0, zIndex: 30, height: `${ROW_HEIGHT + 6}px` }}>
                <td colSpan={8} style={{ padding: '0 0.75rem', position: 'sticky', left: 0, zIndex: 35, backgroundColor: '#0F172A', borderRight: '2px solid #64748B', letterSpacing: '0.04em' }}>
                  📊 MONTHLY PLANT SAFETY COMPLIANCE % (ACROSS {filteredAssets.length} ASSETS)
                </td>
                <td style={{ padding: '0 0.5rem', position: 'sticky', left: 985, zIndex: 35, backgroundColor: '#1E293B', color: '#38BDF8', textAlign: 'center', borderRight: '2px solid #64748B', fontSize: '0.9rem' }}>
                  {filteredAssets.length > 0 ? Math.round(filteredAssets.reduce((acc, a) => acc + a.runningCompliancePct, 0) / filteredAssets.length) : 100}%
                </td>
                {FS_PERIODS.map(p => {
                  const col = columnTotals[p.id];
                  const colPct = col && col.total > 0 ? Math.round((col.compliant / col.total) * 100) : 100;
                  const cColor = colPct < 85 ? '#EF4444' : colPct < 95 ? '#FBBF24' : '#34D399';
                  return (
                    <td key={p.id} style={{ textAlign: 'center', color: cColor, fontSize: '0.85rem', borderRight: '1px solid #334155', backgroundColor: p.isCurrent ? '#1E3A8A' : '#0F172A' }}>
                      {colPct}%
                    </td>
                  );
                })}
              </tr>
            </tfoot>

          </table>
        </div>
      </div>

      {/* ── CELL DRILL-DOWN MODAL: Component-level Status Detail ── */}
      {selectedCellDetail && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}
        onClick={() => setSelectedCellDetail(null)}>
          <div style={{
            backgroundColor: '#FFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              backgroundColor: selectedCellDetail.status.status === 'Compliant' ? '#065F46' : selectedCellDetail.status.status === 'Non-Compliant' ? '#991B1B' : '#334155',
              color: '#FFF',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
                  Audit Cell Detail ({selectedCellDetail.period.label})
                </div>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: 900 }}>
                  Asset: {selectedCellDetail.asset.Asset_ID}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCellDetail(null)}
                style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: '0.4rem' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
              
              {/* Status Badge & Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>STATUS RESULT</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: selectedCellDetail.status.status === 'Compliant' ? '#10B981' : selectedCellDetail.status.status === 'Non-Compliant' ? '#EF4444' : '#64748B', marginTop: '0.2rem' }}>
                    ● {selectedCellDetail.status.status} ({selectedCellDetail.status.result})
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>INSPECTED BY & TIME</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginTop: '0.2rem' }}>
                    {selectedCellDetail.status.inspector}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{selectedCellDetail.status.inspectedAt}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>AREA & DEPARTMENT</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginTop: '0.2rem' }}>
                    {selectedCellDetail.asset.Line} · {selectedCellDetail.asset.Area_Zone}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>SOP DOCUMENT & REVISION</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginTop: '0.2rem' }}>
                    {selectedCellDetail.asset.Document_Number} (Rev {selectedCellDetail.asset.Revision_Number})
                  </div>
                </div>
              </div>

              {/* Component-Level Status Breakdown Table */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={16} color="#3B82F6" /> Component-Level Checklist Audit Breakdown
                </h4>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '0.65rem 1rem' }}>Component Name</th>
                        <th style={{ padding: '0.65rem 1rem' }}>Standard / Parameter</th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCellDetail.asset.components.map((comp, idx) => {
                        const isFailedComp = selectedCellDetail.status.failedComponent === comp.name;
                        const compResult = selectedCellDetail.status.status === 'Compliant' ? 'OK' : (isFailedComp ? 'Not OK' : 'OK');
                        const compColor = compResult === 'OK' ? '#10B981' : '#EF4444';

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isFailedComp ? '#FEF2F2' : '#FFF' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1E293B' }}>{comp.name}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontSize: '0.8rem' }}>{comp.standard}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800, color: compColor }}>
                              {compResult}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks / Corrective Actions */}
              <div style={{ backgroundColor: selectedCellDetail.status.status === 'Non-Compliant' ? '#FFF1F2' : '#F8FAFC', padding: '1rem', borderRadius: '10px', border: `1px solid ${selectedCellDetail.status.status === 'Non-Compliant' ? '#FECDD3' : '#E2E8F0'}` }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: selectedCellDetail.status.status === 'Non-Compliant' ? '#991B1B' : '#64748B' }}>
                  AUDIT REMARKS & CORRECTIVE ACTION
                </span>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: selectedCellDetail.status.status === 'Non-Compliant' ? '#881337' : '#334155', fontWeight: 600 }}>
                  {selectedCellDetail.status.remarks}
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedCellDetail(null)}
                style={{ padding: '0.6rem 1.25rem', backgroundColor: '#1E293B', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Close Detail
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MasterComplianceMatrix;
