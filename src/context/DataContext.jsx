import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, syncData, saveData } from './firebase';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [units, setUnits] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [supportInbox, setSupportInbox] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Sync Employees
    const unsubEmployees = syncData('employees', (val) => {
      setEmployees(val ? Object.values(val) : []);
    });

    // 2. Sync Checklists
    const unsubChecklists = syncData('checklists', (val) => {
      setChecklists(val ? Object.values(val) : []);
    });

    // 3. Sync Units
    const unsubUnits = syncData('units', (val) => {
      setUnits(val ? Object.values(val) : []);
    });

    // 4. Sync Submissions
    const unsubSubmissions = syncData('submissions', (val) => {
      setSubmissions(val ? Object.values(val) : []);
    });

    // 5. Sync Support Inbox
    const unsubSupport = syncData('support_inbox', (val) => {
      setSupportInbox(val ? Object.values(val) : []);
    });

    // 6. Sync Logs
    const unsubLogs = syncData('logs', (val) => {
      setLogs(val ? Object.values(val) : []);
    });

    // 7. Sync Activities
    const unsubActivities = syncData('activities', (val) => {
      setActivities(val ? Object.values(val) : []);
    });

    // 8. Sync Shifts
    const unsubShifts = syncData('shifts', (val) => {
      setShifts(val ? Object.values(val) : []);
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
    };
  }, []);

  // Helper to push updates to Firebase
  const updateFirebase = async (collection, data) => {
    await saveData(collection, data);
  };

  return (
    <DataContext.Provider value={{ 
      employees, checklists, units, submissions, supportInbox, logs, activities, shifts,
      updateFirebase, loading 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
