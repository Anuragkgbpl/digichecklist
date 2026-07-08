import React, { useState, useRef } from 'react';
import { Plus, Trash2, Edit, FileText, Upload, BookOpen, Check, X, AlertCircle, Eye, RefreshCw, File, ShieldAlert } from 'lucide-react';
import { useData } from '../context/DataContext';
import { saveData, removeData } from '../firebase';
import ResponsivePdfViewer from './ResponsivePdfViewer';

export default function KoreModuleMaster() {
  const { koreModules = [], updateFirebase } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [moduleName, setModuleName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewData, setFilePreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingModule, setViewingModule] = useState(null);
  const fileInputRef = useRef(null);

  const openAddModal = () => {
    setEditingId(null);
    setModuleName('');
    setSelectedFile(null);
    setFilePreviewData(null);
    setIsModalOpen(true);
  };

  const openEditModal = (mod) => {
    setEditingId(mod.id);
    setModuleName(mod.name || '');
    setSelectedFile(null);
    setFilePreviewData({
      fileName: mod.fileName || 'document.pdf',
      fileType: mod.fileType || 'application/pdf',
      fileSize: mod.fileSize || 'Unknown size',
      fileData: mod.fileData,
      extractedText: mod.extractedText
    });
    setIsModalOpen(true);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return bytes || 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isVal = file.name.match(/\.(pdf|doc|docx)$/i);
    if (!isVal) {
      alert('Please select a valid PDF or Word (.doc/.docx) file.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const extractTextFromFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        if (file.name.endsWith('.pdf') || file.type.includes('pdf')) {
          try {
            if (!window.pdfjsLib) {
              await new Promise((res, rej) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.onload = () => {
                  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                  res();
                };
                script.onerror = rej;
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
            resolve(JSON.stringify(fullText));
          } catch (err) {
            console.error("PDF extraction error:", err);
            resolve("");
          }
        } else if (file.name.match(/\.(doc|docx)$/i)) {
          try {
            if (!window.mammoth) {
              await new Promise((res, rej) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
                script.onload = res;
                script.onerror = rej;
                document.head.appendChild(script);
              });
            }
            const result = await window.mammoth.extractRawText({ arrayBuffer });
            const htmlRes = await window.mammoth.convertToHtml({ arrayBuffer });
            resolve(JSON.stringify({ text: result.value, html: htmlRes.value }));
          } catch (err) {
            console.error("Word extraction error:", err);
            resolve("");
          }
        } else {
          resolve("");
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const readDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!moduleName.trim()) {
      alert('Please enter a KORE Module Name.');
      return;
    }
    if (!editingId && !selectedFile) {
      alert('Please upload a PDF or Word file for this module.');
      return;
    }
    if (editingId && !selectedFile && !filePreviewData) {
      alert('Please upload a replacement file.');
      return;
    }

    setIsProcessing(true);
    try {
      let finalFileInfo = {};
      if (selectedFile) {
        const base64Data = await readDataUrl(selectedFile);
        const extractedText = await extractTextFromFile(selectedFile);
        finalFileInfo = {
          fileName: selectedFile.name,
          fileType: selectedFile.type || (selectedFile.name.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
          fileSize: formatFileSize(selectedFile.size),
          fileData: base64Data,
          extractedText: extractedText
        };
      } else {
        finalFileInfo = { ...filePreviewData };
      }

      const timestamp = new Date().toISOString().split('T')[0];

      if (editingId) {
        const targetMod = koreModules.find(m => m.id === editingId);
        const fbKey = targetMod?._fbKey || editingId;
        const updatedMod = {
          ...targetMod,
          name: moduleName.trim(),
          ...finalFileInfo,
          updatedAt: timestamp
        };
        delete updatedMod._fbKey;
        await saveData(`kore_modules/${fbKey}`, updatedMod);
      } else {
        const newId = 'kore_' + Date.now();
        const newRecord = {
          id: newId,
          name: moduleName.trim(),
          ...finalFileInfo,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        await saveData(`kore_modules/${newId}`, newRecord);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setModuleName('');
      setSelectedFile(null);
      setFilePreviewData(null);
    } catch (err) {
      alert('Error saving KORE Module: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this KORE Module? This will remove the uploaded document.')) {
      const targetMod = koreModules.find(m => m.id === id);
      const fbKey = targetMod?._fbKey || id;
      await removeData(`kore_modules/${fbKey}`);
    }
  };

  const handleRemoveUploadedFileInEdit = () => {
    setFilePreviewData(null);
    setSelectedFile(null);
  };

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <BookOpen size={22} color="var(--primary-light)" /> KORE Module Management
          </h3>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Upload and manage KORE training & reference modules (PDF / Word documents). Scannable via QR code.
          </p>
        </div>
        <button 
          onClick={openAddModal} 
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          <Plus size={18} /> Add KORE Module
        </button>
      </div>

      {/* Modules Table */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        {koreModules.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', border: '2px dashed #E2E8F0', borderRadius: '12px', backgroundColor: '#F8FAFC' }}>
            <BookOpen size={48} color="#94A3B8" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>No KORE Modules Added</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              Upload standard operating procedures, guidelines, or reference manuals in PDF or Word format.
            </p>
            <button onClick={openAddModal} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
              + Upload First Module
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#334155' }}>Module Name</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#334155' }}>Uploaded Document</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#334155' }}>Size</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#334155' }}>Last Updated</th>
                  <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#334155', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {koreModules.map((mod) => {
                  const isPdf = String(mod.fileName || '').toLowerCase().endsWith('.pdf') || String(mod.fileType || '').includes('pdf');
                  return (
                    <tr key={mod.id} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 650, color: '#0F172A', fontSize: '0.95rem' }}>
                        {mod.name}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', backgroundColor: isPdf ? '#FEF2F2' : '#EFF6FF', color: isPdf ? '#DC2626' : '#2563EB', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem' }}>
                          <FileText size={15} />
                          <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mod.fileName || 'Document'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#64748B', fontWeight: 500 }}>
                        {mod.fileSize || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#64748B' }}>
                        {mod.updatedAt || mod.createdAt || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setViewingModule(mod)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Preview Document"
                          >
                            <Eye size={14} /> Preview
                          </button>
                          <button
                            onClick={() => openEditModal(mod)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#0284C7', borderColor: '#BAE6FD', backgroundColor: '#F0F9FF', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Edit / Replace File"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(mod.id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', color: '#0F172A' }}>
                {editingId ? <Edit size={20} color="#0284C7" /> : <Plus size={20} color="var(--primary-light)" />}
                {editingId ? 'Edit KORE Module' : 'Add KORE Module'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 650, color: '#334155', marginBottom: '0.5rem' }}>
                  KORE Module Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., SOP - High Voltage Equipment Maintenance"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 650, color: '#334155', marginBottom: '0.5rem' }}>
                  Upload Document (PDF or Word) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0 0 0.5rem' }}>
                  {editingId ? 'Edit means to rename, remove uploaded files and replace with new one.' : 'Upload the reference PDF or Word document for this module.'}
                </p>

                {/* File Upload Box */}
                {filePreviewData && !selectedFile ? (
                  <div style={{ border: '1px solid #CBD5E1', borderRadius: '8px', padding: '1rem', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: filePreviewData.fileName?.endsWith('.pdf') ? '#FEF2F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} color={filePreviewData.fileName?.endsWith('.pdf') ? '#DC2626' : '#2563EB'} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>{filePreviewData.fileName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Current Uploaded File ({filePreviewData.fileSize})</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0284C7' }}
                      >
                        <RefreshCw size={13} /> Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveUploadedFileInEdit}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: '#DC2626', backgroundColor: '#FEF2F2', border: 'none' }}
                        title="Remove file"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: '2px dashed #CBD5E1', borderRadius: '10px', padding: '2rem', textAlign: 'center', backgroundColor: selectedFile ? '#EFF6FF' : '#F8FAFC', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    <Upload size={32} color={selectedFile ? '#2563EB' : '#94A3B8'} style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 600, color: selectedFile ? '#1D4ED8' : '#334155', marginBottom: '0.25rem' }}>
                      {selectedFile ? `Selected: ${selectedFile.name}` : 'Click to upload PDF or Word document'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {selectedFile ? `Size: ${formatFileSize(selectedFile.size)}` : 'Supports .pdf, .doc, .docx'}
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {selectedFile && filePreviewData && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <Check size={14} /> Will replace "{filePreviewData.fileName}" with "{selectedFile.name}" upon saving.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn"
                  style={{ padding: '0.65rem 1.25rem', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 600 }}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.5rem', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#059669', border: 'none' }}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing File...' : editingId ? 'Update KORE Module' : 'Save KORE Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal for Admin */}
      {viewingModule && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, backdropFilter: 'blur(5px)', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '850px', height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={22} color="var(--primary-light)" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A' }}>{viewingModule.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{viewingModule.fileName} ({viewingModule.fileSize})</div>
                </div>
              </div>
              <button onClick={() => setViewingModule(null)} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <X size={16} /> Close Preview
              </button>
            </div>

            <div 
              style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', backgroundColor: '#F1F5F9', display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none', WebkitUserSelect: 'none' }}
              onContextMenu={(e) => { e.preventDefault(); alert('Security Policy: Right-clicking, copying, downloading, and printing KORE documents is disabled.'); return false; }}
              onKeyDown={(e) => {
                if (e.key === 'PrintScreen' || (e.ctrlKey && ['p', 's', 'c', 'u'].includes(e.key.toLowerCase()))) {
                  e.preventDefault();
                  alert('Security Policy: Downloading, printing, copying, and screenshotting KORE documents is disabled.');
                }
              }}
            >
              {viewingModule.fileName?.toLowerCase().endsWith('.pdf') || viewingModule.fileType?.includes('pdf') ? (
                <ResponsivePdfViewer
                  fileData={viewingModule.fileData}
                  fileName={viewingModule.fileName || viewingModule.name}
                  height="100%"
                />
              ) : (
                <div style={{ width: '100%', backgroundColor: 'white', padding: '2.5rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '100%', boxSizing: 'border-box' }}>
                  <div style={{ paddingBottom: '1.5rem', borderBottom: '2px solid #E2E8F0', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#0F172A' }}>{viewingModule.name}</h3>
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '999px', fontWeight: 600 }}>Word Document Preview</span>
                  </div>
                  {viewingModule.extractedText ? (
                    (() => {
                      try {
                        const parsed = JSON.parse(viewingModule.extractedText);
                        if (parsed.html) {
                          return <div dangerouslySetInnerHTML={{ __html: parsed.html }} style={{ lineHeight: 1.6, color: '#334155' }} />;
                        } else if (parsed.text) {
                          return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6, color: '#334155' }}>{parsed.text}</pre>;
                        }
                      } catch (e) {
                        return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6, color: '#334155' }}>{viewingModule.extractedText}</pre>;
                      }
                    })()
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                      <AlertCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                      <p>Text preview not available for this legacy Word document.</p>
                      <a href={viewingModule.fileData} download={viewingModule.fileName} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', textDecoration: 'none' }}>
                        Download to View
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
