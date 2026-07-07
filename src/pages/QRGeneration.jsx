import React, { useState, useEffect } from 'react';
import { QrCode, Printer, Search, Building, AlertCircle, Download, BookOpen, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { QRCode } from 'react-qr-code';

import { useData } from '../context/DataContext';

const QRGeneration = () => {
  const { user } = useAuth();
  const { checklists, koreModules = [] } = useData();
  const [activeTab, setActiveTab] = useState('activity');
  const [hierarchyData, setHierarchyData] = useState({
    types: [],
    lines: [],
    subLines: []
  });
  const [selectedLevel, setSelectedLevel] = useState('Activity Type');
  const [searchQuery, setSearchQuery] = useState('');

  const getScanUrl = (name, isKore = false, id = null) => {
    if (isKore) {
      if (id === 'all') return `${window.location.origin}/scan/koremodule/all`;
      return `${window.location.origin}/scan/koremodule/${encodeURIComponent(String(id || name))}`;
    }
    if (!name || String(name).trim() === '') return null;
    const levelSlug = selectedLevel.replace(/\s+/g, '').replace(/-/g, '').toLowerCase();
    return `${window.location.origin}/scan/${levelSlug}/${encodeURIComponent(String(name))}`;
  };

  useEffect(() => {
    const types = [...new Set(checklists.map(c => c.Type_of_Activity).filter(v => v && String(v).trim()))];
    const lines = [...new Set(checklists.map(c => c.Line_Equipment).filter(v => v && String(v).trim()))];
    const subLines = [...new Set(checklists.map(c => c.Sub_Line_Equipment).filter(v => v && String(v).trim()))];

    setHierarchyData({ types, lines, subLines });
  }, [checklists]);

  const getFilteredItems = () => {
    let items = [];
    if (selectedLevel === 'Activity Type') {
      items = hierarchyData.types.map(t => ({ name: t, type: t }));
    } else if (selectedLevel === 'Line') {
      items = hierarchyData.lines.map(l => {
        const cl = checklists.find(c => c.Line_Equipment === l);
        return { name: l, type: cl ? cl.Type_of_Activity : 'Mixed / Multiple' };
      });
    } else if (selectedLevel === 'Sub-Line') {
      items = hierarchyData.subLines.map(sl => {
        const cl = checklists.find(c => c.Sub_Line_Equipment === sl);
        return { name: sl, type: cl ? cl.Type_of_Activity : 'Mixed / Multiple' };
      });
    }

    return items
      .filter(item => item.name && String(item.name).trim() !== '')
      .filter(item => String(item.name).toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const filteredItems = getFilteredItems();

  const handlePrintAll = () => {
    window.print();
  };

  const handlePrintSingle = (item, isKore = false) => {
    const printWindow = window.open('', '_blank');
    const scanUrl = getScanUrl(item.name, isKore, item.id);
    const title = item.name || 'KORE Module Portal';

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${title}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 2px solid #000; padding: 40px; border-radius: 20px; text-align: center; }
            .qr { margin-bottom: 20px; }
            h1 { font-size: 32px; margin: 10px 0; }
            p { font-size: 18px; color: #666; }
          </style>
        </head>
        <body>
          <div class="card">
            <div id="qrcode" class="qr"></div>
            <h1>${title}</h1>
            <p>${user?.unit || 'Digital Checklist'} ${isKore ? '• KORE Module' : ''}</p>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
          <script>
            var typeNumber = 4;
            var errorCorrectionLevel = 'L';
            var qr = qrcode(typeNumber, errorCorrectionLevel);
            qr.addData('${scanUrl}');
            qr.make();
            document.getElementById('qrcode').innerHTML = qr.createImgTag(8);
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      <div className="print-only" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>{user?.unit || 'Global System'}</h1>
        <p style={{ fontSize: '14px', margin: 0, color: '#666' }}>Activity Scan Codes</p>
      </div>

      <h2 className="card-title no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <QrCode /> QR Code Generation
      </h2>
      <p className="no-print" style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Generate QR codes for Activity Types. Scanning them on a mobile device initiates the execution workflow.
      </p>

      <div className="card no-print-shadow">
        {/* Level Tabs */}
        <div className="no-print" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <div
            onClick={() => { setActiveTab('activity'); setSearchQuery(''); }}
            style={{
              padding: '0.75rem 1rem',
              borderBottom: activeTab === 'activity' ? '2px solid var(--primary-light)' : 'none',
              color: activeTab === 'activity' ? 'var(--primary-light)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'activity' ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
            <QrCode size={18} /> Activity Type Level
          </div>
          <div
            onClick={() => { setActiveTab('kore'); setSearchQuery(''); }}
            style={{
              padding: '0.75rem 1rem',
              borderBottom: activeTab === 'kore' ? '2px solid var(--primary-light)' : 'none',
              color: activeTab === 'kore' ? 'var(--primary-light)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'kore' ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
            <BookOpen size={18} /> KORE Module
          </div>
        </div>

        {/* Search Bar */}
        <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '0.5rem 1rem' }}>
            <Search size={18} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
            <input
              type="text"
              placeholder={activeTab === 'kore' ? "Search KORE Modules..." : "Search Activity Types..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)' }}
            />
          </div>
          <button className="btn btn-primary" onClick={handlePrintAll}>
            <Printer size={18} /> Print All
          </button>
        </div>

        {/* QR Cards Grid */}
        {activeTab === 'activity' ? (
          <div className="qr-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {filteredItems.map(item => {
              const scanUrl = getScanUrl(item.name);
              const hasValidUrl = scanUrl && typeof scanUrl === 'string' && scanUrl.length > 0;

              return (
                <div key={String(item.name)} className="qr-card" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: 'var(--surface-color)', pageBreakInside: 'avoid' }}>
                  <div style={{ width: '150px', height: '150px', backgroundColor: '#FFF', padding: '10px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    {hasValidUrl ? (
                      <QRCode value={scanUrl} size={130} />
                    ) : (
                      <QrCode size={64} color="var(--text-tertiary)" />
                    )}
                  </div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{String(item.name)}</h4>

                  <div className="no-print" style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', width: '100%', fontSize: '0.75rem', textAlign: 'left', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                      <Building size={11} /> {user?.unit || 'Global System'}
                    </div>
                  </div>

                  <div className="no-print" style={{ display: 'flex', width: '100%', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                      onClick={() => hasValidUrl && window.open(scanUrl, '_blank')}
                      disabled={!hasValidUrl}
                    >
                      Test Scan
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', color: 'var(--primary-dark)' }}
                      onClick={() => handlePrintSingle(item)}
                      disabled={!hasValidUrl}
                    >
                      Print
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <AlertCircle size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No items found</div>
                <div style={{ fontSize: '0.875rem' }}>
                  {checklists.length === 0
                    ? 'Upload a Checklist Master first to generate QR codes.'
                    : `No ${selectedLevel}s match your search.`}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <BookOpen size={32} color="#15803D" />
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#14532D', fontSize: '1.05rem' }}>KORE Training & Reference Modules</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#166534' }}>
                  Scan any KORE QR code below to view uploaded manuals, SOPs, and guidelines with built-in PDF find & keyword search.
                </p>
              </div>
            </div>

            <div className="qr-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {/* Master Portal Card */}
              {(!searchQuery || 'all kore modules portal'.includes(searchQuery.toLowerCase())) && (
                <div className="qr-card" style={{ border: '2px solid #10B981', borderRadius: 'var(--border-radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#ECFDF5', pageBreakInside: 'avoid' }}>
                  <div style={{ width: '150px', height: '150px', backgroundColor: '#FFF', padding: '10px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <QRCode value={getScanUrl('KORE Portal', true, 'all')} size={130} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Master Portal QR</span>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#064E3B', fontSize: '1.15rem' }}>All KORE Modules</h4>
                  <p style={{ fontSize: '0.75rem', color: '#065F46', margin: '0 0 0.5rem 0' }}>Scan to view & search all uploaded documents</p>

                  <div className="no-print" style={{ display: 'flex', width: '100%', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', backgroundColor: 'white' }}
                      onClick={() => window.open(getScanUrl('KORE Portal', true, 'all'), '_blank')}
                    >
                      Test Scan
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', backgroundColor: '#059669', border: 'none' }}
                      onClick={() => handlePrintSingle({ name: 'All KORE Modules Portal', id: 'all' }, true)}
                    >
                      Print
                    </button>
                  </div>
                </div>
              )}

              {/* Individual Modules */}
              {koreModules
                .filter(m => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || (m.fileName && m.fileName.toLowerCase().includes(searchQuery.toLowerCase())))
                .map(mod => {
                  const scanUrl = getScanUrl(mod.name, true, mod.id);
                  return (
                    <div key={mod.id} className="qr-card" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: 'var(--surface-color)', pageBreakInside: 'avoid' }}>
                      <div style={{ width: '150px', height: '150px', backgroundColor: '#FFF', padding: '10px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                        <QRCode value={scanUrl} size={130} />
                      </div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)', fontSize: '1.05rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mod.name}>{mod.name}</h4>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        <FileText size={13} /> {mod.fileName}
                      </div>

                      <div className="no-print" style={{ display: 'flex', width: '100%', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                          onClick={() => window.open(scanUrl, '_blank')}
                        >
                          Test Scan
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', color: 'var(--primary-dark)' }}
                          onClick={() => handlePrintSingle(mod, true)}
                        >
                          Print
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRGeneration;
