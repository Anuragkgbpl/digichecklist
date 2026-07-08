import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, syncData, saveData, updateData, pushData, batchAppendData } from '../firebase';

const DataContext = createContext(null);

const mapFirebaseValues = (val) => {
  if (!val) return [];
  return Object.entries(val).map(([key, item]) => {
    if (!item) return null;
    if (typeof item === 'object') {
      return { ...item, _fbKey: key };
    }
    return item;
  }).filter(Boolean);
};

export const DataProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [units, setUnits] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [supportInbox, setSupportInbox] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [koreModules, setKoreModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [koreLoading, setKoreLoading] = useState(true);
  const [koreError, setKoreError] = useState(null);

  useEffect(() => {
    // 1. Sync Employees
    const unsubEmployees = syncData('employees', (val) => {
      setEmployees(mapFirebaseValues(val));
    });

    // 2. Sync Checklists
    const unsubChecklists = syncData('checklists', (val) => {
      setChecklists(mapFirebaseValues(val));
    });

    // 3. Sync Units
    const unsubUnits = syncData('units', (val) => {
      setUnits(mapFirebaseValues(val));
    });

    // 4. Sync Submissions
    const unsubSubmissions = syncData('submissions', (val) => {
      setSubmissions(mapFirebaseValues(val));
    });

    // 5. Sync Support Inbox
    const unsubSupport = syncData('support_inbox', (val) => {
      setSupportInbox(mapFirebaseValues(val));
    });

    // 6. Sync Logs
    const unsubLogs = syncData('logs', (val) => {
      setLogs(mapFirebaseValues(val));
    });

    // 7. Sync Activities
    const unsubActivities = syncData('activities', (val) => {
      setActivities(mapFirebaseValues(val));
    });

    // 8. Sync Shifts
    const unsubShifts = syncData('shifts', (val) => {
      setShifts(mapFirebaseValues(val));
    });

    // 9. Sync Frequencies
    const unsubFreqs = syncData('frequencies', (val) => {
      setFrequencies(mapFirebaseValues(val));
    });

    // 10. Sync Reviewers
    const unsubReviewers = syncData('reviewers', (val) => {
      setReviewers(mapFirebaseValues(val));
    });

    // 11. Sync Kore Modules
    console.log('[KORE Modules Fetch] Initiating sync for path: kore_modules');
    const unsubKore = syncData('kore_modules', (val) => {
      const mapped = mapFirebaseValues(val);
      console.log(`[KORE Modules Fetch] Successfully fetched kore_modules. Result count: ${mapped.length}`, mapped);
      setKoreModules(mapped);
      setKoreLoading(false);
      setKoreError(null);
    }, (err) => {
      console.error('[KORE Modules Fetch] Error fetching kore_modules:', err);
      setKoreError(err?.message || 'Error fetching KORE modules');
      setKoreLoading(false);
    });

    setLoading(false);

    return () => {
      unsubEmployees();
      unsubChecklists();
      unsubUnits();
      unsubSubmissions();
      unsubSupport();
      unsubLogs();
      unsubActivities();
      unsubShifts();
      unsubFreqs();
      unsubReviewers();
      unsubKore();
    };
  }, []);

  // Helper to push updates to Firebase
  const updateFirebase = async (collection, data) => {
    await saveData(collection, data);
  };

  // Highly optimized function to PATCH specific fields of existing records atomically
  const patchFirebase = async (collection, updates) => {
    await updateData(collection, updates);
  };

  // Highly optimized function to APPEND multiple new records to a collection atomically
  const appendFirebase = async (collection, newRecordsArray) => {
    const payload = {};
    newRecordsArray.forEach(rec => {
      // Use record.id if present, otherwise fallback to a timestamp-based key
      const key = rec.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      payload[key] = rec;
    });
    await batchAppendData(collection, payload);
  };

  return (
    <DataContext.Provider value={{ 
      employees, checklists, units, submissions, supportInbox, logs, activities, shifts, frequencies, reviewers, koreModules,
      updateFirebase, patchFirebase, appendFirebase, loading, koreLoading, koreError 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
