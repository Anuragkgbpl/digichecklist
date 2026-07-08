import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BookOpen, FileText, Search, ArrowLeft, Eye, Download, AlertCircle, CheckCircle2, RefreshCw, Layers, File, ChevronRight, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import ResponsivePdfViewer from '../components/ResponsivePdfViewer';

export default function KoreModuleViewer() {
  const { koreModules = [], loading, koreLoading, koreError } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedModule, setSelectedModule] = useState(null);
  const [activeMode, setActiveMode] = useState('view'); // 'view' or 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [dynamicText, setDynamicText] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [targetSearchPage, setTargetSearchPage] = useState(null);

  useEffect(() => {
    console.log('[KORE Viewer] Rendering list. Total modules in memory:', koreModules.length, 'koreLoading:', koreLoading, 'koreError:', koreError);
  }, [koreModules, koreLoading, koreError]);

  const getProtectedPdfUrl = (dataUrl) => {
    if (!dataUrl) return '';
    if (dataUrl.includes('#')) return dataUrl;
    return `${dataUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&print=0&copy=0`;
  };

  // Check URL params on load for direct module selection from QR scan
  useEffect(() => {
    const paramVal = searchParams.get('selected');
    if (paramVal && koreModules.length > 0 && !selectedModule) {
      const found = koreModules.find(m => 
        String(m.id) === String(paramVal) || 
        m.name.toLowerCase() === decodeURIComponent(paramVal).toLowerCase() ||
        m.id.toLowerCase() === decodeURIComponent(paramVal).toLowerCase()
      );
      if (found) {
        setSelectedModule(found);
        setActiveMode('view');
      }
    }
  }, [searchParams, koreModules, selectedModule]);

  // Extract text on the fly if needed when switching to search mode
  useEffect(() => {
    if (activeMode === 'search' && selectedModule && !selectedModule.extractedText && !dynamicText && !isExtracting) {
      extractOnTheFly(selectedModule);
    }
  }, [activeMode, selectedModule]);

  const extractOnTheFly = async (mod) => {
    if (!mod || !mod.fileData) return;
    setIsExtracting(true);
    try {
      // Convert base64 Data URL to ArrayBuffer
      const res = await fetch(mod.fileData);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const isPdf = mod.fileName?.toLowerCase().endsWith('.pdf') || mod.fileType?.includes('pdf');
      if (isPdf) {
        if (!window.pdfjsLib) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map(item => item.str).join(' ');
          fullText.push({ page: i, text: pageText });
        }
        setDynamicText(JSON.stringify(fullText));
      } else if (mod.fileName?.match(/\.(doc|docx)$/i)) {
        if (!window.mammoth) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        const htmlRes = await window.mammoth.convertToHtml({ arrayBuffer });
        setDynamicText(JSON.stringify({ text: result.value, html: htmlRes.value }));
      }
    } catch (err) {
      console.error("On-the-fly extraction error:", err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSelectModule = (mod) => {
    setSelectedModule(mod);
    setActiveMode('view');
    setSearchQuery('');
    setDynamicText(null);
    setTargetSearchPage(null);
    setSearchParams({ selected: mod.id });
  };

  const handleBackToList = () => {
    setSelectedModule(null);
    setActiveMode('view');
    setSearchQuery('');
    setDynamicText(null);
    setTargetSearchPage(null);
    setSearchParams({});
  };

  const parsedTextData = useMemo(() => {
    if (!selectedModule) return null;
    const raw = selectedModule.extractedText || dynamicText;
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return raw;
    }
  }, [selectedModule, dynamicText]);

  // Search matches calculation
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !parsedTextData) return [];
    const query = searchQuery.toLowerCase().trim();

    if (Array.isArray(parsedTextData)) {
      // PDF pages array [{ page: 1, text: "..." }]
      const matches = [];
      parsedTextData.forEach(item => {
        if (item.text && item.text.toLowerCase().includes(query)) {
          // Find sentences or excerpts around the match
          const regex = new RegExp(`([^.?!]*?${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.?!]*?[.?!])`, 'gi');
          const excerpts = item.text.match(regex) || [item.text.slice(0, 300) + '...'];
          excerpts.forEach((ex, idx) => {
            matches.push({
              id: `${item.page}-${idx}`,
              page: item.page,
              text: ex.trim()
            });
          });
        }
      });
      return matches;
    } else if (typeof parsedTextData === 'object' && parsedTextData.text) {
      // Word document { text: "...", html: "..." }
      const matches = [];
      const paragraphs = parsedTextData.text.split(/\n+/);
      paragraphs.forEach((para, idx) => {
        if (para.toLowerCase().includes(query)) {
          matches.push({
            id: `para-${idx}`,
            page: null,
            text: para.trim()
          });
        }
      });
      return matches;
    } else if (typeof parsedTextData === 'string') {
      const matches = [];
      const paragraphs = parsedTextData.split(/\n+/);
      paragraphs.forEach((para, idx) => {
        if (para.toLowerCase().includes(query)) {
          matches.push({
            id: `str-${idx}`,
            page: null,
            text: para.trim()
          });
        }
      });
      return matches;
    }
    return [];
  }, [searchQuery, parsedTextData]);

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} style={{ backgroundColor: '#FEF08A', color: '#854D0E', padding: '0 3px', borderRadius: '4px', fontWeight: 700 }}>
          {part}
        </mark>
      ) : part
    );
  };

  const filteredList = useMemo(() => {
    if (!listSearchQuery.trim()) return koreModules;
    const q = listSearchQuery.toLowerCase();
    return koreModules.filter(m => m.name.toLowerCase().includes(q) || (m.fileName && m.fileName.toLowerCase().includes(q)));
  }, [koreModules, listSearchQuery]);

  if ((koreLoading || loading) && koreModules.length === 0) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: '#F8FAFC', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '42px', height: '42px', border: '3.5px solid #E2E8F0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#475569', fontWeight: 650, fontSize: '1rem', margin: 0 }}>Loading KORE Modules from Cloud...</p>
        <p style={{ color: '#94A3B8', fontSize: '0.8rem', margin: 0 }}>Please wait while documents synchronize over network</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (koreError && koreModules.length === 0) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: '#F8FAFC', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <AlertCircle size={48} color="#DC2626" />
        <p style={{ color: '#0F172A', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Failed to Load KORE Modules</p>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>{koreError}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', backgroundColor: '#059669', border: 'none' }}>
          Retry Fetch
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: '#F8FAFC', padding: '0.75rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* STATE 1: MODULES LIST */}
        {!selectedModule ? (
          <div>
            {/* Sticky Search Bar & Exit Button */}
            <div style={{ position: 'sticky', top: 0, backgroundColor: '#F8FAFC', paddingBottom: '0.75rem', paddingTop: '0.25rem', zIndex: 10, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1.5px solid #CBD5E1', borderRadius: '10px', padding: '0.65rem 0.85rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <Search size={18} color="#64748B" style={{ marginRight: '0.65rem', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Find KORE module by name..."
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: '#0F172A', fontSize: '0.95rem' }}
                />
                {listSearchQuery && (
                  <button onClick={() => setListSearchQuery('')} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <X size={18} />
                  </button>
                )}
              </div>
              {localStorage.getItem('qr_mode') === 'true' && (
                <button
                  onClick={() => {
                    localStorage.removeItem('qr_mode');
                    localStorage.removeItem('qr_scan_level');
                    localStorage.removeItem('qr_scan_name');
                    window.location.href = '/login';
                  }}
                  style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '0.65rem 0.85rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                >
                  Exit
                </button>
              )}
            </div>

            {/* Simple Quick List */}
            {koreModules.length === 0 ? (
              <div style={{ backgroundColor: 'white', padding: '3rem 1.5rem', borderRadius: '12px', textAlign: 'center', border: '2px dashed #CBD5E1', marginTop: '0.5rem' }}>
                <BookOpen size={48} color="#94A3B8" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 0.5rem', color: '#1E293B', fontSize: '1.15rem' }}>No KORE Modules Uploaded</h3>
                <p style={{ color: '#64748B', maxWidth: '400px', margin: '0 auto', fontSize: '0.9rem' }}>
                  There are currently no training or reference documents available.
                </p>
              </div>
            ) : filteredList.length === 0 ? (
              <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '12px', textAlign: 'center', color: '#64748B', marginTop: '0.5rem' }}>
                <AlertCircle size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <h4 style={{ margin: 0 }}>No modules match "{listSearchQuery}"</h4>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {filteredList.map((mod) => {
                  const isPdf = String(mod.fileName || '').toLowerCase().endsWith('.pdf') || String(mod.fileType || '').includes('pdf');
                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleSelectModule(mod)}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s active'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#10B981';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden', flex: 1 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: isPdf ? '#FEF2F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={20} color={isPdf ? '#DC2626' : '#2563EB'} />
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.15rem' }}>
                            {mod.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mod.fileName || 'Document'} {mod.fileSize ? `• ${mod.fileSize}` : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#059669', fontWeight: 600, fontSize: '0.85rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                        <span>Open</span>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* STATE 2: MODULE VIEWER & SEARCH */
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '85vh' }}>
            
            {/* Top Navigation Bar */}
            <div style={{ backgroundColor: '#0F172A', color: 'white', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                onClick={handleBackToList}
                style={{ backgroundColor: '#EF4444', border: 'none', color: 'white', padding: '0.45rem 0.85rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.15s' }}
              >
                <X size={16} /> Close & Return to List
              </button>

              <div style={{ flex: '1 1 150px', textAlign: 'center', overflow: 'hidden', padding: '0 0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedModule.name}</h3>
              </div>

              {/* Navigation Modes: View vs Search */}
              <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px', borderRadius: '6px' }}>
                <button
                  onClick={() => setActiveMode('view')}
                  style={{
                    backgroundColor: activeMode === 'view' ? '#10B981' : 'transparent',
                    color: 'white',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: 650
                  }}
                >
                  <Eye size={14} /> PDF
                </button>
                <button
                  onClick={() => setActiveMode('search')}
                  style={{
                    backgroundColor: activeMode === 'search' ? '#10B981' : 'transparent',
                    color: 'white',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: 650
                  }}
                >
                  <Search size={14} /> Find
                </button>
              </div>
            </div>

            {/* MODE A: VIEW DOCUMENT */}
            {activeMode === 'view' && (
              <div 
                style={{ flex: 1, backgroundColor: '#525659', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0', overflowY: 'auto', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                onContextMenu={(e) => { e.preventDefault(); alert('Security Policy: Right-clicking, copying, downloading, and printing KORE documents is disabled.'); return false; }}
                onKeyDown={(e) => {
                  if (e.key === 'PrintScreen' || (e.ctrlKey && ['p', 's', 'c', 'u'].includes(e.key.toLowerCase()))) {
                    e.preventDefault();
                    alert('Security Policy: Downloading, printing, copying, and screenshotting KORE documents is disabled.');
                  }
                }}
              >
                <style>{`
                  @media print {
                    body * { display: none !important; }
                    body:after {
                      content: 'Printing and copying of KORE modules is strictly prohibited by security policy.';
                      display: block !important;
                      font-size: 20px;
                      text-align: center;
                      margin-top: 50px;
                    }
                  }
                `}</style>
                {selectedModule.fileName?.toLowerCase().endsWith('.pdf') || selectedModule.fileType?.includes('pdf') ? (
                  <div style={{ width: '100%', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                    <ResponsivePdfViewer
                      fileData={selectedModule.fileData}
                      fileName={selectedModule.fileName || selectedModule.name}
                      targetPage={targetSearchPage}
                      height="100%"
                    />
                  </div>
                ) : (
                  <div style={{ width: '100%', maxWidth: '850px', backgroundColor: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', minHeight: '78vh', boxSizing: 'border-box' }}>
                    <div style={{ borderBottom: '2px solid #E2E8F0', paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ margin: '0 0 0.35rem 0', color: '#0F172A', fontSize: '1.5rem' }}>{selectedModule.name}</h2>
                        <span style={{ color: '#64748B', fontSize: '0.875rem' }}>{selectedModule.fileName}</span>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 650 }}>
                        <AlertCircle size={14} /> Confidential & Protected Document (No Download / Print)
                      </div>
                    </div>

                    {parsedTextData ? (
                      (() => {
                        if (typeof parsedTextData === 'object' && parsedTextData.html) {
                          return <div dangerouslySetInnerHTML={{ __html: parsedTextData.html }} style={{ lineHeight: 1.7, color: '#334155', fontSize: '1rem' }} />;
                        } else if (typeof parsedTextData === 'object' && parsedTextData.text) {
                          return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.7, color: '#334155', fontSize: '0.95rem' }}>{parsedTextData.text}</pre>;
                        } else if (typeof parsedTextData === 'string') {
                          return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.7, color: '#334155', fontSize: '0.95rem' }}>{parsedTextData}</pre>;
                        }
                        return null;
                      })()
                    ) : (
                      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748B' }}>
                        <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3 style={{ color: '#1E293B', margin: '0 0 0.5rem' }}>Word Document Preview</h3>
                        <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.95rem' }}>
                          Confidential Document: Download disabled by security policy.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MODE B: FIND / SEARCH IN PDF */}
            {activeMode === 'search' && (
              <div style={{ flex: 1, backgroundColor: '#F8FAFC', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
                <div style={{ width: '100%', maxWidth: '800px' }}>
                  
                  {/* Search Bar Box */}
                  <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #CBD5E1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.75rem' }}>
                      Find keyword or phrase in "{selectedModule.name}"
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={20} color="#64748B" style={{ position: 'absolute', left: '1rem' }} />
                        <input
                          type="text"
                          placeholder="Type to search (e.g., safety, voltage, inspection, valve)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.85rem', borderRadius: '10px', border: '2px solid #059669', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                          autoFocus
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                            &times;
                          </button>
                        )}
                      </div>
                      <button 
                        onClick={() => setActiveMode('view')} 
                        className="btn btn-secondary" 
                        style={{ padding: '0 1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <Eye size={18} /> Switch to View
                      </button>
                    </div>
                    {isExtracting && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#0284C7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={14} className="animate-spin" /> Indexing document text for deep search...
                      </div>
                    )}
                  </div>

                  {/* Search Results */}
                  {!searchQuery.trim() ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748B', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                      <Search size={48} color="#CBD5E1" style={{ margin: '0 auto 1rem' }} />
                      <h3 style={{ margin: '0 0 0.5rem', color: '#334155' }}>Ready to Search</h3>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>Type any term above to search through the entire document text and locate specific pages/sections.</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748B', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                      <AlertCircle size={48} color="#F59E0B" style={{ margin: '0 auto 1rem' }} />
                      <h3 style={{ margin: '0 0 0.5rem', color: '#1E293B' }}>No matches found</h3>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>We couldn't find any occurrences of "{searchQuery}" in this document.</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                          Found {searchResults.length} match{searchResults.length === 1 ? '' : 'es'} for "{searchQuery}"
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Click "View in Document" to open PDF</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {searchResults.map((res) => (
                          <div
                            key={res.id}
                            style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'border-color 0.15s' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              {res.page ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                                  <Layers size={14} /> Page {res.page}
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#EFF6FF', color: '#2563EB', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                                  <FileText size={14} /> Paragraph Match
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setTargetSearchPage(res.page || 1);
                                  setActiveMode('view');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669', borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }}
                              >
                                <Eye size={13} /> View in Document
                              </button>
                            </div>
                            <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#334155', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #059669' }}>
                              ...{highlightText(res.text, searchQuery)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
