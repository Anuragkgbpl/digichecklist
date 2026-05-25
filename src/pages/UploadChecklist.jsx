import React, { useState, useRef, useMemo } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, ClipboardList, Download, List, Trash2, Power, PowerOff, Search, X, Filter, Settings, Shield } from 'lucide-react';
import FrequencyMaster from '../components/FrequencyMaster';
import ReviewersMaster from '../components/ReviewersMaster';
import { parseCSV, validateChecklist } from '../utils/csvParser';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';

const UploadChecklist = () => {
  const { checklists, frequencies, updateFirebase } = useData();
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);

  // Filter state
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterSubLine, setFilterSubLine] = useState('');
  const [filterComponent, setFilterComponent] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');

  // Fire Safety state
  const [selectedFsTab, setSelectedFsTab] = useState('ALL');
  const [isFsModalOpen, setIsFsModalOpen] = useState(false);
  const [fsNewActivity, setFsNewActivity] = useState({
    Equipment_Category: 'Fire Extinguisher',
    Line_Equipment: '',
    Sub_Line_Equipment: '',
    Area_Zone: '',
    Frequency: 'Daily',
    Document_Number: '',
    Revision: '',
    Last_Revised_Date: '',
    Asset_ID: '',
    Component: '',
    Activity_Description: '',
    Standard: ''
  });

  const activityTypes = useMemo(() => [...new Set(checklists.filter(c => c.Type_of_Activity !== 'Fire Safety').map(c => c.Type_of_Activity).filter(Boolean))], [checklists]);
  const lines = useMemo(() => [...new Set(checklists.filter(c => c.Type_of_Activity !== 'Fire Safety').map(c => c.Line_Equipment).filter(Boolean))], [checklists]);
  const subLines = useMemo(() => [...new Set(checklists.filter(c => c.Type_of_Activity !== 'Fire Safety' && (!filterLine || c.Line_Equipment === filterLine)).map(c => c.Sub_Line_Equipment).filter(Boolean))], [checklists, filterLine]);
  const components = useMemo(() => [...new Set(checklists.filter(c => c.Type_of_Activity !== 'Fire Safety').map(c => c.Component).filter(Boolean))], [checklists]);
  
  const PREBUILT_FREQ_NAMES = ['Daily', 'Shift-wise', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Yearly'];
  const dynamicFreqs = useMemo(() => {
    const fromChecklists = checklists.map(c => c.Frequency).filter(Boolean);
    const fromMaster = (frequencies || []).map(f => f.name);
    return [...new Set([...PREBUILT_FREQ_NAMES, ...fromChecklists, ...fromMaster])];
  }, [checklists, frequencies]);

  const filteredChecklists = useMemo(() => checklists.filter(c => {
    if (c.Type_of_Activity === 'Fire Safety') return false;
    const txt = filterText.toLowerCase();
    const matchText = !txt ||
      String(c.Activity_Description || '').toLowerCase().includes(txt) ||
      String(c.Document_Number || '').toLowerCase().includes(txt) ||
      String(c.Revision || '').toLowerCase().includes(txt);
    return matchText
      && (!filterType || c.Type_of_Activity === filterType)
      && (!filterLine || c.Line_Equipment === filterLine)
      && (!filterSubLine || c.Sub_Line_Equipment === filterSubLine)
      && (!filterComponent || c.Component === filterComponent)
      && (!filterFrequency || c.Frequency === filterFrequency);
  }), [checklists, filterText, filterType, filterLine, filterSubLine, filterComponent, filterFrequency]);

  const hasActiveFilters = filterText || filterType || filterLine || filterSubLine || filterComponent || filterFrequency;
  const resetFilters = () => { setFilterText(''); setFilterType(''); setFilterLine(''); setFilterSubLine(''); setFilterComponent(''); setFilterFrequency(''); };
  const [isDragging, setIsDragging] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    Type_of_Activity: '',
    Line_Equipment: '',
    Sub_Line_Equipment: '',
    Component: '',
    Activity_Description: '',
    Frequency: 'Daily',
    Status: 'Active',
    Document_Number: '',
    Revision: '',
    Last_Revised_Date: ''
  });
  const fileInputRef = useRef(null);
  const fsFileInputRef = useRef(null);

  const processFsFile = (selectedFile) => {
    if (!selectedFile) return;
    const isExcel = selectedFile.name.match(/\.(xlsx|xls|csv)$/i);
    if (!isExcel) { alert('Please upload a valid Excel or CSV file.'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        // Map user-friendly headers to internal keys
        const mappedData = data.map(row => ({
          Type_of_Activity: 'Fire Safety',
          Status: 'Active',
          Equipment_Category: row['Equipment Category'] || row['Equipment_Category'] || '',
          Line_Equipment: row['Line'] || row['Line_Equipment'] || '',
          Sub_Line_Equipment: row['Sub-Line'] || row['Sub_Line_Equipment'] || '',
          Area_Zone: row['Area / Zone'] || row['Area_Zone'] || '',
          Asset_ID: row['Asset ID'] || row['Asset_ID'] || '',
          Component: row['Component'] || '',
          Activity_Description: row['Checkpoint'] || row['Activity_Description'] || '',
          Standard: row['Expected Standard'] || row['Standard'] || '',
          Frequency: row['Frequency'] || '',
          Document_Number: row['Doc No'] || row['Document_Number'] || '',
          Revision: row['Rev'] || row['Revision'] || '',
          Last_Revised_Date: row['Last Rev Date'] || row['Last_Revised_Date'] || ''
        }));
        
        // Validate (we use the existing validateChecklist but it validates based on Type_of_Activity='Fire Safety')
        const { validateChecklist } = await import('../utils/csvParser');
        const validationResult = validateChecklist(mappedData);
        
        if (validationResult.errors.length > 0) {
          alert('Upload failed due to errors:\n' + validationResult.errors.slice(0, 5).map(err => `Row ${err.row}: ${err.messages.join(', ')}`).join('\n') + (validationResult.errors.length > 5 ? '\n...and more.' : ''));
          return;
        }
        
        if (window.confirm(`Successfully validated ${validationResult.validData.length} records. Upload them now?`)) {
          await updateFirebase('checklists', [...checklists, ...validationResult.validData]);
          alert('Upload successful!');
          if(fsFileInputRef.current) fsFileInputRef.current.value = '';
        }
      } catch (error) {
        alert('Failed to parse file. Ensure it is correctly formatted.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    const isExcel = selectedFile.name.match(/\.(xlsx|xls|csv)$/i);
    if (!isExcel) { alert('Please upload a valid Excel or CSV file.'); return; }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        setValidationResult(validateChecklist(data));
      } catch (error) {
        setValidationResult({ parseErrors: ['Failed to parse Excel file. Ensure it is correctly formatted.'] });
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (!validationResult || validationResult.errors.length > 0) return;
    try {
      await updateFirebase('checklists', [...checklists, ...validationResult.validData]);
      setFile(null);
      setValidationResult(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('view');
    } catch (e) {
      alert('Upload failed: ' + e.message);
    }
  };

  const downloadTemplate = () => {
    const headers = "Type_of_Activity,Line_Equipment,Sub_Line_Equipment,Component,Activity_Description,Frequency,Status,Document_Number,Revision,Last_Revised_Date\n";
    const sample = "GMP,Packaging Line 1,Cartoning Machine,Sensors,Check and clean optical sensors,Daily,Active,DOC-123,1.0,2026-04-01\n";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Checklist_Master_Template.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this checklist item?')) {
      const updated = checklists.filter(chk => chk.id !== id);
      await updateFirebase('checklists', updated);
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('WARNING: Are you sure you want to delete ALL checklist items? This action cannot be undone.')) {
      if (window.confirm('Please confirm again. Type OK to proceed.')) {
        // Keep Fire Safety items intact during standard Delete All!
        const updated = checklists.filter(chk => chk.Type_of_Activity === 'Fire Safety');
        await updateFirebase('checklists', updated);
      }
    }
  };

  const toggleStatus = async (id) => {
    const updated = checklists.map(chk => {
      if (chk.id === id) {
        return { ...chk, Status: chk.Status === 'Active' ? 'Inactive' : 'Active' };
      }
      return chk;
    });
    await updateFirebase('checklists', updated);
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!newActivity.Type_of_Activity || !newActivity.Component || !newActivity.Activity_Description) {
      alert('Please fill in required fields: Activity Type, Component, and Description.');
      return;
    }
    const item = { ...newActivity, id: Date.now() };
    await updateFirebase('checklists', [...checklists, item]);
    setIsManualModalOpen(false);
    setNewActivity({
      Type_of_Activity: '', Line_Equipment: '', Sub_Line_Equipment: '', Component: '',
      Activity_Description: '', Frequency: 'Daily', Status: 'Active',
      Document_Number: '', Revision: '', Last_Revised_Date: ''
    });
  };

  const downloadFsExcel = (category, data) => {
    const headers = [
      'Type_of_Activity', 'Line_Equipment', 'Sub_Line_Equipment', 'Area_Zone', 'Equipment_Category', 'Asset_ID', 'Component', 'Activity_Description', 'Standard', 'Frequency', 'Document_Number', 'Revision', 'Last_Revised_Date', 'Status'
    ];

    const rows = data.map(item => {
      const row = {};
      headers.forEach(h => {
        row[h] = item[h] || '';
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, category);
    XLSX.writeFile(workbook, `Fire_Safety_${category}_Master.xlsx`);
  };

  const downloadFsCSV = (category, data) => {
    const headers = [
      'Type_of_Activity', 'Line_Equipment', 'Sub_Line_Equipment', 'Area_Zone', 'Equipment_Category', 'Asset_ID', 'Component', 'Activity_Description', 'Standard', 'Frequency', 'Document_Number', 'Revision', 'Last_Revised_Date', 'Status'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(item => headers.map(h => `"${String(item[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Fire_Safety_${category}_Master.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFsDeleteAll = async (category) => {
    if (window.confirm(`WARNING: Are you sure you want to delete ALL Fire Safety ${category} items? This action cannot be undone.`)) {
      if (window.confirm('Please confirm again. Type OK to proceed.')) {
        const updated = checklists.filter(c => !(c.Type_of_Activity === 'Fire Safety' && c.Equipment_Category === category));
        await updateFirebase('checklists', updated);
      }
    }
  };

  const handleFsManualAdd = async (e) => {
    e.preventDefault();
    if (!fsNewActivity.Line_Equipment || !fsNewActivity.Asset_ID || !fsNewActivity.Component || !fsNewActivity.Activity_Description || !fsNewActivity.Standard) {
      alert('Line, Asset ID, Component, Checkpoint, and Expected Standard are required.');
      return;
    }

    const newId = `FS-${Date.now()}`;
    const activityRecord = {
      id: newId,
      Type_of_Activity: 'Fire Safety',
      Equipment_Category: fsNewActivity.Equipment_Category || 'Fire Extinguisher',
      Status: 'Active',
      ...fsNewActivity
    };

    await updateFirebase('checklists', [...checklists, activityRecord]);
    setIsFsModalOpen(false);
    setFsNewActivity({ Equipment_Category: 'Fire Extinguisher', Line_Equipment: '', Sub_Line_Equipment: '', Area_Zone: '', Frequency: 'Daily', Document_Number: '', Revision: '', Last_Revised_Date: '', Asset_ID: '', Component: '', Activity_Description: '', Standard: '' });
  };

  const handleFsPreSeed = async () => {
    if (!window.confirm('This will add sample Fire Safety master checklist data for all 10 equipment categories across multiple lines and areas. Existing data will be kept. Continue?')) return;
    const today = new Date().toISOString().split('T')[0];
    const seed = [
      // FIRE EXTINGUISHER
      { id:`FS-SEED-${Date.now()}-1`,  Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Extinguisher', Line_Equipment:'Production',  Sub_Line_Equipment:'Filling Line 1', Area_Zone:'Shopfloor',       Asset_ID:'FE-FL1-01', Component:'Pressure Gauge',    Activity_Description:'Check pressure gauge needle is in green zone', Standard:'Green Zone (12–15 bar)',       Frequency:'Monthly',   Document_Number:'FS-FE-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-2`,  Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Extinguisher', Line_Equipment:'Production',  Sub_Line_Equipment:'Filling Line 2', Area_Zone:'Shopfloor',       Asset_ID:'FE-FL2-01', Component:'Safety Pin & Seal', Activity_Description:'Verify safety pin and tamper seal are intact',   Standard:'Pin intact, seal unbroken',    Frequency:'Monthly',   Document_Number:'FS-FE-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-3`,  Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Extinguisher', Line_Equipment:'Warehouse',   Sub_Line_Equipment:'RM Store',      Area_Zone:'Storage Area',    Asset_ID:'FE-WH-01',  Component:'Hose Pipe',         Activity_Description:'Inspect hose pipe for cracks, blockage, or damage', Standard:'No cracks, clear path',       Frequency:'Monthly',   Document_Number:'FS-FE-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-4`,  Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Extinguisher', Line_Equipment:'Utility',     Sub_Line_Equipment:'Boiler Area',   Area_Zone:'Plant Area',      Asset_ID:'FE-UT-01',  Component:'Mounting Bracket',  Activity_Description:'Check wall mounting stability and height',           Standard:'Securely mounted at 1.5m',    Frequency:'Quarterly', Document_Number:'FS-FE-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      // FIRE HYDRANT
      { id:`FS-SEED-${Date.now()}-5`,  Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Hydrant',     Line_Equipment:'Production',  Sub_Line_Equipment:'Main Gate Area',Area_Zone:'Perimeter',       Asset_ID:'HYD-PD-01', Component:'Landing Valve',     Activity_Description:'Verify landing valve handwheel turns smoothly',      Standard:'Smooth, no jam or corrosion', Frequency:'Weekly',    Document_Number:'FS-HY-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-6`,  Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Hydrant',     Line_Equipment:'Warehouse',   Sub_Line_Equipment:'Loading Bay',   Area_Zone:'External Zone',   Asset_ID:'HYD-WH-01', Component:'Pressure Gauge',    Activity_Description:'Measure static hydrant line pressure',               Standard:'6.5 – 7.5 kg/cm²',           Frequency:'Weekly',    Document_Number:'FS-HY-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-7`,  Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Hydrant',     Line_Equipment:'Utility',     Sub_Line_Equipment:'Pump House',    Area_Zone:'Plant Area',      Asset_ID:'HYD-UT-01', Component:'Hose Box',          Activity_Description:'Inspect hose box door lock and internal condition',   Standard:'Lock functional, clean inside',Frequency:'Weekly',    Document_Number:'FS-HY-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      // SMOKE DETECTOR
      { id:`FS-SEED-${Date.now()}-8`,  Type_of_Activity:'Fire Safety', Equipment_Category:'Smoke Detector',   Line_Equipment:'Production',  Sub_Line_Equipment:'Filling Line 1', Area_Zone:'Shopfloor',       Asset_ID:'SD-FL1-01', Component:'LED Indicator',     Activity_Description:'Verify red status LED blinks every 10 seconds',      Standard:'Blinks every 10s',            Frequency:'Weekly',    Document_Number:'FS-SD-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-9`,  Type_of_Activity:'Fire Safety', Equipment_Category:'Smoke Detector',   Line_Equipment:'Production',  Sub_Line_Equipment:'Packing Zone',  Area_Zone:'Shopfloor',       Asset_ID:'SD-PZ-01', Component:'Test Response',     Activity_Description:'Perform aerosol smoke test to verify alarm trigger',  Standard:'Triggers alarm within 5s',    Frequency:'Monthly',   Document_Number:'FS-SD-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-10`, Type_of_Activity:'Fire Safety', Equipment_Category:'Smoke Detector',   Line_Equipment:'Warehouse',   Sub_Line_Equipment:'FG Store',      Area_Zone:'Storage Area',    Asset_ID:'SD-WH-01', Component:'Chamber Cleanliness',Activity_Description:'Inspect sensor chamber for dust or cobwebs',         Standard:'Clean, no blockage',          Frequency:'Monthly',   Document_Number:'FS-SD-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      // ALARM PANEL
      { id:`FS-SEED-${Date.now()}-11`, Type_of_Activity:'Fire Safety', Equipment_Category:'Alarm Panel',      Line_Equipment:'Utility',     Sub_Line_Equipment:'Control Room',  Area_Zone:'Admin Block',     Asset_ID:'AP-CR-01', Component:'Battery Backup',    Activity_Description:'Check battery charger state and voltage reading',     Standard:'24V DC, fully charging',      Frequency:'Monthly',   Document_Number:'FS-AP-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-12`, Type_of_Activity:'Fire Safety', Equipment_Category:'Alarm Panel',      Line_Equipment:'Utility',     Sub_Line_Equipment:'Control Room',  Area_Zone:'Admin Block',     Asset_ID:'AP-CR-01', Component:'Display Panel',     Activity_Description:'Verify zero active fault notifications on display',   Standard:'Normal status, no faults',    Frequency:'Daily',     Document_Number:'FS-AP-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      // MCP
      { id:`FS-SEED-${Date.now()}-13`, Type_of_Activity:'Fire Safety', Equipment_Category:'MCP',              Line_Equipment:'Production',  Sub_Line_Equipment:'Filling Line 1', Area_Zone:'Shopfloor',       Asset_ID:'MCP-FL1-01',Component:'Glass Panel',       Activity_Description:'Check MCP glass panel integrity and hammer presence', Standard:'Glass unbroken, hammer present',Frequency:'Weekly',   Document_Number:'FS-MC-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-14`, Type_of_Activity:'Fire Safety', Equipment_Category:'MCP',              Line_Equipment:'Warehouse',   Sub_Line_Equipment:'RM Store',      Area_Zone:'Storage Area',    Asset_ID:'MCP-WH-01', Component:'LED Status',        Activity_Description:'Inspect system connection status LED',               Standard:'Steady green indicator',      Frequency:'Weekly',    Document_Number:'FS-MC-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      // HOOTER
      { id:`FS-SEED-${Date.now()}-15`, Type_of_Activity:'Fire Safety', Equipment_Category:'Hooter',           Line_Equipment:'Production',  Sub_Line_Equipment:'Main Building', Area_Zone:'Shopfloor',       Asset_ID:'HOO-MB-01', Component:'Audio Output',      Activity_Description:'Test hooter sound level during drill',               Standard:'> 90 dB at 1 metre',          Frequency:'Monthly',   Document_Number:'FS-HO-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-16`, Type_of_Activity:'Fire Safety', Equipment_Category:'Hooter',           Line_Equipment:'Warehouse',   Sub_Line_Equipment:'FG Store',      Area_Zone:'Storage Area',    Asset_ID:'HOO-WH-01', Component:'Enclosure',         Activity_Description:'Check hooter casing for rust or water ingress',      Standard:'No rust or water damage',     Frequency:'Monthly',   Document_Number:'FS-HO-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      // FIRE PUMP
      { id:`FS-SEED-${Date.now()}-17`, Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Pump',        Line_Equipment:'Utility',     Sub_Line_Equipment:'Pump House',    Area_Zone:'Plant Area',      Asset_ID:'FP-UT-01',  Component:'Jockey Pump',       Activity_Description:'Verify jockey pump auto-start pressure setting',     Standard:'Auto-starts at 6.0 kg/cm²',   Frequency:'Weekly',    Document_Number:'FS-FP-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-18`, Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Pump',        Line_Equipment:'Utility',     Sub_Line_Equipment:'Pump House',    Area_Zone:'Plant Area',      Asset_ID:'FP-UT-01',  Component:'Diesel Level',      Activity_Description:'Check diesel fuel level in backup engine tank',      Standard:'> 75% tank capacity',         Frequency:'Daily',     Document_Number:'FS-FP-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-19`, Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Pump',        Line_Equipment:'Utility',     Sub_Line_Equipment:'Pump House',    Area_Zone:'Plant Area',      Asset_ID:'FP-UT-02',  Component:'Main Pump',         Activity_Description:'Test main electric pump dry run for abnormal noise',  Standard:'No abnormal sound or vibration',Frequency:'Weekly',   Document_Number:'FS-FP-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      // SAND BUCKET
      { id:`FS-SEED-${Date.now()}-20`, Type_of_Activity:'Fire Safety', Equipment_Category:'Sand Bucket',      Line_Equipment:'Production',  Sub_Line_Equipment:'Filling Line 1', Area_Zone:'Shopfloor',       Asset_ID:'SB-FL1-01', Component:'Sand Quality',      Activity_Description:'Verify sand is dry and bucket is filled to capacity',Standard:'Dry sand, full capacity',      Frequency:'Monthly',   Document_Number:'FS-SB-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-21`, Type_of_Activity:'Fire Safety', Equipment_Category:'Sand Bucket',      Line_Equipment:'Warehouse',   Sub_Line_Equipment:'RM Store',      Area_Zone:'Storage Area',    Asset_ID:'SB-WH-01',  Component:'Bucket Casing',     Activity_Description:'Check red paint marking and wall hook mounting',     Standard:'Rust-free, labelled FIRE',    Frequency:'Monthly',   Document_Number:'FS-SB-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      // FIRE EXIT
      { id:`FS-SEED-${Date.now()}-22`, Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Exit',        Line_Equipment:'Production',  Sub_Line_Equipment:'Filling Line 1', Area_Zone:'Shopfloor',       Asset_ID:'FX-FL1-01', Component:'Exit Door',         Activity_Description:'Verify emergency exit door opens outwards smoothly',  Standard:'Opens on push, no obstruction',Frequency:'Daily',     Document_Number:'FS-FX-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-23`, Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Exit',        Line_Equipment:'Warehouse',   Sub_Line_Equipment:'FG Store',      Area_Zone:'Storage Area',    Asset_ID:'FX-WH-01',  Component:'Access Path',       Activity_Description:'Inspect fire exit passage for material obstructions', Standard:'Clear passage, 0 obstacles',  Frequency:'Daily',     Document_Number:'FS-FX-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-24`, Type_of_Activity:'Fire Safety', Equipment_Category:'Fire Exit',        Line_Equipment:'Utility',     Sub_Line_Equipment:'Boiler Area',   Area_Zone:'Plant Area',      Asset_ID:'FX-UT-01',  Component:'Exit Signage',      Activity_Description:'Verify glowing exit signage is visible and functional',Standard:'Illuminated, visible 30m away',Frequency:'Weekly',   Document_Number:'FS-FX-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      // EMERGENCY LIGHT
      { id:`FS-SEED-${Date.now()}-25`, Type_of_Activity:'Fire Safety', Equipment_Category:'Emergency Light',  Line_Equipment:'Production',  Sub_Line_Equipment:'Filling Line 1', Area_Zone:'Shopfloor',       Asset_ID:'EL-FL1-01', Component:'Battery Run Test',  Activity_Description:'Simulate mains failure and verify light stays ON',   Standard:'Illuminates for 30+ minutes',  Frequency:'Monthly',   Document_Number:'FS-EL-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-26`, Type_of_Activity:'Fire Safety', Equipment_Category:'Emergency Light',  Line_Equipment:'Warehouse',   Sub_Line_Equipment:'FG Store',      Area_Zone:'Storage Area',    Asset_ID:'EL-WH-01',  Component:'Bulb Filament',     Activity_Description:'Verify LED spot illumination pattern is functioning', Standard:'Dual spot alignment OK',       Frequency:'Monthly',   Document_Number:'FS-EL-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
      { id:`FS-SEED-${Date.now()}-27`, Type_of_Activity:'Fire Safety', Equipment_Category:'Emergency Light',  Line_Equipment:'Utility',     Sub_Line_Equipment:'Control Room',  Area_Zone:'Admin Block',     Asset_ID:'EL-CR-01',  Component:'Charging Status',   Activity_Description:'Check emergency light battery charging indicator',    Standard:'Green charging LED ON',        Frequency:'Weekly',    Document_Number:'FS-EL-01', Revision:'1.0', Last_Revised_Date:today, Status:'Active' },
    ];
    // Deduplicate by Asset_ID + Component combination to avoid duplicates
    const existingKeys = new Set(checklists.filter(c => c.Type_of_Activity === 'Fire Safety').map(c => `${c.Asset_ID}|${c.Component}`));
    const toAdd = seed.filter(s => !existingKeys.has(`${s.Asset_ID}|${s.Component}`));
    if (toAdd.length === 0) { alert('Sample data already exists. No duplicates added.'); return; }
    await updateFirebase('checklists', [...checklists, ...toAdd]);
    alert(`✅ Successfully seeded ${toAdd.length} Fire Safety checklist records across all 10 categories!`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><ClipboardList /> Unit Checklist Master</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleDeleteAll} className="btn" style={{ padding: '0.5rem 1rem', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', fontWeight: 600 }}>
            Delete All
          </button>
          <button onClick={() => setIsManualModalOpen(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            + Add Activity
          </button>
          <button onClick={downloadTemplate} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            <Download size={16} /> Download Template
          </button>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Upload the master checklist configuring Type, Line, Sub-Line, and Frequency, or view existing ones.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <div 
          onClick={() => setActiveTab('upload')}
          style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'upload' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'upload' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'upload' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Upload size={18} /> Upload Checklists
        </div>
        <div 
          onClick={() => setActiveTab('view')}
          style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'view' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'view' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'view' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <List size={18} /> View Checklists
        </div>
        <div 
          onClick={() => setActiveTab('freq')}
          style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'freq' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'freq' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'freq' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={18} /> Frequency Master
        </div>
        <div 
          onClick={() => setActiveTab('reviewers')}
          style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'reviewers' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'reviewers' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'reviewers' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={18} /> Reviewers Master
        </div>
        <div 
          onClick={() => setActiveTab('firesafety')}
          style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'firesafety' ? '2px solid var(--primary-light)' : 'none', color: activeTab === 'firesafety' ? 'var(--primary-light)' : 'var(--text-secondary)', fontWeight: activeTab === 'firesafety' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={18} /> Fire Safety Master
        </div>
      </div>

      {activeTab === 'freq' && <FrequencyMaster />}
      {activeTab === 'reviewers' && <ReviewersMaster />}

      {activeTab === 'upload' && (
        <div className="card">
          <div 
            style={{ border: `2px dashed ${isDragging ? 'var(--primary-light)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius-lg)', padding: '3rem', textAlign: 'center', backgroundColor: isDragging ? '#EEF2FF' : 'var(--bg-color)' }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}
          >
            <Upload size={48} color="var(--primary-light)" style={{ marginBottom: '1rem' }} />
            <h3>Drag & drop your Excel/CSV file here</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{file ? `Selected: ${file.name}` : 'or click to browse'}</p>
            <input type="file" accept=".csv, .xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={(e) => processFile(e.target.files[0])} />
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>Browse Files</button>
          </div>

          {validationResult && (
            <div style={{ marginTop: '2rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Validation Report</h3>
              {validationResult.parseErrors ? (
                 <div style={{ color: 'var(--status-rejected)' }}><strong>Parse Errors:</strong> {validationResult.parseErrors.join(', ')}</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
                    <div>Total Rows: <strong>{validationResult.totalRows}</strong></div>
                    <div style={{ color: 'var(--status-completed)' }}>Successful: <strong>{validationResult.validData.length}</strong></div>
                    <div style={{ color: 'var(--status-rejected)' }}>Errors: <strong>{validationResult.errors.length}</strong></div>
                  </div>

                  {validationResult.errors.length > 0 && (
                    <div style={{ backgroundColor: '#FEF2F2', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem' }}>
                      <h4 style={{ color: 'var(--status-rejected)' }}><XCircle size={16} /> Failed Rows</h4>
                      <ul>{validationResult.errors.slice(0, 5).map((err, i) => <li key={i}>Row {err.row}: {err.messages.join(', ')}</li>)}</ul>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" disabled={validationResult.errors.length > 0} onClick={handleUpload}>Confirm & Upload</button>
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ marginTop: '2rem', backgroundColor: '#EEF2FF', padding: '1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.875rem' }}>
            <strong>Required Columns:</strong> Type_of_Activity, Line_Equipment, Sub_Line_Equipment, Component, Activity_Description, Frequency, Status<br/><br/>
            <strong>Optional Columns:</strong> Document_Number, Revision, Last_Revised_Date
          </div>
        </div>
      )}

      {activeTab === 'view' && (
        <div className="card">
          {/* Filter Bar */}
          <div style={{ marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <Filter size={18} /> Filter Results
              </div>
              {hasActiveFilters && (
                <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: 'var(--status-rejected)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <X size={14} /> Reset All Filters
                </button>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              {/* Search Bar */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>SEARCH CRITERIA</label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input 
                    type="text" 
                    value={filterText} 
                    onChange={e => setFilterText(e.target.value)} 
                    placeholder="Desc / Doc / Rev..." 
                    style={{ width: '100%', padding: '0.45rem 0.5rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }} 
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>ACTIVITY TYPE</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <option value="">All Activity Types</option>
                  {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Line Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>LINE EQUIPMENT</label>
                <select value={filterLine} onChange={e => { setFilterLine(e.target.value); setFilterSubLine(''); }} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <option value="">All Lines</option>
                  {lines.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Sub-Line Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>SUB-LINE EQUIPMENT</label>
                <select value={filterSubLine} onChange={e => setFilterSubLine(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <option value="">All Sub-Lines</option>
                  {subLines.map(sl => <option key={sl} value={sl}>{sl}</option>)}
                </select>
              </div>

              {/* Component Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>COMPONENT</label>
                <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <option value="">All Components</option>
                  {components.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Frequency Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 750, color: '#64748B', marginBottom: '0.35rem', letterSpacing: '0.025em' }}>FREQUENCY</label>
                <select value={filterFrequency} onChange={e => setFilterFrequency(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <option value="">All Frequencies</option>
                  {dynamicFreqs.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Line</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Sub-Line</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Component</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Freq</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Doc No</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Rev</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Last Rev Date</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChecklists.map((chk, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{chk.Type_of_Activity}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Line_Equipment}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Sub_Line_Equipment}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Component}</td>
                    <td style={{ padding: '0.75rem 1rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={chk.Activity_Description}>{chk.Activity_Description}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Frequency}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Document_Number || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Revision || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{chk.Last_Revised_Date || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: 'var(--border-radius-sm)', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        backgroundColor: chk.Status === 'Active' ? '#ECFDF5' : '#FEF2F2',
                        color: chk.Status === 'Active' ? 'var(--status-completed)' : 'var(--status-rejected)'
                      }}>
                        {chk.Status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem' }}
                        onClick={() => toggleStatus(chk.id)}
                        title={chk.Status === 'Active' ? 'Mark Inactive' : 'Mark Active'}
                      >
                        {chk.Status === 'Active' ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', color: 'var(--status-rejected)' }}
                        onClick={() => handleDelete(chk.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredChecklists.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      {hasActiveFilters ? 'No activities match your current filters.' : 'No checklists found. Please upload a CSV or Excel file.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'firesafety' && (() => {
        const FS_CATS = ['Fire Extinguisher','Fire Hydrant','Smoke Detector','Alarm Panel','MCP','Hooter','Fire Pump','Sand Bucket','Fire Exit','Emergency Light'];
        const CAT_EMOJI = { 'Fire Extinguisher':'🧯','Fire Hydrant':'🔴','Smoke Detector':'💨','Alarm Panel':'🚨','MCP':'🔘','Hooter':'📢','Fire Pump':'🚰','Sand Bucket':'🪣','Fire Exit':'🚪','Emergency Light':'💡' };
        const allFs = checklists.filter(c => c.Type_of_Activity === 'Fire Safety');
        const filteredFs = selectedFsTab === 'ALL' ? allFs : allFs.filter(c => c.Equipment_Category === selectedFsTab);
        const downloadData = selectedFsTab === 'ALL' ? allFs : filteredFs;
        return (
          <div>
            {/* ─── Action Bar ─── */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'0.75rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
                <h3 style={{ margin:0, display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  🔥 Fire Safety Master
                </h3>
                {/* Category filter pill */}
                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'#F1F5F9', borderRadius:'8px', padding:'0.3rem 0.6rem' }}>
                  <Filter size={13} color="#64748B" />
                  <select
                    value={selectedFsTab}
                    onChange={e => setSelectedFsTab(e.target.value)}
                    style={{ border:'none', background:'transparent', fontSize:'0.82rem', fontWeight:600, color:'#374151', cursor:'pointer', outline:'none' }}
                  >
                    <option value="ALL">All Equipment ({allFs.length})</option>
                    {FS_CATS.map(cat => (
                      <option key={cat} value={cat}>{CAT_EMOJI[cat]} {cat} ({allFs.filter(c=>c.Equipment_Category===cat).length})</option>
                    ))}
                  </select>
                </div>
                <span style={{ fontSize:'0.78rem', color:'var(--text-tertiary)' }}>
                  Showing {filteredFs.length} record{filteredFs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', alignItems:'center' }}>
                <button onClick={handleFsPreSeed} className="btn" style={{ padding:'0.45rem 0.9rem', backgroundColor:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', fontWeight:600, fontSize:'0.82rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                  🌱 Pre-seed
                </button>
                <button onClick={() => { if(selectedFsTab==='ALL'){ if(window.confirm('Delete ALL Fire Safety records?')) updateFirebase('checklists', checklists.filter(c=>c.Type_of_Activity!=='Fire Safety')); } else handleFsDeleteAll(selectedFsTab); }} className="btn" style={{ padding:'0.45rem 0.9rem', backgroundColor:'#FEE2E2', color:'#DC2626', border:'none', fontWeight:600, fontSize:'0.82rem' }}>
                  🗑 Delete All
                </button>
                <button onClick={() => { setFsNewActivity(prev=>({...prev, Frequency:'Daily'})); setIsFsModalOpen(true); }} className="btn btn-primary" style={{ padding:'0.45rem 0.9rem', fontSize:'0.82rem' }}>
                  + Add Activity
                </button>
                <input type="file" accept=".csv, .xlsx, .xls" style={{ display: 'none' }} ref={fsFileInputRef} onChange={(e) => processFsFile(e.target.files[0])} />
                <button onClick={() => fsFileInputRef.current?.click()} className="btn btn-primary" style={{ padding:'0.45rem 0.9rem', fontSize:'0.82rem', backgroundColor: '#10B981', borderColor: '#10B981' }}>
                  <Upload size={13} style={{ marginRight: '0.3rem' }} /> Upload
                </button>
                <button onClick={() => downloadFsCSV(selectedFsTab==='ALL'?'All':selectedFsTab, downloadData)} className="btn btn-secondary" style={{ padding:'0.45rem 0.9rem', fontSize:'0.82rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                  <Download size={13}/> CSV
                </button>
                <button onClick={() => downloadFsExcel(selectedFsTab==='ALL'?'All':selectedFsTab, downloadData)} className="btn btn-secondary" style={{ padding:'0.45rem 0.9rem', fontSize:'0.82rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                  <Download size={13}/> Excel
                </button>
              </div>
            </div>

            {/* ─── Unified Table ─── */}
            <div className="card" style={{ padding:'0', border:'1px solid var(--border-color)', overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left', fontSize:'0.85rem', whiteSpace:'nowrap' }}>
                  <thead style={{ backgroundColor:'#F8FAFC', borderBottom:'2px solid var(--border-color)' }}>
                    <tr>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Equipment Category</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Line</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Sub-Line</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Area / Zone</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Asset ID</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Component</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Checkpoint</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Expected Standard</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Frequency</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Doc No</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Rev</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Last Rev Date</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151' }}>Status</th>
                      <th style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#374151', textAlign:'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFs.map((chk, i) => (
                      <tr key={chk.id || i} style={{ borderBottom:'1px solid var(--border-color)', transition:'background 0.15s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                        onMouseLeave={e=>e.currentTarget.style.background=''}
                      >
                        <td style={{ padding:'0.85rem 1rem' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', fontWeight:600, fontSize:'0.8rem', padding:'0.2rem 0.5rem', borderRadius:'5px', backgroundColor:'#FEF2F2', color:'#B91C1C' }}>
                            {CAT_EMOJI[chk.Equipment_Category] || '🔥'} {chk.Equipment_Category || '-'}
                          </span>
                        </td>
                        <td style={{ padding:'0.85rem 1rem' }}>{chk.Line_Equipment || '-'}</td>
                        <td style={{ padding:'0.85rem 1rem' }}>{chk.Sub_Line_Equipment || '-'}</td>
                        <td style={{ padding:'0.85rem 1rem' }}>{chk.Area_Zone || '-'}</td>
                        <td style={{ padding:'0.85rem 1rem', fontWeight:600, color:'#1D4ED8' }}>{chk.Asset_ID || '-'}</td>
                        <td style={{ padding:'0.85rem 1rem', fontWeight:600 }}>{chk.Component || '-'}</td>
                        <td style={{ padding:'0.85rem 1rem', maxWidth:'220px', overflow:'hidden', textOverflow:'ellipsis' }} title={chk.Activity_Description}>{chk.Activity_Description || '-'}</td>
                        <td style={{ padding:'0.85rem 1rem', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', color:'#065F46', fontWeight:600 }} title={chk.Standard}>{chk.Standard || '-'}</td>
                        <td style={{ padding:'0.85rem 1rem' }}>
                          <span style={{ padding:'0.15rem 0.5rem', borderRadius:'5px', backgroundColor:'#EFF6FF', color:'#1D4ED8', fontWeight:600, fontSize:'0.78rem' }}>{chk.Frequency || '-'}</span>
                        </td>
                        <td style={{ padding:'0.85rem 1rem', color:'#6B7280' }}>{chk.Document_Number || '-'}</td>
                        <td style={{ padding:'0.85rem 1rem', color:'#6B7280' }}>{chk.Revision || '-'}</td>
                        <td style={{ padding:'0.85rem 1rem', color:'#6B7280' }}>{chk.Last_Revised_Date || '-'}</td>
                        <td style={{ padding:'0.85rem 1rem' }}>
                          <span style={{ padding:'0.2rem 0.5rem', borderRadius:'5px', fontSize:'0.75rem', fontWeight:600, backgroundColor: chk.Status==='Active'?'#ECFDF5':'#FEF2F2', color: chk.Status==='Active'?'#065F46':'#B91C1C' }}>
                            {chk.Status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding:'0.85rem 1rem', textAlign:'right' }}>
                          <div style={{ display:'inline-flex', gap:'0.4rem' }}>
                            <button className="btn btn-secondary" style={{ padding:'0.2rem 0.45rem' }} onClick={()=>toggleStatus(chk.id)} title={chk.Status==='Active'?'Mark Inactive':'Mark Active'}>
                              {chk.Status==='Active'?<PowerOff size={13}/>:<Power size={13}/>}
                            </button>
                            <button className="btn btn-secondary" style={{ padding:'0.2rem 0.45rem', color:'#DC2626' }} onClick={()=>handleDelete(chk.id)} title="Delete">
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredFs.length === 0 && (
                      <tr>
                        <td colSpan="14" style={{ padding:'3rem', textAlign:'center', color:'var(--text-tertiary)' }}>
                          No Fire Safety records found. Click <strong>🌱 Pre-seed</strong> to load sample data or <strong>+ Add Activity</strong> to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fire Safety Manual Modal */}
      {isFsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', margin: '1rem', padding: '2rem', borderRadius: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={20} color="#EF4444" /> Add Activity
                </h3>
                <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', fontWeight: 700, color: '#EF4444', backgroundColor: '#FEE2E2', padding: '0.2rem 0.6rem', borderRadius: '4px', display: 'inline-block' }}>
                  🔥 {selectedFsTab}
                </div>
              </div>
              <button onClick={() => setIsFsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleFsManualAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Equipment Category - full width, first field */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Equipment Category *</label>
                <select required value={fsNewActivity.Equipment_Category} onChange={e => setFsNewActivity({...fsNewActivity, Equipment_Category: e.target.value})} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600 }}>
                  {['Fire Extinguisher','Fire Hydrant','Smoke Detector','Alarm Panel','MCP','Hooter','Fire Pump','Sand Bucket','Fire Exit','Emergency Light'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {/* Common Fields */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Line *</label>
                <input type="text" required value={fsNewActivity.Line_Equipment} onChange={e => setFsNewActivity({...fsNewActivity, Line_Equipment: e.target.value})} placeholder="e.g., Production, Utility" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Sub-Line</label>
                <input type="text" value={fsNewActivity.Sub_Line_Equipment} onChange={e => setFsNewActivity({...fsNewActivity, Sub_Line_Equipment: e.target.value})} placeholder="e.g., Filling Line 1, Boiler" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Area / Zone</label>
                <input type="text" value={fsNewActivity.Area_Zone} onChange={e => setFsNewActivity({...fsNewActivity, Area_Zone: e.target.value})} placeholder="e.g., Shopfloor, Plant Area" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Frequency *</label>
                <select value={fsNewActivity.Frequency} onChange={e => setFsNewActivity({...fsNewActivity, Frequency: e.target.value})} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  {dynamicFreqs.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Asset ID *</label>
                <input type="text" required value={fsNewActivity.Asset_ID} onChange={e => setFsNewActivity({...fsNewActivity, Asset_ID: e.target.value})} placeholder="e.g., FE-FL1-01, HYD-01" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Component *</label>
                <input type="text" required value={fsNewActivity.Component} onChange={e => setFsNewActivity({...fsNewActivity, Component: e.target.value})} placeholder="e.g., Valve, Pressure Gauge, Cylinder" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Checkpoint / Activity Description *</label>
                <textarea required value={fsNewActivity.Activity_Description} onChange={e => setFsNewActivity({...fsNewActivity, Activity_Description: e.target.value})} placeholder="Describe checks like pressure reading, physical damage, leakage check..." style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', minHeight: '80px', fontFamily: 'inherit' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Expected Standard *</label>
                <input type="text" required value={fsNewActivity.Standard} onChange={e => setFsNewActivity({...fsNewActivity, Standard: e.target.value})} placeholder="e.g., Pressure > 10 bar, No Leakage, OK" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Document Number (Checklist ID)</label>
                <input type="text" value={fsNewActivity.Document_Number} onChange={e => setFsNewActivity({...fsNewActivity, Document_Number: e.target.value})} placeholder="e.g., FS-DOC-01" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Revision No.</label>
                <input type="text" value={fsNewActivity.Revision} onChange={e => setFsNewActivity({...fsNewActivity, Revision: e.target.value})} placeholder="e.g., 1.0" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Last Revision Date</label>
                <input type="date" value={fsNewActivity.Last_Revised_Date} onChange={e => setFsNewActivity({...fsNewActivity, Last_Revised_Date: e.target.value})} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsFsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}

    {/* Manual Addition Modal */}
    {isManualModalOpen && (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '600px', margin: '1rem', padding: '2rem', borderRadius: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ClipboardList size={20} color="var(--primary-light)" /> Add New Activity</h3>
            <button onClick={() => setIsManualModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><XCircle size={24} /></button>
          </div>
          
          <form onSubmit={handleManualAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Activity Type *</label>
              <input type="text" required value={newActivity.Type_of_Activity} onChange={e => setNewActivity({...newActivity, Type_of_Activity: e.target.value})} placeholder="e.g., GMP, Maintenance" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Line / Equipment</label>
              <input type="text" value={newActivity.Line_Equipment} onChange={e => setNewActivity({...newActivity, Line_Equipment: e.target.value})} placeholder="Line name" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Sub-Line / Area</label>
              <input type="text" value={newActivity.Sub_Line_Equipment} onChange={e => setNewActivity({...newActivity, Sub_Line_Equipment: e.target.value})} placeholder="Sub-area" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Component *</label>
              <input type="text" required value={newActivity.Component} onChange={e => setNewActivity({...newActivity, Component: e.target.value})} placeholder="Component name" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Frequency *</label>
              <select value={newActivity.Frequency} onChange={e => setNewActivity({...newActivity, Frequency: e.target.value})} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                {dynamicFreqs.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Activity Description *</label>
              <textarea required value={newActivity.Activity_Description} onChange={e => setNewActivity({...newActivity, Activity_Description: e.target.value})} placeholder="Describe the check to be performed..." style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', minHeight: '80px', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Document No.</label>
              <input type="text" value={newActivity.Document_Number} onChange={e => setNewActivity({...newActivity, Document_Number: e.target.value})} placeholder="DOC-000" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Revision</label>
              <input type="text" value={newActivity.Revision} onChange={e => setNewActivity({...newActivity, Revision: e.target.value})} placeholder="1.0" style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsManualModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Activity</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
};

export default UploadChecklist;
