// src/components/firesafety/FireSafetyLandingView.jsx
// Plant Fire Safety Status - Landing View
// Ultra-premium aesthetic, Hero RAG Badge, 8-Department Heat-Strip, Worst-Performing Rankings, Overdue SOP Callout, 12-Month Trend Line

import React from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Clock, 
  TrendingUp, Layers, FileWarning, ArrowRight, Activity, Flame,
  AlertCircle, HelpCircle, Filter, ChevronRight, Award, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ReferenceLine, BarChart, Bar, Cell
} from 'recharts';

const FireSafetyLandingView = ({ analytics, onSelectFilter, onNavigateToView, activeFilters }) => {
  const {
    overallCompliancePct,
    totalDueCount,
    compliantCount,
    nonCompliantCount,
    notDoneCount,
    lineList,
    worstZones,
    worstCategories,
    overdueSOPs,
    outdatedRevisionAssetsCount,
    monthlyTrend
  } = analytics;

  // Determine RAG Status for overall compliance
  const getRagColor = (pct) => {
    if (pct >= 95) return { bg: '#ECFDF5', border: '#10B981', text: '#065F46', badge: 'GREEN (OPTIMAL)', hex: '#10B981' };
    if (pct >= 85) return { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', badge: 'AMBER (WARNING)', hex: '#F59E0B' };
    return { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', badge: 'RED (CRITICAL RISK)', hex: '#EF4444' };
  };

  const rag = getRagColor(overallCompliancePct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* ── Overdue SOP & Outdated Revisions Alert Banner ── */}
      {(overdueSOPs.length > 0 || outdatedRevisionAssetsCount > 0) && (
        <div style={{
          backgroundColor: '#FFF1F2',
          border: '1px solid #FECDD3',
          borderLeft: '6px solid #F43F5E',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 4px 12px rgba(244, 63, 94, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileWarning size={24} color="#F43F5E" style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#881337' }}>
                  SOP Document Review Overdue & Outdated Standards Flagged
                </h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#9F1239' }}>
                  SOP documents must undergo periodic review every 2 years. Also detected <strong>{outdatedRevisionAssetsCount} assets</strong> being audited against outdated revisions (Rev 0 / Rev 1).
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToView('breakdowns', { viewSlice: 'document' })}
              style={{
                backgroundColor: '#F43F5E',
                color: '#fff',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 8px rgba(244, 63, 94, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              Review Documents & Revisions <ArrowRight size={16} />
            </button>
          </div>

          {/* Quick chip list of overdue SOPs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.25rem' }}>
            {overdueSOPs.map(sop => (
              <div 
                key={sop.docNo}
                onClick={() => onSelectFilter('docNo', sop.docNo)}
                style={{
                  backgroundColor: '#FFF',
                  border: '1px solid #FDA4AF',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#BE123C',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                title={`Last Revised: ${sop.lastRevisedDate} (Target interval: 2 years)`}
              >
                <span>⚠️ {sop.docNo}</span>
                <span style={{ fontWeight: 500, color: '#64748B', fontSize: '0.75rem' }}>({sop.category} - Rev {sop.currentRevision})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HERO KPI GRID: RAG Hero Number + 4 Breakdown Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        
        {/* Hero Tile: Overall Compliance % */}
        <div style={{
          backgroundColor: rag.bg,
          border: `2px solid ${rag.border}`,
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '180px',
          boxShadow: `0 8px 24px ${rag.hex}18`,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onClick={() => onNavigateToView('matrix')}
        title="Click to view Master Compliance Matrix"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: rag.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Plant Safety Compliance
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{
                  backgroundColor: rag.hex,
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {rag.badge}
                </span>
              </div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '0.6rem', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              {overallCompliancePct >= 95 ? <ShieldCheck size={28} color={rag.hex} /> : <ShieldAlert size={28} color={rag.hex} />}
            </div>
          </div>

          <div style={{ margin: '1rem 0 0.5rem 0', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '3.5rem', fontWeight: 900, color: rag.text, lineHeight: 1 }}>
              {overallCompliancePct}%
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>
              Target: 95.0%
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${rag.border}40`, paddingTop: '0.75rem', fontSize: '0.78rem', fontWeight: 600, color: rag.text }}>
            <span>Audited across {totalDueCount} active checkpoints</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>View Matrix <ChevronRight size={14} /></span>
          </div>
        </div>

        {/* KPI Tile 1: Total Assets Due */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', marginBottom: 0, cursor: 'pointer', borderLeft: '5px solid #3B82F6' }}
             onClick={() => onNavigateToView('matrix', { status: 'ALL' })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Total Due Checkpoints</span>
            <div style={{ backgroundColor: '#EFF6FF', padding: '0.5rem', borderRadius: '10px' }}><Layers size={20} color="#3B82F6" /></div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1E293B' }}>{totalDueCount}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>Across 371 plant assets (Current Period)</div>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
            Click to view all assets in matrix <ChevronRight size={14} />
          </div>
        </div>

        {/* KPI Tile 2: Compliant (Result = OK) */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', marginBottom: 0, cursor: 'pointer', borderLeft: '5px solid #10B981' }}
             onClick={() => onNavigateToView('matrix', { status: 'Compliant' })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Compliant Checkpoints</span>
            <div style={{ backgroundColor: '#ECFDF5', padding: '0.5rem', borderRadius: '10px' }}><CheckCircle2 size={20} color="#10B981" /></div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#065F46' }}>{compliantCount}</div>
            <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700, marginTop: '0.25rem' }}>
              ● {totalDueCount > 0 ? Math.round((compliantCount/totalDueCount)*100) : 100}% Result = "OK"
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
            Filter compliant assets <ChevronRight size={14} />
          </div>
        </div>

        {/* KPI Tile 3 & 4 Combined/Split: Non-Compliant & Not Done */}
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '1rem' }}>
          {/* Non-Compliant */}
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECDD3',
            borderLeft: '5px solid #EF4444',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onClick={() => onNavigateToView('matrix', { status: 'Non-Compliant' })}
          title="Click to view Non-Compliant (Result = Not OK) assets">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ backgroundColor: '#FFF', padding: '0.4rem', borderRadius: '8px' }}><AlertTriangle size={20} color="#EF4444" /></div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>Non-Compliant (Not OK)</div>
                <div style={{ fontSize: '0.78rem', color: '#EF4444', fontWeight: 600 }}>Action items requiring immediate repair</div>
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#EF4444' }}>{nonCompliantCount}</div>
          </div>

          {/* Not Done / Overdue */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderLeft: '5px solid #64748B',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onClick={() => onNavigateToView('matrix', { status: 'Not Done' })}
          title="Click to view Overdue / Not Done assets">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ backgroundColor: '#FFF', padding: '0.4rem', borderRadius: '8px' }}><Clock size={20} color="#64748B" /></div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Not Done / Overdue</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>No execution record past due date</div>
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#475569' }}>{notDoneCount}</div>
          </div>
        </div>

      </div>

      {/* ── DEPARTMENT HEAT-STRIP (8 TILES) ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={20} color="#EA580C" /> Department Compliance Heat-Strip (8 Lines)
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Instant plant manager view: Click any department tile to slice the entire dashboard or see what is dragging the score down.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#065F46' }}><span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#10B981' }}></span> Green ≥ 95%</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#92400E' }}><span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#F59E0B' }}></span> Amber 85–94.9%</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#991B1B' }}><span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#EF4444' }}></span> Red &lt; 85%</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem' }}>
          {lineList.map((line) => {
            const pct = line.compliancePct;
            const tileRag = getRagColor(pct);
            const isSelected = activeFilters.line === line.name;

            return (
              <div
                key={line.name}
                onClick={() => onSelectFilter('line', isSelected ? 'ALL' : line.name)}
                style={{
                  backgroundColor: tileRag.bg,
                  border: `2px solid ${isSelected ? '#1E293B' : tileRag.border}`,
                  borderRadius: '12px',
                  padding: '1rem 0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 0 3px rgba(30, 41, 59, 0.2)' : 'none',
                  position: 'relative'
                }}
                title={`Click to filter by Line = ${line.name}`}
              >
                {isSelected && (
                  <span style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#1E293B', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    ACTIVE
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: tileRag.text, letterSpacing: '0.04em' }}>
                  {line.name}
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: 900, color: tileRag.text, margin: '0.3rem 0' }}>
                  {pct}%
                </span>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                  <span style={{ color: '#10B981' }}>{line.compliant} OK</span> · <span style={{ color: '#EF4444' }}>{line.nonCompliant + line.notDone} Fail/Due</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TOP 5 WORST ZONES & CATEGORIES RANKINGS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Top 5 Worst-Performing Zones */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} color="#EF4444" /> Top 5 Worst-Performing Areas / Zones
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                Operationally prioritized non-compliant zones requiring immediate physical inspection.
              </p>
            </div>
            <button
              onClick={() => onNavigateToView('breakdowns', { viewSlice: 'area' })}
              style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              View All Zones →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {worstZones.map((zone, idx) => {
              const pct = zone.compliancePct;
              const barColor = pct < 85 ? '#EF4444' : pct < 95 ? '#F59E0B' : '#10B981';

              return (
                <div 
                  key={zone.name}
                  onClick={() => onSelectFilter('area', zone.name)}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '0.8rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Click to filter by Area = ${zone.name}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#64748B', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {zone.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: barColor }}>
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, transition: 'width 0.4s ease' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.4rem', fontWeight: 600 }}>
                    <span>Total Checkpoints: {zone.totalDue}</span>
                    <span><strong style={{ color: '#EF4444' }}>{zone.nonCompliant + zone.notDone}</strong> Failures/Overdue</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Worst-Performing Equipment Categories */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={18} color="#EA580C" /> Top 5 Worst-Performing Equipment Categories
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                Equipment types flagged with the lowest compliance rates across the plant.
              </p>
            </div>
            <button
              onClick={() => onNavigateToView('breakdowns', { viewSlice: 'category' })}
              style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              View All Categories →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {worstCategories.map((cat, idx) => {
              const pct = cat.compliancePct;
              const barColor = pct < 85 ? '#EF4444' : pct < 95 ? '#F59E0B' : '#10B981';

              return (
                <div 
                  key={cat.name}
                  onClick={() => onSelectFilter('category', cat.name)}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '0.8rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Click to filter by Equipment Category = ${cat.name}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#64748B', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>
                        {cat.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: barColor }}>
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, transition: 'width 0.4s ease' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.4rem', fontWeight: 600 }}>
                    <span>Total Checkpoints: {cat.totalDue}</span>
                    <span><strong style={{ color: '#EF4444' }}>{cat.nonCompliant + cat.notDone}</strong> Failures/Overdue</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── 12-MONTH HISTORICAL TREND LINE CHART ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="#3B82F6" /> Plant Fire Safety Compliance Trend (Last 12 Periods)
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Monthly progression of overall safety compliance vs. 95.0% Plant Audit Target.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3B82F6' }}>
              <span style={{ width: 12, height: 3, backgroundColor: '#3B82F6', borderRadius: 2 }}></span> Compliance %
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10B981' }}>
              <span style={{ width: 12, height: 2, borderBottom: '2px dashed #10B981' }}></span> Target (95%)
            </span>
          </div>
        </div>

        <div style={{ height: '320px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="shortMonth" fontSize={11} axisLine={false} tickLine={false} stroke="#64748B" />
              <YAxis fontSize={11} axisLine={false} tickLine={false} stroke="#64748B" unit="%" domain={[60, 100]} />
              <Tooltip 
                formatter={(val, name) => [
                  name === 'Compliance' ? `${val}%` : val, 
                  name === 'Compliance' ? 'Compliance Rate' : name
                ]}
                labelFormatter={(label) => `Period: ${label}`}
                contentStyle={{ backgroundColor: '#1E293B', color: '#FFF', borderRadius: '8px', border: 'none', fontSize: '0.85rem' }}
              />
              <ReferenceLine y={95} stroke="#10B981" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Target 95%', fill: '#10B981', fontSize: 11, position: 'insideTopRight' }} />
              <Area type="monotone" dataKey="Compliance" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorCompliance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default FireSafetyLandingView;
