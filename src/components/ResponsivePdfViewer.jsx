import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, RefreshCw, AlertCircle, Layers, FileText, Eye } from 'lucide-react';

const PdfPageCanvas = React.memo(({ pdfDoc, pageNum, viewportInfo, zoomMode, containerWidth, onPageVisible }) => {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setInView(true);
          if (onPageVisible) onPageVisible(pageNum);
        } else {
          setInView(false);
        }
      });
    }, {
      rootMargin: '1200px 0px 1200px 0px',
      threshold: 0.05
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNum, onPageVisible]);

  // Calculate dimensions based on zoomMode and containerWidth
  const dimensions = useMemo(() => {
    if (!viewportInfo) return { width: 600, height: 800, scale: 1 };
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const padding = isMobile ? 16 : 48;
    const availWidth = Math.max(280, containerWidth - padding);

    let scale = 1;
    if (zoomMode === 'fitWidth') {
      scale = availWidth / viewportInfo.width;
    } else if (zoomMode === 'fitPage') {
      const availHeight = (typeof window !== 'undefined' ? window.innerHeight : 800) - 180;
      const scaleW = availWidth / viewportInfo.width;
      const scaleH = availHeight / viewportInfo.height;
      scale = Math.min(scaleW, scaleH);
    } else if (typeof zoomMode === 'number') {
      scale = zoomMode;
    }

    return {
      width: Math.floor(viewportInfo.width * scale),
      height: Math.floor(viewportInfo.height * scale),
      scale
    };
  }, [viewportInfo, zoomMode, containerWidth]);

  useEffect(() => {
    if ((!inView && !hasRendered) || !pdfDoc || !viewportInfo) return;

    let isCancelled = false;
    const renderPage = async () => {
      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const outputScale = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        const viewport = page.getViewport({ scale: dimensions.scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const ctx = canvas.getContext("2d");
        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform,
          viewport: viewport
        };

        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch (e) {}
        }

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isCancelled) {
          setIsRendering(false);
          setHasRendered(true);
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNum}:`, err);
          if (!isCancelled) setIsRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (e) {}
      }
    };
  }, [inView, hasRendered, pdfDoc, pageNum, dimensions]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: dimensions.width ? `${dimensions.width}px` : '100%',
        height: dimensions.height ? `${dimensions.height}px` : 'auto',
        minHeight: dimensions.height ? `${dimensions.height}px` : '350px',
        backgroundColor: 'white',
        boxShadow: '0 4px 15px -3px rgba(0,0,0,0.1), 0 2px 6px -2px rgba(0,0,0,0.05)',
        borderRadius: '8px',
        position: 'relative',
        margin: '0 auto 1.5rem auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}
    >
      {isRendering && !hasRendered && (
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.85rem' }}>
          <RefreshCw size={24} className="animate-spin" color="#059669" />
          <span>Rendering Page {pageNum}...</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '12px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        color: 'white',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '0.72rem',
        fontWeight: 650,
        pointerEvents: 'none',
        backdropFilter: 'blur(4px)'
      }}>
        Page {pageNum}
      </div>
    </div>
  );
});

export default function ResponsivePdfViewer({ fileData, fileName = 'Document.pdf', targetPage = null, height = '100%' }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageViewports, setPageViewports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomMode, setZoomMode] = useState('fitWidth'); // 'fitWidth', 'fitPage', or numeric scale
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [useNativeFallback, setUseNativeFallback] = useState(false);

  const containerRef = useRef(null);
  const pageRefs = useRef({});
  const [containerWidth, setContainerWidth] = useState((typeof window !== 'undefined' ? window.innerWidth : 800) - 32);

  // Monitor container width for responsive scaling
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      } else if (typeof window !== 'undefined') {
        setContainerWidth(window.innerWidth - 32);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Load pdf.js dynamically if needed
  const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Load and parse document
  useEffect(() => {
    let isCancelled = false;
    let activePdf = null;

    const loadDocument = async () => {
      if (!fileData) return;
      setLoading(true);
      setError(null);
      setUseNativeFallback(false);
      try {
        const pdfjs = await loadPdfJs();
        if (isCancelled) return;

        let docPromise;
        if (typeof fileData === 'string' && (fileData.startsWith('data:') || fileData.startsWith('blob:'))) {
          const res = await fetch(fileData);
          const buffer = await res.arrayBuffer();
          if (isCancelled) return;
          docPromise = pdfjs.getDocument({ data: buffer });
        } else {
          docPromise = pdfjs.getDocument(fileData);
        }

        const pdf = await docPromise.promise;
        if (isCancelled) return;

        activePdf = pdf;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(targetPage || 1);
        setPageInput(String(targetPage || 1));

        // Load unscaled viewports for responsive placeholder sizing
        const viewports = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (isCancelled) break;
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          viewports.push({ pageNum: i, width: vp.width, height: vp.height });
        }
        if (!isCancelled) {
          setPageViewports(viewports);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading PDF document:', err);
        if (!isCancelled) {
          setError('Could not render responsive PDF viewer. You can switch to the native device viewer.');
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
      if (activePdf) {
        try { activePdf.destroy(); } catch (e) {}
      }
    };
  }, [fileData]);

  // Handle scrolling to page
  const scrollToPage = useCallback((pNum) => {
    const p = Math.max(1, Math.min(numPages || 1, pNum));
    setCurrentPage(p);
    setPageInput(String(p));
    const el = pageRefs.current[p];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [numPages]);

  // When targetPage prop changes from search results, scroll to that page
  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= numPages && !loading) {
      scrollToPage(targetPage);
    }
  }, [targetPage, numPages, loading, scrollToPage]);

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      scrollToPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomOut = () => {
    if (zoomMode === 'fitWidth' || zoomMode === 'fitPage') {
      const firstVp = pageViewports[0];
      if (firstVp) {
        const availWidth = Math.max(280, containerWidth - 32);
        const currentScale = availWidth / firstVp.width;
        setZoomMode(Math.max(0.4, Number((currentScale - 0.25).toFixed(2))));
      } else {
        setZoomMode(0.75);
      }
    } else if (typeof zoomMode === 'number') {
      setZoomMode(Math.max(0.4, Number((zoomMode - 0.25).toFixed(2))));
    }
  };

  const handleZoomIn = () => {
    if (zoomMode === 'fitWidth' || zoomMode === 'fitPage') {
      const firstVp = pageViewports[0];
      if (firstVp) {
        const availWidth = Math.max(280, containerWidth - 32);
        const currentScale = availWidth / firstVp.width;
        setZoomMode(Math.min(3.0, Number((currentScale + 0.25).toFixed(2))));
      } else {
        setZoomMode(1.25);
      }
    } else if (typeof zoomMode === 'number') {
      setZoomMode(Math.min(3.0, Number((zoomMode + 0.25).toFixed(2))));
    }
  };

  if (useNativeFallback) {
    const nativeUrl = fileData ? (fileData.includes('#') ? fileData : `${fileData}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`) : '';
    return (
      <div style={{ width: '100%', height: height, display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1rem', backgroundColor: '#1E293B', color: 'white', fontSize: '0.85rem' }}>
          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} color="#38BDF8" /> {fileName} (Native Viewer)
          </span>
          <button
            onClick={() => setUseNativeFallback(false)}
            style={{ padding: '0.35rem 0.75rem', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
          >
            Switch to Responsive Multi-Page Viewer
          </button>
        </div>
        <iframe
          src={nativeUrl}
          style={{ width: '100%', flex: 1, border: 'none', backgroundColor: 'white' }}
          title={fileName}
        />
      </div>
    );
  }

  return (
    <div 
      style={{ 
        width: '100%', 
        height: height, 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: '#F1F5F9',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
      onContextMenu={(e) => { e.preventDefault(); return false; }}
    >
      {/* Top Controls Bar */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0.65rem 1rem', 
        backgroundColor: '#1E293B', 
        color: 'white', 
        gap: '0.75rem',
        borderBottom: '1px solid #334155',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: '150px', overflow: 'hidden' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={16} color="#DC2626" />
          </div>
          <span style={{ fontWeight: 650, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#F8FAFC' }}>
            {fileName}
          </span>
        </div>

        {/* Page Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0F172A', padding: '0.25rem 0.65rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <button
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: currentPage <= 1 ? '#475569' : 'white', 
              cursor: currentPage <= 1 ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px'
            }}
            title="Previous Page"
          >
            <ChevronLeft size={18} />
          </button>

          <form onSubmit={handlePageInputSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputSubmit}
              disabled={loading || numPages === 0}
              style={{
                width: '45px',
                padding: '0.2rem 0.35rem',
                textAlign: 'center',
                backgroundColor: '#1E293B',
                color: 'white',
                border: '1px solid #475569',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 650,
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
              of {numPages || '-'}
            </span>
          </form>

          <button
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= numPages || loading}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: currentPage >= numPages ? '#475569' : 'white', 
              cursor: currentPage >= numPages ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px'
            }}
            title="Next Page"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Zoom and Fit Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={handleZoomOut}
            disabled={loading || numPages === 0}
            style={{ background: '#334155', border: 'none', color: 'white', padding: '0.35rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          <button
            onClick={() => setZoomMode('fitWidth')}
            disabled={loading || numPages === 0}
            style={{ 
              backgroundColor: zoomMode === 'fitWidth' ? '#059669' : '#334155', 
              color: 'white', 
              border: 'none', 
              padding: '0.35rem 0.65rem', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              fontWeight: 650, 
              cursor: 'pointer',
              transition: 'background-color 0.15s'
            }}
            title="Fit to Screen Width"
          >
            Fit Width
          </button>

          <button
            onClick={handleZoomIn}
            disabled={loading || numPages === 0}
            style={{ background: '#334155', border: 'none', color: 'white', padding: '0.35rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Main Scrollable Pages Container */}
      <div 
        ref={containerRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: typeof window !== 'undefined' && window.innerWidth < 640 ? '1rem 0.5rem' : '1.5rem', 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748B' }}>
            <RefreshCw size={36} className="animate-spin" color="#059669" style={{ margin: '0 auto 1rem' }} />
            <h4 style={{ margin: '0 0 0.5rem', color: '#1E293B' }}>Loading Responsive PDF Viewer...</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Preparing {fileName} across all mobile and desktop screens.</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #CBD5E1', maxWidth: '480px', margin: '2rem auto' }}>
            <AlertCircle size={40} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
            <h4 style={{ margin: '0 0 0.5rem', color: '#1E293B' }}>Failed to Load PDF</h4>
            <p style={{ margin: '0 0 1.5rem', color: '#64748B', fontSize: '0.9rem' }}>{error}</p>
            <button
              onClick={() => setUseNativeFallback(true)}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 650 }}
            >
              Open with Native Device Viewer
            </button>
          </div>
        )}

        {!loading && !error && pdfDoc && (
          <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column' }}>
            {pageViewports.map((vp) => (
              <div
                key={vp.pageNum}
                ref={(el) => { pageRefs.current[vp.pageNum] = el; }}
                style={{ width: '100%', scrollMarginTop: '1rem' }}
              >
                <PdfPageCanvas
                  pdfDoc={pdfDoc}
                  pageNum={vp.pageNum}
                  viewportInfo={vp}
                  zoomMode={zoomMode}
                  containerWidth={containerWidth}
                  onPageVisible={(visiblePage) => {
                    setCurrentPage(visiblePage);
                    setPageInput(String(visiblePage));
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
