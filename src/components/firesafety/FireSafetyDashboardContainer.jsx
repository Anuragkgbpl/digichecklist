// src/components/firesafety/FireSafetyDashboardContainer.jsx
// Main Orchestrator & View Controller for Fire Safety Module
// Handles state between Landing View, Master Matrix, and Breakdowns with live cross-filtering

import React, { useState, useMemo } from 'react';
import { generate371PlantFireAssets, computeFireSafetyAnalytics } from './FireSafetyDataGenerator';
import FireSafetyLandingView from './FireSafetyLandingView';
import MasterComplianceMatrix from './MasterComplianceMatrix';
import FireSafetyBreakdownsView from './FireSafetyBreakdownsView';
import { 
  Home, FileSpreadsheet, Layers, Filter, RefreshCw, Flame, 
  ShieldCheck, ArrowRight, X, AlertCircle, Sparkles
} from 'lucide-react';

const FireSafetyDashboardContainer = () => {
  // 1. Generate master assets (memoized so it stays stable across renders)
  const masterAssets = useMemo(() => generate371PlantFireAssets(), []);

  // 2. View control state ('landing', 'breakdowns', 'matrix')
  const [viewMode, setViewMode] = useState('landing');
  const [breakdownSlice, setBreakdownSlice] = useState('category');

  // 3. Global cross-filter state
  const [filters, setFilters] = useState({
    line: 'ALL',
    category: 'ALL',
    subLine: 'ALL',
    area: 'ALL',
    frequency: 'ALL',
    revision: 'ALL',
    docNo: 'ALL',
    status: 'ALL',
    searchQuery: ''
  });

  // Helper to update a filter
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      line: 'ALL',
      category: 'ALL',
      subLine: 'ALL',
      area: 'ALL',
      frequency: 'ALL',
      revision: 'ALL',
      docNo: 'ALL',
      status: 'ALL',
      searchQuery: ''
    });
  };

  // Helper for navigating across views with optional slice/filter context
  const handleNavigateToView = (newView, options = {}) => {
    if (options.viewSlice) {
      setBreakdownSlice(options.viewSlice);
    }
    if (options.status) {
      handleFilterChange('status', options.status);
    }
    if (options.line) {
      handleFilterChange('line', options.line);
    }
    if (options.category) {
      handleFilterChange('category', options.category);
    }
    setViewMode(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper for selecting/toggling filter from tiles or charts
  const handleSelectFilter = (filterType, value) => {
    if (filterType === 'area') {
      handleFilterChange('area', filters.area === value ? 'ALL' : value);
    } else if (filterType === 'line') {
      handleFilterChange('line', filters.line === value ? 'ALL' : value);
    } else if (filterType === 'category') {
      handleFilterChange('category', filters.category === value ? 'ALL' : value);
      handleFilterChange('subLine', 'ALL');
    } else if (filterType === 'subLine') {
      handleFilterChange('subLine', filters.subLine === value ? 'ALL' : value);
    } else if (filterType === 'frequency') {
      handleFilterChange('frequency', filters.frequency === value ? 'ALL' : value);
    } else if (filterType === 'revision') {
      handleFilterChange('revision', filters.revision === value ? 'ALL' : value);
    } else if (filterType === 'docNo') {
      handleFilterChange('docNo', filters.docNo === value ? 'ALL' : value);
    }
  };

  // 4. Compute all analytics & breakdowns dynamically reflecting active global filters
  const analytics = useMemo(() => {
    return computeFireSafetyAnalytics(masterAssets, filters);
  }, [masterAssets, filters]);

  // Check if any filter is active
  const activeFiltersList = Object.entries(filters).filter(([k, v]) => v !== 'ALL' && v !== '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'fadeIn 0.3s ease' }}>
      
      {/* ── TOP HEADER / SUB-NAV BAR FOR FIRE SAFETY MODULE ── */}
      <div style={{
        backgroundColor: '#FFF',
        border: '1px solid #CBD5E1',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ backgroundColor: '#FFF7ED', padding: '0.6rem', borderRadius: '12px', border: '1px solid #FFEDD5' }}>
            <Flame size={26} color="#EA580C" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Plant Fire Safety Compliance & Audit Engine
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
              Master inventory tracking <strong>371 Plant Assets across 8 Departments & 7 Equipment Categories</strong> (12-Period Audit Matrix).
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#F1F5F9', padding: '0.35rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <button
            onClick={() => setViewMode('landing')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: viewMode === 'landing' ? '#3B82F6' : 'transparent',
              color: viewMode === 'landing' ? '#FFF' : '#475569',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: viewMode === 'landing' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Home size={16} /> Plant Safety Status
          </button>

          <button
            onClick={() => setViewMode('breakdowns')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: viewMode === 'breakdowns' ? '#3B82F6' : 'transparent',
              color: viewMode === 'breakdowns' ? '#FFF' : '#475569',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: viewMode === 'breakdowns' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Layers size={16} /> Analytics Breakdowns
          </button>

          <button
            onClick={() => setViewMode('matrix')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: viewMode === 'matrix' ? '#3B82F6' : 'transparent',
              color: viewMode === 'matrix' ? '#FFF' : '#475569',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: viewMode === 'matrix' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <FileSpreadsheet size={16} /> Master Matrix (371 Assets)
          </button>
        </div>
      </div>

      {/* ── ACTIVE CROSS-FILTER BAR (Visible when any filter is selected) ── */}
      {activeFiltersList.length > 0 && (
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Filter size={15} color="#2563EB" /> ACTIVE CROSS-FILTERS:
            </span>
            {activeFiltersList.map(([key, val]) => (
              <div
                key={key}
                onClick={() => handleFilterChange(key, key === 'searchQuery' ? '' : 'ALL')}
                style={{
                  backgroundColor: '#FFF',
                  border: '1px solid #93C5FD',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
                title="Click to remove filter"
              >
                <span>{key === 'docNo' ? 'Document' : key.toUpperCase()}: <strong>{val}</strong></span>
                <X size={13} color="#2563EB" />
              </div>
            ))}
            <span style={{ fontSize: '0.75rem', color: '#3B82F6', fontWeight: 600 }}>
              (Filtering {analytics.filteredAssets.length} of {masterAssets.length} plant assets across all tabs)
            </span>
          </div>

          <button
            onClick={handleResetFilters}
            style={{
              background: 'none',
              border: '1px solid #60A5FA',
              backgroundColor: '#DBEAFE',
              color: '#1D4ED8',
              padding: '0.35rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <RefreshCw size={13} /> Clear All Filters
          </button>
        </div>
      )}

      {/* ── RENDER ACTIVE VIEW MODE ── */}
      {viewMode === 'landing' && (
        <FireSafetyLandingView 
          analytics={analytics}
          onSelectFilter={handleSelectFilter}
          onNavigateToView={handleNavigateToView}
          activeFilters={filters}
        />
      )}

      {viewMode === 'breakdowns' && (
        <FireSafetyBreakdownsView 
          analytics={analytics}
          activeFilters={filters}
          onSelectFilter={handleSelectFilter}
          onNavigateToView={handleNavigateToView}
          initialSlice={breakdownSlice}
        />
      )}

      {viewMode === 'matrix' && (
        <MasterComplianceMatrix 
          assets={masterAssets}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />
      )}

    </div>
  );
};

export default FireSafetyDashboardContainer;
