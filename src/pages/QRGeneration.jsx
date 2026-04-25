import React, { useState, useEffect } from 'react';
import { QrCode, Printer, Search, Building, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { QRCode } from 'react-qr-code';

import { useData } from '../context/DataContext';

const QRGeneration = () => {
  const { user } = useAuth();
  const { checklists } = useData();
  const [hierarchyData, setHierarchyData] = useState({
    types: [],
    lines: [],
    subLines: []
  });
  const [selectedLevel, setSelectedLevel] = useState('Activity Type');
  const [searchQuery, setSearchQuery] = useState('');

  const getScanUrl = (name) => {
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

  const handlePrintSingle = (item) => {
    const printWindow = window.open('', '_blank');
    const scanUrl = getScanUrl(item.name);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${item.name}</title>
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
            <h1>${item.name}</h1>
            <p>${user?.unit || 'Digital PCMS'}</p>
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
          {['Activity Type', 'Line', 'Sub-Line'].map(level => (
            <div
              key={level}
              onClick={() => setSelectedLevel(level)}
              style={{
                padding: '0.75rem 1rem',
                borderBottom: selectedLevel === level ? '2px solid var(--primary-light)' : 'none',
                color: selectedLevel === level ? 'var(--primary-light)' : 'var(--text-secondary)',
                fontWeight: selectedLevel === level ? 600 : 400,
                cursor: 'pointer'
              }}>
              {level} Level
            </div>
          ))}
        </div>

        {/* Search Bar */}
        <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '0.5rem 1rem' }}>
            <Search size={18} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
            <input
              type="text"
              placeholder="Search Activity Types..."
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
      </div>
    </div>
  );
};

export default QRGeneration;
