// src/components/firesafety/FireSafetyBreakdownsView.jsx
// Required Analytics Breakdowns & Cross-Filtering
// Slices: Category, Line/Department, Sub-Line, Area/Zone, Frequency, Revision Number, Document Number (with SOP Overdue Flags), Asset Drill-Down

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  Cell, PieChart, Pie
} from 'recharts';
import { 
  Layers, ShieldAlert, ShieldCheck, AlertCircle, Clock, FileText, 
  ChevronRight, Filter, Search, Eye, AlertTriangle, FileWarning, Check
} from 'lucide-react';

const FireSafetyBreakdownsView = ({ analytics, activeFilters, onSelectFilter, onNavigateToView, initialSlice = 'category' }) => {
  const [currentSlice, setCurrentSlice] = useState(initialSlice);
  const [selectedAssetForModal, setSelectedAssetForModal] = useState(null);

  const {
    filteredAssets,
    categoryList,
    lineList,
    subLineList,
    areaList,
    frequencyList,
    revisionList,
    documentList
  } = analytics;

  // Slices navigation tabs
  const slices = [
    { id: 'category', label: 'By Equipment Category', icon: ShieldCheck },
    { id: 'line', label: 'By Line / Department', icon: Layers },
    { id: 'subline', label: 'By Sub-Line', icon: Layers },
    { id: 'area', label: 'By Area / Zone (Top Non-Compliant)', icon: AlertCircle },
    { id: 'frequency', label: 'By Frequency', icon: Clock },
    { id: 'revision', label: 'By Revision Number', icon: FileText },
    { id: 'document', label: 'By Document Number & SOP Review', icon: FileWarning },
    { id: 'assets', label: `Asset_ID Drill-Down (${filteredAssets.length})`, icon: Eye }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Slice Selection Navigation Pills */}
      <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem', borderBottom: '2px solid #E2E8F0' }}>
        {slices.map((slice) => {
          const Icon = slice.icon;
          const isActive = currentSlice === slice.id;
          return (
            <button
              key={slice.id}
              onClick={() => setCurrentSlice(slice.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '999px',
                border: isActive ? '2px solid #3B82F6' : '1px solid #CBD5E1',
                backgroundColor: isActive ? '#3B82F6' : '#FFF',
                color: isActive ? '#FFF' : '#334155',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.25)' : 'none'
              }}
            >
              <Icon size={15} /> {slice.label}
            </button>
          );
        })}
      </div>

      {/* ── 1. BY EQUIPMENT CATEGORY ── */}
      {currentSlice === 'category' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Compliance Rate by Equipment Category (%)</h3>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryList} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Compliance %']} />
                  <Bar dataKey="compliancePct" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Compliance %">
                    {categoryList.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.compliancePct < 85 ? '#EF4444' : entry.compliancePct < 95 ? '#F59E0B' : '#10B981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Category Status Counts & Click to Cross-Filter</h3>
            <div className="table-container-responsive" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Category Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Due</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981' }}>OK</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444' }}>Fail / Due</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Compliance %</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: activeFilters.category === item.name ? '#EFF6FF' : '#FFF' }}
                        onClick={() => onSelectFilter('category', activeFilters.category === item.name ? 'ALL' : item.name)}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1E293B' }}>{item.name}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>{item.totalDue}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{item.compliant}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>{item.nonCompliant + item.notDone}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: item.compliancePct < 85 ? '#EF4444' : item.compliancePct < 95 ? '#F59E0B' : '#10B981' }}>
                        {item.compliancePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. BY LINE / DEPARTMENT ── */}
      {currentSlice === 'line' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Compliance Rate by Line / Department (%)</h3>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineList} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} interval={0} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Compliance %']} />
                  <Bar dataKey="compliancePct" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Compliance %">
                    {lineList.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.compliancePct < 85 ? '#EF4444' : entry.compliancePct < 95 ? '#F59E0B' : '#8B5CF6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Department Breakdown (All 8 Departments)</h3>
            <div className="table-container-responsive" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Department Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Due</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981' }}>Compliant</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444' }}>Non-Compliant</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Compliance %</th>
                  </tr>
                </thead>
                <tbody>
                  {lineList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: activeFilters.line === item.name ? '#EFF6FF' : '#FFF' }}
                        onClick={() => onSelectFilter('line', activeFilters.line === item.name ? 'ALL' : item.name)}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1E293B' }}>{item.name}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>{item.totalDue}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{item.compliant}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>{item.nonCompliant + item.notDone}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: item.compliancePct < 85 ? '#EF4444' : item.compliancePct < 95 ? '#F59E0B' : '#10B981' }}>
                        {item.compliancePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. BY SUB-LINE ── */}
      {currentSlice === 'subline' && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Sub-Line Compliance Breakdown (ABC 6KG, CO2 4.5KG, etc.)</h3>
          <div className="table-container-responsive" style={{ maxHeight: '480px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Sub-Line / Equipment Type</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Checkpoints Due</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981' }}>Compliant (OK)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444' }}>Failures / Overdue</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Compliance Rate</th>
                </tr>
              </thead>
              <tbody>
                {subLineList.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: activeFilters.subLine === item.name ? '#EFF6FF' : '#FFF' }}
                      onClick={() => onSelectFilter('subLine', activeFilters.subLine === item.name ? 'ALL' : item.name)}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1E293B' }}>{item.name}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>{item.totalDue}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{item.compliant}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>{item.nonCompliant + item.notDone}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: item.compliancePct < 85 ? '#EF4444' : item.compliancePct < 95 ? '#F59E0B' : '#10B981' }}>
                      {item.compliancePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. BY AREA / ZONE (Surfacing Top Non-Compliant First) ── */}
      {currentSlice === 'area' && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>
                Area / Zone Compliance (Top Non-Compliant Surfaced First)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Operationally prioritized cut: Areas with the lowest compliance percentage are listed at the very top for urgent safety team dispatch.
              </p>
            </div>
          </div>

          <div className="table-container-responsive" style={{ maxHeight: '520px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Area / Zone Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Due</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981' }}>Compliant (OK)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444' }}>Non-Compliant (Not OK)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748B' }}>Overdue</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Compliance Rate</th>
                </tr>
              </thead>
              <tbody>
                {areaList.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: activeFilters.area === item.name ? '#EFF6FF' : (idx < 3 ? '#FEF2F2' : '#FFF') }}
                      onClick={() => onSelectFilter('area', activeFilters.area === item.name ? 'ALL' : item.name)}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: idx < 3 ? '#991B1B' : '#64748B' }}>#{idx + 1}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1E293B' }}>
                      {item.name} {idx < 3 && <span style={{ fontSize: '0.7rem', backgroundColor: '#EF4444', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.4rem' }}>HIGH PRIORITY</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>{item.totalDue}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{item.compliant}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444', fontWeight: 800 }}>{item.nonCompliant}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>{item.notDone}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 900, color: item.compliancePct < 85 ? '#EF4444' : item.compliancePct < 95 ? '#F59E0B' : '#10B981' }}>
                      {item.compliancePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. BY FREQUENCY ── */}
      {currentSlice === 'frequency' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Compliance by Inspection Frequency</h3>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frequencyList} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Compliance %']} />
                  <Bar dataKey="compliancePct" fill="#10B981" radius={[6, 6, 0, 0]} barSize={40} name="Compliance %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Frequency Audit Summary Table</h3>
            <div className="table-container-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Frequency</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Due</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981' }}>Compliant</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444' }}>Non-Compliant</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Compliance %</th>
                  </tr>
                </thead>
                <tbody>
                  {frequencyList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: activeFilters.frequency === item.name ? '#EFF6FF' : '#FFF' }}
                        onClick={() => onSelectFilter('frequency', activeFilters.frequency === item.name ? 'ALL' : item.name)}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1E293B' }}>{item.name}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>{item.totalDue}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{item.compliant}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>{item.nonCompliant + item.notDone}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: item.compliancePct < 85 ? '#EF4444' : item.compliancePct < 95 ? '#F59E0B' : '#10B981' }}>
                        {item.compliancePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. BY REVISION NUMBER ── */}
      {currentSlice === 'revision' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>SOP Revision Generation Tracking</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748B' }}>
              Flags assets checked against outdated standards (Revision 0 / Revision 1) vs. current Revision 2.
            </p>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revisionList} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Compliance %']} />
                  <Bar dataKey="compliancePct" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={45} name="Compliance %">
                    {revisionList.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name.includes('0') || entry.name.includes('1') ? '#EA580C' : '#10B981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Revision Audit Summary Table</h3>
            <div className="table-container-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Revision Number</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Assets</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981' }}>Compliant</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444' }}>Failures</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Compliance %</th>
                  </tr>
                </thead>
                <tbody>
                  {revisionList.map((item, idx) => {
                    const revNo = item.name.replace('Rev ', '');
                    const isOutdated = revNo === '0' || revNo === '1';

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: activeFilters.revision === revNo ? '#EFF6FF' : (isOutdated ? '#FFF7ED' : '#FFF') }}
                          onClick={() => onSelectFilter('revision', activeFilters.revision === revNo ? 'ALL' : revNo)}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1E293B' }}>
                          {item.name} {isOutdated && <span style={{ fontSize: '0.7rem', backgroundColor: '#EA580C', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.4rem' }}>OUTDATED STANDARD</span>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>{item.totalDue}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{item.compliant}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>{item.nonCompliant + item.notDone}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: item.compliancePct < 85 ? '#EF4444' : item.compliancePct < 95 ? '#F59E0B' : '#10B981' }}>
                          {item.compliancePct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. BY DOCUMENT NUMBER (SOP Review Intervals & Overdue Flags) ── */}
      {currentSlice === 'document' && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileWarning size={20} color="#F43F5E" /> SOP Documents Periodic Review Status (Target: 2-Year Interval)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Each SOP document maps exactly to one Equipment Category. Documents not revised within the 2-year (730 days) review window are flagged in red.
              </p>
            </div>
          </div>

          <div className="table-container-responsive" style={{ maxHeight: '520px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Document Number</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Equipment Category & Title</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Current Rev</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Last Revised Date</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Review Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Checkpoints</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Compliance Rate</th>
                </tr>
              </thead>
              <tbody>
                {documentList.map((doc, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: activeFilters.docNo === doc.docNo ? '#EFF6FF' : (doc.overdueForReview ? '#FFF1F2' : '#FFF') }}
                      onClick={() => onSelectFilter('docNo', activeFilters.docNo === doc.docNo ? 'ALL' : doc.docNo)}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: doc.overdueForReview ? '#991B1B' : '#1E293B' }}>
                      {doc.docNo}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#1E293B' }}>{doc.category}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{doc.title}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>
                      Rev {doc.currentRevision}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                      {doc.lastRevisedDate}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {doc.overdueForReview ? (
                        <span style={{ backgroundColor: '#F43F5E', color: '#FFF', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          ⚠️ OVERDUE FOR REVIEW (&gt; 2 YRS)
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#DCFCE7', color: '#065F46', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          ✅ UP TO DATE
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>
                      {doc.totalDue}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 900, color: doc.compliancePct < 85 ? '#EF4444' : doc.compliancePct < 95 ? '#F59E0B' : '#10B981' }}>
                      {doc.compliancePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 8. ASSET_ID DRILL-DOWN TABLE & MODAL ── */}
      {currentSlice === 'assets' && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>
                Asset_ID Drill-Down Table ({filteredAssets.length} Matching Assets)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Click any row below to view specific component-level inspection details, exact failure parameters, and inspector notes.
              </p>
            </div>
            <button
              onClick={() => onNavigateToView('matrix')}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#3B82F6', color: '#FFF', borderRadius: '6px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              Open in Master Matrix Spreadsheet →
            </button>
          </div>

          <div className="table-container-responsive" style={{ maxHeight: '560px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Asset ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Equipment Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Department & Area</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Sub-Line</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Rev</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Document No</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Latest Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Running Compliance %</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset, idx) => {
                  const st = asset.latestStatus;
                  const stColor = st?.status === 'Compliant' ? '#10B981' : st?.status === 'Non-Compliant' ? '#EF4444' : '#64748B';

                  return (
                    <tr key={asset.id || idx} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                        onClick={() => setSelectedAssetForModal(asset)}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#1E293B' }}>{asset.Asset_ID}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}>{asset.Equipment_Category}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <strong style={{ color: '#0F172A' }}>{asset.Line}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{asset.Area_Zone}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{asset.Sub_Line}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: asset.isRevisionOutdated ? '#EF4444' : '#10B981' }}>
                        Rev {asset.Revision_Number} {asset.isRevisionOutdated && '⚠️'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.78rem', color: '#64748B' }}>{asset.Document_Number}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span style={{ backgroundColor: `${stColor}18`, color: stColor, padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>
                          ● {st ? st.status : 'Not yet due'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 900, color: asset.runningCompliancePct < 85 ? '#EF4444' : asset.runningCompliancePct < 95 ? '#F59E0B' : '#10B981' }}>
                        {asset.runningCompliancePct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ASSET DRILL-DOWN MODAL ── */}
      {selectedAssetForModal && (
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
        onClick={() => setSelectedAssetForModal(null)}>
          <div style={{
            backgroundColor: '#FFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}>
            
            <div style={{
              backgroundColor: '#1E293B',
              color: '#FFF',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>
                  Asset Component Audit Profile
                </div>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: 900 }}>
                  {selectedAssetForModal.Asset_ID} ({selectedAssetForModal.Equipment_Category})
                </h3>
              </div>
              <button 
                onClick={() => setSelectedAssetForModal(null)}
                style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: '0.4rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B' }}>DEPARTMENT & AREA</span>
                  <div style={{ fontWeight: 700, color: '#1E293B', marginTop: '0.2rem' }}>{selectedAssetForModal.Line} · {selectedAssetForModal.Area_Zone}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B' }}>SUB-LINE</span>
                  <div style={{ fontWeight: 700, color: '#1E293B', marginTop: '0.2rem' }}>{selectedAssetForModal.Sub_Line}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B' }}>FREQUENCY & REVISION</span>
                  <div style={{ fontWeight: 700, color: '#1E293B', marginTop: '0.2rem' }}>
                    {selectedAssetForModal.Frequency} · Rev {selectedAssetForModal.Revision_Number} {selectedAssetForModal.isRevisionOutdated && '⚠️'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B' }}>OVERALL COMPLIANCE HISTORY</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: selectedAssetForModal.runningCompliancePct < 85 ? '#EF4444' : '#10B981', marginTop: '0.1rem' }}>
                    {selectedAssetForModal.runningCompliancePct}%
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.95rem', fontWeight: 800 }}>Component Checkpoints List</h4>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '0.65rem 1rem' }}>Component Name</th>
                        <th style={{ padding: '0.65rem 1rem' }}>Standard Parameter</th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Current Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAssetForModal.components.map((c, idx) => {
                        const latest = selectedAssetForModal.latestStatus;
                        const isFailed = latest?.failedComponent === c.name;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isFailed ? '#FEF2F2' : '#FFF' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1E293B' }}>{c.name}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#64748B' }}>{c.standard}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800, color: isFailed ? '#EF4444' : '#10B981' }}>
                              {isFailed ? 'Not OK (Fail)' : 'OK (Pass)'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedAssetForModal(null)}
                style={{ padding: '0.6rem 1.25rem', backgroundColor: '#1E293B', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FireSafetyBreakdownsView;
